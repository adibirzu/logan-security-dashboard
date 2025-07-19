'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Database, Activity, Search, ChartBar, Users, Settings, Home, Sparkles, HardDrive, Target, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SimpleThemeToggle } from '@/components/ui/theme-toggle'

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    description: 'Main dashboard with recent events and search'
  },
  {
    name: 'Security Overview',
    href: '/security-overview',
    icon: Shield,
    description: 'Comprehensive security metrics and analysis'
  },
  {
    name: 'Log Sources',
    href: '/log-sources',
    icon: Database,
    description: 'All available log sources and their status'
  },
  {
    name: 'Query Builder',
    href: '/query-builder',
    icon: Sparkles,
    description: 'Advanced query builder, visualizations, and data export'
  },
  {
    name: 'Storage Analytics',
    href: '/storage-analytics',
    icon: HardDrive,
    description: 'OCI Logging Analytics storage usage monitoring and analysis'
  },
  {
    name: 'Threat Hunting',
    href: '/threat-hunting',
    icon: Target,
    description: 'Threat intelligence, hunting playbooks, and IOC management'
  },
  {
    name: 'Help',
    href: '/help',
    icon: HelpCircle,
    description: 'Scoring methodology and system documentation'
  }
]

interface NavigationProps {
  className?: string
}

export function Navigation({ className }: NavigationProps) {
  const pathname = usePathname()

  return (
    <nav className={cn('bg-card border-b border-border', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Shield className="h-8 w-8 text-primary mr-3" />
              <span className="text-xl font-semibold text-foreground">
                Logan Security Dashboard
              </span>
            </Link>
            <div className="ml-4 px-2 py-1 text-xs bg-oracle-red-100 text-oracle-red-800 rounded-full font-medium">
              Oracle Cloud Security
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                    title={item.description}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Settings and Theme Toggle */}
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className={cn(
                'p-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                pathname === '/settings'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              title="System configuration and service status monitoring"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden lg:inline">Settings</span>
            </Link>
            <SimpleThemeToggle />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'block px-3 py-2 rounded-md text-base font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </Link>
              )
            })}
            
            {/* Settings in Mobile Navigation */}
            <Link
              href="/settings"
              className={cn(
                'block px-3 py-2 rounded-md text-base font-medium transition-colors',
                pathname === '/settings'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                System configuration and service status monitoring
              </p>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}