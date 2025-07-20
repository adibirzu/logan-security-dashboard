import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const LOGAN_QUERIES_FILE = path.join(process.cwd(), 'config', 'logan-working-queries.json')
const MITRE_QUERIES_FILE = path.join(process.cwd(), 'config', 'mitre-enhanced-queries.json')

interface LoganQueryCategory {
  name: string
  description: string
  queries: LoganQuery[]
}

interface LoganQuery {
  id: string
  name: string
  description: string
  query: string
  category: string
  tags: string[]
  timeRange: string
  maxResults: number
}

interface LoganQueriesFile {
  version: string
  description: string
  last_updated: string
  categories: Record<string, LoganQueryCategory>
}

// Load Logan working queries file
function loadLoganQueries(): LoganQueriesFile | null {
  try {
    if (fs.existsSync(LOGAN_QUERIES_FILE)) {
      const content = fs.readFileSync(LOGAN_QUERIES_FILE, 'utf8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('Error loading Logan queries:', error)
  }
  return null
}

// Load MITRE enhanced queries file
function loadMitreQueries(): any {
  try {
    if (fs.existsSync(MITRE_QUERIES_FILE)) {
      const content = fs.readFileSync(MITRE_QUERIES_FILE, 'utf8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('Error loading MITRE queries:', error)
  }
  return null
}

// Convert MITRE queries to Logan format
function convertMitreToLoganFormat(mitreData: any): LoganQueryCategory {
  // Handle different possible structures
  let queriesArray = []
  if (mitreData.queries) {
    queriesArray = mitreData.queries
  } else if (mitreData.mitre_enhanced_queries?.queries) {
    queriesArray = mitreData.mitre_enhanced_queries.queries
  } else {
    console.warn('MITRE queries data structure not recognized:', Object.keys(mitreData))
    queriesArray = []
  }

  const queries: LoganQuery[] = queriesArray.map((query: any) => ({
    id: query.id,
    name: query.name,
    description: query.description || query.query || 'Enhanced MITRE query',
    query: query.query,
    category: query.category || 'mitre-attack',
    tags: query.mitre_mapping ? [
      'mitre-attack',
      'windows-sysmon',
      query.mitre_mapping.tactic || 'unknown',
      ...(query.mitre_mapping.techniques || [])
    ] : ['mitre-attack', 'windows-sysmon'],
    timeRange: '1440m', // Default to 24 hours
    maxResults: 1000
  }))

  return {
    name: 'MITRE ATT&CK Enhanced',
    description: 'Enhanced MITRE ATT&CK queries for Windows Sysmon events with technique extraction and mapping',
    queries
  }
}

// GET - Retrieve Logan working queries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    
    const loganQueries = loadLoganQueries()
    const mitreQueries = loadMitreQueries()
    
    if (!loganQueries) {
      return NextResponse.json({
        success: false,
        error: 'Logan queries file not found'
      }, { status: 404 })
    }

    // Merge MITRE queries with Logan queries
    let categories = { ...loganQueries.categories }
    if (mitreQueries) {
      try {
        const mitreCategory = convertMitreToLoganFormat(mitreQueries)
        if (mitreCategory.queries.length > 0) {
          categories['mitre_enhanced'] = mitreCategory
        }
      } catch (error) {
        console.error('Error converting MITRE queries:', error)
      }
    }

    // Filter by category if specified
    if (category) {
      const filteredCategories: Record<string, LoganQueryCategory> = {}
      if (categories[category]) {
        filteredCategories[category] = categories[category]
      }
      categories = filteredCategories
    }

    // Filter by tag if specified
    if (tag) {
      const filteredCategories: Record<string, LoganQueryCategory> = {}
      Object.entries(categories).forEach(([catKey, catData]) => {
        const filteredQueries = catData.queries.filter(query => 
          query.tags.includes(tag)
        )
        if (filteredQueries.length > 0) {
          filteredCategories[catKey] = {
            ...catData,
            queries: filteredQueries
          }
        }
      })
      categories = filteredCategories
    }

    // Transform to flat array if needed
    const allQueries: LoganQuery[] = []
    Object.values(categories).forEach(category => {
      allQueries.push(...category.queries)
    })

    return NextResponse.json({
      success: true,
      data: {
        version: loganQueries.version,
        description: loganQueries.description,
        last_updated: loganQueries.last_updated,
        total_queries: allQueries.length,
        total_categories: Object.keys(categories).length,
        categories,
        queries: allQueries // Flat array for easy access
      }
    })
  } catch (error) {
    console.error('Error retrieving Logan queries:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve Logan queries'
    }, { status: 500 })
  }
}

// POST - Execute a Logan query
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { queryId, customQuery, timeRange, maxResults } = body

    const loganQueries = loadLoganQueries()
    
    if (!loganQueries && !customQuery) {
      return NextResponse.json({
        success: false,
        error: 'Logan queries file not found and no custom query provided'
      }, { status: 404 })
    }

    let queryToExecute = customQuery
    let queryInfo = null

    // If queryId provided, find the specific query
    if (queryId && loganQueries) {
      let foundQuery: LoganQuery | undefined = undefined
      
      for (const category of Object.values(loganQueries.categories)) {
        const query = category.queries.find(q => q.id === queryId)
        if (query) {
          foundQuery = query
          break
        }
      }

      if (!foundQuery) {
        return NextResponse.json({
          success: false,
          error: `Query with ID ${queryId} not found`
        }, { status: 404 })
      }

      queryToExecute = foundQuery.query
      queryInfo = foundQuery
    }

    if (!queryToExecute) {
      return NextResponse.json({
        success: false,
        error: 'No query to execute'
      }, { status: 400 })
    }

    // Execute the query via the MCP search API
    const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mcp/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: queryToExecute,
        timePeriodMinutes: timeRange || (queryInfo?.timeRange === '24h' ? 1440 : 60),
        maxResults: maxResults || queryInfo?.maxResults || 100,
        bypassValidation: false
      })
    })

    const searchResult = await searchResponse.json()

    return NextResponse.json({
      success: true,
      query_info: queryInfo,
      query_executed: queryToExecute,
      execution_result: searchResult
    })

  } catch (error) {
    console.error('Error executing Logan query:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to execute Logan query'
    }, { status: 500 })
  }
}