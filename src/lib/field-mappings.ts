/**
 * OCI Logging Analytics Field Mappings and Query Validation
 * Maps log fields to their correct names, types, and relationships
 */

export interface FieldDefinition {
  name: string
  displayName: string
  type: 'string' | 'number' | 'timestamp' | 'ip' | 'boolean'
  category: string
  description: string
  indexed: boolean
  searchable: boolean
  aggregatable: boolean
  examples?: string[]
  related?: string[]
}

export interface LogSource {
  name: string
  displayName: string
  fields: string[]
  commonQueries: string[]
  timeField: string
  primaryFields: string[]
}

// Standard OCI Logging Analytics field mappings
export const FIELD_MAPPINGS: Record<string, FieldDefinition> = {
  'Time': {
    name: 'Time',
    displayName: 'Timestamp',
    type: 'timestamp',
    category: 'Core',
    description: 'Event timestamp in UTC',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['2024-01-15T10:30:00Z'],
    related: ['datetime', 'eventTime']
  },
  "'Log Source'": {
    name: "'Log Source'",
    displayName: 'Log Source',
    type: 'string',
    category: 'Core',
    description: 'Source system generating the log',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['OCI Audit Logs', 'OCI VCN Flow Unified Schema Logs', 'Windows Security Events'],
    related: ['source', 'logSource']
  },
  "'Event Name'": {
    name: "'Event Name'",
    displayName: 'Event Name',
    type: 'string',
    category: 'Core',
    description: 'Name of the logged event or action',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['CreateUser', 'DeleteInstance', 'Login'],
    related: ['eventName', 'action', 'operation']
  },
  "'Message'": {
    name: "'Message'",
    displayName: 'Message',
    type: 'string',
    category: 'Core',
    description: 'Log message content',
    indexed: true,
    searchable: true,
    aggregatable: false,
    examples: ['User login successful', 'Access denied'],
    related: ['message', 'content', 'description']
  },
  "'Principal Name'": {
    name: "'Principal Name'",
    displayName: 'Principal Name',
    type: 'string',
    category: 'Identity',
    description: 'User or service principal performing the action',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['user@example.com', 'service-principal-001'],
    related: ['username', 'user', 'principal', 'caller']
  },
  "'User Name'": {
    name: "'User Name'",
    displayName: 'User Name',
    type: 'string',
    category: 'Identity',
    description: 'Username of the person performing the action',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['admin', 'john.doe', 'service-account'],
    related: ['username', 'login', 'account']
  },
  "'IP Address'": {
    name: "'IP Address'",
    displayName: 'IP Address',
    type: 'ip',
    category: 'Network',
    description: 'Source IP address',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['192.168.1.100', '10.0.0.5', '203.0.113.1'],
    related: ['sourceIp', 'clientIp', 'remoteAddr']
  },
  "'Source IP'": {
    name: "'Source IP'",
    displayName: 'Source IP',
    type: 'ip',
    category: 'Network',
    description: 'Source IP address for network flows',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['192.168.1.100', '10.0.0.5'],
    related: ['sourceIP', 'srcIP', 'clientIP']
  },
  "'Destination IP'": {
    name: "'Destination IP'",
    displayName: 'Destination IP',
    type: 'ip',
    category: 'Network',
    description: 'Destination IP address for network flows',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['192.168.1.200', '10.0.0.10'],
    related: ['destIP', 'targetIP', 'dstIP']
  },
  "'Client IP'": {
    name: "'Client IP'",
    displayName: 'Client IP',
    type: 'ip',
    category: 'Network',
    description: 'Client IP address (often for WAF logs)',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['203.0.113.1', '198.51.100.5'],
    related: ['clientIP', 'remoteIP']
  },
  "'Security Result'": {
    name: "'Security Result'",
    displayName: 'Security Result',
    type: 'string',
    category: 'Security',
    description: 'Result of security validation (success, failure, denied)',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['success', 'denied', 'failed', 'allowed'],
    related: ['result', 'status', 'outcome']
  },
  "'Action'": {
    name: "'Action'",
    displayName: 'Action',
    type: 'string',
    category: 'Security',
    description: 'Action taken (allow, deny, drop, etc.)',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['allow', 'deny', 'drop', 'accept', 'reject'],
    related: ['action', 'decision', 'verdict']
  },
  "'HTTP Method'": {
    name: "'HTTP Method'",
    displayName: 'HTTP Method',
    type: 'string',
    category: 'Web',
    description: 'HTTP request method',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    related: ['method', 'requestMethod', 'verb']
  },
  "'HTTP Status'": {
    name: "'HTTP Status'",
    displayName: 'HTTP Status',
    type: 'number',
    category: 'Web',
    description: 'HTTP response status code',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['200', '404', '500', '401', '403'],
    related: ['statusCode', 'responseCode', 'httpStatus']
  },
  "'User Agent'": {
    name: "'User Agent'",
    displayName: 'User Agent',
    type: 'string',
    category: 'Web',
    description: 'Client user agent string',
    indexed: true,
    searchable: true,
    aggregatable: false,
    examples: ['Mozilla/5.0...', 'curl/7.68.0'],
    related: ['userAgent', 'browser', 'client']
  },
  "'Compartment Name'": {
    name: "'Compartment Name'",
    displayName: 'Compartment Name',
    type: 'string',
    category: 'Infrastructure',
    description: 'OCI compartment name',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['root', 'production', 'development'],
    related: ['compartment', 'tenancy']
  },
  "'Availability Domain'": {
    name: "'Availability Domain'",
    displayName: 'Availability Domain',
    type: 'string',
    category: 'Infrastructure',
    description: 'OCI availability domain',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['AD-1', 'AD-2', 'AD-3'],
    related: ['ad', 'zone', 'region']
  },
  "'Resource Name'": {
    name: "'Resource Name'",
    displayName: 'Resource Name',
    type: 'string',
    category: 'Infrastructure',
    description: 'OCI resource name',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['my-instance', 'web-server-01'],
    related: ['resourceName', 'instanceName', 'serviceName']
  },
  "'Instance ID'": {
    name: "'Instance ID'",
    displayName: 'Instance ID',
    type: 'string',
    category: 'Infrastructure',
    description: 'OCI instance identifier',
    indexed: true,
    searchable: true,
    aggregatable: true,
    examples: ['ocid1.instance.oc1.iad.aaaaa...'],
    related: ['instanceId', 'resourceId', 'id']
  }
}

