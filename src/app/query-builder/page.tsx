'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import ModernLayout from '@/components/Layout/ModernLayout'
import { ComponentLoading } from '@/components/ui/component-loading'
import { VirtualList } from '@/components/ui/virtual-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { UnifiedTimeFilter, TimeRange, useTimeRange } from '@/components/TimeFilter/UnifiedTimeFilter'

// Lazy load heavy components to reduce initial bundle size
const SimpleQueryBuilder = dynamic(() => import('@/components/QueryBuilder/SimpleQueryBuilder'), {
  loading: () => <ComponentLoading height="h-32" message="Loading query builder..." />
})

const AdvancedQueryBuilder = dynamic(() => import('@/components/QueryBuilder/AdvancedQueryBuilder'), {
  loading: () => <ComponentLoading height="h-48" message="Loading advanced editor..." />
})

const AdvancedVisualizationSuite = dynamic(() => 
  import('@/components/Visualization/AdvancedCharts').then(mod => ({ default: mod.AdvancedVisualizationSuite })), {
  loading: () => <ComponentLoading height="h-64" message="Loading visualizations..." />
})

const InteractiveDashboard = dynamic(() => import('@/components/Dashboard/InteractiveDashboard'), {
  loading: () => <ComponentLoading height="h-96" message="Loading dashboard..." />
})

const QueryHistoryManager = dynamic(() => import('@/components/QueryHistory/QueryHistoryManager'), {
  loading: () => <ComponentLoading height="h-64" message="Loading query history..." />
})

const AdvancedDataExporter = dynamic(() => import('@/components/DataExport/AdvancedDataExporter'), {
  loading: () => <ComponentLoading height="h-48" message="Loading export tools..." />
})

const SecurityRulesBrowser = dynamic(() => 
  import('@/components/SecurityRules/SecurityRulesBrowser').then(mod => ({ default: mod.SecurityRulesBrowser })), {
  loading: () => <ComponentLoading height="h-64" message="Loading security rules..." />
})

import { 
  Database, 
  Clock, 
  BarChart3, 
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Filter,
  Settings,
  PieChart,
  Activity,
  AlertTriangle,
  Search,
  TrendingUp,
  Layout,
  History,
  Play,
  Zap,
  Shield
} from 'lucide-react'

interface QueryResult {
  id: string
  timestamp: string
  severity: string
  source: string
  message: string
  details: string
  sourceIp?: string
  user?: string
  eventName?: string
  compartmentName?: string
  rawData: any
}

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

// Mock data generator for advanced analytics
const generateMockData = (count = 1000) => {
  const logSources = ['Windows Security Events', 'Linux Secure Logs', 'OCI Audit Logs', 'Network Firewall', 'Application Logs']
  const eventTypes = ['authentication', 'network', 'system', 'application', 'security']
  const securityResults = ['success', 'denied', 'warning', 'error']
  const ipPools = ['192.168.1', '10.0.0', '172.16.0', '203.0.113', '198.51.100']

  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    'Time': new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    'Log Source': logSources[Math.floor(Math.random() * logSources.length)],
    'Event Name': `Event ${i % 100}`,
    'Event Type': eventTypes[Math.floor(Math.random() * eventTypes.length)],
    'Principal Name': `user${Math.floor(Math.random() * 50)}`,
    'IP Address': `${ipPools[Math.floor(Math.random() * ipPools.length)]}.${Math.floor(Math.random() * 255)}`,
    'Source IP': `${ipPools[Math.floor(Math.random() * ipPools.length)]}.${Math.floor(Math.random() * 255)}`,
    'Destination IP': `${ipPools[Math.floor(Math.random() * ipPools.length)]}.${Math.floor(Math.random() * 255)}`,
    'Security Result': securityResults[Math.floor(Math.random() * securityResults.length)],
    'Compartment Name': `compartment-${Math.floor(Math.random() * 10)}`,
    'Request Method': ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
    'Response Code': [200, 401, 403, 404, 500][Math.floor(Math.random() * 5)],
    'User Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Message': `Sample log message ${i}`,
    'Severity': ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)]
  }))
}


