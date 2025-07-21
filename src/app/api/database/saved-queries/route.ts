import { NextRequest, NextResponse } from 'next/server'
import { getOracleMCPClient, SavedQuery } from '@/lib/database/oracle-client'
import { v4 as uuidv4 } from 'uuid'

// GET /api/database/saved-queries - Retrieve saved queries
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || undefined
    const category = searchParams.get('category') || undefined

    const client = getOracleMCPClient()
    
    // Ensure connection is initialized
    const initialized = await client.initialize()
    if (!initialized) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize database connection'
      }, { status: 500 })
    }

    const queries = await client.getSavedQueries(userId, category)
    
    return NextResponse.json({
      success: true,
      data: queries,
      count: queries.length
    })
  } catch (error) {
    console.error('Failed to retrieve saved queries:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve saved queries',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/database/saved-queries - Save a new query
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.query) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name and query are required'
      }, { status: 400 })
    }

    const client = getOracleMCPClient()
    
    // Ensure connection is initialized
    const initialized = await client.initialize()
    if (!initialized) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize database connection'
      }, { status: 500 })
    }

    // Create SavedQuery object
    const savedQuery: SavedQuery = {
      id: body.id || uuidv4(),
      name: body.name,
      description: body.description || '',
      query: body.query,
      category: body.category || 'general',
      parameters: body.parameters || [],
      createdBy: body.createdBy || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: body.isPublic || false,
      tags: body.tags || [],
      executionCount: 0,
      avgExecutionTime: 0
    }

    const result = await client.saveQuery(savedQuery)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: savedQuery,
        message: 'Query saved successfully'
      }, { status: 201 })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to save query',
        details: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to save query:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save query',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/database/saved-queries - Update an existing query
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: id'
      }, { status: 400 })
    }

    const client = getOracleMCPClient()
    
    // Ensure connection is initialized
    const initialized = await client.initialize()
    if (!initialized) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize database connection'
      }, { status: 500 })
    }

    // Update query via MCP
    const updateData = {
      ...body,
      updated_at: new Date()
    }

    const result = await client.executeMCPRequest('update', {
      table: 'saved_queries',
      filters: { id: body.id },
      data: updateData
    })
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: updateData,
        message: 'Query updated successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update query',
        details: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to update query:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update query',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/database/saved-queries - Delete a query
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryId = searchParams.get('id')
    
    if (!queryId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: id'
      }, { status: 400 })
    }

    const client = getOracleMCPClient()
    
    // Ensure connection is initialized
    const initialized = await client.initialize()
    if (!initialized) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize database connection'
      }, { status: 500 })
    }

    const result = await client.executeMCPRequest('delete', {
      table: 'saved_queries',
      filters: { id: queryId }
    })
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Query deleted successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete query',
        details: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to delete query:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete query',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}