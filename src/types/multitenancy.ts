/**
 * Multitenancy Types and Interfaces
 * Supports multiple OCI Logging Analytics instances
 */

export interface OCIEnvironment {
  id: string
  name: string
  description?: string
  region: string
  compartmentId: string
  namespace: string
  authType: 'config_file' | 'instance_principal' | 'resource_principal'
  configProfile?: string // For config_file auth
  isDefault?: boolean
  isActive: boolean
  endpoints?: {
    loggingAnalytics?: string
    identity?: string
  }
  tags?: Record<string, string>
}

export interface MultitenancyConfig {
  environments: OCIEnvironment[]
  defaultEnvironmentId?: string
  queryMode: 'single' | 'parallel' | 'sequential'
  parallelQueryLimit?: number
  timeoutMs?: number
}

export interface EnvironmentQueryResult {
  environmentId: string
  environmentName: string
  success: boolean
  data?: any
  error?: string
  executionTimeMs?: number
}

export interface MultitenantQueryOptions {
  environments?: string[] // Specific environment IDs to query, or all if not specified
  aggregateResults?: boolean
  continueOnError?: boolean
  timeout?: number
}