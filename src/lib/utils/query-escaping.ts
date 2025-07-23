/**
 * OCI Logging Analytics Query Escaping Utilities
 * Provides functions to safely escape values in OCI queries
 */

/**
 * Escape special characters in query values for OCI Logging Analytics
 * @param value - The value to escape
 * @returns Escaped value safe for use in OCI queries
 */
export function escapeQueryValue(value: string): string {
  if (typeof value !== 'string') {
    value = String(value)
  }

  return value
    .replace(/\\/g, '\\\\')  // Escape backslashes first (must be first!)
    .replace(/'/g, "\\'")    // Escape single quotes
    .replace(/"/g, '\\"')    // Escape double quotes
}

/**
 * Escape a field name for OCI Logging Analytics
 * Field names with spaces need to be wrapped in single quotes
 * @param fieldName - The field name to escape
 * @returns Properly formatted field name
 */
export function escapeFieldName(fieldName: string): string {
  // If field name contains spaces, wrap in single quotes
  if (fieldName.includes(' ')) {
    return `'${fieldName}'`
  }
  return fieldName
}

/**
 * Create a safe string literal for OCI queries
 * @param value - The value to make into a string literal
 * @returns Properly escaped and quoted string literal
 */
export function createStringLiteral(value: string): string {
  return `'${escapeQueryValue(value)}'`
}

/**
 * Create a safe contains() function call
 * @param field - The field to search in
 * @param value - The value to search for
 * @returns Properly formatted contains() call
 */
export function createContainsCall(field: string, value: string): string {
  const escapedField = escapeFieldName(field)
  const escapedValue = escapeQueryValue(value)
  return `${escapedField} contains('${escapedValue}')`
}

/**
 * Create a safe equality comparison
 * @param field - The field to compare
 * @param value - The value to compare against
 * @param operator - The comparison operator (=, !=, etc.)
 * @returns Properly formatted comparison
 */
export function createComparison(field: string, value: string, operator: string = '='): string {
  const escapedField = escapeFieldName(field)
  const escapedValue = createStringLiteral(value)
  return `${escapedField} ${operator} ${escapedValue}`
}

/**
 * Common Windows system accounts that need special escaping
 */
export const WINDOWS_SYSTEM_ACCOUNTS = {
  'NT_AUTHORITY_SYSTEM': 'NT AUTHORITY\\\\SYSTEM',
  'NT_AUTHORITY_LOCAL_SERVICE': 'NT AUTHORITY\\\\LOCAL SERVICE',
  'NT_AUTHORITY_NETWORK_SERVICE': 'NT AUTHORITY\\\\NETWORK SERVICE',
} as const

/**
 * Create a safe query condition excluding Windows system accounts
 * @param userField - The user field name (usually 'User' or 'Principal Name')
 * @returns Query condition that excludes common system accounts
 */
export function excludeSystemAccounts(userField: string = 'User'): string {
  const escapedField = escapeFieldName(userField)
  const conditions = Object.values(WINDOWS_SYSTEM_ACCOUNTS).map(account => 
    `${escapedField} != '${account}'`
  )
  return conditions.join(' and ')
}

/**
 * Validate that a query value is safe (basic validation)
 * @param value - The value to validate
 * @returns true if the value appears safe
 */
export function isQueryValueSafe(value: string): boolean {
  // Check for obviously dangerous patterns
  const dangerousPatterns = [
    /;\s*drop\s+/i,           // SQL injection attempts
    /;\s*delete\s+/i,         // SQL injection attempts
    /\|\s*rm\s+/i,           // Shell command injection
    /\|\s*curl\s+/i,         // Shell command injection
    /\|\s*wget\s+/i,         // Shell command injection
  ]

  return !dangerousPatterns.some(pattern => pattern.test(value))
}

/**
 * Build a safe time filter for OCI queries
 * @param minutes - Number of minutes to look back
 * @returns Time filter string
 */
export function createTimeFilter(minutes: number): string {
  if (minutes <= 0) {
    return ''
  }
  return `Time > dateRelative(${minutes}m)`
}

/**
 * Example usage and tests
 */
export const EXAMPLES = {
  // Safe user exclusion
  excludeSystemUser: excludeSystemAccounts('User'),
  
  // Safe string searches
  searchForFailedLogin: createContainsCall('Log Entry', 'failed login'),
  
  // Safe comparisons
  compareLogSource: createComparison('Log Source', 'Windows Security Events'),
  
  // Combined example
  secureQuery: [
    createTimeFilter(1440),
    createComparison('Log Source', 'Windows Sysmon Events'),
    excludeSystemAccounts('User'),
    createContainsCall('Event Name', 'process creation')
  ].filter(Boolean).join(' and ')
}