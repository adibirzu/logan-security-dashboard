/**
 * Plugin system types and interfaces
 * Defines the contract for creating extensible security plugins
 */

export interface PluginMetadata {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: 'analysis' | 'visualization' | 'integration' | 'utility' | 'security'
  tags: string[]
  dependencies?: string[]
  configSchema?: PluginConfigSchema
  permissions: PluginPermission[]
}

export interface PluginPermission {
  type: 'api' | 'storage' | 'network' | 'system'
  scope: string
  description: string
}

export interface PluginConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
    required: boolean
    default?: any
    description: string
    validation?: {
      min?: number
      max?: number
      pattern?: string
      enum?: any[]
    }
  }
}

export interface PluginContext {
  config: Record<string, any>
  api: PluginAPI
  store: PluginStore
  logger: PluginLogger
  events: PluginEventEmitter
}

export interface PluginAPI {
  get: (endpoint: string, params?: Record<string, any>) => Promise<any>
  post: (endpoint: string, data?: any) => Promise<any>
  put: (endpoint: string, data?: any) => Promise<any>
  delete: (endpoint: string) => Promise<any>
}

export interface PluginStore {
  get: (key: string) => Promise<any>
  set: (key: string, value: any) => Promise<void>
  delete: (key: string) => Promise<void>
  list: (prefix?: string) => Promise<string[]>
}

export interface PluginLogger {
  debug: (message: string, meta?: any) => void
  info: (message: string, meta?: any) => void
  warn: (message: string, meta?: any) => void
  error: (message: string, meta?: any) => void
}

export interface PluginEventEmitter {
  on: (event: string, handler: (data: any) => void) => void
  off: (event: string, handler: (data: any) => void) => void
  emit: (event: string, data: any) => void
}

export interface PluginLifecycle {
  onActivate?: (context: PluginContext) => Promise<void> | void
  onDeactivate?: (context: PluginContext) => Promise<void> | void
  onConfigUpdate?: (newConfig: Record<string, any>, context: PluginContext) => Promise<void> | void
}

export interface PluginComponent {
  type: 'widget' | 'page' | 'modal' | 'sidebar' | 'toolbar'
  component: React.ComponentType<any>
  props?: Record<string, any>
  placement?: {
    route?: string
    position?: 'before' | 'after' | 'replace'
    target?: string
  }
}

export interface PluginMenuItem {
  id: string
  label: string
  icon?: string
  route?: string
  action?: () => void
  children?: PluginMenuItem[]
  permissions?: string[]
}

export interface PluginAPI_Extension {
  registerEndpoint?: (path: string, handler: PluginAPIHandler) => void
  registerMiddleware?: (middleware: PluginMiddleware) => void
}

export interface PluginAPIHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  handler: (req: any, res: any, context: PluginContext) => Promise<any>
  permissions?: string[]
  rateLimit?: {
    requests: number
    window: number
  }
}

export interface PluginMiddleware {
  name: string
  handler: (req: any, res: any, next: () => void, context: PluginContext) => void
  order: number
}

export interface PluginDefinition extends PluginMetadata, PluginLifecycle {
  components?: PluginComponent[]
  menuItems?: PluginMenuItem[]
  apiExtensions?: PluginAPI_Extension
  scheduledTasks?: PluginScheduledTask[]
}

export interface PluginScheduledTask {
  id: string
  name: string
  schedule: string // Cron expression
  handler: (context: PluginContext) => Promise<void>
  enabled: boolean
}

export interface PluginInstance {
  definition: PluginDefinition
  context: PluginContext
  active: boolean
  config: Record<string, any>
  lastError?: string
}

export interface PluginManager {
  loadPlugin: (definition: PluginDefinition) => Promise<boolean>
  unloadPlugin: (pluginId: string) => Promise<boolean>
  activatePlugin: (pluginId: string) => Promise<boolean>
  deactivatePlugin: (pluginId: string) => Promise<boolean>
  configurePlugin: (pluginId: string, config: Record<string, any>) => Promise<boolean>
  getPlugin: (pluginId: string) => PluginInstance | undefined
  getAllPlugins: () => PluginInstance[]
  getActivePlugins: () => PluginInstance[]
  isPluginActive: (pluginId: string) => boolean
}

export interface PluginEventTypes {
  'plugin:loaded': { pluginId: string }
  'plugin:unloaded': { pluginId: string }
  'plugin:activated': { pluginId: string }
  'plugin:deactivated': { pluginId: string }
  'plugin:error': { pluginId: string; error: string }
  'plugin:config-updated': { pluginId: string; config: Record<string, any> }
  'security:threat-detected': { indicator: any; source: string }
  'security:incident-created': { incident: any }
  'security:alert-triggered': { alert: any }
  'query:executed': { query: string; results: any }
  'ui:page-loaded': { route: string }
  'ui:component-mounted': { component: string }
}