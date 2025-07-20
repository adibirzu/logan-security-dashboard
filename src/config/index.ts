/**
 * Configuration management for Logan Security Dashboard
 * Centralizes all configuration settings with environment variable support
 */

export interface DatabaseConfig {
  connectionString?: string
  maxConnections: number
  timeout: number
}

export interface OCIConfig {
  region: string
  compartmentId: string
  tenancyId?: string
  configFile?: string
  profile: string
  timeout: number
}

export interface APIConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
}

export interface SecurityConfig {
  encryptionKey?: string
  sessionTimeout: number
  maxLoginAttempts: number
  passwordPolicy: {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
  }
}

export interface FeatureFlags {
  threatIntelligence: boolean
  ritaAnalysis: boolean
  mitreAttack: boolean
  incidentResponse: boolean
  queryTemplates: boolean
  securityRules: boolean
  pluginSystem: boolean
  advancedAnalytics: boolean
}

export interface UIConfig {
  theme: 'light' | 'dark' | 'system'
  sidebarCollapsed: boolean
  defaultTimeRange: string
  maxQueryResults: number
  refreshInterval: number
  notifications: {
    enabled: boolean
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
    duration: number
  }
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error'
  enableConsole: boolean
  enableFile: boolean
  filePath?: string
  maxFileSize: string
  maxFiles: number
}

export interface AppConfig {
  app: {
    name: string
    version: string
    environment: 'development' | 'staging' | 'production'
    port: number
    baseUrl: string
  }
  database: DatabaseConfig
  oci: OCIConfig
  api: APIConfig
  security: SecurityConfig
  features: FeatureFlags
  ui: UIConfig
  logging: LoggingConfig
}

// Helper function to safely get environment variables
const getEnvVar = (key: string, defaultValue?: string): string | undefined => {
  if (typeof window !== 'undefined') {
    // Client-side: Don't expose server environment variables
    return defaultValue
  }
  return process.env[key] || defaultValue
}

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = getEnvVar(key)
  if (value === undefined) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = getEnvVar(key)
  if (value === undefined) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

