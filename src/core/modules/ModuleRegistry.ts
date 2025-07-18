/**
 * Module Registry - Central system for managing feature modules
 * Allows for easy addition of new security features without breaking existing functionality
 */

import { ComponentType } from 'react'
import { LucideIcon } from 'lucide-react'

export interface ModuleRoute {
  path: string
  component: ComponentType
  name: string
  description: string
  icon?: LucideIcon
  badge?: {
    text: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'
  }
  permissions?: string[]
  hidden?: boolean
}

export interface ModuleAPI {
  baseUrl: string
  endpoints: Record<string, string>
  version: string
}

export interface ModuleConfig {
  enabled: boolean
  settings: Record<string, any>
  features: Record<string, boolean>
}

export interface ModuleDefinition {
  id: string
  name: string
  version: string
  description: string
  author: string
  dependencies: string[]
  routes: ModuleRoute[]
  api?: ModuleAPI
  config?: ModuleConfig
  icon?: LucideIcon
  category: 'security' | 'analytics' | 'monitoring' | 'threat-intel' | 'incident-response' | 'compliance'
  tags: string[]
  permissions: string[]
}

export interface ModuleContext {
  config: ModuleConfig
  api: ModuleAPI
  routes: ModuleRoute[]
  services: Record<string, any>
}

class ModuleRegistry {
  private modules: Map<string, ModuleDefinition> = new Map()
  private enabledModules: Set<string> = new Set()
  private moduleContexts: Map<string, ModuleContext> = new Map()

  /**
   * Register a new module
   */
  register(module: ModuleDefinition): void {
    if (this.modules.has(module.id)) {
      console.warn(`Module ${module.id} is already registered`)
      return
    }

    // Check dependencies
    const missingDependencies = module.dependencies.filter(dep => !this.modules.has(dep))
    if (missingDependencies.length > 0) {
      throw new Error(`Module ${module.id} has missing dependencies: ${missingDependencies.join(', ')}`)
    }

    this.modules.set(module.id, module)
    
    // Auto-enable if no explicit config
    if (module.config?.enabled !== false) {
      this.enabledModules.add(module.id)
    }

    // Create module context
    this.moduleContexts.set(module.id, {
      config: module.config || { enabled: true, settings: {}, features: {} },
      api: module.api || { baseUrl: '', endpoints: {}, version: '1.0.0' },
      routes: module.routes,
      services: {}
    })

    console.log(`Module ${module.id} registered successfully`)
  }

  /**
   * Unregister a module
   */
  unregister(moduleId: string): void {
    if (!this.modules.has(moduleId)) {
      console.warn(`Module ${moduleId} is not registered`)
      return
    }

    // Check if other modules depend on this one
    const dependentModules = Array.from(this.modules.values())
      .filter(module => module.dependencies.includes(moduleId))
      .map(module => module.id)

    if (dependentModules.length > 0) {
      throw new Error(`Cannot unregister module ${moduleId}. It is required by: ${dependentModules.join(', ')}`)
    }

    this.modules.delete(moduleId)
    this.enabledModules.delete(moduleId)
    this.moduleContexts.delete(moduleId)

    console.log(`Module ${moduleId} unregistered successfully`)
  }

  /**
   * Enable a module
   */
  enable(moduleId: string): void {
    if (!this.modules.has(moduleId)) {
      throw new Error(`Module ${moduleId} is not registered`)
    }

    this.enabledModules.add(moduleId)
    
    // Update module context
    const context = this.moduleContexts.get(moduleId)
    if (context) {
      context.config.enabled = true
      this.moduleContexts.set(moduleId, context)
    }
  }

  /**
   * Disable a module
   */
  disable(moduleId: string): void {
    if (!this.modules.has(moduleId)) {
      throw new Error(`Module ${moduleId} is not registered`)
    }

    this.enabledModules.delete(moduleId)
    
    // Update module context
    const context = this.moduleContexts.get(moduleId)
    if (context) {
      context.config.enabled = false
      this.moduleContexts.set(moduleId, context)
    }
  }

  /**
   * Check if a module is enabled
   */
  isEnabled(moduleId: string): boolean {
    return this.enabledModules.has(moduleId)
  }

  /**
   * Get all registered modules
   */
  getModules(): ModuleDefinition[] {
    return Array.from(this.modules.values())
  }

  /**
   * Get enabled modules
   */
  getEnabledModules(): ModuleDefinition[] {
    return Array.from(this.modules.values())
      .filter(module => this.enabledModules.has(module.id))
  }

  /**
   * Get modules by category
   */
  getModulesByCategory(category: ModuleDefinition['category']): ModuleDefinition[] {
    return this.getEnabledModules()
      .filter(module => module.category === category)
  }

  /**
   * Get module by ID
   */
  getModule(moduleId: string): ModuleDefinition | undefined {
    return this.modules.get(moduleId)
  }

  /**
   * Get module context
   */
  getModuleContext(moduleId: string): ModuleContext | undefined {
    return this.moduleContexts.get(moduleId)
  }

  /**
   * Get all routes from enabled modules
   */
  getRoutes(): ModuleRoute[] {
    return this.getEnabledModules()
      .flatMap(module => module.routes)
      .filter(route => !route.hidden)
  }

  /**
   * Get routes by category
   */
  getRoutesByCategory(category: ModuleDefinition['category']): ModuleRoute[] {
    return this.getModulesByCategory(category)
      .flatMap(module => module.routes)
      .filter(route => !route.hidden)
  }

  /**
   * Update module configuration
   */
  updateModuleConfig(moduleId: string, config: Partial<ModuleConfig>): void {
    const context = this.moduleContexts.get(moduleId)
    if (!context) {
      throw new Error(`Module ${moduleId} is not registered`)
    }

    context.config = { ...context.config, ...config }
    this.moduleContexts.set(moduleId, context)
  }

  /**
   * Get module statistics
   */
  getStats(): {
    total: number
    enabled: number
    disabled: number
    byCategory: Record<string, number>
  } {
    const modules = this.getModules()
    const enabled = this.getEnabledModules()
    
    const byCategory = modules.reduce((acc, module) => {
      acc[module.category] = (acc[module.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: modules.length,
      enabled: enabled.length,
      disabled: modules.length - enabled.length,
      byCategory
    }
  }
}

// Global module registry instance
export const moduleRegistry = new ModuleRegistry()

// Helper function to register core modules
export function registerCoreModules() {
  // Core modules will be registered here
  console.log('Core modules registered')
}

export default moduleRegistry