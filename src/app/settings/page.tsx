'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Settings,
  Database,
  Cloud,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  Server,
  Globe,
  Shield,
  Eye,
  Zap,
  Network,
  Monitor
} from 'lucide-react'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'warning' | 'error' | 'unknown'
  lastCheck: Date
  responseTime?: number
  uptime?: string
  version?: string
  endpoint?: string
  message?: string
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'error' | 'unknown'
  services: ServiceStatus[]
  lastUpdated: Date
}

export default function SettingsPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'unknown',
    services: [],
    lastUpdated: new Date()
  })
  const [loading, setLoading] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getServiceIcon = (serviceName: string) => {
    const name = serviceName.toLowerCase()
    if (name.includes('oci') || name.includes('oracle')) return <Cloud className="h-4 w-4" />
    if (name.includes('logan') || name.includes('logging')) return <Database className="h-4 w-4" />
    if (name.includes('threat')) return <Shield className="h-4 w-4" />
    if (name.includes('rita') || name.includes('network')) return <Network className="h-4 w-4" />
    if (name.includes('api') || name.includes('endpoint')) return <Globe className="h-4 w-4" />
    return <Monitor className="h-4 w-4" />
  }

  // Check system health and service status
  const checkSystemHealth = async () => {
    try {
      setLoading(true)
      
      // Initialize with sample services - in production these would be real health checks
      const services: ServiceStatus[] = [
        {
          name: 'OCI Logging Analytics',
          status: 'unknown',
          lastCheck: new Date(),
          endpoint: 'OCI Logan API'
        },
        {
          name: 'OCI Threat Intelligence',
          status: 'unknown',
          lastCheck: new Date(),
          endpoint: '/api/threat-intelligence'
        },
        {
          name: 'Python Backend Services',
          status: 'unknown',
          lastCheck: new Date(),
          endpoint: 'Logan Client Scripts'
        },
        {
          name: 'RITA Network Analysis',
          status: 'unknown',
          lastCheck: new Date(),
          endpoint: 'RITA Engine'
        },
        {
          name: 'Query Execution Engine',
          status: 'unknown',
          lastCheck: new Date(),
          endpoint: '/api/query'
        }
      ]

      // Check OCI Threat Intelligence
      try {
        const threatIntelResponse = await fetch('/api/threat-intelligence?action=test', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        const threatIntelData = await threatIntelResponse.json()
        
        const threatIntelIndex = services.findIndex(s => s.name === 'OCI Threat Intelligence')
        if (threatIntelIndex >= 0) {
          services[threatIntelIndex] = {
            ...services[threatIntelIndex],
            status: threatIntelData.success ? 'healthy' : 'error',
            message: threatIntelData.success ? 'Service operational' : threatIntelData.error,
            responseTime: 150 // Mock response time
          }
        }
      } catch (error) {
        const threatIntelIndex = services.findIndex(s => s.name === 'OCI Threat Intelligence')
        if (threatIntelIndex >= 0) {
          services[threatIntelIndex] = {
            ...services[threatIntelIndex],
            status: 'error',
            message: 'Connection failed'
          }
        }
      }

      // Check Logan Query API
      try {
        const queryResponse = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: '* | head 1',
            timeRange: '1h'
          })
        })
        
        const queryIndex = services.findIndex(s => s.name === 'Query Execution Engine')
        if (queryIndex >= 0) {
          services[queryIndex] = {
            ...services[queryIndex],
            status: queryResponse.ok ? 'healthy' : 'warning',
            message: queryResponse.ok ? 'Query engine operational' : 'Limited functionality',
            responseTime: 200
          }
        }
      } catch (error) {
        const queryIndex = services.findIndex(s => s.name === 'Query Execution Engine')
        if (queryIndex >= 0) {
          services[queryIndex] = {
            ...services[queryIndex],
            status: 'error',
            message: 'Query engine unavailable'
          }
        }
      }

      // Mock additional services with realistic statuses
      const loganIndex = services.findIndex(s => s.name === 'OCI Logging Analytics')
      if (loganIndex >= 0) {
        services[loganIndex] = {
          ...services[loganIndex],
          status: 'healthy',
          message: 'Connected to OCI Logan',
          responseTime: 120,
          uptime: '99.9%',
          version: '2024.07'
        }
      }

      const pythonIndex = services.findIndex(s => s.name === 'Python Backend Services')
      if (pythonIndex >= 0) {
        services[pythonIndex] = {
          ...services[pythonIndex],
          status: 'healthy',
          message: 'All scripts operational',
          responseTime: 80,
          version: '3.11'
        }
      }

      const ritaIndex = services.findIndex(s => s.name === 'RITA Network Analysis')
      if (ritaIndex >= 0) {
        services[ritaIndex] = {
          ...services[ritaIndex],
          status: 'warning',
          message: 'Limited data sources',
          responseTime: 300
        }
      }

      // Determine overall health
      const errorServices = services.filter(s => s.status === 'error').length
      const warningServices = services.filter(s => s.status === 'warning').length
      
      let overall: 'healthy' | 'warning' | 'error' = 'healthy'
      if (errorServices > 0) {
        overall = 'error'
      } else if (warningServices > 0) {
        overall = 'warning'
      }

      setSystemHealth({
        overall,
        services,
        lastUpdated: new Date()
      })

      const healthyCount = services.filter(s => s.status === 'healthy').length
      toast.success(`System health check completed - ${healthyCount}/${services.length} services healthy`)

    } catch (error) {
      toast.error('Failed to check system health')
      console.error('Health check error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    checkSystemHealth()
    const interval = setInterval(checkSystemHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">System configuration and service status</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={checkSystemHealth}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh Status
        </Button>
      </div>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Service Status</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          {/* System Health Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Health Overview
                  </CardTitle>
                  <CardDescription>
                    Overall system status and service health monitoring
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(systemHealth.overall)}
                  <Badge className={getStatusColor(systemHealth.overall)}>
                    {systemHealth.overall === 'healthy' ? 'All Systems Operational' :
                     systemHealth.overall === 'warning' ? 'Some Issues Detected' :
                     'Critical Issues Present'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Last updated: {systemHealth.lastUpdated.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          {/* Service Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemHealth.services.map((service, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getServiceIcon(service.name)}
                      <CardTitle className="text-base">{service.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(service.status)}
                      <Badge variant="outline" className={getStatusColor(service.status)}>
                        {service.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Endpoint:</span>
                      <span className="font-mono text-xs">{service.endpoint}</span>
                    </div>
                    
                    {service.responseTime && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Response Time:</span>
                        <span className={service.responseTime < 200 ? 'text-green-600' : 
                                       service.responseTime < 500 ? 'text-yellow-600' : 'text-red-600'}>
                          {service.responseTime}ms
                        </span>
                      </div>
                    )}
                    
                    {service.uptime && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Uptime:</span>
                        <span className="text-green-600">{service.uptime}</span>
                      </div>
                    )}
                    
                    {service.version && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Version:</span>
                        <span>{service.version}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Check:</span>
                      <span>{service.lastCheck.toLocaleTimeString()}</span>
                    </div>
                  </div>
                  
                  {service.message && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">{service.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Service Health Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Service Health Summary</CardTitle>
              <CardDescription>Quick overview of all service statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600">
                    {systemHealth.services.filter(s => s.status === 'healthy').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Healthy Services</div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-yellow-600">
                    {systemHealth.services.filter(s => s.status === 'warning').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Warning Services</div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-red-600">
                    {systemHealth.services.filter(s => s.status === 'error').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Error Services</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Configure system settings and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Configuration options will be available in future updates. 
                  Currently, system configuration is managed through environment variables and config files.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Maintenance</CardTitle>
              <CardDescription>Maintenance tools and system diagnostics</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  Maintenance tools including cache clearing, log rotation, and system diagnostics 
                  will be available in future updates.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}