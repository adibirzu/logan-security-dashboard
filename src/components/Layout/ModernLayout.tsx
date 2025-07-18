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
import { ModularNavigation } from './ModularNavigation'
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

// Modular navigation system - routes are now dynamically generated from registered modules

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


  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-background border-r border-border transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Logan</h1>
                <p className="text-xs text-muted-foreground">Security Dashboard</p>
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
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">System Status</span>
              {getStatusIcon(systemStatus.status)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Alerts</span>
                <Badge variant="outline" className="text-xs">
                  {systemStatus.alerts}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Threats</span>
                <Badge variant="outline" className="text-xs">
                  {systemStatus.threats}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          {!sidebarCollapsed ? (
            <ModularNavigation />
          ) : (
            // Collapsed sidebar - show only icons
            <div className="p-2 space-y-2">
              <Link href="/" className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                pathname === '/' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}>
                <Home className="h-5 w-5" />
              </Link>
              <Link href="/query-builder" className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                pathname === '/query-builder' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}>
                <Database className="h-5 w-5" />
              </Link>
              <Link href="/threat-analytics" className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                pathname === '/threat-analytics' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}>
                <TrendingUp className="h-5 w-5" />
              </Link>
              <Link href="/mitre-attack" className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                pathname === '/mitre-attack' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}>
                <Target className="h-5 w-5" />
              </Link>
              <Link href="/settings" className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                pathname === '/settings' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}>
                <Settings className="h-5 w-5" />
              </Link>
            </div>
          )}
        </div>

        {/* User Profile */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2 hover:bg-accent hover:text-accent-foreground">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src="/avatars/user.png" alt="User" />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">Admin User</p>
                    <p className="text-xs text-muted-foreground">Security Analyst</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
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