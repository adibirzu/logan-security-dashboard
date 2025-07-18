'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import ModernLayout from '@/components/Layout/ModernLayout'
import { format } from 'date-fns'

import {
  Play,
  Search,
  Copy,
  Download,
  RefreshCw,
  Clock,
  Database,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  Filter,
  Calendar as CalendarIcon,
  User,
  Globe,
  Shield,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Hash,
  MapPin
} from 'lucide-react'

// Enhanced log entry interface matching API response structure
interface LogEntry {
  id: string
  timestamp: string
  rawTimestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical' | 'info'
  source: string
  message: string
  details: string
  sourceIp?: string
  user?: string
  eventName?: string
  compartmentName?: string
  rawData?: any
  parsedData?: any
  [key: string]: any
}

interface QueryResult {
  success: boolean
  results: LogEntry[]
  count: number
  executionTime: number
  error?: string
}

const TIME_RANGES = [
  { label: '1 hour', value: 60 },
  { label: '6 hours', value: 360 },
  { label: '24 hours', value: 1440 },
  { label: '48 hours', value: 2880 },
  { label: '72 hours', value: 4320 },
  { label: 'Custom Period', value: -1 }
]

// Logan working queries interface
interface LoganQuery {
  id: string
  name: string
  description: string
  query: string
  category: string
  tags: string[]
  timeRange: string
  maxResults: number
}

interface LoganCategory {
  name: string
  description: string
  queries: LoganQuery[]
}

const SAMPLE_QUERIES = [
  {
    name: 'Recent Security Events',
    query: "'Log Source' = 'Windows Security Events' and Time > dateRelative(1h) | head 100",
    description: 'Show recent Windows security events from the last hour',
    category: 'basic'
  },
  {
    name: 'Failed Login Attempts',
    query: "'Security Result' = 'denied' and Time > dateRelative(24h) | head 50",
    description: 'Failed authentication attempts in the last 24 hours',
    category: 'basic'
  },
  {
    name: 'Network Activity Analysis',
    query: "'IP Address' != null and Time > dateRelative(6h) | stats count by 'IP Address' | sort count desc | head 20",
    description: 'Top IP addresses by activity in the last 6 hours',
    category: 'basic'
  },
  {
    name: 'Error Events',
    query: "'Event Name' contains 'Error' and Time > dateRelative(2h) | head 100",
    description: 'All error events from the last 2 hours',
    category: 'basic'
  }
]

// Visualization components
const LogMetricsCards = ({ logs }: { logs: LogEntry[] }) => {
  const safelogs = logs || []
  const totalLogs = safelogs.length
  const uniqueSources = new Set(safelogs.map(log => log.source || 'Unknown')).size
  const uniqueIPs = new Set(safelogs.map(log => log.sourceIp).filter(Boolean)).size
  const securityEvents = safelogs.filter(log => log.severity && ['critical', 'high'].includes(log.severity)).length

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLogs.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Log Sources</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{uniqueSources}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{uniqueIPs}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Security Events</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{securityEvents}</div>
        </CardContent>
      </Card>
    </div>
  )
}

