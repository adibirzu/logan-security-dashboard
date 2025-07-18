import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get health status from various components
    const healthStatus = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      components: {
        mcp_server: {
          status: 'unknown',
          last_check: null as string | null,
          error: null as string | null
        },
        oci_connection: {
          status: 'unknown',
          last_check: null as string | null,
          error: null as string | null
        },
        dashboard: {
          status: 'healthy',
          last_check: new Date().toISOString(),
          error: null as string | null
        }
      },
      environment: {
        region: process.env.NEXT_PUBLIC_LOGAN_REGION || 'unknown',
        compartment_configured: !!(process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID),
        server_path: process.env.LOGAN_MCP_SERVER_PATH || 'default'
      }
    }

    // Test MCP server connection
    try {
      const { MCPClient } = await import('@/lib/mcp-client/mcp-client')
      const client = new MCPClient()
      
      const connectionTest = await client.testConnection()
      
      if (connectionTest?.success) {
        healthStatus.components.mcp_server.status = 'healthy'
        healthStatus.components.mcp_server.last_check = new Date().toISOString()
        
        // If MCP server is healthy, OCI connection is likely healthy too
        healthStatus.components.oci_connection.status = 'healthy'
        healthStatus.components.oci_connection.last_check = new Date().toISOString()
      } else {
        healthStatus.components.mcp_server.status = 'unhealthy'
        healthStatus.components.mcp_server.error = connectionTest?.error || 'Connection failed'
        healthStatus.components.oci_connection.status = 'unhealthy'
        healthStatus.components.oci_connection.error = 'MCP server connection failed'
        healthStatus.status = 'degraded'
      }
      
      await client.disconnect()
    } catch (error) {
      healthStatus.components.mcp_server.status = 'unhealthy'
      healthStatus.components.mcp_server.error = error instanceof Error ? error.message : 'Unknown error'
      healthStatus.components.oci_connection.status = 'unhealthy'
      healthStatus.components.oci_connection.error = 'MCP server unavailable'
      healthStatus.status = 'degraded'
    }

    return NextResponse.json(healthStatus)
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      components: {
        mcp_server: { status: 'unknown', error: 'Health check failed' },
        oci_connection: { status: 'unknown', error: 'Health check failed' },
        dashboard: { status: 'unhealthy', error: 'Health check failed' }
      }
    }, { status: 500 })
  }
}