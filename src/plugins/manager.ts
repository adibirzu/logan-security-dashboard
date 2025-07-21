/**
 * Plugin Manager Implementation
 * Handles loading, activation, and lifecycle management of security plugins
 */

import { EventEmitter } from 'events'
import { 
  PluginDefinition, 
  PluginInstance, 
  PluginManager, 
  PluginContext,
  PluginEventTypes,
  PluginLogger,
  PluginStore,
  PluginAPI 
} from './types'
import { config } from '@/config'

class LoganPluginManager extends EventEmitter implements PluginManager {
  private plugins = new Map<string, PluginInstance>()
  private pluginStorage = new Map<string, Map<string, any>>()
  private scheduledTasks = new Map<string, NodeJS.Timeout>()

  constructor() {
    super()
    this.setMaxListeners(50) // Allow many plugins to listen to events
  }

  async loadPlugin(definition: PluginDefinition): Promise<boolean> {
    try {
      // Validate plugin definition
      if (!this.validatePluginDefinition(definition)) {
        throw new Error(`Invalid plugin definition for ${definition.id}`)
      }

      // Check if plugin already exists
      if (this.plugins.has(definition.id)) {
        throw new Error(`Plugin ${definition.id} is already loaded`)
      }

      // Check dependencies
      if (definition.dependencies) {
        for (const dep of definition.dependencies) {
          if (!this.plugins.has(dep) || !this.plugins.get(dep)?.active) {
            throw new Error(`Plugin ${definition.id} requires dependency ${dep}`)
          }
        }
      }

      // Create plugin context
      const context = this.createPluginContext(definition.id)

      // Create plugin instance
      const instance: PluginInstance = {
        definition,
        context,
        active: false,
        config: this.getDefaultConfig(definition),
        lastError: undefined,
      }

      // Store plugin
      this.plugins.set(definition.id, instance)

      // Initialize plugin storage
      this.pluginStorage.set(definition.id, new Map())

      // Emit loaded event
      this.emit('plugin:loaded', { pluginId: definition.id })

      return true
    } catch (error) {
      console.error(`Failed to load plugin ${definition.id}:`, error)
      this.emit('plugin:error', { 
        pluginId: definition.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      return false
    }
  }

  async unloadPlugin(pluginId: string): Promise<boolean> {
    try {
      const instance = this.plugins.get(pluginId)
      if (!instance) {
        throw new Error(`Plugin ${pluginId} not found`)
      }

      // Deactivate if active
      if (instance.active) {
        await this.deactivatePlugin(pluginId)
      }

      // Clean up scheduled tasks
      this.cleanupScheduledTasks(pluginId)

      // Clean up storage
      this.pluginStorage.delete(pluginId)

      // Remove plugin
      this.plugins.delete(pluginId)

      // Emit unloaded event
      this.emit('plugin:unloaded', { pluginId })

      return true
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginId}:`, error)
      this.emit('plugin:error', { 
        pluginId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      return false
    }
  }

  async activatePlugin(pluginId: string): Promise<boolean> {
    try {
      const instance = this.plugins.get(pluginId)
      if (!instance) {
        throw new Error(`Plugin ${pluginId} not found`)
      }

      if (instance.active) {
        return true // Already active
      }

      // Call onActivate lifecycle method
      if (instance.definition.onActivate) {
        await instance.definition.onActivate(instance.context)
      }

      // Set up scheduled tasks
      this.setupScheduledTasks(instance)

      // Mark as active
      instance.active = true
      instance.lastError = undefined

      // Emit activated event
      this.emit('plugin:activated', { pluginId })

      return true
    } catch (error) {
      console.error(`Failed to activate plugin ${pluginId}:`, error)
      const instance = this.plugins.get(pluginId)
      if (instance) {
        instance.lastError = error instanceof Error ? error.message : 'Unknown error'
      }
      this.emit('plugin:error', { 
        pluginId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      return false
    }
  }

  async deactivatePlugin(pluginId: string): Promise<boolean> {
    try {
      const instance = this.plugins.get(pluginId)
      if (!instance) {
        throw new Error(`Plugin ${pluginId} not found`)
      }

      if (!instance.active) {
        return true // Already inactive
      }

      // Call onDeactivate lifecycle method
      if (instance.definition.onDeactivate) {
        await instance.definition.onDeactivate(instance.context)
      }

      // Clean up scheduled tasks
      this.cleanupScheduledTasks(pluginId)

      // Mark as inactive
      instance.active = false

      // Emit deactivated event
      this.emit('plugin:deactivated', { pluginId })

      return true
    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginId}:`, error)
      this.emit('plugin:error', { 
        pluginId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      return false
    }
  }

  async configurePlugin(pluginId: string, newConfig: Record<string, any>): Promise<boolean> {
    try {
      const instance = this.plugins.get(pluginId)
      if (!instance) {
        throw new Error(`Plugin ${pluginId} not found`)
      }

      // Validate configuration against schema
      if (instance.definition.configSchema) {
        if (!this.validateConfig(newConfig, instance.definition.configSchema)) {
          throw new Error('Invalid configuration')
        }
      }

      // Update configuration
      instance.config = { ...instance.config, ...newConfig }

      // Call onConfigUpdate lifecycle method
      if (instance.definition.onConfigUpdate) {
        await instance.definition.onConfigUpdate(newConfig, instance.context)
      }

      // Emit config updated event
      this.emit('plugin:config-updated', { pluginId, config: instance.config })

      return true
    } catch (error) {
      console.error(`Failed to configure plugin ${pluginId}:`, error)
      this.emit('plugin:error', { 
        pluginId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      return false
    }
  }

  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId)
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values())
  }

  getActivePlugins(): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(p => p.active)
  }

