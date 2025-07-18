/**
 * Modular Navigation Component
 * Automatically generates navigation from registered modules
 */

'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Shield, Settings, BarChart3, AlertTriangle, Eye, Search } from 'lucide-react'

import { moduleRegistry, ModuleDefinition } from '@/core/modules/ModuleRegistry'

interface NavigationSection {
  category: ModuleDefinition['category']
  name: string
  icon: React.ComponentType<{ className?: string }>
  modules: ModuleDefinition[]
}

const categoryConfig = {
  security: {
    name: 'Security',
    icon: Shield,
    order: 1
  },
  analytics: {
    name: 'Analytics',
    icon: BarChart3,
    order: 2
  },
  monitoring: {
    name: 'Monitoring',
    icon: Eye,
    order: 3
  },
  'threat-intel': {
    name: 'Threat Intelligence',
    icon: Search,
    order: 4
  },
  'incident-response': {
    name: 'Incident Response',
    icon: AlertTriangle,
    order: 5
  },
  compliance: {
    name: 'Compliance',
    icon: Settings,
    order: 6
  }
}

export function ModularNavigation() {
  const pathname = usePathname()
  const [sections, setSections] = useState<NavigationSection[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['security', 'analytics']))

  useEffect(() => {
    // Get enabled modules and group by category
    const enabledModules = moduleRegistry.getEnabledModules()
    const modulesByCategory = enabledModules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = []
      }
      acc[module.category].push(module)
      return acc
    }, {} as Record<string, ModuleDefinition[]>)

    // Create navigation sections
    const navigationSections = Object.entries(modulesByCategory)
      .map(([category, modules]) => ({
        category: category as ModuleDefinition['category'],
        name: categoryConfig[category as keyof typeof categoryConfig]?.name || category,
        icon: categoryConfig[category as keyof typeof categoryConfig]?.icon || Settings,
        modules: modules.sort((a, b) => a.name.localeCompare(b.name))
      }))
      .sort((a, b) => {
        const aOrder = categoryConfig[a.category as keyof typeof categoryConfig]?.order || 999
        const bOrder = categoryConfig[b.category as keyof typeof categoryConfig]?.order || 999
        return aOrder - bOrder
      })

    setSections(navigationSections)
  }, [])

  const toggleSection = (category: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const isCurrentPath = (path: string) => {
    return pathname === path
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-4">
          {/* Dashboard Overview */}
          <div className="mb-3">
            <Link href="/">
              <Button
                variant={isCurrentPath('/') ? 'default' : 'ghost'}
                className={cn(
                  "w-full justify-start h-9 text-sm font-medium transition-colors",
                  isCurrentPath('/') 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </div>

          <Separator className="my-3" />

          {/* Module-based Navigation */}
          <div className="space-y-1">
            {sections.map((section) => (
              <div key={section.category} className="space-y-1">
                <Collapsible
                  open={expandedSections.has(section.category)}
                  onOpenChange={() => toggleSection(section.category)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start px-2 py-2 h-8 text-xs font-semibold uppercase tracking-wide",
                        "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                        "transition-colors duration-200"
                      )}
                    >
                      {expandedSections.has(section.category) ? (
                        <ChevronDown className="mr-2 h-3 w-3 shrink-0" />
                      ) : (
                        <ChevronRight className="mr-2 h-3 w-3 shrink-0" />
                      )}
                      <section.icon className="mr-2 h-3 w-3 shrink-0" />
                      <span className="truncate">{section.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs shrink-0">
                        {section.modules.length}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 ml-4 border-l border-border pl-4">
                    {section.modules.map((module) =>
                      module.routes.map((route) => (
                        <Link key={route.path} href={route.path}>
                          <Button
                            variant={isCurrentPath(route.path) ? 'default' : 'ghost'}
                            className={cn(
                              "w-full justify-start pl-2 py-2 h-8 text-sm transition-colors",
                              isCurrentPath(route.path)
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "text-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            {route.icon && <route.icon className="mr-2 h-3 w-3 shrink-0" />}
                            <span className="truncate">{route.name}</span>
                            {route.badge && (
                              <Badge
                                variant={route.badge.variant}
                                className="ml-auto text-xs shrink-0"
                              >
                                {route.badge.text}
                              </Badge>
                            )}
                          </Button>
                        </Link>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section with Settings and Status */}
      <div className="mt-auto border-t border-border bg-muted/20">
        <div className="p-4 space-y-3">
          {/* Settings */}
          <Link href="/settings">
            <Button
              variant={isCurrentPath('/settings') ? 'default' : 'ghost'}
              className={cn(
                "w-full justify-start h-9 text-sm",
                isCurrentPath('/settings')
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>

          {/* Module Statistics */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs font-medium text-foreground mb-2">System Status</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="font-medium text-foreground">{moduleRegistry.getEnabledModules().length}</div>
                <div className="text-muted-foreground">Active Modules</div>
              </div>
              <div>
                <div className="font-medium text-foreground">{moduleRegistry.getRoutes().length}</div>
                <div className="text-muted-foreground">Available Routes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModularNavigation