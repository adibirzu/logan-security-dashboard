'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ModernLayout from '@/components/Layout/ModernLayout'

// Import all our new advanced components
import AdvancedQueryBuilder from '@/components/QueryBuilder/AdvancedQueryBuilder'
import { AdvancedVisualizationSuite } from '@/components/Visualization/AdvancedCharts'
import InteractiveDashboard from '@/components/Dashboard/InteractiveDashboard'
import QueryHistoryManager from '@/components/QueryHistory/QueryHistoryManager'
import StreamingQueryExecutor from '@/components/QueryExecution/StreamingQueryExecutor'
import AdvancedDataExporter from '@/components/DataExport/AdvancedDataExporter'

import {
  Zap,
  BarChart3,
  Layout,
  History,
  Play,
  Download,
  Sparkles,
  TrendingUp,
  Database,
  Settings,
  Activity
} from 'lucide-react'

// Mock data for demonstrations
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

// Mock query history data
const mockQueryHistory = [
  {
    id: 'query-1',
    query: "'Log Source' = 'Windows Security Events' and 'Security Result' = 'denied'",
    executedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    executionTime: 2.34,
    resultCount: 156,
    success: true,
    timePeriod: 1440,
    parameters: { maxResults: 100 },
    isFavorite: true,
    tags: ['security', 'windows', 'failed-auth'],
    description: 'Failed Windows authentication attempts'
  },
  {
    id: 'query-2',
    query: "'IP Address' != null | stats count by 'IP Address' | sort count desc",
    executedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    executionTime: 5.67,
    resultCount: 234,
    success: true,
    timePeriod: 720,
    parameters: { maxResults: 50 },
    isFavorite: false,
    tags: ['network', 'ip-analysis'],
    description: 'Top IP addresses by activity'
  },
  {
    id: 'query-3',
    query: "'Event Name' contains 'error'",
    executedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    executionTime: 1.23,
    resultCount: 89,
    success: false,
    error: 'Query timeout after 30 seconds',
    timePeriod: 240,
    parameters: { maxResults: 200 },
    isFavorite: false,
    tags: ['errors', 'troubleshooting']
  }
]

