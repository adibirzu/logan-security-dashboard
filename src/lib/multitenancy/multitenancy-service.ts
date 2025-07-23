/**
 * Multitenancy Service
 * Manages multiple OCI environments and coordinates queries across them
 */

import { OCIEnvironment, MultitenancyConfig, EnvironmentQueryResult, MultitenantQueryOptions } from '@/types/multitenancy'

const STORAGE_KEY = 'logan_multitenancy_config'

export class MultitenancyService {
  private static instance: MultitenancyService
  private config: MultitenancyConfig

  private constructor() {
    this.config = this.loadConfig()
  }

  static getInstance(): MultitenancyService {
    if (!MultitenancyService.instance) {
      MultitenancyService.instance = new MultitenancyService()
    }
    return MultitenancyService.instance
  }

  // Load configuration from localStorage or defaults
  private loadConfig(): MultitenancyConfig {
    if (typeof window === 'undefined') {
      return this.getDefaultConfig()
    }

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.error('Failed to parse multitenancy config:', e)
      }
    }

    return this.getDefaultConfig()
  }

  private getDefaultConfig(): MultitenancyConfig {
    // Try to load from environment variables first
    const defaultEnv: OCIEnvironment = {
      id: 'default',
      name: 'Default Environment',
      region: process.env.NEXT_PUBLIC_LOGAN_REGION || 'us-ashburn-1',
      compartmentId: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID || '',
      namespace: process.env.NEXT_PUBLIC_OCI_NAMESPACE || '',
      authType: 'config_file',
      configProfile: 'DEFAULT',
      isDefault: true,
      isActive: true
    }

    return {
      environments: [defaultEnv],
      defaultEnvironmentId: 'default',
      queryMode: 'parallel',
      parallelQueryLimit: 5,
      timeoutMs: 30000
    }
  }

  // Save configuration
  saveConfig(config: MultitenancyConfig): void {
    this.config = config
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    }
  }

  // Environment management
  getEnvironments(): OCIEnvironment[] {
    return this.config.environments
  }

  getActiveEnvironments(): OCIEnvironment[] {
    return this.config.environments.filter(env => env.isActive)
  }

  getEnvironment(id: string): OCIEnvironment | undefined {
    return this.config.environments.find(env => env.id === id)
  }

  addEnvironment(environment: OCIEnvironment): void {
    // Ensure unique ID
    if (this.config.environments.find(env => env.id === environment.id)) {
      throw new Error(`Environment with ID ${environment.id} already exists`)
    }

    this.config.environments.push(environment)
    this.saveConfig(this.config)
  }

  updateEnvironment(id: string, updates: Partial<OCIEnvironment>): void {
    const index = this.config.environments.findIndex(env => env.id === id)
    if (index === -1) {
      throw new Error(`Environment with ID ${id} not found`)
    }

    this.config.environments[index] = {
      ...this.config.environments[index],
      ...updates,
      id // Ensure ID cannot be changed
    }
    this.saveConfig(this.config)
  }

  removeEnvironment(id: string): void {
    if (this.config.environments.length === 1) {
      throw new Error('Cannot remove the last environment')
    }

    this.config.environments = this.config.environments.filter(env => env.id !== id)
    
    // Update default if necessary
    if (this.config.defaultEnvironmentId === id) {
      this.config.defaultEnvironmentId = this.config.environments[0].id
    }
    
    this.saveConfig(this.config)
  }

  // Query configuration
  getQueryMode(): 'single' | 'parallel' | 'sequential' {
    return this.config.queryMode
  }

  setQueryMode(mode: 'single' | 'parallel' | 'sequential'): void {
    this.config.queryMode = mode
    this.saveConfig(this.config)
  }

  // Execute query across multiple environments
  async executeMultitenantQuery(
    queryFn: (env: OCIEnvironment) => Promise<any>,
    options: MultitenantQueryOptions = {}
  ): Promise<EnvironmentQueryResult[]> {
    const targetEnvironments = options.environments 
      ? this.config.environments.filter(env => env.isActive && options.environments!.includes(env.id))
      : this.getActiveEnvironments()

    if (targetEnvironments.length === 0) {
      throw new Error('No active environments to query')
    }

    const results: EnvironmentQueryResult[] = []
    const timeout = options.timeout || this.config.timeoutMs || 30000

    if (this.config.queryMode === 'parallel') {
      // Execute queries in parallel with limit
      const limit = this.config.parallelQueryLimit || 5
      for (let i = 0; i < targetEnvironments.length; i += limit) {
        const batch = targetEnvironments.slice(i, i + limit)
        const batchResults = await Promise.all(
          batch.map(env => this.executeQueryWithTimeout(env, queryFn, timeout, options.continueOnError))
        )
        results.push(...batchResults)
      }
    } else {
      // Execute queries sequentially
      for (const env of targetEnvironments) {
        const result = await this.executeQueryWithTimeout(env, queryFn, timeout, options.continueOnError)
        results.push(result)
        
        // Stop on error if not continuing
        if (!result.success && !options.continueOnError) {
          break
        }
      }
    }

    return results
  }

  private async executeQueryWithTimeout(
    env: OCIEnvironment,
    queryFn: (env: OCIEnvironment) => Promise<any>,
    timeoutMs: number,
    continueOnError?: boolean
  ): Promise<EnvironmentQueryResult> {
    const startTime = Date.now()
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
      })

      const data = await Promise.race([queryFn(env), timeoutPromise])
      
      return {
        environmentId: env.id,
        environmentName: env.name,
        success: true,
        data,
        executionTimeMs: Date.now() - startTime
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Query failed for environment ${env.name}:`, errorMessage)
      
      if (!continueOnError) {
        throw error
      }

      return {
        environmentId: env.id,
        environmentName: env.name,
        success: false,
        error: errorMessage,
        executionTimeMs: Date.now() - startTime
      }
    }
  }

  // Aggregate results from multiple environments
  aggregateResults(results: EnvironmentQueryResult[], aggregationType: 'merge' | 'group' = 'merge'): any {
    const successfulResults = results.filter(r => r.success && r.data)
    
    if (successfulResults.length === 0) {
      return null
    }

    if (aggregationType === 'merge') {
      // Merge arrays or combine objects
      const firstData = successfulResults[0].data
      
      if (Array.isArray(firstData)) {
        return successfulResults.flatMap(r => r.data)
      } else if (typeof firstData === 'object') {
        return successfulResults.reduce((acc, r) => ({ ...acc, ...r.data }), {})
      } else {
        return successfulResults.map(r => r.data)
      }
    } else {
      // Group by environment
      return successfulResults.reduce((acc, r) => {
        acc[r.environmentId] = r.data
        return acc
      }, {} as Record<string, any>)
    }
  }
}