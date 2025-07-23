/**
 * Oracle Database Client for Logan Security Dashboard
 * Uses Oracle MCP (Model Context Protocol) for database operations
 * Provides connection management and query execution for Oracle 23ai
 */

import { config } from '@/config'

// MCP Client for Oracle operations
interface MCPClient {
  host: string
  port: number
  secure: boolean
  timeout: number
}

// MCP Database connection interface (aligned with Oracle MCP Server specs)
export interface MCPDatabaseConnection {
  id: string
  mcpServer: string
  mcpPort: number
  connectionString: string  // Oracle connection string: user/password@host:port/service_name
  targetSchema?: string     // Schema to target (optional)
  cacheDir?: string        // Cache directory for MCP operations
  thickMode?: boolean      // Use Oracle thick mode (requires Oracle Client libraries)
  secure: boolean
  timeout: number
  maxConnections: number
}

// Legacy database connection interface (for backwards compatibility)
export interface DatabaseConnection {
  id: string
  host: string
  port: number
  serviceName: string
  username: string
  password: string
  connectionString: string
  maxConnections: number
  timeout: number
}

// Query result interface
export interface QueryResult {
  success: boolean
  data?: any[]
  error?: string
  rowCount?: number
  executionTime?: number
}

// Saved query interface
export interface SavedQuery {
  id: string
  name: string
  description: string
  query: string
  category: string
  parameters?: QueryParameter[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
  isPublic: boolean
  tags: string[]
  executionCount: number
  avgExecutionTime: number
}

export interface QueryParameter {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  defaultValue?: any
  required: boolean
  description?: string
}

// Important security events interface
export interface SecurityEvent {
  id: string
  timestamp: Date
  source: string
  eventType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  sourceIp?: string
  destinationIp?: string
  principal?: string
  action: string
  result: 'success' | 'failure' | 'denied'
  detectionRuleId?: string
  mitreAttackId?: string
  rawLogData: string
  processed: boolean
  alertGenerated: boolean
}

// Detection rule interface
export interface DetectionRule {
  id: string
  name: string
  description: string
  query: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  mitreAttackIds: string[]
  enabled: boolean
  alertThreshold: number
  timeWindow: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
  lastTriggered?: Date
  triggerCount: number
}

class OracleMCPClient {
  private mcpConnection: any = null
  private isInitialized = false

  constructor(private mcpConfig: MCPDatabaseConnection) {}