// Mock saved queries
const mockSavedQueries = [
  {
    id: 'saved-1',
    name: 'Failed Login Analysis',
    description: 'Comprehensive analysis of failed login attempts across all systems',
    query: "'Log Source' in ('Windows Security Events', 'Linux Secure Logs') and 'Security Result' = 'denied'",
    category: 'Security',
    tags: ['authentication', 'security', 'monitoring'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    usageCount: 15,
    isFavorite: true,
    isPublic: true,
    author: 'Security Team',
    parameters: { timePeriod: 1440, maxResults: 500 }
  },
  {
    id: 'saved-2',
    name: 'Network Traffic Analysis',
    description: 'Monitor unusual network connection patterns',
    query: "'Log Source' contains 'Network' | stats count by 'Source IP', 'Destination IP' | where count > 10",
    category: 'Network',
    tags: ['network', 'traffic', 'anomaly-detection'],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    usageCount: 8,
    isFavorite: false,
    isPublic: false,
    author: 'Network Team',
    parameters: { timePeriod: 720, maxResults: 100 }
  }
]

export default function AdvancedAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('query-builder')
  const [currentData, setCurrentData] = useState<Record<string, unknown>[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [queryHistory, setQueryHistory] = useState<any[]>(mockQueryHistory)
  const [savedQueries, setSavedQueries] = useState<any[]>(mockSavedQueries)

  // Generate initial mock data
  React.useEffect(() => {
    setCurrentData(generateMockData(500))
  }, [])

  // Mock query execution function
  const executeQuery = useCallback(async (query: string, options: { timePeriod?: number; maxResults?: number; bypassValidation?: boolean; format?: string; [key: string]: unknown }) => {
    setIsLoading(true)
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
      
      // Generate mock results based on query
      const resultCount = Math.floor(Math.random() * 500) + 50
      const mockResults = generateMockData(resultCount)
      
      setCurrentData(mockResults)
      
      // Add to query history
      const newHistoryEntry: {
        id: string
        query: string
        executedAt: string
        executionTime: number
        resultCount: number
        success: boolean
        timePeriod: number
        parameters: Record<string, unknown>
        isFavorite: boolean
        tags: string[]
        description: string
        error?: string
      } = {
        id: `query-${Date.now()}`,
        query,
        executedAt: new Date().toISOString(),
        executionTime: 1 + Math.random() * 4,
        resultCount,
        success: Math.random() > 0.1, // 90% success rate
        timePeriod: options.timePeriod || 1440,
        parameters: options as Record<string, unknown>,
        isFavorite: false,
        tags: [],
        description: `Query executed at ${new Date().toLocaleTimeString()}`
      }
      
      if (!newHistoryEntry.success) {
        newHistoryEntry.error = 'Simulated query execution error'
      }
      
      setQueryHistory(prev => [newHistoryEntry, ...prev])
      
      toast.success(`Query executed successfully! Found ${resultCount} results.`)
      
      return {
        success: newHistoryEntry.success,
        results: mockResults,
        count: resultCount,
        executionTime: newHistoryEntry.executionTime
      }
    } catch (error) {
      toast.error('Query execution failed')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSaveQuery = useCallback((query: Record<string, unknown>) => {
    const newQuery = {
      ...query,
      id: `saved-${Date.now()}`,
      createdAt: new Date().toISOString(),
      usageCount: 0,
      author: 'Current User'
    }
    setSavedQueries(prev => [newQuery, ...prev])
    toast.success('Query saved successfully!')
  }, [])

  const handleDataExport = useCallback((data: Record<string, unknown>[], options: Record<string, unknown>) => {
    // Simulate export process
    toast.success(`Exporting ${data.length} rows as ${String(options.format).toUpperCase()}...`)
    
    // In a real implementation, this would generate and download the file
    setTimeout(() => {
      toast.success('Export completed successfully!')
    }, 2000)
  }, [])

  const handleDashboardQuery = useCallback(async (query: string, options: { timePeriod?: number; maxResults?: number; bypassValidation?: boolean; format?: string; [key: string]: unknown }) => {
    return executeQuery(query, options)
  }, [executeQuery])

  return (
    <ModernLayout
      title="Advanced Analytics Suite"
      subtitle="Comprehensive security analytics with advanced querying, visualization, and data management"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-lg font-medium">Analytics Dashboard</span>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {currentData.length.toLocaleString()} records loaded
          </Badge>
        </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="query-builder" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Query Builder
              </TabsTrigger>
              <TabsTrigger value="visualizations" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Visualizations
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Query History
              </TabsTrigger>
              <TabsTrigger value="streaming" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Live Execution
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Data Export
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        {/* Query Builder Tab */}
        <TabsContent value="query-builder">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Advanced Query Builder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Build complex queries using our visual interface or write raw OCI Logging Analytics queries. 
                  Includes query validation, templates, and saved query management.
                </p>
              </CardContent>
            </Card>
            
            <AdvancedQueryBuilder
              onExecute={executeQuery as any}
              onSave={handleSaveQuery as any}
              savedQueries={savedQueries}
              loading={isLoading}
            />
          </div>
        </TabsContent>

        {/* Visualizations Tab */}
        <TabsContent value="visualizations">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Advanced Data Visualizations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Interactive charts and visualizations including time series, security heatmaps, 
                  network topology, threat radar, and multi-metric dashboards.
                </p>
              </CardContent>
            </Card>

            <AdvancedVisualizationSuite
              data={currentData}
              title="Security Analytics Visualization"
              onExport={handleDataExport as any}
            />
          </div>
        </TabsContent>

        {/* Interactive Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Interactive Dashboard Builder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Create custom dashboards with drag-and-drop widgets. Each widget can be configured 
                  with custom queries, refresh intervals, and visualization types.
                </p>
              </CardContent>
            </Card>

            <InteractiveDashboard
              onQueryExecute={handleDashboardQuery}
              onSaveLayout={(layout) => toast.success(`Layout "${layout.name}" saved!`)}
              onLoadLayout={async (layoutId) => {
                toast.success('Layout loaded successfully!')
                return { id: layoutId, name: 'Sample Layout', widgets: [], created: '', lastModified: '' }
              }}
            />
          </div>
        </TabsContent>

        {/* Query History Tab */}
        <TabsContent value="history">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Query History & Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Track all executed queries, manage saved queries, and analyze query performance. 
                  Includes search, filtering, and analytics on query usage patterns.
                </p>
              </CardContent>
            </Card>

            <QueryHistoryManager
              onExecuteQuery={(query, params) => executeQuery(query, params)}
              onSaveQuery={handleSaveQuery as any}
              queryHistory={queryHistory}
              savedQueries={savedQueries}
            />
          </div>
        </TabsContent>

        {/* Streaming Execution Tab */}
        <TabsContent value="streaming">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Real-time Query Execution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Execute queries with real-time streaming results. Monitor execution progress, 
                  view results as they arrive, and analyze performance metrics.
                </p>
              </CardContent>
            </Card>

            <StreamingQueryExecutor
              onExecute={async () => {
                // The streaming executor handles its own execution simulation
                return Promise.resolve()
              }}
              onCancel={() => toast.info('Query execution cancelled')}
              onExport={handleDataExport as any}
            />
          </div>
        </TabsContent>

        {/* Data Export Tab */}
        <TabsContent value="export">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Advanced Data Export
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Export filtered data in multiple formats with advanced filtering, column selection, 
                  and export options. Supports JSON, CSV, Excel, PDF, XML, and Parquet formats.
                </p>
              </CardContent>
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
          </div>
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