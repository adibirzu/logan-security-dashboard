'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  Server, 
  Globe,
  Eye,
  Zap,
  Clock,
  CheckCircle,
  Database,
  BarChart3,
  Target,
  Network,
  Settings,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  HelpCircle
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Icon mapping for dynamic icons
const iconMap = {
  AlertTriangle,
  Users,
  Network,
  CheckCircle,
  Activity,
  Settings
}

// Types for data structures
interface SecurityMetric {
  value: number
  change: string
  trend: string
}

interface SecurityMetrics {
  securityScore: SecurityMetric
  activeThreats: SecurityMetric
  riskEvents: SecurityMetric
  compliance: SecurityMetric
}

interface SystemStatusItem {
  name: string
  status: string
  latency: string
  uptime: string
}

interface Activity {
  id: number
  type: string
  title: string
  description: string
  time: string
  severity: string
  icon: string
}

interface ThreatSource {
  country: string
  count: number
  percentage: number
}

// Static metrics configuration
const metricsConfig = [
  {
    key: 'securityScore' as keyof SecurityMetrics,
    title: 'Security Score',
    unit: '/100',
    icon: Shield,
    color: 'emerald',
    description: 'Overall security posture'
  },
  {
    key: 'activeThreats' as keyof SecurityMetrics,
    title: 'Active Threats',
    unit: '',
    icon: AlertTriangle,
    color: 'red',
    description: 'Detected security threats'
  },
  {
    key: 'riskEvents' as keyof SecurityMetrics,
    title: 'Risk Events',
    unit: '',
    icon: Activity,
    color: 'orange',
    description: 'Risk events this week'
  },
  {
    key: 'compliance' as keyof SecurityMetrics,
    title: 'Compliance',
    unit: '%',
    icon: CheckCircle,
    color: 'blue',
    description: 'Compliance coverage'
  }
]


export default function ModernDashboard() {
  const [timeRange, setTimeRange] = useState('24h')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  
  // Real data state
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatusItem[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [threatSources, setThreatSources] = useState<ThreatSource[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null)
      const [metricsRes, statusRes, activitiesRes, threatsRes] = await Promise.all([
        fetch(`/api/dashboard/metrics?timeRange=${timeRange}`),
        fetch('/api/dashboard/system-status'),
        fetch('/api/dashboard/activities?limit=10'),
        fetch(`/api/dashboard/threats?timeRange=${timeRange}`)
      ])
      
      const [metricsData, statusData, activitiesData, threatsData] = await Promise.all([
        metricsRes.json(),
        statusRes.json(),
        activitiesRes.json(),
        threatsRes.json()
      ])
      
      if (metricsData.success) setMetrics(metricsData.data)
      if (statusData.success) setSystemStatus(statusData.data)
      if (activitiesData.success) setActivities(activitiesData.data)
      if (threatsData.success) setThreatSources(threatsData.data)
      
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeRange])
  
  // Initial data load and auto-refresh
  useEffect(() => {
    fetchDashboardData()
    
    const interval = setInterval(() => {
      fetchDashboardData()
    }, 60000) // Refresh every minute
    
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }, [fetchDashboardData])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-100'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'critical':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100 border-red-200'
      case 'medium':
        return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'low':
        return 'text-green-600 bg-green-100 border-green-200'
      case 'info':
        return 'text-blue-600 bg-blue-100 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getMetricColor = (color: string) => {
    const colors = {
      emerald: 'text-emerald-600',
      red: 'text-red-600',
      orange: 'text-orange-600',
      blue: 'text-blue-600'
    }
    return colors[color as keyof typeof colors] || 'text-gray-600'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4" />
      case 'down':
        return <ArrowDownRight className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Security Overview</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Tabs value={timeRange} onValueChange={setTimeRange}>
            <TabsList>
              <TabsTrigger value="1h">1H</TabsTrigger>
              <TabsTrigger value="24h">24H</TabsTrigger>
              <TabsTrigger value="7d">7D</TabsTrigger>
              <TabsTrigger value="30d">30D</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
        </div>
      )}

      {/* Security Metrics Grid */}
      {!loading && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricsConfig.map((config) => {
            const metric = metrics[config.key]
            const Icon = config.icon
            return (
              <Card key={config.title} className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    {config.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${getMetricColor(config.color)}`} />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline space-x-2">
                    <div className="text-3xl font-bold text-neutral-900 dark:text-white">
                      {metric.value}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      {config.unit}
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <div className={`flex items-center text-sm ${
                      metric.trend === 'up' 
                        ? config.color === 'red' ? 'text-red-600' : 'text-green-600'
                        : metric.trend === 'down'
                        ? config.color === 'red' ? 'text-green-600' : 'text-red-600'
                        : 'text-gray-600'
                    }`}>
                      {getTrendIcon(metric.trend)}
                      <span className="ml-1">{metric.change}</span>
                    </div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
                      vs last period
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    {config.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Main Dashboard Grid */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* System Status */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                System Status
              </CardTitle>
              <CardDescription>
                Real-time monitoring of security infrastructure components
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemStatus.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No system status data available
                </div>
              ) : (
                <div className="space-y-4">
                  {systemStatus.map((system) => (
                    <div key={system.name} className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          system.status === 'operational' ? 'bg-green-500' :
                          system.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">{system.name}</p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Latency: {system.latency} • Uptime: {system.uptime}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(system.status)}>
                        {system.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Threat Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Top Threat Sources
              </CardTitle>
              <CardDescription>
                Geographic distribution of security threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              {threatSources.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No threat data available for selected time range
                </div>
              ) : (
                <div className="space-y-4">
                  {threatSources.map((source) => (
                    <div key={source.country} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-5 bg-neutral-200 dark:bg-neutral-700 rounded-sm flex items-center justify-center">
                          <span className="text-xs font-medium">{source.country.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          {source.country}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-20">
                          <Progress value={source.percentage} className="h-2" />
                        </div>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400 w-8 text-right">
                          {source.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Security Activities */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Recent Security Activities
              </CardTitle>
              <CardDescription>
                Latest security events and system activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activities found</p>
                  <p className="text-sm">Activities will appear here as they occur</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {activities.map((activity) => {
                      const IconComponent = iconMap[activity.icon as keyof typeof iconMap] || Activity
                      return (
                        <div key={activity.id} className="flex items-start space-x-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                          <div className={`p-2 rounded-lg ${getSeverityColor(activity.severity)}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {activity.title}
                            </p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                              {activity.description}
                            </p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                              {activity.time}
                            </p>
                          </div>
                          <Badge className={getSeverityColor(activity.severity)}>
                            {activity.severity}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-6 text-center">
                    <Button variant="outline" className="w-full" asChild>
                      <a href="/threat-hunting">
                        <Eye className="h-4 w-4 mr-2" />
                        View All Activities
                      </a>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Frequently used security operations and tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'Query Builder', icon: Database, href: '/query-builder' },
              { name: 'Threat Hunt', icon: Target, href: '/threat-analytics' },
              { name: 'RITA Analysis', icon: Eye, href: '/rita-discovery' },
              { name: 'Network Map', icon: Network, href: '/threat-map' },
              { name: 'Compute Status', icon: Server, href: '/compute' },
              { name: 'Advanced Analytics', icon: BarChart3, href: '/advanced-analytics' },
              { name: 'Help', icon: HelpCircle, href: '/help' }
            ].map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.name}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  asChild
                >
                  <a href={action.href}>
                    <Icon className="h-6 w-6" />
                    <span className="text-xs text-center">{action.name}</span>
                  </a>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}