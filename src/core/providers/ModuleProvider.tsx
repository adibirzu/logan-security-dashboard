/**
 * Module Provider
 * Initializes and manages the module system
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { moduleRegistry, ModuleDefinition, ModuleRoute } from '@/core/modules/ModuleRegistry'
import { registerCoreModules } from '@/core/modules/CoreModules'

interface ModuleContextType {
  modules: ModuleDefinition[]
  enabledModules: ModuleDefinition[]
  routes: ModuleRoute[]
  isLoading: boolean
  error: string | null
  refreshModules: () => void
  enableModule: (moduleId: string) => void
  disableModule: (moduleId: string) => void
  isModuleEnabled: (moduleId: string) => boolean
  getModulesByCategory: (category: ModuleDefinition['category']) => ModuleDefinition[]
  getModuleStats: () => {
    total: number
    enabled: number
    disabled: number
    byCategory: Record<string, number>
  }
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined)

export function useModules() {
  const context = useContext(ModuleContext)
  if (!context) {
    throw new Error('useModules must be used within a ModuleProvider')
  }
  return context
}

interface ModuleProviderProps {
  children: React.ReactNode
}

export function ModuleProvider({ children }: ModuleProviderProps) {
  const [modules, setModules] = useState<ModuleDefinition[]>([])
  const [enabledModules, setEnabledModules] = useState<ModuleDefinition[]>([])
  const [routes, setRoutes] = useState<ModuleRoute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshModules = useCallback(() => {
    try {
      const allModules = moduleRegistry.getModules()
      const enabled = moduleRegistry.getEnabledModules()
      const moduleRoutes = moduleRegistry.getRoutes()

      setModules(allModules)
      setEnabledModules(enabled)
      setRoutes(moduleRoutes)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh modules')
    }
  }, [])

  const enableModule = useCallback((moduleId: string) => {
    try {
      moduleRegistry.enable(moduleId)
      refreshModules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable module')
    }
  }, [refreshModules])

  const disableModule = useCallback((moduleId: string) => {
    try {
      moduleRegistry.disable(moduleId)
      refreshModules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable module')
    }
  }, [refreshModules])

  const isModuleEnabled = useCallback((moduleId: string) => {
    return moduleRegistry.isEnabled(moduleId)
  }, [])

  const getModulesByCategory = useCallback((category: ModuleDefinition['category']) => {
    return moduleRegistry.getModulesByCategory(category)
  }, [])

  const getModuleStats = useCallback(() => {
    return moduleRegistry.getStats()
  }, [])

  useEffect(() => {
    const initializeModules = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Register core modules
        registerCoreModules()

        // Load module configuration from localStorage if available
        const savedConfig = localStorage.getItem('logan-modules-config')
        if (savedConfig) {
          try {
            const config = JSON.parse(savedConfig)
            Object.entries(config).forEach(([moduleId, enabled]) => {
              if (enabled) {
                moduleRegistry.enable(moduleId)
              } else {
                moduleRegistry.disable(moduleId)
              }
            })
          } catch (err) {
            console.warn('Failed to load module configuration:', err)
          }
        }

        // Refresh modules after initialization
        refreshModules()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize modules')
      } finally {
        setIsLoading(false)
      }
    }

    initializeModules()
  }, [refreshModules])

  // Save module configuration to localStorage when enabled modules change
  useEffect(() => {
    if (!isLoading) {
      const config = modules.reduce((acc, module) => {
        acc[module.id] = enabledModules.some(enabled => enabled.id === module.id)
        return acc
      }, {} as Record<string, boolean>)

      localStorage.setItem('logan-modules-config', JSON.stringify(config))
    }
  }, [modules, enabledModules, isLoading])

  const contextValue: ModuleContextType = {
    modules,
    enabledModules,
    routes,
    isLoading,
    error,
    refreshModules,
    enableModule,
    disableModule,
    isModuleEnabled,
    getModulesByCategory,
    getModuleStats
  }

  return (
    <ModuleContext.Provider value={contextValue}>
      {children}
    </ModuleContext.Provider>
  )
}

export default ModuleProvider