// Log source definitions with their available fields
export const LOG_SOURCES: Record<string, LogSource> = {
  'OCI Audit Logs': {
    name: 'OCI Audit Logs',
    displayName: 'OCI Audit Logs',
    timeField: 'Time',
    primaryFields: ["'Event Name'", "'Principal Name'", "'Compartment Name'", "'IP Address'"],
    fields: [
      'Time', "'Log Source'", "'Event Name'", "'Principal Name'", "'User Name'", 
      "'IP Address'", "'User Agent'", "'Compartment Name'", "'Availability Domain'", 
      "'Resource Name'", "'Instance ID'", "'Message'"
    ],
    commonQueries: [
      "Time > dateRelative(1h) | head 100",
      "'Event Name' contains 'Create' | head 50",
      "'Principal Name' != null | stats count by 'Principal Name' | sort count desc"
    ]
  },
  'OCI VCN Flow Unified Schema Logs': {
    name: 'OCI VCN Flow Unified Schema Logs',
    displayName: 'OCI VCN Flow Logs',
    timeField: 'Time',
    primaryFields: ["'Source IP'", "'Destination IP'", "'Action'", "'Protocol'"],
    fields: [
      'Time', "'Log Source'", "'Source IP'", "'Destination IP'", "'Action'", 
      "'Protocol'", "'Source Port'", "'Destination Port'", "'Bytes'", "'Packets'"
    ],
    commonQueries: [
      "'Action' = 'REJECT' | head 100",
      "'Source IP' != null | stats count by 'Source IP' | sort count desc",
      "Time > dateRelative(1h) and 'Action' in ('ACCEPT', 'REJECT') | head 50"
    ]
  },
  'OCI WAF Logs': {
    name: 'OCI WAF Logs',
    displayName: 'OCI WAF Logs',
    timeField: 'Time',
    primaryFields: ["'Client IP'", "'HTTP Method'", "'HTTP Status'", "'Action'"],
    fields: [
      'Time', "'Log Source'", "'Client IP'", "'HTTP Method'", "'HTTP Status'", 
      "'User Agent'", "'Action'", "'Request URL'", "'Rule ID'", "'Country Code'"
    ],
    commonQueries: [
      "'Action' = 'BLOCK' | head 100",
      "'HTTP Status' >= 400 | head 50",
      "'Client IP' != null | stats count by 'Client IP' | sort count desc"
    ]
  },
  'Windows Security Events': {
    name: 'Windows Security Events',
    displayName: 'Windows Security Events',
    timeField: 'Time',
    primaryFields: ["'Event Name'", "'User Name'", "'IP Address'", "'Security Result'"],
    fields: [
      'Time', "'Log Source'", "'Event Name'", "'User Name'", "'IP Address'", 
      "'Security Result'", "'Logon Type'", "'Process Name'", "'Message'"
    ],
    commonQueries: [
      "'Security Result' = 'failed' | head 100",
      "'Event Name' contains 'Logon' | head 50",
      "'User Name' != null | stats count by 'User Name' | sort count desc"
    ]
  }
}

