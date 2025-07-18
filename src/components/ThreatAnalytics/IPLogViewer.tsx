'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  X, 
  Search, 
  Download,
  Globe,
  Network,
  Shield,
  Activity,
  RefreshCw,
  Filter,
  Copy
} from 'lucide-react'
import { copyToClipboard } from '@/lib/clipboard'
import { safeDateToLocaleString, formatBytes } from '@/lib/format'

interface LogEntry {
  time: string
  logSource: string
  type: string
  [key: string]: any
}

interface IPLogViewerProps {
  ip: string
  timeRange: string
  onClose: () => void
}

export default function IPLogViewer({ ip, timeRange, onClose }: IPLogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [logSourceFilter, setLogSourceFilter] = useState('all')
  const [stats, setStats] = useState({
    totalLogs: 0,
    logSources: [] as string[]
  })

  const getTimePeriodMinutes = (range: string): number => {
    switch (range) {
      case '1h': return 60
      case '6h': return 360
      case '24h': return 1440
      case '7d': return 10080
      case '30d': return 43200
      default: return 1440
    }
  }

  const fetchIPLogs = useCallback(async () => {
    setLoading(true)
    try {
      console.log('Fetching logs for IP:', ip, 'timeRange:', timeRange)
      
      const response = await fetch('/api/graph/ip-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ip,
          timeRange: getTimePeriodMinutes(timeRange)
        })
      })

      const data = await response.json()
      console.log('IP Logs API Response:', data)

      if (data.success) {
        console.log(`Received ${data.logs.length} logs for IP ${ip}`)
        setLogs(data.logs || [])
        setStats({
          totalLogs: data.totalLogs || 0,
          logSources: data.logSources || []
        })
      } else {
        console.error('Failed to fetch IP logs:', data.error, data.details)
        setLogs([])
        setStats({
          totalLogs: 0,
          logSources: []
        })
      }
    } catch (error) {
      console.error('Error fetching IP logs:', error)
      setLogs([])
      setStats({
        totalLogs: 0,
        logSources: []
      })
    } finally {
      setLoading(false)
    }
  }, [ip, timeRange])

  const filterLogs = useCallback(() => {
    let filtered = logs

    // Filter by log source
    if (logSourceFilter !== 'all') {
      filtered = filtered.filter(log => log.logSource === logSourceFilter)
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(log => 
        JSON.stringify(log).toLowerCase().includes(searchLower)
      )
    }

    setFilteredLogs(filtered)
  }, [logs, logSourceFilter, searchTerm])

  useEffect(() => {
    fetchIPLogs()
  }, [ip, timeRange, fetchIPLogs])

  useEffect(() => {
    filterLogs()
  }, [logs, searchTerm, logSourceFilter, filterLogs])

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `ip-logs-${ip}-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'Network Flow':
        return <Network className="h-4 w-4" />
      case 'Audit Event':
        return <Shield className="h-4 w-4" />
      case 'HTTP Request':
        return <Globe className="h-4 w-4" />
      case 'WAF Event':
        return <Shield className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getLogColor = (logSource: string) => {
    switch (logSource) {
      case 'VCN Flow Logs':
        return 'blue'
      case 'Audit Logs':
        return 'purple'
      case 'Load Balancer Logs':
        return 'green'
      case 'WAF Logs':
        return 'orange'
      default:
        return 'default'
    }
  }

  const renderLogEntry = (log: LogEntry) => {
    switch (log.type) {
      case 'Network Flow':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {log.role === 'Source' ? `${log.sourceIP} → ${log.destIP}` : `${log.sourceIP} → ${log.destIP}`}
              </span>
              <Badge variant={log.action === 'REJECT' ? 'destructive' : 'default'} className="text-xs">
                {log.action}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {log.protocol} • Port {log.role === 'Source' ? log.sourcePort : log.destPort} • 
              {formatBytes(log.bytes)} • {log.packets} packets
            </div>
          </div>
        )
      
      case 'Audit Event':
        return (
          <div className="space-y-1">
            <div className="font-medium">{log.eventName}</div>
            <div className="text-sm text-muted-foreground">
              Principal: {log.principal || 'Unknown'}
            </div>
            {log.targetResource && (
              <div className="text-sm text-muted-foreground">
                Target: {log.targetResource}
              </div>
            )}
          </div>
        )
      
      case 'HTTP Request':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{log.method} {log.url}</span>
              <Badge variant={log.status >= 400 ? 'destructive' : 'default'} className="text-xs">
                {log.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Backend: {log.backendIP} • Response: {log.responseTime}ms
            </div>
          </div>
        )
      
      case 'WAF Event':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{log.method} {log.url}</span>
              <Badge variant={log.action === 'BLOCK' ? 'destructive' : 'default'} className="text-xs">
                {log.action}
              </Badge>
              {log.status && (
                <Badge variant={log.status >= 400 ? 'destructive' : 'outline'} className="text-xs">
                  {log.status}
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {log.ruleId && <span>Rule: {log.ruleId} • </span>}
              {log.countryCode && <span>Country: {log.countryCode} • </span>}
              {log.xForwardedFor && <span>X-Forwarded-For: {log.xForwardedFor}</span>}
            </div>
            {log.userAgent && (
              <div className="text-xs text-muted-foreground truncate">
                User-Agent: {log.userAgent}
              </div>
            )}
          </div>
        )
      
      default:
        return (
          <div className="text-sm">
            {Object.entries(log)
              .filter(([key]) => !['time', 'logSource', 'type'].includes(key))
              .map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
          </div>
        )
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Logs for IP: {ip}
            </CardTitle>
            <CardDescription>
              Showing {filteredLogs.length} of {stats.totalLogs} logs from the last {timeRange}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={logSourceFilter}
            onChange={(e) => setLogSourceFilter(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">All Sources</option>
            {stats.logSources.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(ip)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy IP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportLogs}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="oracle-outline"
            size="sm"
            onClick={fetchIPLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Logs */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No logs found for this IP address</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getLogIcon(log.type)}
                      <Badge variant={getLogColor(log.logSource) as any} className="text-xs">
                        {log.logSource}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {safeDateToLocaleString(log.time)}
                      </span>
                    </div>
                  </div>
                  {renderLogEntry(log)}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}