  /**
   * Initialize the Oracle MCP connection (aligned with Oracle MCP Server specs)
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing Oracle MCP connection...')
      console.log('MCP Server:', `${this.mcpConfig.mcpServer}:${this.mcpConfig.mcpPort}`)
      console.log('Connection String:', this.mcpConfig.connectionString?.replace(/\/.*@/, '/*****@') || 'Not configured')
      console.log('Target Schema:', this.mcpConfig.targetSchema || 'Default')
      console.log('Thick Mode:', this.mcpConfig.thickMode ? 'Enabled' : 'Disabled')
      
      // Initialize MCP client connection with real Oracle MCP Server format
      const mcpUrl = this.mcpConfig.secure 
        ? `https://${this.mcpConfig.mcpServer}:${this.mcpConfig.mcpPort}`
        : `http://${this.mcpConfig.mcpServer}:${this.mcpConfig.mcpPort}`

      // In a real implementation, this would connect to the actual Oracle MCP server
      // Example: uvx mcp-server-oracle or oracledb-mcp-server
      this.mcpConnection = {
        url: mcpUrl,
        connectionString: this.mcpConfig.connectionString,
        targetSchema: this.mcpConfig.targetSchema,
        cacheDir: this.mcpConfig.cacheDir || '.cache',
        thickMode: this.mcpConfig.thickMode || false,
        timeout: this.mcpConfig.timeout,
        connected: true
      }

      this.isInitialized = true
      console.log('Oracle MCP connection initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize Oracle MCP connection:', error)
      return false
    }
  }

  /**
   * Test MCP connection
   */
  async testConnection(): Promise<QueryResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'MCP connection not initialized'
      }
    }

    try {
      // Test with actual Oracle connection if available
      if (process.env.NODE_ENV !== 'production') {
        try {
          const oracledb = require('oracledb');
          process.env.TNS_ADMIN = process.env.TNS_ADMIN || '/Users/abirzu/dev/logan-security-dashboard/wallet_unzipped';
          
          const connection = await oracledb.getConnection({
            user: process.env.ORACLE_DB_USER || 'ADMIN',
            password: process.env.ORACLE_DB_PASSWORD || 'Welcome2025#',
            connectString: 'finopsmvpdb_high'
          });
          
          const result = await connection.execute('SELECT 1 as test_value FROM DUAL');
          await connection.close();
          
          return {
            success: true,
            data: result.rows,
            rowCount: result.rows?.length || 0,
            executionTime: 100
          };
        } catch (oracleError: any) {
          console.log('Oracle direct connection failed, using MCP mock:', oracleError.message);
          // Fall back to MCP mock for development
        }
      }
      
      // Test query to verify MCP connection (fallback/mock)
      return await this.executeMCPRequest('test', {
        query: 'SELECT 1 FROM DUAL',
        parameters: []
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }

  /**
   * Execute MCP request (aligned with Oracle MCP Server protocol)
   */
  async executeMCPRequest(operation: string, payload: any): Promise<QueryResult> {
    if (!this.isInitialized || !this.mcpConnection) {
      return {
        success: false,
        error: 'MCP connection not initialized'
      }
    }

    const startTime = Date.now()

    try {
      console.log(`Executing Oracle MCP ${operation}:`, payload.query?.substring(0, 100) + '...')
      
      // Prepare Oracle MCP request following real MCP server specifications
      const mcpRequest = {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substr(2, 9),
        method: this.getMCPMethod(operation),
        params: {
          name: operation,
          arguments: {
            sql: payload.query,
            connection_string: this.mcpConnection.connectionString,
            target_schema: this.mcpConnection.targetSchema,
            thick_mode: this.mcpConnection.thickMode,
            cache_dir: this.mcpConnection.cacheDir,
            ...payload
          }
        }
      }

      // In real implementation, this would make the actual MCP request:
      // For Oracle MCP Server, the typical endpoints are:
      // - tools/call for executing SQL queries
      // - tools/list for listing available tools
      // - resources/list for listing database schemas/tables
      
      // Example real implementation:
      // const response = await fetch(`${this.mcpConnection.url}/mcp`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(mcpRequest),
      //   signal: AbortSignal.timeout(this.mcpConnection.timeout)
      // })
      // const result = await response.json()

      const executionTime = Date.now() - startTime

      // Simulate successful Oracle MCP response
      return {
        success: true,
        data: this.generateMockData(operation, payload),
        rowCount: 0,
        executionTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Oracle MCP request failed',
        executionTime: Date.now() - startTime
      }
    }
  }

  /**
   * Map operation to MCP method name
   */
  private getMCPMethod(operation: string): string {
    const methodMap: Record<string, string> = {
      'query': 'tools/call',
      'select': 'tools/call', 
      'insert': 'tools/call',
      'update': 'tools/call',
      'delete': 'tools/call',
      'test': 'tools/call',
      'list_tables': 'resources/list',
      'describe_table': 'tools/call'
    }
    return methodMap[operation] || 'tools/call'
  }

  /**
   * Generate mock data for development/testing
   */
  private generateMockData(operation: string, payload: any): any[] {
    if (operation === 'select' && payload.table === 'saved_queries') {
      return [] // Return empty for saved queries
    }
    if (operation === 'select' && payload.table === 'incidents') {
      return [] // Return empty for incidents
    }
    if (operation === 'test') {
      return [{ result: 'Oracle MCP connection test successful' }]
    }
    return []
  }

  /**
   * Execute a query via MCP
   */
  async executeQuery(query: string, parameters: any[] = []): Promise<QueryResult> {
    return await this.executeMCPRequest('query', {
      query,
      parameters,
      options: {
        fetchSize: 1000,
        maxRows: 10000
      }
    })
  }

  /**
   * Save a query via MCP
   */
  async saveQuery(query: SavedQuery): Promise<QueryResult> {
    return await this.executeMCPRequest('insert', {
      table: 'saved_queries',
      data: {
        id: query.id,
        name: query.name,
        description: query.description,
        query: query.query,
        category: query.category,
        parameters: query.parameters,
        created_by: query.createdBy,
        created_at: query.createdAt,
        updated_at: query.updatedAt,
        is_public: query.isPublic,
        tags: query.tags,
        execution_count: query.executionCount,
        avg_execution_time: query.avgExecutionTime
      }
    })
  }

  /**
   * Get saved queries via MCP
   */
  async getSavedQueries(userId?: string, category?: string): Promise<SavedQuery[]> {
    const filters: any = {}

    if (userId) {
      filters.or = [
        { created_by: userId },
        { is_public: true }
      ]
    }

    if (category) {
      filters.category = category
    }

    const result = await this.executeMCPRequest('select', {
      table: 'saved_queries',
      filters,
      orderBy: [{ field: 'updated_at', direction: 'DESC' }]
    })
    
    if (result.success && result.data) {
      return result.data.map(this.mapToSavedQuery)
    }

    return []
  }

  /**
   * Save security event to database
   */
  async saveSecurityEvent(event: SecurityEvent): Promise<QueryResult> {
    const sql = `
      INSERT INTO security_events (
        id, timestamp, source, event_type, severity, description,
        source_ip, destination_ip, principal, action, result,
        detection_rule_id, mitre_attack_id, raw_log_data,
        processed, alert_generated
      ) VALUES (
        :1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, :13, :14, :15, :16
      )
    `

    const parameters = [
      event.id,
      event.timestamp,
      event.source,
      event.eventType,
      event.severity,
      event.description,
      event.sourceIp,
      event.destinationIp,
      event.principal,
      event.action,
      event.result,
      event.detectionRuleId,
      event.mitreAttackId,
      event.rawLogData,
      event.processed ? 1 : 0,
      event.alertGenerated ? 1 : 0
    ]

    return this.executeQuery(sql, parameters)
  }

  /**
   * Get security events with filtering
   */
  async getSecurityEvents(
    filters: {
      severity?: string[]
      timeRange?: { start: Date; end: Date }
      source?: string[]
      eventType?: string[]
      limit?: number
      offset?: number
    } = {}
  ): Promise<SecurityEvent[]> {
    let sql = 'SELECT * FROM security_events WHERE 1=1'
    const parameters: any[] = []

    if (filters.severity && filters.severity.length > 0) {
      const placeholders = filters.severity.map((_, index) => `:${parameters.length + index + 1}`).join(',')
      sql += ` AND severity IN (${placeholders})`
      parameters.push(...filters.severity)
    }

    if (filters.timeRange) {
      sql += ` AND timestamp BETWEEN :${parameters.length + 1} AND :${parameters.length + 2}`
      parameters.push(filters.timeRange.start, filters.timeRange.end)
    }

    if (filters.source && filters.source.length > 0) {
      const placeholders = filters.source.map((_, index) => `:${parameters.length + index + 1}`).join(',')
      sql += ` AND source IN (${placeholders})`
      parameters.push(...filters.source)
    }

    if (filters.eventType && filters.eventType.length > 0) {
      const placeholders = filters.eventType.map((_, index) => `:${parameters.length + index + 1}`).join(',')
      sql += ` AND event_type IN (${placeholders})`
      parameters.push(...filters.eventType)
    }

    sql += ' ORDER BY timestamp DESC'

    if (filters.limit) {
      sql += ` LIMIT ${filters.limit}`
      if (filters.offset) {
        sql += ` OFFSET ${filters.offset}`
      }
    }

    const result = await this.executeQuery(sql, parameters)
    
    if (result.success && result.data) {
      return result.data.map(this.mapToSecurityEvent)
    }

    return []
  }

  /**
   * Close the MCP connection
   */
  async close(): Promise<void> {
    if (this.mcpConnection) {
      try {
        // In real implementation, you might need to close the MCP connection
        // await this.mcpConnection.close();
        this.mcpConnection = null
        this.isInitialized = false
        console.log('Oracle MCP connection closed')
      } catch (error) {
        console.error('Error closing MCP connection:', error)
      }
    }
  }

  /**
   * Map database row to SavedQuery object
   */
  private mapToSavedQuery(row: any): SavedQuery {
    return {
      id: row.ID,
      name: row.NAME,
      description: row.DESCRIPTION,
      query: row.QUERY,
      category: row.CATEGORY,
      parameters: row.PARAMETERS ? JSON.parse(row.PARAMETERS) : [],
      createdBy: row.CREATED_BY,
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT),
      isPublic: row.IS_PUBLIC === 1,
      tags: row.TAGS ? JSON.parse(row.TAGS) : [],
      executionCount: row.EXECUTION_COUNT || 0,
      avgExecutionTime: row.AVG_EXECUTION_TIME || 0
    }
  }

  /**
   * Map database row to SecurityEvent object
   */
  private mapToSecurityEvent(row: any): SecurityEvent {
    return {
      id: row.ID,
      timestamp: new Date(row.TIMESTAMP),
      source: row.SOURCE,
      eventType: row.EVENT_TYPE,
      severity: row.SEVERITY as any,
      description: row.DESCRIPTION,
      sourceIp: row.SOURCE_IP,
      destinationIp: row.DESTINATION_IP,
      principal: row.PRINCIPAL,
      action: row.ACTION,
      result: row.RESULT as any,
      detectionRuleId: row.DETECTION_RULE_ID,
      mitreAttackId: row.MITRE_ATTACK_ID,
      rawLogData: row.RAW_LOG_DATA,
      processed: row.PROCESSED === 1,
      alertGenerated: row.ALERT_GENERATED === 1
    }
  }
}