// Query validation rules
export interface ValidationRule {
  type: 'syntax' | 'field' | 'operator' | 'value' | 'performance'
  message: string
  severity: 'error' | 'warning' | 'info'
  fix?: string
}

export function validateQuery(query: string): ValidationRule[] {
  const rules: ValidationRule[] = []
  
  // Basic syntax validation
  if (!query.trim()) {
    rules.push({
      type: 'syntax',
      message: 'Query cannot be empty',
      severity: 'error'
    })
    return rules
  }

  // Check for time filter
  if (!query.includes('Time >') && !query.includes('dateRelative')) {
    rules.push({
      type: 'performance',
      message: 'Query should include a time filter for better performance',
      severity: 'warning',
      fix: 'Add "Time > dateRelative(1h)" to your query'
    })
  }

  // Check for head/limit clause
  if (!query.includes('head ') && !query.includes('| limit ')) {
    rules.push({
      type: 'performance',
      message: 'Consider adding a limit to prevent large result sets',
      severity: 'info',
      fix: 'Add "| head 100" to limit results'
    })
  }

  // Check field names (fields with spaces should be quoted)
  const fieldPattern = /(\w+\s+\w+)(?!\s*['"'])/g
  const unquotedFields = query.match(fieldPattern)
  if (unquotedFields) {
    rules.push({
      type: 'field',
      message: 'Field names with spaces should be quoted',
      severity: 'error',
      fix: `Quote field names: ${unquotedFields.map(f => `'${f}'`).join(', ')}`
    })
  }

  // Check for proper operators
  const invalidOperators = ['like', 'contains'].filter(op => 
    query.includes(` ${op} `) && !query.includes(`${op}(`)
  )
  if (invalidOperators.length > 0) {
    rules.push({
      type: 'operator',
      message: 'Use function syntax for text operators',
      severity: 'warning',
      fix: `Use contains("value") instead of contains "value"`
    })
  }

  return rules
}

// Field relationship mapping
export function getRelatedFields(fieldName: string): string[] {
  const field = FIELD_MAPPINGS[fieldName]
  return field?.related || []
}

// Get available fields for a log source
export function getFieldsForSource(sourceName: string): FieldDefinition[] {
  const source = LOG_SOURCES[sourceName]
  if (!source) return []
  
  return source.fields.map(fieldName => FIELD_MAPPINGS[fieldName]).filter(Boolean)
}

// Suggest fields based on partial input
export function suggestFields(input: string): FieldDefinition[] {
  const inputLower = input.toLowerCase()
  return Object.values(FIELD_MAPPINGS).filter(field =>
    field.displayName.toLowerCase().includes(inputLower) ||
    field.name.toLowerCase().includes(inputLower) ||
    field.description.toLowerCase().includes(inputLower)
  ).slice(0, 10)
}

// Generate sample queries
export function generateSampleQuery(
  source: string,
  timeRange: number = 60,
  limit: number = 100
): string {
  const logSource = LOG_SOURCES[source]
  if (!logSource) {
    return `Time > dateRelative(${timeRange}m) | head ${limit}`
  }

  const primaryField = logSource.primaryFields[0]
  return `'Log Source' = '${source}' and Time > dateRelative(${timeRange}m) and ${primaryField} != null | head ${limit}`
}

// Time range utilities
export function formatTimeRange(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}d`
}

// Convert field display name to actual field name
export function getFieldName(displayName: string): string {
  for (const [fieldName, field] of Object.entries(FIELD_MAPPINGS)) {
    if (field.displayName === displayName) {
      return fieldName
    }
  }
  return displayName
}

// Get field definition by name or display name
export function getFieldDefinition(name: string): FieldDefinition | undefined {
  // Try exact match first
  if (FIELD_MAPPINGS[name]) {
    return FIELD_MAPPINGS[name]
  }
  
  // Try display name match
  for (const [fieldName, field] of Object.entries(FIELD_MAPPINGS)) {
    if (field.displayName === name) {
      return field
    }
  }
  
  return undefined
}