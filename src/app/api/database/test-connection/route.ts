import { NextRequest, NextResponse } from 'next/server'
import { getOracleMCPClient, testDatabaseConnection } from '@/lib/database/oracle-client'

// GET /api/database/test-connection - Test Oracle MCP database connection
export async function GET(request: NextRequest) {
  try {
    console.log('Testing Oracle MCP database connection...')
    
    const client = getOracleMCPClient()
    
    // Test basic initialization
    const initialized = await client.initialize()
    if (!initialized) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize MCP connection',
        status: 'connection_failed'
      }, { status: 500 })
    }

    // Test actual database connectivity
    const connectionTest = await testDatabaseConnection()
    
    if (connectionTest.success) {
      return NextResponse.json({
        success: true,
        message: 'Oracle MCP database connection successful',
        status: 'connected',
        connectionDetails: {
          server: process.env.ORACLE_MCP_SERVER || 'localhost',
          port: process.env.ORACLE_MCP_PORT || '8080',
          connectionString: process.env.ORACLE_CONNECTION_STRING?.replace(/\/.*@/, '/*****@') || 'Not configured',
          targetSchema: process.env.TARGET_SCHEMA || process.env.ORACLE_MCP_SCHEMA || 'LOGAN_USER',
          thickMode: process.env.THICK_MODE === '1' || process.env.ORACLE_THICK_MODE === 'true',
          secure: process.env.ORACLE_MCP_SECURE === 'true',
          executionTime: connectionTest.executionTime
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Database connection test failed',
        details: connectionTest.error,
        status: 'connection_test_failed'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Database connection test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during connection test',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 })
  }
}

// POST /api/database/test-connection - Test connection with custom MCP configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required configuration
    if (!body.mcpServer || (!body.connectionString && !body.database)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: mcpServer and either connectionString or database are required'
      }, { status: 400 })
    }

    console.log('Testing custom Oracle MCP configuration...')
    console.log('MCP Server:', body.mcpServer)
    console.log('Database:', body.database)
    
    // Create temporary MCP client with custom configuration
    const { OracleMCPClient } = await import('@/lib/database/oracle-client')
    
    const customMCPConfig = {
      id: 'test-connection',
      mcpServer: body.mcpServer,
      mcpPort: body.mcpPort || 8080,
      connectionString: body.connectionString || 
                       `${body.username || 'test_user'}/${body.password || 'password'}@${body.mcpServer}:${body.port || 1521}/${body.database}`,
      targetSchema: body.schema || body.targetSchema || 'LOGAN_USER',
      cacheDir: body.cacheDir || '.cache',
      thickMode: body.thickMode || false,
      secure: body.secure || false,
      timeout: body.timeout || 30000,
      maxConnections: body.maxConnections || 10
    }

    const testClient = new OracleMCPClient(customMCPConfig)
    
    // Test initialization
    const initialized = await testClient.initialize()
    if (!initialized) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize MCP connection with custom configuration',
        status: 'connection_failed'
      }, { status: 500 })
    }

    // Test connection
    const connectionTest = await testClient.testConnection()
    
    if (connectionTest.success) {
      return NextResponse.json({
        success: true,
        message: 'Custom Oracle MCP configuration test successful',
        status: 'connected',
        configTested: customMCPConfig,
        executionTime: connectionTest.executionTime
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Custom configuration connection test failed',
        details: connectionTest.error,
        status: 'connection_test_failed',
        configTested: customMCPConfig
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Custom configuration test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during custom configuration test',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 })
  }
}