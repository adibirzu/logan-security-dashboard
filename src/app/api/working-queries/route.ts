import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const WORKING_QUERIES_FILE = path.join(process.cwd(), 'config', 'working-queries.json')

interface WorkingQuery {
  id: string
  name: string
  query: string
  category: string
  description?: string
  saved_date: string
  saved_by: string
  execution_stats?: {
    avg_execution_time_ms?: number
    last_result_count?: number
    success_rate?: number
  }
  usage_stats?: {
    usage_count?: number
    last_used?: string
    avg_results?: number
  }
  tags?: string[]
  user_notes?: string
}

interface WorkingQueriesFile {
  verified_working_queries: {
    meta: {
      last_updated: string
      total_queries: number
      categories: string[]
    }
    queries: WorkingQuery[]
  }
}

// Auto-categorize query based on content
function categorizeQuery(query: string): string {
  const queryLower = query.toLowerCase()
  if (queryLower.includes('failed') || queryLower.includes('error') || queryLower.includes('alert') || queryLower.includes('security')) {
    return 'security'
  }
  if (queryLower.includes('principal') || queryLower.includes('audit') || queryLower.includes('access')) {
    return 'audit'
  }
  if (queryLower.includes('stats count') || queryLower.includes('head') || queryLower.includes('transpose')) {
    return 'basic'
  }
  if (queryLower.includes('performance') || queryLower.includes('time') || queryLower.includes('response')) {
    return 'performance'
  }
  if (queryLower.includes('stats') || queryLower.includes('sort') || queryLower.includes('where')) {
    return 'analysis'
  }
  return 'custom'
}

// Load working queries file
function loadWorkingQueries(): WorkingQueriesFile {
  try {
    if (fs.existsSync(WORKING_QUERIES_FILE)) {
      const content = fs.readFileSync(WORKING_QUERIES_FILE, 'utf8')
      const data = JSON.parse(content)
      
      // Adapt existing structure to our expected format
      if (data.verified_working_queries && data.verified_working_queries.queries) {
        // If it has the existing structure, adapt it
        return {
          verified_working_queries: {
            meta: data.verified_working_queries.meta || {
              last_updated: data.verified_working_queries.last_updated || new Date().toISOString(),
              total_queries: data.verified_working_queries.queries.length,
              categories: [...new Set(data.verified_working_queries.queries.map((q: any) => q.category || 'basic'))]
            },
            queries: data.verified_working_queries.queries
          }
        }
      }
      
      return data
    }
  } catch (error) {
    console.error('Error loading working queries:', error)
  }

  // Return default structure if file doesn't exist or has errors
  return {
    verified_working_queries: {
      meta: {
        last_updated: new Date().toISOString(),
        total_queries: 0,
        categories: ['security', 'audit', 'basic', 'performance', 'custom']
      },
      queries: []
    }
  }
}

// Save working queries file
function saveWorkingQueries(data: WorkingQueriesFile): void {
  try {
    // Ensure directory exists
    const dir = path.dirname(WORKING_QUERIES_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Load existing file to preserve other sections
    let existingData: any = {}
    try {
      if (fs.existsSync(WORKING_QUERIES_FILE)) {
        existingData = JSON.parse(fs.readFileSync(WORKING_QUERIES_FILE, 'utf8'))
      }
    } catch (e) {
      console.log('Could not load existing file, creating new structure')
    }

    // Update meta information
    data.verified_working_queries.meta.last_updated = new Date().toISOString().split('T')[0] // Keep date format consistent
    data.verified_working_queries.meta.total_queries = data.verified_working_queries.queries.length

    // Update categories
    const uniqueCategories = [...new Set(data.verified_working_queries.queries.map(q => q.category))].sort()
    data.verified_working_queries.meta.categories = uniqueCategories

    // Preserve existing sections while updating verified_working_queries
    const finalData = {
      ...existingData,
      verified_working_queries: {
        ...existingData.verified_working_queries,
        ...data.verified_working_queries,
        meta: data.verified_working_queries.meta,
        queries: data.verified_working_queries.queries
      }
    }

    fs.writeFileSync(WORKING_QUERIES_FILE, JSON.stringify(finalData, null, 2))
  } catch (error) {
    console.error('Error saving working queries:', error)
    throw error
  }
}

// GET - Retrieve all working queries
export async function GET() {
  try {
    const workingQueries = loadWorkingQueries()
    return NextResponse.json({
      success: true,
      data: workingQueries.verified_working_queries
    })
  } catch (error) {
    console.error('Error retrieving working queries:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve working queries'
    }, { status: 500 })
  }
}