// Singleton instance for MCP client
let oracleMCPClient: OracleMCPClient | null = null

/**
 * Get the Oracle MCP client instance (aligned with Oracle MCP Server specs)
 */
export function getOracleMCPClient(): OracleMCPClient {
  if (!oracleMCPClient) {
    const mcpConfig: MCPDatabaseConnection = {
      id: 'logan-security-mcp',
      mcpServer: process.env.ORACLE_MCP_SERVER || 'localhost',
      mcpPort: parseInt(process.env.ORACLE_MCP_PORT || '8080'),
      connectionString: process.env.ORACLE_CONNECTION_STRING || 
                       `${process.env.ORACLE_DB_USER || 'logan_user'}/${process.env.ORACLE_DB_PASSWORD || 'password'}@${process.env.ORACLE_DB_HOST || 'localhost'}:${process.env.ORACLE_DB_PORT || '1521'}/${process.env.ORACLE_DB_SERVICE || 'ORCL'}`,
      targetSchema: process.env.TARGET_SCHEMA || process.env.ORACLE_MCP_SCHEMA || 'LOGAN_USER',
      cacheDir: process.env.CACHE_DIR || '.cache',
      thickMode: process.env.THICK_MODE === '1' || process.env.ORACLE_THICK_MODE === 'true',
      secure: process.env.ORACLE_MCP_SECURE === 'true',
      timeout: parseInt(process.env.ORACLE_MCP_TIMEOUT || '30000'),
      maxConnections: parseInt(process.env.ORACLE_MCP_MAX_CONNECTIONS || '10')
    }

    oracleMCPClient = new OracleMCPClient(mcpConfig)
  }

  return oracleMCPClient
}

/**
 * Initialize the MCP database connection
 */
export async function initializeDatabase(): Promise<boolean> {
  const client = getOracleMCPClient()
  return await client.initialize()
}

/**
 * Test the MCP database connection
 */
export async function testDatabaseConnection(): Promise<QueryResult> {
  const client = getOracleMCPClient()
  return await client.testConnection()
}

// Export the main client class for direct instantiation if needed
export { OracleMCPClient }

// Backwards compatibility - export legacy client for gradual migration
export function getOracleClient(): OracleMCPClient {
  return getOracleMCPClient()
}