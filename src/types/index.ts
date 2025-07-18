// Security event types
export interface SecurityEvent {
  id: string
  timestamp: Date
  source: string
  type: SecurityEventType
  severity: Severity
  message: string
  details?: Record<string, any>
  sourceIp?: string
  destIp?: string
  user?: string
  action?: string
  location?: GeoLocation
}

export type SecurityEventType = 
  | 'failed_login'
  | 'privilege_escalation'
  | 'suspicious_network'
  | 'audit_change'
  | 'file_access_violation'
  | 'process_anomaly'
  | 'port_scan'
  | 'high_volume_request'

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface GeoLocation {
  lat: number
  lng: number
  country: string
  city?: string
  region?: string
}

// Query types
export interface QueryResult {
  id: string
  query: string
  timestamp: Date
  executionTime: number
  resultCount: number
  data: any[]
  partial?: boolean
}

export interface SecurityQuery {
  name: string
  description: string
  query: string
  riskLevel: Severity
  osTypes: string[]
}

// Threat map types
export interface ThreatMapData {
  source: GeoLocation & {
    ip: string
    threatLevel: Severity
  }
  destination: GeoLocation & {
    ip: string
    service?: string
  }
  attackType: string
  timestamp: Date
  blocked: boolean
}

// External threat map providers
export interface ThreatMapProvider {
  name: string
  url: string
  description: string
  featured: boolean
  iframe?: {
    width?: string
    height?: string
    sandbox?: string
  }
}

// Dashboard statistics
export interface DashboardStats {
  failedLogins: number
  privilegeEscalations: number
  blockedConnections: number
  criticalAlerts: number
  totalEvents: number
  uniqueSources: number
  systemHealth: number
  threatLevel: 'low' | 'medium' | 'high' | 'unknown'
  activeMonitoring: boolean
}

// Time range options
export interface TimeRange {
  label: string
  value: number // minutes
  shortLabel?: string
}

// Chart data types
export interface ChartDataPoint {
  x: number | string | Date
  y: number
  label?: string
}

export interface ChartSeries {
  name: string
  data: ChartDataPoint[]
  color?: string
}

// MCP Integration types
export interface MCPQueryRequest {
  tool: string
  query: string
  timeStart?: string
  timeEnd?: string
  maxCount?: number
  compartmentId?: string
}

export interface MCPQueryResponse {
  success: boolean
  data?: any
  error?: string
  executionTime?: number
}

// Natural Language Query types
export interface NLPQuery {
  originalText: string
  intent: string
  entities: {
    timeRange?: string
    eventType?: SecurityEventType
    location?: string
    severity?: Severity
    user?: string
    ip?: string
  }
  transformedQuery: string
}

// WebSocket message types
export interface WSMessage {
  type: 'threat_update' | 'stats_update' | 'alert' | 'query_result'
  data: any
  timestamp: Date
}

// Alert types
export interface Alert {
  id: string
  type: SecurityEventType
  severity: Severity
  message: string
  timestamp: Date
  acknowledged: boolean
  source?: string
  details?: Record<string, any>
}

// Filter options
export interface FilterOptions {
  severity?: Severity[]
  eventTypes?: SecurityEventType[]
  timeRange?: TimeRange
  sources?: string[]
  users?: string[]
}

// Export report types
export interface ExportOptions {
  format: 'pdf' | 'csv' | 'json'
  dateRange: {
    start: Date
    end: Date
  }
  includeCharts: boolean
  filters?: FilterOptions
}
