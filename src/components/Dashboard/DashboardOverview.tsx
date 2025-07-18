'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getMCPApi } from '@/lib/api/mcp-api'
import { DashboardStats } from '@/types'
import { AlertTriangle, Shield, Users, Activity, Database, AlertCircle } from 'lucide-react'
import { safeToLocaleString } from '@/lib/format'

interface StatCardProps {
  title: string
  value: number | string
  description?: string
  icon: React.ReactNode
  trend?: number
  className?: string
}

function StatCard({ title, value, description, icon, trend, className = '' }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend !== undefined && (
          <p className={`text-xs ${trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {trend > 0 ? '+' : ''}{trend}% from last hour
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  async function loadStats() {
    try {
      const api = getMCPApi()
      const data = await api.getDashboardStats()
      if (data) {
        setStats(data)
      }
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20 bg-gray-200" />
            <CardContent className="h-20 bg-gray-100" />
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-500">
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">Error loading dashboard: {error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Failed Logins"
        value={stats.failedLogins}
        description="Authentication failures"
        icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
        trend={12}
        className="border-orange-200"
      />
      
      <StatCard
        title="Privilege Escalations"
        value={stats.privilegeEscalations}
        description="Unauthorized access attempts"
        icon={<Shield className="h-4 w-4 text-red-500" />}
        trend={-5}
        className="border-red-200"
      />
      
      <StatCard
        title="Blocked Connections"
        value={stats.blockedConnections}
        description="Network threats blocked"
        icon={<Shield className="h-4 w-4 text-green-500" />}
        className="border-green-200"
      />
      
      <StatCard
        title="Critical Alerts"
        value={stats.criticalAlerts}
        description="Requires immediate attention"
        icon={<AlertCircle className="h-4 w-4 text-red-600" />}
        className="border-red-300 bg-red-50"
      />
      
      <StatCard
        title="Total Events"
        value={safeToLocaleString(stats?.totalEvents)}
        description="Last 24 hours"
        icon={<Activity className="h-4 w-4 text-blue-500" />}
      />
      
      <StatCard
        title="Unique Sources"
        value={stats.uniqueSources}
        description="Active log sources"
        icon={<Database className="h-4 w-4 text-purple-500" />}
      />
    </div>
  )
}
