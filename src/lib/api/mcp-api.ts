import { MCPQueryResponse } from '@/types'

// API wrapper for MCP operations through backend
export class MCPApi {
  private baseUrl: string

  constructor(baseUrl: string = '/api/mcp') {
    this.baseUrl = baseUrl
  }

  private getAbsoluteUrl(endpoint: string): string {
    // Check if we're in a server context (no window object)
    const isServer = typeof window === 'undefined';
    console.log('MCPApi: getAbsoluteUrl called with endpoint:', endpoint);
    console.log('MCPApi: isServer:', isServer);
    
    if (isServer) {
      // Server-side: construct absolute URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const fullUrl = `${baseUrl}${this.baseUrl}${endpoint}`;
      console.log('MCPApi: Server-side URL constructed:', fullUrl);
      return fullUrl;
    } else {
      // Client-side: use relative URL
      const relativeUrl = `${this.baseUrl}${endpoint}`;
      console.log('MCPApi: Client-side URL constructed:', relativeUrl);
      return relativeUrl;
    }
  }

  async searchLogs(query: string, options?: {
    timeStart?: string
    timeEnd?: string
    maxCount?: number
    timeRange?: number
    bypassValidation?: boolean
    validateOnly?: boolean
  }): Promise<MCPQueryResponse> {
    try {
      const url = this.getAbsoluteUrl('/search');
      console.log('MCPApi: Attempting to fetch URL:', url);
      console.log('MCPApi: Request payload:', { query, ...options });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          timeStart: options?.timeStart,
          timeEnd: options?.timeEnd,
          maxCount: options?.maxCount || 100,
          timeRange: options?.timeRange,
          bypassValidation: options?.bypassValidation || false,
          validateOnly: options?.validateOnly || false
        })
      })

      console.log('MCPApi: Response status:', response.status);
      console.log('MCPApi: Response OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('MCPApi: Error response text:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json()
      console.log('MCPApi: Successful response data:', data);
      return {
        success: true,
        data: data.results || [],
        executionTime: data.executionTime
      }
    } catch (error) {
      console.error('MCPApi: Error in searchLogs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async listLogGroups(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/log-groups`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.logGroups || []
    } catch (error) {
      console.error('Failed to list log groups:', error)
      return []
    }
  }

  async listSources(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sources`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.sources || []
    } catch (error) {
      console.error('Failed to list sources:', error)
      return []
    }
  }

  async getSecurityEvents(options?: {
    eventType?: string
    severity?: string
    timeRange?: number
  }): Promise<any[]> {
    try {
      const params = new URLSearchParams()
      if (options?.eventType) params.append('eventType', options.eventType)
      if (options?.severity) params.append('severity', options.severity)
      if (options?.timeRange) params.append('timeRange', options.timeRange.toString())

      const response = await fetch(`${this.baseUrl}/security-events?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.events || []
    } catch (error) {
      console.error('Failed to get security events:', error)
      return []
    }
  }

  async getDashboardStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard-stats`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to get dashboard stats:', error)
      return null
    }
  }
}

// Singleton instance
let mcpApiInstance: MCPApi | null = null

export function getMCPApi(): MCPApi {
  if (!mcpApiInstance) {
    mcpApiInstance = new MCPApi()
  }
  return mcpApiInstance
}