  isPluginActive(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId)
    return plugin?.active ?? false
  }

  // Helper methods

  private validatePluginDefinition(definition: PluginDefinition): boolean {
    return !!(
      definition.id &&
      definition.name &&
      definition.version &&
      definition.category &&
      definition.permissions &&
      Array.isArray(definition.permissions)
    )
  }

  private createPluginContext(pluginId: string): PluginContext {
    return {
      config: this.getDefaultConfig(this.plugins.get(pluginId)?.definition),
      api: this.createPluginAPI(pluginId),
      store: this.createPluginStore(pluginId),
      logger: this.createPluginLogger(pluginId),
      events: this.createPluginEventEmitter(pluginId),
    }
  }

  private createPluginAPI(pluginId: string): PluginAPI {
    return {
      get: async (endpoint: string, params?: Record<string, any>) => {
        // Implement API call with plugin context
        const url = new URL(endpoint, config.api.baseUrl)
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, String(value))
          })
        }
        
        const response = await fetch(url.toString(), {
          headers: {
            'X-Plugin-ID': pluginId,
          },
        })
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`)
        }
        
        return response.json()
      },

      post: async (endpoint: string, data?: any) => {
        const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Plugin-ID': pluginId,
          },
          body: data ? JSON.stringify(data) : undefined,
        })
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`)
        }
        
        return response.json()
      },

      put: async (endpoint: string, data?: any) => {
        const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Plugin-ID': pluginId,
          },
          body: data ? JSON.stringify(data) : undefined,
        })
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`)
        }
        
        return response.json()
      },

      delete: async (endpoint: string) => {
        const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
          method: 'DELETE',
          headers: {
            'X-Plugin-ID': pluginId,
          },
        })
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`)
        }
        
        return response.json()
      },
    }
  }

  private createPluginStore(pluginId: string): PluginStore {
    return {
      get: async (key: string) => {
        const storage = this.pluginStorage.get(pluginId)
        return storage?.get(key)
      },

      set: async (key: string, value: any) => {
        const storage = this.pluginStorage.get(pluginId)
        if (storage) {
          storage.set(key, value)
        }
      },

      delete: async (key: string) => {
        const storage = this.pluginStorage.get(pluginId)
        if (storage) {
          storage.delete(key)
        }
      },

      list: async (prefix?: string) => {
        const storage = this.pluginStorage.get(pluginId)
        if (!storage) return []
        
        const keys = Array.from(storage.keys())
        return prefix ? keys.filter(k => k.startsWith(prefix)) : keys
      },
    }
  }

  private createPluginLogger(pluginId: string): PluginLogger {
    const createLogMethod = (level: string) => (message: string, meta?: any) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        plugin: pluginId,
        message,
        meta,
      }
      
      if (config.logging.enableConsole) {
        console.log(`[${level.toUpperCase()}] [Plugin:${pluginId}] ${message}`, meta || '')
      }
      
      // Implement file logging if enabled
      if (config.logging.enableFile && config.logging.filePath) {
        this.writeToLogFile(pluginId, level, message, meta)
      }
    }

    return {
      debug: createLogMethod('debug'),
      info: createLogMethod('info'),
      warn: createLogMethod('warn'),
      error: createLogMethod('error'),
    }
  }

  private writeToLogFile(pluginId: string, level: string, message: string, meta?: any): void {
    try {
      const timestamp = new Date().toISOString()
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        plugin: pluginId,
        message,
        meta: meta || null
      }
      
      const logLine = JSON.stringify(logEntry) + '\n'
      
      // Use dynamic import for fs to avoid bundling issues
      import('fs').then(fs => {
        fs.appendFileSync(config.logging.filePath!, logLine, 'utf8')
      }).catch(error => {
        console.error('Failed to write to log file:', error)
      })
    } catch (error) {
      console.error('Error in file logging:', error)
    }
  }

  private createPluginEventEmitter(pluginId: string) {
    return {
      on: (event: string, handler: (data: any) => void) => {
        this.on(event, handler)
      },

      off: (event: string, handler: (data: any) => void) => {
        this.off(event, handler)
      },

      emit: (event: string, data: any) => {
        this.emit(event, { ...data, sourcePlugin: pluginId })
      },
    }
  }

  private getDefaultConfig(definition?: PluginDefinition): Record<string, any> {
    if (!definition?.configSchema) return {}
    
    const defaultConfig: Record<string, any> = {}
    Object.entries(definition.configSchema).forEach(([key, schema]) => {
      if (schema.default !== undefined) {
        defaultConfig[key] = schema.default
      }
    })
    
    return defaultConfig
  }

  private validateConfig(config: Record<string, any>, schema: any): boolean {
    // Basic validation - could be enhanced with a proper schema validator
    for (const [key, fieldSchema] of Object.entries(schema)) {
      const field = fieldSchema as any
      if (field.required && config[key] === undefined) {
        return false
      }
    }
    return true
  }

  private setupScheduledTasks(instance: PluginInstance) {
    if (!instance.definition.scheduledTasks) return

    for (const task of instance.definition.scheduledTasks) {
      if (!task.enabled) continue

      // Simple interval implementation - could be enhanced with proper cron parsing
      const interval = this.parseCronToInterval(task.schedule)
      if (interval > 0) {
        const timer = setInterval(async () => {
          try {
            await task.handler(instance.context)
          } catch (error) {
            console.error(`Scheduled task ${task.id} for plugin ${instance.definition.id} failed:`, error)
          }
        }, interval)

        this.scheduledTasks.set(`${instance.definition.id}:${task.id}`, timer)
      }
    }
  }

  private cleanupScheduledTasks(pluginId: string) {
    for (const [key, timer] of this.scheduledTasks.entries()) {
      if (key.startsWith(`${pluginId}:`)) {
        clearInterval(timer)
        this.scheduledTasks.delete(key)
      }
    }
  }

  private parseCronToInterval(schedule: string): number {
    // Simple parser - only supports minute intervals for now
    // Format: "*/5 * * * *" for every 5 minutes
    const parts = schedule.split(' ')
    if (parts.length >= 1 && parts[0].startsWith('*/')) {
      const minutes = parseInt(parts[0].substring(2))
      return minutes * 60 * 1000 // Convert to milliseconds
    }
    return 0
  }
}

// Global plugin manager instance
export const pluginManager = new LoganPluginManager()

export default pluginManager