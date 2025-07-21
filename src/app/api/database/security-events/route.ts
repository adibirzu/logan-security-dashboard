import { NextRequest, NextResponse } from 'next/server'
import { getOracleMCPClient, SecurityEvent } from '@/lib/database/oracle-client'
import { v4 as uuidv4 } from 'uuid'

// GET /api/database/security-events - Retrieve security events
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Parse query parameters
    const severity = searchParams.get('severity')?.split(',') || undefined
    const source = searchParams.get('source')?.split(',') || undefined
    const eventType = searchParams.get('eventType')?.split(',') || undefined
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build time range filter
    let timeRange: { start: Date; end: Date } | undefined
    if (startTime && endTime) {
      timeRange = {
        start: new Date(startTime),
        end: new Date(endTime)
      }
    }

    const filters = {
      severity,
      source,
      eventType,
      timeRange,
      limit,
      offset
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

    const events = await client.getSecurityEvents(filters)
    
    return NextResponse.json({
      success: true,
      data: events,
      count: events.length,
      filters
    })
  } catch (error) {
    console.error('Failed to retrieve security events:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve security events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/database/security-events - Create a new security event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.source || !body.eventType || !body.severity || !body.description || !body.action || !body.result) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: source, eventType, severity, description, action, and result are required'
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

    // Create SecurityEvent object
    const securityEvent: SecurityEvent = {
      id: body.id || uuidv4(),
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      source: body.source,
      eventType: body.eventType,
      severity: body.severity,
      description: body.description,
      sourceIp: body.sourceIp || undefined,
      destinationIp: body.destinationIp || undefined,
      principal: body.principal || undefined,
      action: body.action,
      result: body.result,
      detectionRuleId: body.detectionRuleId || undefined,
      mitreAttackId: body.mitreAttackId || undefined,
      rawLogData: body.rawLogData || JSON.stringify(body),
      processed: body.processed || false,
      alertGenerated: body.alertGenerated || false
    }

    const result = await client.saveSecurityEvent(securityEvent)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: securityEvent,
        message: 'Security event created successfully'
      }, { status: 201 })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to create security event',
        details: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to create security event:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create security event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/database/security-events - Update a security event
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

    // Update security event via MCP
    const updateData = {
      ...body,
      timestamp: body.timestamp ? new Date(body.timestamp) : undefined
    }

    const result = await client.executeMCPRequest('update', {
      table: 'security_events',
      filters: { id: body.id },
      data: updateData
    })
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: updateData,
        message: 'Security event updated successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update security event',
        details: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to update security event:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update security event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Statistics endpoint for security events
export async function OPTIONS(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || '24h'
    
    const client = getOracleMCPClient()
    
    // Ensure connection is initialized
    const initialized = await client.initialize()
    if (!initialized) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize database connection'
      }, { status: 500 })
    }

    // Get statistics via MCP aggregation queries
    const stats = await client.executeMCPRequest('aggregate', {
      table: 'security_events',
      aggregations: [
        { field: 'severity', operation: 'count', groupBy: 'severity' },
        { field: 'source', operation: 'count', groupBy: 'source' },
        { field: 'event_type', operation: 'count', groupBy: 'event_type' },
        { field: '*', operation: 'count' }
      ],
      filters: {
        timestamp: {
          gte: new Date(Date.now() - getTimeRangeInMs(timeRange))
        }
      }
    })
    
    if (stats.success) {
      return NextResponse.json({
        success: true,
        data: stats.data,
        timeRange
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve statistics',
        details: stats.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to retrieve statistics:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to convert time range to milliseconds
function getTimeRangeInMs(timeRange: string): number {
  const ranges: { [key: string]: number } = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }
  return ranges[timeRange] || ranges['24h']
}