// Main configuration object
export const config: AppConfig = {
  app: {
    name: getEnvVar('NEXT_PUBLIC_APP_NAME', 'Logan Security Dashboard') || 'Logan Security Dashboard',
    version: getEnvVar('NEXT_PUBLIC_APP_VERSION', '1.0.0') || '1.0.0',
    environment: (getEnvVar('NODE_ENV', 'development') as AppConfig['app']['environment']) || 'development',
    port: getEnvNumber('PORT', 3000),
    baseUrl: getEnvVar('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000') || 'http://localhost:3000',
  },

  database: {
    connectionString: getEnvVar('DATABASE_URL'),
    maxConnections: getEnvNumber('DB_MAX_CONNECTIONS', 10),
    timeout: getEnvNumber('DB_TIMEOUT', 30000),
  },

  oci: {
    region: getEnvVar('LOGAN_REGION', 'us-ashburn-1') || 'us-ashburn-1',
    compartmentId: getEnvVar('LOGAN_COMPARTMENT_ID', '') || '',
    tenancyId: getEnvVar('OCI_TENANCY_ID'),
    configFile: getEnvVar('OCI_CONFIG_FILE'),
    profile: getEnvVar('OCI_PROFILE', 'DEFAULT') || 'DEFAULT',
    timeout: getEnvNumber('OCI_TIMEOUT', 60000),
  },

  api: {
    baseUrl: getEnvVar('NEXT_PUBLIC_API_BASE_URL', '/api') || '/api',
    timeout: getEnvNumber('API_TIMEOUT', 30000),
    retryAttempts: getEnvNumber('API_RETRY_ATTEMPTS', 3),
    retryDelay: getEnvNumber('API_RETRY_DELAY', 1000),
  },

  security: {
    encryptionKey: getEnvVar('ENCRYPTION_KEY'),
    sessionTimeout: getEnvNumber('SESSION_TIMEOUT', 3600000), // 1 hour
    maxLoginAttempts: getEnvNumber('MAX_LOGIN_ATTEMPTS', 5),
    passwordPolicy: {
      minLength: getEnvNumber('PASSWORD_MIN_LENGTH', 8),
      requireUppercase: getEnvBoolean('PASSWORD_REQUIRE_UPPERCASE', true),
      requireLowercase: getEnvBoolean('PASSWORD_REQUIRE_LOWERCASE', true),
      requireNumbers: getEnvBoolean('PASSWORD_REQUIRE_NUMBERS', true),
      requireSpecialChars: getEnvBoolean('PASSWORD_REQUIRE_SPECIAL', true),
    },
  },

  features: {
    threatIntelligence: getEnvBoolean('FEATURE_THREAT_INTELLIGENCE', true),
    ritaAnalysis: getEnvBoolean('FEATURE_RITA_ANALYSIS', true),
    mitreAttack: getEnvBoolean('FEATURE_MITRE_ATTACK', true),
    incidentResponse: getEnvBoolean('FEATURE_INCIDENT_RESPONSE', true),
    queryTemplates: getEnvBoolean('FEATURE_QUERY_TEMPLATES', true),
    securityRules: getEnvBoolean('FEATURE_SECURITY_RULES', true),
    pluginSystem: getEnvBoolean('FEATURE_PLUGIN_SYSTEM', false),
    advancedAnalytics: getEnvBoolean('FEATURE_ADVANCED_ANALYTICS', true),
  },

  ui: {
    theme: (getEnvVar('NEXT_PUBLIC_DEFAULT_THEME', 'system') as UIConfig['theme']) || 'system',
    sidebarCollapsed: getEnvBoolean('NEXT_PUBLIC_SIDEBAR_COLLAPSED', false),
    defaultTimeRange: getEnvVar('NEXT_PUBLIC_DEFAULT_TIME_RANGE', '24h') || '24h',
    maxQueryResults: getEnvNumber('NEXT_PUBLIC_MAX_QUERY_RESULTS', 1000),
    refreshInterval: getEnvNumber('NEXT_PUBLIC_REFRESH_INTERVAL', 30000),
    notifications: {
      enabled: getEnvBoolean('NEXT_PUBLIC_NOTIFICATIONS_ENABLED', true),
      position: (getEnvVar('NEXT_PUBLIC_NOTIFICATIONS_POSITION', 'top-right') as UIConfig['notifications']['position']) || 'top-right',
      duration: getEnvNumber('NEXT_PUBLIC_NOTIFICATIONS_DURATION', 5000),
    },
  },

  logging: {
    level: (getEnvVar('LOG_LEVEL', 'info') as LoggingConfig['level']) || 'info',
    enableConsole: getEnvBoolean('LOG_ENABLE_CONSOLE', true),
    enableFile: getEnvBoolean('LOG_ENABLE_FILE', false),
    filePath: getEnvVar('LOG_FILE_PATH', './logs/app.log'),
    maxFileSize: getEnvVar('LOG_MAX_FILE_SIZE', '10MB') || '10MB',
    maxFiles: getEnvNumber('LOG_MAX_FILES', 5),
  },
}

// Export specific config sections for easier imports
export const appConfig = config.app
export const databaseConfig = config.database
export const ociConfig = config.oci
export const apiConfig = config.api
export const securityConfig = config.security
export const featureFlags = config.features
export const uiConfig = config.ui
export const loggingConfig = config.logging

// Helper functions
export const isProduction = (): boolean => config.app.environment === 'production'
export const isDevelopment = (): boolean => config.app.environment === 'development'
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => config.features[feature]

// Configuration validation
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Validate required OCI configuration
  if (!config.oci.region) {
    errors.push('OCI region is required (LOGAN_REGION)')
  }

  if (!config.oci.compartmentId) {
    errors.push('OCI compartment ID is required (LOGAN_COMPARTMENT_ID)')
  }

  // Validate encryption key in production
  if (isProduction() && !config.security.encryptionKey) {
    errors.push('Encryption key is required in production (ENCRYPTION_KEY)')
  }

  // Validate database configuration if database features are enabled
  if (isFeatureEnabled('incidentResponse') && !config.database.connectionString) {
    errors.push('Database connection string required for incident response features (DATABASE_URL)')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export default config