const LogsTable = ({ logs, onLogClick }: { logs: LogEntry[], onLogClick: (log: LogEntry) => void }) => {
  const [sortField, setSortField] = useState<string>('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterText, setFilterText] = useState('')

  const safeLogs = logs || []
  const filteredLogs = safeLogs.filter(log => 
    Object.values(log || {}).some(value => 
      String(value).toLowerCase().includes(filterText.toLowerCase())
    )
  )

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const aVal = a[sortField] || ''
    const bVal = b[sortField] || ''
    
    if (sortField === 'timestamp') {
      const aTime = new Date(aVal).getTime()
      const bTime = new Date(bVal).getTime()
      return sortOrder === 'desc' ? bTime - aTime : aTime - bTime
    }
    
    return sortOrder === 'desc' 
      ? String(bVal).localeCompare(String(aVal))
      : String(aVal).localeCompare(String(bVal))
  })

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Query Results ({filteredLogs.length} logs)</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter logs..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-64"
            />
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp">Time</SelectItem>
                <SelectItem value="source">Source</SelectItem>
                <SelectItem value="eventName">Event</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              {sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {sortedLogs.map((log, index) => (
              <Card 
                key={log.id || index} 
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onLogClick(log)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {log.source}
                      </Badge>
                      <Badge className={getSeverityColor(log.severity)}>
                        {log.severity || 'info'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {log.timestamp}
                      </span>
                    </div>
                    
                    <div className="font-medium">{log.eventName || log['Event Name'] || log.message || log.Message || 'Log Entry'}</div>
                    
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        const message = log.message || log.Message || log.details || ''
                        return message && message.length > 100 ? `${message.substring(0, 100)}...` : message
                      })()}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {log.user && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user}
                        </div>
                      )}
                      {log.sourceIp && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {log.sourceIp}
                        </div>
                      )}
                      {log.compartmentName && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {log.compartmentName}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

const LogDetailModal = ({ log, onClose }: { log: LogEntry | null, onClose: () => void }) => {
  if (!log) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Log Details</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(log).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1">
                <Label className="font-medium">{key}</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function QueryLogsPage() {
  const [query, setQuery] = useState('')
  const [timeRange, setTimeRange] = useState(60)
  const [maxResults, setMaxResults] = useState(100)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<LogEntry[]>([])
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [activeTab, setActiveTab] = useState('query')
  const [loganQueries, setLoganQueries] = useState<Record<string, LoganCategory>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('network_analysis')
  const [loadingQueries, setLoadingQueries] = useState(false)
  
  // Custom period state
  const [isCustomPeriod, setIsCustomPeriod] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('23:59')

  // Load Logan working queries on component mount
  React.useEffect(() => {
    const loadLoganQueries = async () => {
      setLoadingQueries(true)
      try {
        const response = await fetch('/api/logan-queries')
        const data = await response.json()
        
        if (data.success) {
          setLoganQueries(data.data.categories || {})
        } else {
          toast.error('Failed to load Logan queries')
        }
      } catch (error) {
        console.error('Error loading Logan queries:', error)
        toast.error('Failed to load Logan queries')
      } finally {
        setLoadingQueries(false)
      }
    }
    
    loadLoganQueries()
  }, [])

  // Handle time range selection
  const handleTimeRangeChange = (value: string) => {
    const numValue = parseInt(value)
    if (numValue === -1) {
      setIsCustomPeriod(true)
      setTimeRange(60) // fallback
    } else {
      setIsCustomPeriod(false)
      setTimeRange(numValue)
    }
  }

  const executeQuery = useCallback(async () => {
    if (!query.trim()) {
      toast.error('Please enter a query')
      return
    }

    // Validate custom period if selected
    if (isCustomPeriod && (!startDate || !endDate)) {
      toast.error('Please select both start and end dates for custom period')
      return
    }

    if (isCustomPeriod && startDate && endDate && startDate > endDate) {
      toast.error('Start date must be before end date')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/mcp/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          timePeriodMinutes: timeRange,
          maxResults,
          bypassValidation: false
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setResults(data.results || [])
        setQueryResult({
          success: true,
          results: data.results || [],
          count: data.count || 0,
          executionTime: data.executionTime || 0
        })
        setActiveTab('results')
        toast.success(`Query executed successfully! Found ${data.count || 0} results.`)
      } else {
        setQueryResult({
          success: false,
          results: [],
          count: 0,
          executionTime: 0,
          error: data.error || 'Query execution failed'
        })
        toast.error(data.error || 'Query execution failed')
      }
    } catch (error) {
      toast.error('Network error: Failed to execute query')
      setQueryResult({
        success: false,
        results: [],
        count: 0,
        executionTime: 0,
        error: 'Network error'
      })
    } finally {
      setLoading(false)
    }
  }, [query, timeRange, maxResults, isCustomPeriod, startDate, endDate])

  const loadSampleQuery = (sampleQuery: typeof SAMPLE_QUERIES[0]) => {
    setQuery(sampleQuery.query)
    toast.success(`Loaded: ${sampleQuery.name}`)
  }

  const loadLoganQuery = (loganQuery: LoganQuery) => {
    setQuery(loganQuery.query)
    // Update timeRange and maxResults from Logan query
    const timeRangeMap: Record<string, number> = {
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '2h': 120,
      '6h': 360,
      '12h': 720,
      '24h': 1440,
      '2d': 2880,
      '7d': 10080
    }
    if (timeRangeMap[loganQuery.timeRange]) {
      setTimeRange(timeRangeMap[loganQuery.timeRange])
    }
    if (loganQuery.maxResults) {
      setMaxResults(loganQuery.maxResults)
    }
    toast.success(`Loaded Logan query: ${loganQuery.name}`)
  }

  const copyQuery = () => {
    navigator.clipboard.writeText(query)
    toast.success('Query copied to clipboard')
  }

  const exportResults = () => {
    if (!results || results.length === 0) {
      toast.error('No results to export')
      return
    }

    const csv = [
      Object.keys(results[0] || {}).join(','),
      ...(results || []).map(row => Object.values(row || {}).map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${new Date().toISOString().slice(0, 19)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Results exported to CSV')
  }

  return (
    <ModernLayout
      title="Query Logs"
      subtitle="Execute queries and view logs with advanced visualizations"
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="query" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Query
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Results ({results.length})
            </TabsTrigger>
            <TabsTrigger value="visualizations" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Visualizations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="query" className="space-y-6">
            {/* Logan Working Queries */}
            <Card>
              <CardHeader>
                <CardTitle>Logan Working Queries</CardTitle>
                <CardDescription>Proven OCI Logging Analytics queries organized by category</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingQueries ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading Logan queries...</span>
                  </div>
                ) : Object.keys(loganQueries).length > 0 ? (
                  <div className="space-y-4">
                    {/* Category selector */}
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(loganQueries).map(([key, category]) => (
                        <Button
                          key={key}
                          variant={selectedCategory === key ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(key)}
                        >
                          {category.name} ({category.queries.length})
                        </Button>
                      ))}
                    </div>

                    {/* Selected category queries */}
                    {loganQueries[selectedCategory] && (
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          {loganQueries[selectedCategory]?.description || 'Loading category description...'}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {(loganQueries[selectedCategory]?.queries || []).map((loganQuery) => (
                            <Card 
                              key={loganQuery.id} 
                              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors" 
                              onClick={() => loadLoganQuery(loganQuery)}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="font-medium">{loganQuery.name}</div>
                                  <div className="flex gap-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {loganQuery.timeRange}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      max {loganQuery.maxResults}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground">{loganQuery.description}</div>
                                <div className="flex gap-1 flex-wrap">
                                  {(loganQuery.tags || []).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                                  {loganQuery.query.length > 120 ? `${loganQuery.query.substring(0, 120)}...` : loganQuery.query}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Logan Queries Available</h3>
                    <p className="text-muted-foreground">
                      Logan working queries could not be loaded. Using basic sample queries instead.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Basic Sample Queries - fallback */}
            {Object.keys(loganQueries).length === 0 && !loadingQueries && (
              <Card>
                <CardHeader>
                  <CardTitle>Basic Sample Queries</CardTitle>
                  <CardDescription>Click to load a basic sample query</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SAMPLE_QUERIES.map((sample, index) => (
                      <Card key={index} className="p-4 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => loadSampleQuery(sample)}>
                        <div className="space-y-2">
                          <div className="font-medium">{sample.name}</div>
                          <div className="text-sm text-muted-foreground">{sample.description}</div>
                          <div className="text-xs font-mono bg-muted p-2 rounded">{sample.query}</div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Query Input */}
            <Card>
              <CardHeader>
                <CardTitle>Query Input</CardTitle>
                <CardDescription>Enter your OCI Logging Analytics query</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="query">Query</Label>
                  <Textarea
                    id="query"
                    placeholder="Enter your OCI Logging Analytics query here..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={6}
                    className="font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time-range">Time Range</Label>
                    <Select value={isCustomPeriod ? '-1' : timeRange.toString()} onValueChange={handleTimeRangeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_RANGES.map((range) => (
                          <SelectItem key={range.value} value={range.value.toString()}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Custom Period Selector */}
                    {isCustomPeriod && (
                      <div className="mt-4 p-4 border rounded-lg space-y-4">
                        <div className="text-sm font-medium">Custom Time Period</div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Start Date & Time */}
                          <div className="space-y-2">
                            <Label>Start Date & Time</Label>
                            <div className="flex gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, 'MMM dd, yyyy') : 'Select date'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={setStartDate}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-24"
                              />
                            </div>
                          </div>
                          
                          {/* End Date & Time */}
                          <div className="space-y-2">
                            <Label>End Date & Time</Label>
                            <div className="flex gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, 'MMM dd, yyyy') : 'Select date'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={setEndDate}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-24"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {startDate && endDate && (
                          <div className="text-xs text-muted-foreground">
                            Range: {format(startDate, 'MMM dd, yyyy')} {startTime} → {format(endDate, 'MMM dd, yyyy')} {endTime}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-results">Max Results</Label>
                    <Select value={maxResults.toString()} onValueChange={(value) => setMaxResults(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                        <SelectItem value="1000">1000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={executeQuery} disabled={loading} className="flex-1">
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Execute Query
                  </Button>
                  <Button variant="outline" onClick={copyQuery}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {queryResult && (
                  <Alert variant={queryResult.success ? "default" : "destructive"}>
                    {queryResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {queryResult.success 
                        ? `Query executed successfully in ${queryResult.executionTime}s. Found ${queryResult.count} results.`
                        : `Query failed: ${queryResult.error}`
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {results.length > 0 && (
              <>
                <LogMetricsCards logs={results} />
                
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Query Results</h3>
                  <Button variant="outline" onClick={exportResults}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>

                <LogsTable 
                  logs={results} 
                  onLogClick={setSelectedLog}
                />
              </>
            )}

            {results.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Results</h3>
                  <p className="text-muted-foreground">
                    Execute a query to see results here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="visualizations" className="space-y-6">
            {results.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Source Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Log Sources Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Array.from(new Set((results || []).map(log => log?.source || 'Unknown'))).map(source => {
                        const count = (results || []).filter(log => (log?.source || 'Unknown') === source).length
                        const percentage = results && results.length > 0 ? (count / results.length) * 100 : 0
                        return (
                          <div key={source} className="flex items-center justify-between">
                            <span className="text-sm">{source}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-12 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Events Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4" />
                      <p>Timeline visualization would be implemented here</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Top IPs */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top IP Addresses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Array.from(new Set((results || []).map(log => log?.sourceIp).filter(Boolean))).slice(0, 10).map(ip => {
                        const count = (results || []).filter(log => log?.sourceIp === ip).length
                        return (
                          <div key={ip} className="flex items-center justify-between">
                            <span className="text-sm font-mono">{ip}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Severity Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Severity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {['critical', 'high', 'medium', 'low'].map(severity => {
                        const count = (results || []).filter(log => log?.severity === severity).length
                        const percentage = results && results.length > 0 ? (count / results.length) * 100 : 0
                        return (
                          <div key={severity} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{severity}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    severity === 'critical' ? 'bg-red-600' :
                                    severity === 'high' ? 'bg-orange-600' :
                                    severity === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-12 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Data to Visualize</h3>
                  <p className="text-muted-foreground">
                    Execute a query to see visualizations here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Log Detail Modal */}
        {selectedLog && (
          <LogDetailModal 
            log={selectedLog} 
            onClose={() => setSelectedLog(null)} 
          />
        )}
      </div>
    </ModernLayout>
  )
}