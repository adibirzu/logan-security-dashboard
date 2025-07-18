'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { 
  Shield, 
  Home, 
  Activity, 
  BarChart3, 
  Database, 
  Settings, 
  User, 
  Bell, 
  Search, 
  Menu, 
  X,
  ChevronDown,
  Server,
  Network,
  Eye,
  TrendingUp,
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Navigation structure with modern security-focused organization
const navigationSections = [
  {
    title: 'Overview',
    items: [
      {
        name: 'Dashboard',
        href: '/',
        icon: Home,
        description: 'Security overview and metrics',
        badge: null
      },
      {
        name: 'Security Overview',
        href: '/security-overview',
        icon: Shield,
        description: 'Comprehensive security status',
        badge: null
      }
    ]
  },
  {
    title: 'Analytics',
    items: [
      {
        name: 'Query Builder',
        href: '/query-builder',
        icon: Database,
        description: 'Build queries, execute, and visualize results with Logan queries',
        badge: { text: 'Enhanced', variant: 'success' as const }
      },
      {
        name: 'Advanced Analytics',
        href: '/advanced-analytics',
        icon: BarChart3,
        description: 'Advanced queries, visualizations, and dashboards',
        badge: { text: 'Pro', variant: 'info' as const }
      },
      {
        name: 'Threat Analytics',
        href: '/threat-analytics',
        icon: TrendingUp,
        description: 'Advanced threat detection and analysis',
        badge: { text: 'Enhanced', variant: 'success' as const }
      },
      {
        name: 'Network Analysis',
        href: '/network-analysis',
        icon: Network,
        description: 'Network behavior and flow analysis',
        badge: null
      },
      {
        name: 'RITA Discovery',
        href: '/rita-discovery',
        icon: Eye,
        description: 'Real Intelligence Threat Analytics',
        badge: null
      },
      {
        name: 'Threat Hunting',
        href: '/threat-hunting',
        icon: Target,
        description: 'NIST-aligned proactive threat detection framework',
        badge: { text: 'New', variant: 'info' as const }
      },
      {
        name: 'Incident Response',
        href: '/incident-response',
        icon: AlertTriangle,
        description: 'Automated incident management with n8n workflows',
        badge: { text: 'New', variant: 'success' as const }
      }
    ]
  },
  {
    title: 'Infrastructure',
    items: [
      {
        name: 'Compute Management',
        href: '/compute',
        icon: Server,
        description: 'OCI compute instances and resources',
        badge: null
      },
      {
        name: 'Log Sources',
        href: '/log-sources',
        icon: Database,
        description: 'Data sources and ingestion',
        badge: null
      }
    ]
  },
  {
    title: 'Intelligence',
    items: [
      {
        name: 'Threat Map',
        href: '/threat-map',
        icon: Globe,
        description: 'Global threat visualization',
        badge: null
      },
      {
        name: 'MITRE ATT&CK',
        href: '/mitre-attack',
        icon: Activity,
        description: 'Attack technique mapping',
        badge: null
      }
    ]
  },
]

interface ModernLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export default function ModernLayout({ children, title, subtitle }: ModernLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()

  // Mock real-time data
  const [systemStatus, setSystemStatus] = useState({
    status: 'operational',
    alerts: 3,
    threats: 12,
    lastUpdate: new Date()
  })

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        lastUpdate: new Date()
      }))
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getBadgeVariant = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'danger':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-neutral-900 dark:text-white">Logan</h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Security Dashboard</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* System Status */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-900 dark:text-white">System Status</span>
              {getStatusIcon(systemStatus.status)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Alerts</span>
                <Badge variant="outline" className="text-xs">
                  {systemStatus.alerts}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Threats</span>
                <Badge variant="outline" className="text-xs">
                  {systemStatus.threats}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {navigationSections.map((section) => (
            <div key={section.title}>
              {!sidebarCollapsed && (
                <h2 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
                  {section.title}
                </h2>
              )}
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                        sidebarCollapsed && "justify-center"
                      )}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <Icon className={cn("h-5 w-5", !sidebarCollapsed && "mr-3")} />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.name}</span>
                          {item.badge && (
                            <Badge className={cn("text-xs", getBadgeVariant(item.badge.variant))}>
                              {item.badge.text}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* User Profile */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src="/avatars/user.png" alt="User" />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Admin User</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Security Analyst</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        {/* Top bar */}
        <header className="bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {title && (
                <div>
                  <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Global search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  type="search"
                  placeholder="Search logs, threats, IPs..."
                  className="pl-10 w-80"
                />
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  3
                </Badge>
              </Button>

              {/* Quick actions */}
              <Button variant="ghost" size="sm">
                <Zap className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}