// POST - Save a new query to working queries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, query: queryData } = body

    if (action === 'save' && queryData) {
      const workingQueries = loadWorkingQueries()
      
      // Check for duplicates
      const existingQuery = workingQueries.verified_working_queries.queries.find(
        q => q.query === queryData.query || q.name === queryData.name
      )
      
      if (existingQuery) {
        return NextResponse.json({
          success: false,
          error: 'Query with this name or content already exists in working queries',
          existing: existingQuery
        }, { status: 409 })
      }

      // Auto-categorize if no category provided
      const category = queryData.category || categorizeQuery(queryData.query)

      // Create new working query
      const newQuery: WorkingQuery = {
        id: `user_saved_${Date.now()}`,
        name: queryData.name,
        query: queryData.query,
        category,
        description: queryData.description,
        saved_date: new Date().toISOString(),
        saved_by: 'user',
        execution_stats: {
          avg_execution_time_ms: queryData.execution_time_ms,
          last_result_count: queryData.result_count,
          success_rate: 1.0
        },
        usage_stats: {
          usage_count: 1,
          last_used: new Date().toISOString(),
          avg_results: queryData.result_count || 0
        },
        tags: queryData.tags || [category],
        user_notes: queryData.user_notes
      }

      // Add to working queries
      workingQueries.verified_working_queries.queries.push(newQuery)

      // Save file
      saveWorkingQueries(workingQueries)

      return NextResponse.json({
        success: true,
        message: 'Query saved to working queries successfully',
        query: newQuery
      })
    }

    if (action === 'delete' && queryData?.id) {
      const workingQueries = loadWorkingQueries()
      const initialLength = workingQueries.verified_working_queries.queries.length
      
      workingQueries.verified_working_queries.queries = workingQueries.verified_working_queries.queries.filter(
        q => q.id !== queryData.id
      )

      if (workingQueries.verified_working_queries.queries.length === initialLength) {
        return NextResponse.json({
          success: false,
          error: 'Query not found'
        }, { status: 404 })
      }

      saveWorkingQueries(workingQueries)

      return NextResponse.json({
        success: true,
        message: 'Query deleted from working queries successfully'
      })
    }

    if (action === 'update' && queryData) {
      const workingQueries = loadWorkingQueries()
      const queryIndex = workingQueries.verified_working_queries.queries.findIndex(
        q => q.id === queryData.id
      )

      if (queryIndex === -1) {
        return NextResponse.json({
          success: false,
          error: 'Query not found'
        }, { status: 404 })
      }

      // Update query
      const existingQuery = workingQueries.verified_working_queries.queries[queryIndex]
      const updatedQuery = {
        ...existingQuery,
        ...queryData,
        id: existingQuery.id, // Keep original ID
        saved_date: existingQuery.saved_date, // Keep original save date
        usage_stats: {
          ...existingQuery.usage_stats,
          usage_count: (existingQuery.usage_stats?.usage_count || 0) + 1,
          last_used: new Date().toISOString()
        }
      }

      workingQueries.verified_working_queries.queries[queryIndex] = updatedQuery
      saveWorkingQueries(workingQueries)

      return NextResponse.json({
        success: true,
        message: 'Query updated successfully',
        query: updatedQuery
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing query data'
    }, { status: 400 })

  } catch (error) {
    console.error('Error processing working queries request:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
