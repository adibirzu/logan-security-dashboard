'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, FileText, Clock, Server, AlertTriangle, Search, Download, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { safeDateToLocaleString } from '@/lib/format'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LogEntry {
  Time?: string
  'Log Source'?: string
  'Source IP'?: string
  'Destination IP'?: string
  'Source Port'?: string | number
  'Destination Port'?: string | number
  Action?: string
  Protocol?: string
  Bytes?: string | number
  Packets?: string | number
  'Event Name'?: string
  'Principal Name'?: string
  'Resource Name'?: string
  _source?: string
  _selection_type?: string
  _selection_value?: string
  [key: string]: any
}

interface LogViewerCardProps {
  selectionType: string | null
  selectionValue: string | null
  timeRange: string
  onClose?: () => void
}

const LogViewerCard: React.FC<LogViewerCardProps> = ({
  selectionType,
  selectionValue,
  timeRange,
  onClose
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  // Get unique values for filters
  const uniqueSources = Array.from(new Set((logs || []).map(log => log._source || log['Log Source'] || 'Unknown')))
  const uniqueActions = Array.from(new Set((logs || []).map(log => log.Action || 'Unknown')))

  const fetchLogs = useCallback(async () => {
    if (!selectionType || !selectionValue) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        selectionType,
        selectionValue,
        timeRange
      })

      const response = await fetch(`/api/rita/logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs || [])
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch logs')
        setLogs([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [selectionType, selectionValue, timeRange])

  useEffect(() => {
    if (selectionType && selectionValue) {
      fetchLogs()
    }
  }, [selectionType, selectionValue, timeRange, fetchLogs])

  useEffect(() => {
    // Apply filters
    let filtered = logs || []

    if (searchTerm) {
      filtered = filtered.filter(log => 
        JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(log => 
        (log._source || log['Log Source'] || 'Unknown') === sourceFilter
      )
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => 
        (log.Action || 'Unknown') === actionFilter
      )
    }

    setFilteredLogs(filtered)
  }, [logs, searchTerm, sourceFilter, actionFilter])

  const formatTimestamp = (timestamp: string | undefined) => {
    return safeDateToLocaleString(timestamp, 'Unknown')
  }

  const formatBytes = (bytes: string | number | undefined) => {
    if (!bytes) return '0 B'
    const num = typeof bytes === 'string' ? parseInt(bytes) : bytes
    if (isNaN(num)) return '0 B'
    
    const units = ['B', 'KB', 'MB', 'GB']
    let size = num
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const getActionBadgeVariant = (action: string | undefined) => {
    switch (action?.toUpperCase()) {
      case 'ACCEPT':
        return 'default'
      case 'REJECT':
      case 'DROP':
      case 'DENY':
        return 'destructive'
      case 'ALLOW':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `logs_${selectionType}_${selectionValue}_${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!selectionType || !selectionValue) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log Viewer
          </CardTitle>
          <CardDescription>
            Select an item from the graph to view related logs
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No selection made</p>
            <p className="text-sm">Click on a graph node or edge to see related logs</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Log Viewer
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
                  ×
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              Logs for {selectionType}: <span className="font-mono">{selectionValue}</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {filteredLogs.length} logs
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {uniqueSources.map(source => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading logs...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && filteredLogs.length === 0 && (
          <div className="flex items-center justify-center h-64 text-center text-muted-foreground">
            <div>
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No logs found</p>
              <p className="text-sm">Try adjusting the time range or filters</p>
            </div>
          </div>
        )}

        {!loading && !error && filteredLogs.length > 0 && (
          <Tabs defaultValue="list" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Log List</TabsTrigger>
              <TabsTrigger value="details">Log Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {filteredLogs.map((log, index) => (
                    <Card 
                      key={index} 
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedLog === log ? 'bg-muted border-primary' : ''
                      }`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <Server className="h-3 w-3 mr-1" />
                              {log._source || log['Log Source'] || 'Unknown'}
                            </Badge>
                            {log.Action && (
                              <Badge variant={getActionBadgeVariant(log.Action)} className="text-xs">
                                {log.Action}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTimestamp(log.Time)}
                          </div>
                        </div>
                        
                        <div className="text-sm space-y-1">
                          {log['Source IP'] && log['Destination IP'] && (
                            <div className="font-mono">
                              {log['Source IP']}
                              {log['Source Port'] && `:${log['Source Port']}`}
                              {' → '}
                              {log['Destination IP']}
                              {log['Destination Port'] && `:${log['Destination Port']}`}
                            </div>
                          )}
                          
                          {log['Event Name'] && (
                            <div className="text-muted-foreground">
                              Event: {log['Event Name']}
                            </div>
                          )}
                          
                          {log['Principal Name'] && (
                            <div className="text-muted-foreground">
                              User: {log['Principal Name']}
                            </div>
                          )}
                          
                          {log.Bytes && (
                            <div className="text-muted-foreground">
                              Bytes: {formatBytes(log.Bytes)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="details" className="flex-1 overflow-hidden">
              {selectedLog ? (
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Log Details</h4>
                      <Card>
                        <CardContent className="p-4">
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(selectedLog, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Parsed Fields</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(selectedLog).map(([key, value]) => (
                          <div key={key} className="flex justify-between p-2 bg-muted rounded text-sm">
                            <span className="font-medium">{key}:</span>
                            <span className="ml-2 break-all">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                  <div>
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a log entry</p>
                    <p className="text-sm">Click on a log from the list to see details</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

export default LogViewerCard