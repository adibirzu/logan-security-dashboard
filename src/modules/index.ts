/**
 * Feature-based module system for Logan Security Dashboard
 * Organizes features into self-contained modules with clear boundaries
 */

import { ReactNode } from 'react'

export interface ModuleDefinition {
  id: string
  name: string
  description: string
  version: string
  category: 'core' | 'security' | 'analytics' | 'integration' | 'utility'
  enabled: boolean
  dependencies?: string[]
  routes?: ModuleRoute[]
  components?: ModuleComponent[]
  menuItems?: ModuleMenuItem[]
  permissions?: string[]
  config?: ModuleConfig
}

export interface ModuleRoute {
  path: string
  component: React.ComponentType<any>
  exact?: boolean
  permissions?: string[]
  title?: string
  description?: string
}

export interface ModuleComponent {
  id: string
  name: string
  component: React.ComponentType<any>
  type: 'widget' | 'page' | 'modal' | 'sidebar'
  placement?: {
    position: 'header' | 'sidebar' | 'main' | 'footer'
    order?: number
  }
}

export interface ModuleMenuItem {
  id: string
  label: string
  path?: string
  icon?: any
  children?: ModuleMenuItem[]
  permissions?: string[]
  order?: number
  section?: 'main' | 'security' | 'analytics' | 'admin'
}

export interface ModuleConfig {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
    default: any
    description: string
    required?: boolean
    validation?: any
  }
}

// Module registry for managing feature modules
class ModuleRegistry {
  private modules = new Map<string, ModuleDefinition>()
  private initializedModules = new Set<string>()

  register(moduleDefinition: ModuleDefinition): void {
    if (this.modules.has(moduleDefinition.id)) {
      throw new Error(`Module ${moduleDefinition.id} is already registered`)
    }

    // Validate dependencies
    if (moduleDefinition.dependencies) {
      for (const dep of moduleDefinition.dependencies) {
        if (!this.modules.has(dep)) {
          throw new Error(`Module ${moduleDefinition.id} requires dependency ${dep} which is not registered`)
        }
      }
    }

    this.modules.set(moduleDefinition.id, moduleDefinition)
  }

  unregister(moduleId: string): void {
    // Check if other modules depend on this one
    for (const [id, moduleDefinition] of this.modules.entries()) {
      if (moduleDefinition.dependencies?.includes(moduleId)) {
        throw new Error(`Cannot unregister module ${moduleId} because ${id} depends on it`)
      }
    }

    this.modules.delete(moduleId)
    this.initializedModules.delete(moduleId)
  }

  get(moduleId: string): ModuleDefinition | undefined {
    return this.modules.get(moduleId)
  }

  getAll(): ModuleDefinition[] {
    return Array.from(this.modules.values())
  }

  getEnabled(): ModuleDefinition[] {
    return this.getAll().filter(moduleDefinition => moduleDefinition.enabled)
  }

  getByCategory(category: ModuleDefinition['category']): ModuleDefinition[] {
    return this.getAll().filter(moduleDefinition => moduleDefinition.category === category)
  }

  isEnabled(moduleId: string): boolean {
    const moduleDefinition = this.modules.get(moduleId)
    return moduleDefinition?.enabled ?? false
  }

  enable(moduleId: string): void {
    const moduleDefinition = this.modules.get(moduleId)
    if (!moduleDefinition) {
      throw new Error(`Module ${moduleId} not found`)
    }

    // Check dependencies are enabled
    if (moduleDefinition.dependencies) {
      for (const dep of moduleDefinition.dependencies) {
        if (!this.isEnabled(dep)) {
          throw new Error(`Cannot enable module ${moduleId} because dependency ${dep} is not enabled`)
        }
      }
    }

    moduleDefinition.enabled = true
  }

  disable(moduleId: string): void {
    const moduleDefinition = this.modules.get(moduleId)
    if (!moduleDefinition) {
      throw new Error(`Module ${moduleId} not found`)
    }

    // Check if other enabled modules depend on this one
    for (const [id, mod] of this.modules.entries()) {
      if (mod.enabled && mod.dependencies?.includes(moduleId)) {
        throw new Error(`Cannot disable module ${moduleId} because ${id} depends on it`)
      }
    }

    moduleDefinition.enabled = false
  }

  getAllRoutes(): ModuleRoute[] {
    const routes: ModuleRoute[] = []
    
    for (const moduleDefinition of this.getEnabled()) {
      if (moduleDefinition.routes) {
        routes.push(...moduleDefinition.routes)
      }
    }

    return routes
  }

  getAllMenuItems(): ModuleMenuItem[] {
    const menuItems: ModuleMenuItem[] = []
    
    for (const moduleDefinition of this.getEnabled()) {
      if (moduleDefinition.menuItems) {
        menuItems.push(...moduleDefinition.menuItems)
      }
    }

    return menuItems.sort((a, b) => (a.order || 0) - (b.order || 0))
  }

  getMenuItemsBySection(section: ModuleMenuItem['section']): ModuleMenuItem[] {
    return this.getAllMenuItems().filter(item => item.section === section)
  }

  getComponentsByType(type: ModuleComponent['type']): ModuleComponent[] {
    const components: ModuleComponent[] = []
    
    for (const moduleDefinition of this.getEnabled()) {
      if (moduleDefinition.components) {
        components.push(...moduleDefinition.components.filter(comp => comp.type === type))
      }
    }

    return components
  }

  getDependencyTree(moduleId: string): string[] {
    const moduleDefinition = this.modules.get(moduleId)
    if (!moduleDefinition) return []

    const dependencies: string[] = []
    const visited = new Set<string>()

    const collectDependencies = (id: string) => {
      if (visited.has(id)) return
      visited.add(id)

      const mod = this.modules.get(id)
      if (mod?.dependencies) {
        for (const dep of mod.dependencies) {
          dependencies.push(dep)
          collectDependencies(dep)
        }
      }
    }

    collectDependencies(moduleId)
    return [...new Set(dependencies)] // Remove duplicates
  }
}

// Global module registry instance
export const moduleRegistry = new ModuleRegistry()

// Helper function to register a module
export function registerModule(moduleDefinition: ModuleDefinition): void {
  moduleRegistry.register(moduleDefinition)
}

// Helper function to check if a feature is enabled
export function isFeatureEnabled(moduleId: string): boolean {
  return moduleRegistry.isEnabled(moduleId)
}

// Helper function to get feature routes
export function getFeatureRoutes(): ModuleRoute[] {
  return moduleRegistry.getAllRoutes()
}

// Helper function to get navigation menu items
export function getNavigationItems(section?: ModuleMenuItem['section']): ModuleMenuItem[] {
  return section 
    ? moduleRegistry.getMenuItemsBySection(section)
    : moduleRegistry.getAllMenuItems()
}

export default moduleRegistry