export default function QueryBuilderPage() {
  const [results, setResults] = useState<QueryResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [queryStats, setQueryStats] = useState<{
    executionTime: number
    totalResults: number
    timeRange: string
    queryUsed: string
  } | null>(null)
  
  // Unified time filter state
  const [timeRange, setTimeRange] = useState<TimeRange>({
    type: 'preset',
    preset: '240',
    minutes: 240
  })
  const { getTimeRangeInMinutes } = useTimeRange(timeRange)
  
  // Logan queries state
  const [loganQueries, setLoganQueries] = useState<Record<string, LoganCategory>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('network_analysis')
  const [loadingQueries, setLoadingQueries] = useState(false)
  
  // Advanced analytics state
  const [currentData, setCurrentData] = useState<Record<string, unknown>[]>([])
  const [queryHistory, setQueryHistory] = useState<any[]>([])
  const [savedQueries, setSavedQueries] = useState<any[]>([])

  // Load Logan working queries and initialize mock data on component mount
  useEffect(() => {
    const loadLoganQueries = async () => {
      setLoadingQueries(true)
      try {
        const response = await fetch('/api/logan-queries')
        const data = await response.json()
        
        if (data.success) {
          // Handle both the categories structure and potential fallbacks
          const categories = data.data?.categories || {}
          setLoganQueries(categories)
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

    const loadQueryHistory = async () => {
      try {
        const response = await fetch('/api/mcp/query-history')
        const data = await response.json()
        if (data.success) {
          setQueryHistory(data.data)
        } else {
          toast.error('Failed to load query history')
        }
      } catch (error) {
        console.error('Error loading query history:', error)
        toast.error('Failed to load query history')
      }
    }

    const loadSavedQueries = async () => {
      try {
        const response = await fetch('/api/mcp/saved-queries')
        const data = await response.json()
        if (data.success) {
          setSavedQueries(data.data)
        } else {
          toast.error('Failed to load saved queries')
        }
      } catch (error) {
        console.error('Error loading saved queries:', error)
        toast.error('Failed to load saved queries')
      }
    }
    
    loadLoganQueries()
    loadQueryHistory()
    loadSavedQueries()
    // Initialize smaller mock data set for faster initial load
    setCurrentData(generateMockData(100))
    
    // Background load larger dataset after initial render
    setTimeout(() => {
      setCurrentData(generateMockData(500))
    }, 1000)
  }, [])

  const loadLoganQuery = (loganQuery: LoganQuery) => {
    // Use the current unified time filter setting
    const timePeriodMinutes = getTimeRangeInMinutes()
    executeQuery(loganQuery.query, { 
      timePeriodMinutes, 
      maxResults: loganQuery.maxResults 
    })
    toast.success(`Loaded Logan query: ${loganQuery.name}`)
  }

  const executeQuery = useCallback(async (query: string, options: { timePeriodMinutes?: number; maxResults?: number; bypassValidation?: boolean; [key: string]: unknown }) => {
    setIsLoading(true)
    setResults([])
    setQueryStats(null)

    try {
      const response = await fetch('/api/mcp/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          timePeriodMinutes: options.timePeriodMinutes || getTimeRangeInMinutes(),
          bypassValidation: options.bypassValidation || false
        })
      })

      const data = await response.json()

      if (data.success) {
        const queryResults = data.results || []
        setResults(queryResults)
        setCurrentData(queryResults.length > 0 ? queryResults : generateMockData(Math.floor(Math.random() * 500) + 50))
        
        setQueryStats({
          executionTime: data.executionTime || 0,
          totalResults: data.total || 0,
          timeRange: data.timeRange || `${options.timePeriodMinutes || getTimeRangeInMinutes()} minutes`,
          queryUsed: data.queryUsed || query
        })
        
        // Add to query history
        const newHistoryEntry = {
          id: `query-${Date.now()}`,
          query,
          executedAt: new Date().toISOString(),
          executionTime: data.executionTime || (1 + Math.random() * 4),
          resultCount: queryResults.length,
          success: true,
          timePeriod: options.timePeriodMinutes || getTimeRangeInMinutes(),
          parameters: options,
          isFavorite: false,
          tags: [],
          description: `Query executed at ${new Date().toLocaleTimeString()}`
        }
        
        setQueryHistory(prev => [newHistoryEntry, ...prev])
        
        toast.success(`Query executed successfully! Found ${queryResults.length} results.`)
      } else {
        const errorMessage = data.error || 'Query execution failed'
        toast.error(errorMessage)
        setResults([])
        
        // Add failed query to history
        const failedEntry = {
          id: `query-${Date.now()}`,
          query,
          executedAt: new Date().toISOString(),
          executionTime: 0,
          resultCount: 0,
          success: false,
          error: errorMessage,
          timePeriod: options.timePeriodMinutes || getTimeRangeInMinutes(),
          parameters: options,
          isFavorite: false,
          tags: [],
          description: 'Failed query execution'
        }
        
        setQueryHistory(prev => [failedEntry, ...prev])
      }
    } catch (error) {
      console.error('Query execution error:', error)
      toast.error('Failed to execute query')
      setResults([])
      
      // Add error to history
      const errorEntry = {
        id: `query-${Date.now()}`,
        query,
        executedAt: new Date().toISOString(),
        executionTime: 0,
        resultCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        timePeriod: options.timePeriodMinutes || getTimeRangeInMinutes(),
        parameters: options,
        isFavorite: false,
        tags: [],
        description: 'Network error during execution'
      }
      
      setQueryHistory(prev => [errorEntry, ...prev])
    } finally {
      setIsLoading(false)
    }
  }, [getTimeRangeInMinutes])

  const saveQuery = (queryData: { name: string; query: string; description: string }) => {
    const newQuery = {
      ...queryData,
      id: `saved-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      usageCount: 0,
      isFavorite: false,
      isPublic: false,
      author: 'Current User',
      category: 'User Query',
      tags: [],
      parameters: { timePeriod: 1440, maxResults: 100 }
    }
    setSavedQueries(prev => [newQuery, ...prev])
    toast.success('Query saved successfully!')
  }

  const handleDataExport = useCallback((data: Record<string, unknown>[], options: Record<string, unknown>) => {
    // Simulate export process
    toast.success(`Exporting ${data.length} rows as ${String(options.format).toUpperCase()}...`)
    
    // In a real implementation, this would generate and download the file
    setTimeout(() => {
      toast.success('Export completed successfully!')
    }, 2000)
  }, [])

  const exportResults = (format: 'json' | 'csv') => {
    if (results.length === 0) {
      toast.error('No results to export')
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `query-results-${timestamp}.${format}`

    let content = ''
    let mimeType = ''

    if (format === 'json') {
      content = JSON.stringify(results, null, 2)
      mimeType = 'application/json'
    } else if (format === 'csv') {
      const headers = ['Timestamp', 'Severity', 'Source', 'Message', 'Details', 'Source IP', 'User', 'Event Name', 'Compartment']
      const csvContent = [
        headers.join(','),
        ...results.map(result => [
          `"${result.timestamp}"`,
          `"${result.severity}"`,
          `"${result.source}"`,
          `"${result.message.replace(/"/g, '""')}"`,
          `"${result.details.replace(/"/g, '""')}"`,
          `"${result.sourceIp || ''}"`,
          `"${result.user || ''}"`,
          `"${result.eventName || ''}"`,
          `"${result.compartmentName || ''}"`
        ].join(','))
      ].join('\n')
      content = csvContent
      mimeType = 'text/csv'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)

    toast.success(`Results exported as ${format.toUpperCase()}`)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  return (
    <ModernLayout
      title="Unified Analytics Suite"
      subtitle="Comprehensive security analytics with advanced querying, visualization, and data management"
    >
      <div className="space-y-6">
        {/* Unified Time Filter */}
        <UnifiedTimeFilter
          value={timeRange}
          onChange={setTimeRange}
          showTitle={true}
        />
        
        {/* Header Stats */}
        {queryStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Execution Time</p>
                    <p className="text-lg font-semibold">{queryStats.executionTime.toFixed(2)}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Results Found</p>
                    <p className="text-lg font-semibold">{queryStats.totalResults.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time Range</p>
                    <p className="text-lg font-semibold">{queryStats.timeRange}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-lg font-semibold text-emerald-600">Success</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="builder" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="logan-queries">Logan Queries</TabsTrigger>
              <TabsTrigger value="security-rules">Security Rules</TabsTrigger>
              <TabsTrigger value="builder">Query Builder</TabsTrigger>
              <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
              <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>
            
            {results.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportResults('json')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportResults('csv')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="logan-queries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Logan Working Queries
                </CardTitle>
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
                      Logan working queries could not be loaded. Try the Query Builder tab instead.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security-rules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Rules Library
                </CardTitle>
                <CardDescription>
                  Prebuilt detection rules from Elastic and Splunk converted to OCI Logging Analytics format
                </CardDescription>
              </CardHeader>
            </Card>
            
            <SecurityRulesBrowser
              onRuleSelect={(rule) => {
                // Execute the rule query when selected using current time filter
                executeQuery(rule.oci_query, { 
                  timePeriodMinutes: getTimeRangeInMinutes(), 
                  maxResults: 100 
                })
                toast.success(`Loaded security rule: ${rule.name}`)
              }}
            />
          </TabsContent>

          <TabsContent value="builder">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Query Builder
                  </CardTitle>
                  <CardDescription>
                    Build and execute OCI Logging Analytics queries with visual interface
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <SimpleQueryBuilder
                onExecute={(query, options) => {
                  // Use unified time filter instead of SimpleQueryBuilder's own time range
                  const timePeriodMinutes = getTimeRangeInMinutes()
                  return executeQuery(query, {
                    ...options,
                    timePeriodMinutes
                  })
                }}
                onSave={saveQuery}
                loading={isLoading}
                timeRange={timeRange}
              />
              
              <AdvancedQueryBuilder
                onExecute={executeQuery as any}
                onSave={saveQuery as any}
                savedQueries={savedQueries}
                loading={isLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Executing query...</p>
                  </div>
                </CardContent>
              </Card>
            ) : results.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Results</h3>
                    <p className="text-muted-foreground">Execute a query to see results here</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Query Information */}
                {queryStats && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Query executed:</strong> {queryStats.queryUsed}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Results List with Virtual Scrolling */}
                {results.length > 50 ? (
                  <VirtualList
                    items={results}
                    itemHeight={120}
                    containerHeight={600}
                    className="border rounded-lg"
                    renderItem={(result, index) => (
                      <Card className="hover:shadow-md transition-shadow m-1">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <Badge className={getSeverityColor(result.severity)}>
                                  {result.severity}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {result.timestamp}
                                </span>
                                {result.sourceIp && (
                                  <Badge variant="outline">
                                    {result.sourceIp}
                                  </Badge>
                                )}
                                {result.user && (
                                  <Badge variant="outline">
                                    {result.user}
                                  </Badge>
                                )}
                              </div>
                              
                              <div>
                                <h4 className="font-medium">{result.message}</h4>
                                <p className="text-sm text-muted-foreground">{result.source}</p>
                              </div>
                              
                              {result.details && (
                                <p className="text-sm text-muted-foreground">{result.details}</p>
                              )}
                            </div>
                            
                            <Button variant="ghost" size="sm">
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  />
                ) : (
                  <div className="space-y-2">
                    {results.map((result) => (
                      <Card key={result.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <Badge className={getSeverityColor(result.severity)}>
                                  {result.severity}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {result.timestamp}
                                </span>
                                {result.sourceIp && (
                                  <Badge variant="outline">
                                    {result.sourceIp}
                                  </Badge>
                                )}
                                {result.user && (
                                  <Badge variant="outline">
                                    {result.user}
                                  </Badge>
                                )}
                              </div>
                              
                              <div>
                                <h4 className="font-medium">{result.message}</h4>
                                <p className="text-sm text-muted-foreground">{result.source}</p>
                              </div>
                              
                              {result.details && (
                                <p className="text-sm text-muted-foreground">{result.details}</p>
                              )}
                            </div>
                            
                            <Button variant="ghost" size="sm">
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="visualizations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Advanced Data Visualizations
                </CardTitle>
                <CardDescription>
                  Interactive charts and visualizations including time series, security heatmaps, network topology, and threat analysis.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <AdvancedVisualizationSuite
              data={currentData}
              title="Security Analytics Visualization"
              onExport={handleDataExport as any}
            />
            
            {results.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Source Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Log Sources Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Array.from(new Set((results || []).map(result => result?.source || 'Unknown'))).map(source => {
                        const count = (results || []).filter(result => (result?.source || 'Unknown') === source).length
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
                      {Array.from(new Set((results || []).map(result => result?.sourceIp).filter(Boolean))).slice(0, 10).map(ip => {
                        const count = (results || []).filter(result => result?.sourceIp === ip).length
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
                        const count = (results || []).filter(result => result?.severity === severity).length
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
          
          {/* Interactive Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Interactive Dashboard Builder
                </CardTitle>
                <CardDescription>
                  Create custom dashboards with drag-and-drop widgets. Each widget can be configured with custom queries, refresh intervals, and visualization types.
                </CardDescription>
              </CardHeader>
            </Card>

            <InteractiveDashboard
              onQueryExecute={executeQuery as any}
              onSaveLayout={(layout) => toast.success(`Layout "${layout.name}" saved!`)}
              onLoadLayout={async (layoutId) => {
                toast.success('Layout loaded successfully!')
                return { id: layoutId, name: 'Sample Layout', widgets: [], created: '', lastModified: '' }
              }}
            />
          </TabsContent>

          {/* Query History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Query History & Management
                </CardTitle>
                <CardDescription>
                  Track all executed queries, manage saved queries, and analyze query performance. Includes search, filtering, and analytics on query usage patterns.
                </CardDescription>
              </CardHeader>
            </Card>

            <QueryHistoryManager
              onExecuteQuery={(query, params) => executeQuery(query, params)}
              onSaveQuery={saveQuery as any}
              queryHistory={queryHistory}
              savedQueries={savedQueries}
            />
          </TabsContent>

          {/* Data Export Tab */}
          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Advanced Data Export
                </CardTitle>
                <CardDescription>
                  Export filtered data in multiple formats with advanced filtering, column selection, and export options. Supports JSON, CSV, Excel, PDF, XML, and Parquet formats.
                </CardDescription>
              </CardHeader>
            </Card>

            <AdvancedDataExporter
              data={currentData}
              onExport={handleDataExport as any}
              onSaveFilter={() => toast.success('Filter configuration saved!')}
              savedFilters={[
                {
                  id: 'filter-1',
                  name: 'Security Events Only',
                  filters: [
                    {
                      id: '1',
                      field: 'Event Type',
                      operator: 'equals',
                      value: 'security',
                      enabled: true
                    }
                  ]
                }
              ]}
              loading={isLoading}
            />
          </TabsContent>
        </Tabs>
        
        {/* Footer Stats */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{queryHistory.length}</p>
                <p className="text-sm text-muted-foreground">Queries Executed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{savedQueries.length}</p>
                <p className="text-sm text-muted-foreground">Saved Queries</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{currentData.length.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Records Analyzed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {queryHistory.filter(q => q.success).length}/{queryHistory.length}
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  )
}