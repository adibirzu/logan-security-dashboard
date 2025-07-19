'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Network,
  Shield,
  User,
  Database,
  Search,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  X
} from 'lucide-react'

interface IPLog {
  Time: string
  'Event Name': string
  'Log Source': string
  'Source IP': string
  'Destination IP': string
  'Destination Port'?: string
  Action?: string
  'User Name'?: string
  'Event Type'?: string
  [key: string]: any
}

interface IPLogData {
  success: boolean
  ip: string
  timeRange: string
  totalLogs: number
  categories: {
    network: number
    authentication: number
    security: number
    other: number
  }
  logs: {
    network: IPLog[]
    authentication: IPLog[]
    security: IPLog[]
    other: IPLog[]
  }
  allLogs: IPLog[]
  error?: string
}

interface IPLogViewerProps {
  ip?: string
  onClose?: () => void
  timeRange?: string
}

export default function IPLogViewer({ ip: initialIP, onClose, timeRange = '24h' }: IPLogViewerProps) {
  const [ip, setIp] = useState(initialIP || '')
  const [logData, setLogData] = useState<IPLogData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchFilter, setSearchFilter] = useState('')

  const fetchIPLogs = useCallback(async (targetIP: string, range: string = timeRange) => {
    if (!targetIP.trim()) {
      toast.error('Please enter an IP address')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/ip-logs?ip=${encodeURIComponent(targetIP)}&timeRange=${range}`)
      const data = await response.json()

      if (data.success) {
        setLogData(data)
        toast.success(`Found ${data.totalLogs} logs for IP ${targetIP}`)
      } else {
        toast.error(`Failed to fetch logs: ${data.error}`)
        setLogData(null)
      }
    } catch (error) {
      console.error('Error fetching IP logs:', error)
      toast.error('Failed to fetch IP logs')
      setLogData(null)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    if (initialIP) {
      fetchIPLogs(initialIP, timeRange)
    }
  }, [initialIP, timeRange, fetchIPLogs])

  const getLogIcon = (category: string) => {
    switch (category) {
      case 'network': return <Network className="h-4 w-4" />
      case 'authentication': return <User className="h-4 w-4" />
      case 'security': return <Shield className="h-4 w-4" />
      default: return <Database className="h-4 w-4" />
    }
  }

  const getEventSeverity = (log: IPLog) => {
    const eventName = log['Event Name']?.toLowerCase() || ''
    const action = log.Action?.toLowerCase() || ''
    
    if (eventName.includes('failed') || eventName.includes('error') || action === 'deny' || action === 'reject') {
      return 'high'
    }
    if (eventName.includes('warning') || eventName.includes('alert')) {
      return 'medium'
    }
    if (eventName.includes('success') || action === 'allow' || action === 'accept') {
      return 'low'
    }
    return 'info'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-3 w-3" />
      case 'medium': return <Info className="h-3 w-3" />
      case 'low': return <CheckCircle className="h-3 w-3" />
      default: return <Info className="h-3 w-3" />
    }
  }

  const formatTime = (timeStr: string) => {
    try {
      return new Date(timeStr).toLocaleString()
    } catch {
      return timeStr
    }
  }

  const getFilteredLogs = () => {
    if (!logData) return []
    
    let logs: IPLog[] = []
    if (selectedCategory === 'all') {
      logs = logData.allLogs
    } else {
      logs = logData.logs[selectedCategory as keyof typeof logData.logs] || []
    }

    if (searchFilter.trim()) {
      logs = logs.filter(log => 
        Object.values(log).some(value => 
          String(value).toLowerCase().includes(searchFilter.toLowerCase())
        )
      )
    }

    return logs
  }

  const exportLogs = () => {
    if (!logData) return
    
    const logs = getFilteredLogs()
    const csv = [
      // Header
      'Time,Event Name,Log Source,Source IP,Destination IP,Destination Port,Action,User Name,Event Type',
      // Data
      ...logs.map(log => [
        log.Time,
        log['Event Name'] || '',
        log['Log Source'] || '',
        log['Source IP'] || '',
        log['Destination IP'] || '',
        log['Destination Port'] || '',
        log.Action || '',
        log['User Name'] || '',
        log['Event Type'] || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ip-logs-${ip}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Logs exported successfully')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                IP Log Analysis
              </CardTitle>
              <CardDescription>
                Search and analyze logs related to specific IP addresses
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="ip-search">IP Address</Label>
              <Input
                id="ip-search"
                placeholder="Enter IP address (e.g., 192.168.1.100)"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchIPLogs(ip)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button 
                onClick={() => fetchIPLogs(ip)}
                disabled={loading || !ip.trim()}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search Logs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {logData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Logs</p>
                    <p className="text-lg font-semibold">{logData.totalLogs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Network className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Network</p>
                    <p className="text-lg font-semibold">{logData.categories.network}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Authentication</p>
                    <p className="text-lg font-semibold">{logData.categories.authentication}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Security</p>
                    <p className="text-lg font-semibold">{logData.categories.security}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Other</p>
                    <p className="text-lg font-semibold">{logData.categories.other}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Log Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Log Details for {logData.ip}</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Filter logs..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-64"
                  />
                  <Button variant="outline" size="sm" onClick={exportLogs}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList>
                  <TabsTrigger value="all">All ({logData.totalLogs})</TabsTrigger>
                  <TabsTrigger value="network">Network ({logData.categories.network})</TabsTrigger>
                  <TabsTrigger value="authentication">Auth ({logData.categories.authentication})</TabsTrigger>
                  <TabsTrigger value="security">Security ({logData.categories.security})</TabsTrigger>
                  <TabsTrigger value="other">Other ({logData.categories.other})</TabsTrigger>
                </TabsList>

                <TabsContent value={selectedCategory} className="mt-4">
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {getFilteredLogs().map((log, index) => {
                        const severity = getEventSeverity(log)
                        return (
                          <Card key={index} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {getSeverityIcon(severity)}
                                    <h4 className="font-medium text-sm">{log['Event Name'] || 'Unknown Event'}</h4>
                                    <Badge className={getSeverityColor(severity)}>
                                      {severity}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {log['Log Source']} • {formatTime(log.Time)}
                                  </p>
                                </div>
                                {log.Action && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.Action}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="font-medium">Source:</span> {log['Source IP'] || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Destination:</span> {log['Destination IP'] || 'N/A'}
                                  {log['Destination Port'] && `:${log['Destination Port']}`}
                                </div>
                                <div>
                                  <span className="font-medium">User:</span> {log['User Name'] || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                      
                      {getFilteredLogs().length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No logs found matching the current filters</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {loading && (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Searching logs for {ip}...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!logData && !loading && ip && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Enter an IP address and click &quot;Search Logs&quot; to find related log entries.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}