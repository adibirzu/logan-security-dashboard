'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Activity, 
  Users, 
  Server, 
  Globe,
  Eye,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Wifi,
  Database,
  BarChart3,
  PieChart,
  Target,
  Network,
  FileText,
  Settings,
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Security Metrics Cards
const securityMetrics = [
  {
    title: 'Security Score',
    value: '94',
    unit: '/100',
    change: '+2.1%',
    trend: 'up',
    icon: Shield,
    color: 'emerald',
    description: 'Overall security posture'
  },
  {
    title: 'Active Threats',
    value: '12',
    unit: '',
    change: '-15%',
    trend: 'down',
    icon: AlertTriangle,
    color: 'red',
    description: 'Detected security threats'
  },
  {
    title: 'Risk Events',
    value: '247',
    unit: '',
    change: '+5.2%',
    trend: 'up',
    icon: Activity,
    color: 'orange',
    description: 'Risk events this week'
  },
  {
    title: 'Compliance',
    value: '98.7',
    unit: '%',
    change: '+0.3%',
    trend: 'up',
    icon: CheckCircle,
    color: 'blue',
    description: 'Compliance coverage'
  }
]

// System Status Items
const systemStatus = [
  {
    name: 'OCI Logging Analytics',
    status: 'operational',
    latency: '12ms',
    uptime: '99.9%'
  },
  {
    name: 'Threat Detection Engine',
    status: 'operational',
    latency: '8ms',
    uptime: '99.8%'
  },
  {
    name: 'Data Ingestion Pipeline',
    status: 'warning',
    latency: '45ms',
    uptime: '99.5%'
  },
  {
    name: 'Alert Processing',
    status: 'operational',
    latency: '3ms',
    uptime: '99.9%'
  }
]

// Recent Activities
const recentActivities = [
  {
    id: 1,
    type: 'threat',
    title: 'Suspicious login attempt detected',
    description: 'Multiple failed login attempts from IP 192.168.1.100',
    time: '2 minutes ago',
    severity: 'high',
    icon: AlertTriangle
  },
  {
    id: 2,
    type: 'network',
    title: 'Unusual network activity',
    description: 'High data transfer volume detected in VCN subnet',
    time: '15 minutes ago',
    severity: 'medium',
    icon: Network
  },
  {
    id: 3,
    type: 'compliance',
    title: 'Compliance scan completed',
    description: 'PCI DSS compliance check passed with 98.7% score',
    time: '1 hour ago',
    severity: 'low',
    icon: CheckCircle
  },
  {
    id: 4,
    type: 'system',
    title: 'System maintenance scheduled',
    description: 'Scheduled maintenance window for security updates',
    time: '2 hours ago',
    severity: 'info',
    icon: Settings
  }
]

// Top Threat Sources
const threatSources = [
  { country: 'China', count: 45, percentage: 35 },
  { country: 'Russia', count: 32, percentage: 25 },
  { country: 'North Korea', count: 20, percentage: 15 },
  { country: 'Iran', count: 15, percentage: 12 },
  { country: 'Other', count: 17, percentage: 13 }
]

export default function ModernDashboard() {
  const [timeRange, setTimeRange] = useState('24h')
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdate(new Date())
    setRefreshing(false)
  }

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

      {/* Security Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {securityMetrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${getMetricColor(metric.color)}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline space-x-2">
                  <div className="text-3xl font-bold text-neutral-900 dark:text-white">
                    {metric.value}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    {metric.unit}
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <div className={`flex items-center text-sm ${
                    metric.trend === 'up' 
                      ? metric.color === 'red' ? 'text-red-600' : 'text-green-600'
                      : metric.trend === 'down'
                      ? metric.color === 'red' ? 'text-green-600' : 'text-red-600'
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
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Dashboard Grid */}
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
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const Icon = activity.icon
                return (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className={`p-2 rounded-lg ${getSeverityColor(activity.severity)}`}>
                      <Icon className="h-4 w-4" />
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
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                View All Activities
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
              { name: 'Advanced Analytics', icon: BarChart3, href: '/advanced-analytics' }
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