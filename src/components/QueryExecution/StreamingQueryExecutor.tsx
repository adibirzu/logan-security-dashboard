'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Download,
  Eye,
  EyeOff,
  Settings,
  Zap,
  Clock,
  Database,
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  TrendingUp,
  BarChart3,
  RefreshCw
} from 'lucide-react'

interface StreamingResult {
  id: string
  timestamp: string
  data: Record<string, any>
  chunk: number
}

interface QueryExecutionStats {
  startTime: string
  endTime?: string
  duration: number
  totalResults: number
  processedChunks: number
  bytesProcessed: number
  avgResponseTime: number
  peakMemoryUsage: number
  errorCount: number
}

interface StreamingQueryExecutorProps {
  onExecute: (query: string, options: QueryOptions) => Promise<void>
  onCancel?: () => void
  onExport?: (data: StreamingResult[], format: string) => void
}

interface QueryOptions {
  timePeriod: number
  maxResults: number
  chunkSize: number
  realTimeUpdates: boolean
  autoRefresh: boolean
  refreshInterval: number
}

export default function StreamingQueryExecutor({
  onExecute,
  onCancel,
  onExport
}: StreamingQueryExecutorProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [results, setResults] = useState<StreamingResult[]>([])
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<QueryExecutionStats>({
    startTime: '',
    duration: 0,
    totalResults: 0,
    processedChunks: 0,
    bytesProcessed: 0,
    avgResponseTime: 0,
    peakMemoryUsage: 0,
    errorCount: 0
  })
  const [errors, setErrors] = useState<Array<{ timestamp: string; message: string }>>([])
  const [activeTab, setActiveTab] = useState('results')
  const [autoScroll, setAutoScroll] = useState(true)
  const [showRawData, setShowRawData] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')

  const resultsRef = useRef<HTMLDivElement>(null)
  const executionRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Simulated streaming execution
  const executeQuery = useCallback(async (query: string, options: QueryOptions) => {
    if (isExecuting) return

    // Initialize execution
    setIsExecuting(true)
    setIsPaused(false)
    setResults([])
    setErrors([])
    setProgress(0)
    startTimeRef.current = Date.now()

    const controller = new AbortController()
    executionRef.current = controller

    const startTime = new Date().toISOString()
    setStats(prev => ({
      ...prev,
      startTime,
      duration: 0,
      totalResults: 0,
      processedChunks: 0,
      bytesProcessed: 0,
      errorCount: 0
    }))

    try {
      // Simulate streaming chunks of data
      const totalChunks = Math.ceil(options.maxResults / options.chunkSize)
      
      for (let chunk = 0; chunk < totalChunks; chunk++) {
        if (controller.signal.aborted) break
        if (isPaused) {
          await new Promise(resolve => {
            const checkPause = () => {
              if (!isPaused || controller.signal.aborted) {
                resolve(void 0)
              } else {
                setTimeout(checkPause, 100)
              }
            }
            checkPause()
          })
        }

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))

        // Generate mock data for this chunk
        const chunkData = Array.from({ length: options.chunkSize }, (_, i) => ({
          id: `${chunk}-${i}`,
          timestamp: new Date().toISOString(),
          data: {
            'Log Source': ['Windows Security Events', 'Linux Secure Logs', 'OCI Audit Logs'][Math.floor(Math.random() * 3)],
            'Event Name': `Event ${chunk * options.chunkSize + i}`,
            'Principal Name': `user${Math.floor(Math.random() * 100)}`,
            'IP Address': `192.168.1.${Math.floor(Math.random() * 255)}`,
            'Security Result': Math.random() > 0.8 ? 'denied' : 'success',
            'Event Type': ['authentication', 'network', 'system'][Math.floor(Math.random() * 3)],
            'Timestamp': new Date(Date.now() - Math.random() * 86400000).toISOString()
          },
          chunk
        }))

        // Add results
        setResults(prev => [...prev, ...chunkData])
        
        // Update progress
        const currentProgress = ((chunk + 1) / totalChunks) * 100
        setProgress(currentProgress)

        // Update stats
        const currentTime = Date.now()
        const duration = (currentTime - startTimeRef.current) / 1000
        
        setStats(prev => ({
          ...prev,
          duration,
          totalResults: prev.totalResults + chunkData.length,
          processedChunks: chunk + 1,
          bytesProcessed: prev.bytesProcessed + JSON.stringify(chunkData).length,
          avgResponseTime: duration / (chunk + 1)
        }))

        // Simulate occasional errors
        if (Math.random() < 0.05) {
          const error = {
            timestamp: new Date().toISOString(),
            message: `Temporary error in chunk ${chunk}: Network timeout`
          }
          setErrors(prev => [...prev, error])
          setStats(prev => ({ ...prev, errorCount: prev.errorCount + 1 }))
        }
      }

      // Execution completed
      setStats(prev => ({
        ...prev,
        endTime: new Date().toISOString()
      }))

    } catch (error) {
      console.error('Query execution failed:', error)
      setErrors(prev => [...prev, {
        timestamp: new Date().toISOString(),
        message: `Execution failed: ${error}`
      }])
    } finally {
      setIsExecuting(false)
      setProgress(100)
    }
  }, [isExecuting, isPaused])

  // Auto-scroll to bottom when new results arrive
  useEffect(() => {
    if (autoScroll && resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight
    }
  }, [results, autoScroll])

  // Update duration timer
  useEffect(() => {
    if (isExecuting) {
      intervalRef.current = setInterval(() => {
        const duration = (Date.now() - startTimeRef.current) / 1000
        setStats(prev => ({ ...prev, duration }))
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isExecuting])

  const handleStart = () => {
    const defaultOptions: QueryOptions = {
      timePeriod: 1440,
      maxResults: 1000,
      chunkSize: 50,
      realTimeUpdates: true,
      autoRefresh: false,
      refreshInterval: 30
    }
    executeQuery("* | head 1000", defaultOptions)
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleStop = () => {
    if (executionRef.current) {
      executionRef.current.abort()
    }
    setIsExecuting(false)
    setIsPaused(false)
    onCancel?.()
  }

  const handleReset = () => {
    setResults([])
    setErrors([])
    setProgress(0)
    setStats({
      startTime: '',
      duration: 0,
      totalResults: 0,
      processedChunks: 0,
      bytesProcessed: 0,
      avgResponseTime: 0,
      peakMemoryUsage: 0,
      errorCount: 0
    })
  }

  const filteredResults = results.filter(result => {
    if (!filterQuery) return true
    return Object.values(result.data).some(value => 
      String(value).toLowerCase().includes(filterQuery.toLowerCase())
    )
  })

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Streaming Query Executor
            </span>
            <div className="flex items-center gap-2">
              {!isExecuting ? (
                <Button onClick={handleStart} className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Start
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handlePause} 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button 
                    onClick={handleStop} 
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                </>
              )}
              <Button 
                onClick={handleReset} 
                variant="outline"
                disabled={isExecuting}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Execution Progress</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {/* Real-time Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="text-center">
                <p className="text-lg font-bold">{formatDuration(stats.duration)}</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{stats.totalResults.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Results</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{stats.processedChunks}</p>
                <p className="text-xs text-muted-foreground">Chunks</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{formatBytes(stats.bytesProcessed)}</p>
                <p className="text-xs text-muted-foreground">Data</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{stats.avgResponseTime.toFixed(2)}s</p>
                <p className="text-xs text-muted-foreground">Avg Time</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{stats.errorCount}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
              <div className="text-center">
                <Badge variant={isExecuting ? "default" : isPaused ? "secondary" : "outline"}>
                  {isExecuting ? (isPaused ? "Paused" : "Running") : "Stopped"}
                </Badge>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{results.length > 0 ? (stats.totalResults / stats.duration || 0).toFixed(0) : '0'}</p>
                <p className="text-xs text-muted-foreground">Results/sec</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Results ({filteredResults.length})
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Errors ({errors.length})
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="flex items-center gap-2"
            >
              {autoScroll ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Auto-scroll
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawData(!showRawData)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {showRawData ? 'Table' : 'Raw'}
            </Button>
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport(results, 'json')}
                disabled={results.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Results Stream
                </CardTitle>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Filter results..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="px-3 py-1 text-sm border rounded"
                  />
                  {isExecuting && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96" ref={resultsRef}>
                {showRawData ? (
                  <div className="p-4 font-mono text-xs">
                    {filteredResults.map((result, index) => (
                      <div key={result.id} className="mb-2 p-2 bg-muted rounded">
                        <div className="text-muted-foreground mb-1">
                          #{index + 1} | Chunk {result.chunk} | {result.timestamp}
                        </div>
                        <pre>{JSON.stringify(result.data, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Log Source</TableHead>
                        <TableHead>Event Name</TableHead>
                        <TableHead>Principal</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((result, index) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-mono text-xs">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {new Date(result.data.Timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>{result.data['Log Source']}</TableCell>
                          <TableCell>{result.data['Event Name']}</TableCell>
                          <TableCell>{result.data['Principal Name']}</TableCell>
                          <TableCell className="font-mono">{result.data['IP Address']}</TableCell>
                          <TableCell>
                            <Badge variant={result.data['Security Result'] === 'success' ? "default" : "destructive"}>
                              {result.data['Security Result']}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Execution Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {errors.length > 0 ? (
                <div className="space-y-2">
                  {errors.map((error, index) => (
                    <div key={index} className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                      <div className="flex items-center justify-between">
                        <Badge variant="destructive" className="text-xs">
                          Error #{index + 1}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-destructive">{error.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No errors detected</p>
                  <p className="text-sm">Query execution is running smoothly</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Execution Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Timing</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Start Time:</span>
                        <span>{stats.startTime ? new Date(stats.startTime).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{formatDuration(stats.duration)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Response:</span>
                        <span>{stats.avgResponseTime.toFixed(2)}s</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Data Processing</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total Results:</span>
                        <span>{stats.totalResults.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processed Chunks:</span>
                        <span>{stats.processedChunks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data Processed:</span>
                        <span>{formatBytes(stats.bytesProcessed)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Performance</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Results/sec:</span>
                        <span>{stats.duration > 0 ? (stats.totalResults / stats.duration).toFixed(1) : '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Throughput:</span>
                        <span>{stats.duration > 0 ? formatBytes(stats.bytesProcessed / stats.duration) : '0 B'}/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Error Rate:</span>
                        <span>{stats.processedChunks > 0 ? ((stats.errorCount / stats.processedChunks) * 100).toFixed(1) : '0'}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}