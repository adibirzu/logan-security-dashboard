import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { MCPQueryRequest, MCPQueryResponse } from '@/types'

export class MCPClient {
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private serverPath: string
  private maxRetries: number = 3
  private baseDelay: number = 1000 // 1 second
  private maxDelay: number = 30000 // 30 seconds
  private connectionAttempts: number = 0
  private isConnecting: boolean = false

  constructor(serverPath: string = '/Users/abirzu/Documents/Cline/MCP/logan-fastmcp/logan_mcp.py') {
    this.serverPath = process.env.LOGAN_MCP_SERVER_PATH || serverPath
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private exponentialBackoff(attempt: number): number {
    const delay = this.baseDelay * Math.pow(2, attempt)
    return Math.min(delay, this.maxDelay)
  }

  private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation()
        if (attempt > 0) {
          console.log(`${operationName} succeeded on attempt ${attempt + 1}`)
        }
        return result
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.maxRetries) {
          const delay = this.exponentialBackoff(attempt)
          console.warn(`${operationName} attempt ${attempt + 1} failed: ${error}. Retrying in ${delay}ms`)
          await this.sleep(delay)
        } else {
          console.error(`${operationName} failed after ${this.maxRetries + 1} attempts: ${error}`)
        }
      }
    }
    
    throw lastError || new Error(`${operationName} failed after ${this.maxRetries + 1} attempts`)
  }

  async connect(): Promise<void> {
    if (this.isConnecting) {
      throw new Error('Connection already in progress')
    }
    
    this.isConnecting = true
    
    try {
      await this.withRetry(async () => {
        // Create stdio transport to communicate with Python MCP server
        this.transport = new StdioClientTransport({
          command: 'python3',
          args: [this.serverPath],
          env: {
            ...process.env,
            LOGAN_REGION: process.env.NEXT_PUBLIC_LOGAN_REGION || 'eu-frankfurt-1',
            LOGAN_COMPARTMENT_ID: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID || '',
            DEBUG: 'false'
          }
        })

        this.client = new Client(
          {
            name: 'logan-security-dashboard',
            version: '1.0.0'
          },
          {
            capabilities: {}
          }
        )

        await this.client.connect(this.transport)
        this.connectionAttempts = 0
        console.log('Connected to Logan FastMCP server')
      }, 'MCP server connection')
    } finally {
      this.isConnecting = false
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
    }
    if (this.transport) {
      await this.transport.close()
      this.transport = null
    }
  }

  async searchLogs(query: string, options?: {
    timePeriodMinutes?: number
    compartmentId?: string
  }): Promise<MCPQueryResponse> {
    if (!this.client) {
      await this.connect()
    }

    return this.withRetry(async () => {
      if (!this.client) {
        throw new Error('MCP client not connected')
      }

      const result = await this.client.callTool({
        name: 'search_logs',
        arguments: {
          query,
          time_period_minutes: options?.timePeriodMinutes || 1440,
          compartment_id: options?.compartmentId
        }
      })

      const content = (result.content as any)?.[0]
      if (content?.type === 'text') {
        const data = JSON.parse(content.text)
        
        // Handle enhanced response format
        if (data.status === 'success') {
          return {
            success: true,
            data: data.data?.items || data.results || [],
            executionTime: data.data?.query_execution_time_ms || data.execution_time,
            queryUsed: data.query_used,
            timeFilterMethod: data.time_filter_method,
            timeRange: data.time_range,
            warning: data.warning
          }
        } else {
          return {
            success: false,
            error: data.error || 'Query failed'
          }
        }
      }

      return {
        success: false,
        error: 'Invalid response format'
      }
    }, 'search logs')
  }

  async listLogSources(timePeriodMinutes: number = 1440): Promise<any[]> {
    if (!this.client) {
      throw new Error('MCP client not connected')
    }

    try {
      const result = await this.client.callTool({
        name: 'list_log_sources',
        arguments: {
          time_period_minutes: timePeriodMinutes
        }
      })
      const content = (result.content as any)?.[0]
      
      if (content?.type === 'text') {
        const data = JSON.parse(content.text)
        return data.sources || []
      }
      
      return []
    } catch (error) {
      console.error('Failed to list log sources:', error)
      return []
    }
  }

  async runSecurityCheck(checkType: string, timePeriodMinutes: number = 60): Promise<any> {
    if (!this.client) {
      throw new Error('MCP client not connected')
    }

    try {
      const result = await this.client.callTool({
        name: 'run_security_check',
        arguments: {
          check_type: checkType,
          time_period_minutes: timePeriodMinutes
        }
      })
      const content = (result.content as any)?.[0]
      
      if (content?.type === 'text') {
        return JSON.parse(content.text)
      }
      
      return null
    } catch (error) {
      console.error('Failed to run security check:', error)
      return null
    }
  }

  async getSecurityEvents(severity: string = 'all', timePeriodMinutes: number = 60): Promise<any[]> {
    if (!this.client) {
      throw new Error('MCP client not connected')
    }

    try {
      const result = await this.client.callTool({
        name: 'get_security_events',
        arguments: {
          severity,
          time_period_minutes: timePeriodMinutes
        }
      })
      const content = (result.content as any)?.[0]
      
      if (content?.type === 'text') {
        const data = JSON.parse(content.text)
        return data.events || []
      }
      
      return []
    } catch (error) {
      console.error('Failed to get security events:', error)
      return []
    }
  }

  async listCompartments(): Promise<any[]> {
    if (!this.client) {
      throw new Error('MCP client not connected')
    }

    try {
      const result = await this.client.callTool({
        name: 'list_compartments',
        arguments: {}
      })
      const content = (result.content as any)?.[0]
      
      if (content?.type === 'text') {
        const data = JSON.parse(content.text)
        return data.compartments || []
      }
      
      return []
    } catch (error) {
      console.error('Failed to list compartments:', error)
      return []
    }
  }

  async testConnection(region?: string, compartmentId?: string): Promise<any> {
    if (!this.client) {
      await this.connect()
    }

    return this.withRetry(async () => {
      if (!this.client) {
        throw new Error('MCP client not connected')
      }

      const result = await this.client.callTool({
        name: 'test_connection',
        arguments: {
          region,
          compartment_id: compartmentId
        }
      })
      const content = (result.content as any)?.[0]
      
      if (content?.type === 'text') {
        return JSON.parse(content.text)
      }
      
      return {
        success: false,
        error: 'Invalid response format'
      }
    }, 'test connection')
  }

  async getHealthStatus(): Promise<any> {
    try {
      const connectionTest = await this.testConnection()
      return {
        connected: connectionTest?.success || false,
        server_path: this.serverPath,
        connection_attempts: this.connectionAttempts,
        last_error: connectionTest?.error || null
      }
    } catch (error) {
      return {
        connected: false,
        server_path: this.serverPath,
        connection_attempts: this.connectionAttempts,
        last_error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async runSecurityWorkflow(osType: string = 'cloud', timePeriodMinutes: number = 60): Promise<any> {
    if (!this.client) {
      throw new Error('MCP client not connected')
    }

    try {
      const result = await this.client.callTool({
        name: 'run_security_workflow',
        arguments: {
          os_type: osType,
          time_period_minutes: timePeriodMinutes
        }
      })
      const content = (result.content as any)?.[0]
      
      if (content?.type === 'text') {
        return JSON.parse(content.text)
      }
      
      return null
    } catch (error) {
      console.error('Failed to run security workflow:', error)
      return null
    }
  }

  async getAvailableSecurityChecks(): Promise<any[]> {
    if (!this.client) {
      throw new Error('MCP client not connected')
    }

    try {
      const result = await this.client.callTool({
        name: 'get_available_security_checks',
        arguments: {}
      })
      const content = (result.content as any)?.[0]
      
      if (content?.type === 'text') {
        const data = JSON.parse(content.text)
        return data.checks || []
      }
      
      return []
    } catch (error) {
      console.error('Failed to get available security checks:', error)
      return []
    }
  }

  // Legacy methods for backward compatibility
  async listLogGroups(): Promise<any[]> {
    // Redirect to listLogSources as the new server doesn't have log groups
    return this.listLogSources()
  }

  async listSources(): Promise<any[]> {
    // Redirect to listLogSources as the new server doesn't have separate sources
    return this.listLogSources()
  }
}
