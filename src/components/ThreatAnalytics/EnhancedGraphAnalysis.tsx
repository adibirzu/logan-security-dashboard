'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Network, Server, Globe, Shield, Eye, RefreshCw, Download } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import NetworkGraphVisualization from './NetworkGraphVisualization'
import IPLogViewer from './IPLogViewer'
import LogViewerCard from './LogViewerCard'

interface ApplicationCommunication {
  source_app: string
  dest_app: string
  source_ip: string
  dest_ip: string
  port: number
  protocol: string
  connection_count: number
  total_bytes: number
  first_seen: string
  last_seen: string
  log_sources: string[]
  risk_score: number
}

interface IPCommunication {
  source_ip: string
  dest_ip: string
  ports_used: number[]
  protocols: string[]
  actions: string[]
  connection_count: number
  total_bytes: number
  first_seen: string
  last_seen: string
  log_sources: string[]
  is_internal_to_internal: boolean
  is_internal_to_external: boolean
  is_external_to_internal: boolean
  risk_indicators: string[]
}

interface LogSource {
  name: string
  count: number
  sample_fields: string[]
  has_ip_fields: boolean
  has_application_fields: boolean
  has_user_fields: boolean
  last_updated: string
}

interface EnhancedGraphAnalysisProps {
  timeRange: string
}

const EnhancedGraphAnalysis: React.FC<EnhancedGraphAnalysisProps> = ({ timeRange }) => {
  const [applications, setApplications] = useState<ApplicationCommunication[]>([])
  const [ipCommunications, setIPCommunications] = useState<IPCommunication[]>([])
  const [logSources, setLogSources] = useState<Record<string, LogSource>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<{type: string, value: string} | null>(null)
  const [activeTab, setActiveTab] = useState('graph')
  const [selectedIP, setSelectedIP] = useState<string | null>(null)

  const handleIPClick = (ip: string) => {
    setSelectedIP(ip)
  }

  // Load enhanced RITA data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Load all data in parallel
      const [discoverResponse, appsResponse, commsResponse] = await Promise.all([
        fetch(`/api/rita/discover?timeRange=${timeRange}`),
        fetch(`/api/rita/applications?timeRange=${timeRange}`),
        fetch(`/api/rita/communications?timeRange=${timeRange}`)
      ])

      const [discoverData, appsData, commsData] = await Promise.all([
        discoverResponse.json(),
        appsResponse.json(),
        commsResponse.json()
      ])

      if (discoverData.success) {
        setLogSources(discoverData.log_sources || {})
      }

      if (appsData.success) {
        setApplications(appsData.applications || [])
      }

      if (commsData.success) {
        setIPCommunications(commsData.ip_communications || [])
      }

      // Set error if any request failed
      if (!discoverData.success || !appsData.success || !commsData.success) {
        setError('Some data could not be loaded. Check the console for details.')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enhanced RITA data')
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleGraphSelection = (nodeId: string, nodeType: string) => {
    let selectionType = 'ip'
    let selectionValue = nodeId

    // Extract actual value from node ID
    if (nodeId.startsWith('ip:')) {
      selectionType = 'ip'
      selectionValue = nodeId.substring(3)
    } else if (nodeId.startsWith('port:')) {
      selectionType = 'port'
      selectionValue = nodeId.substring(5)
    } else if (nodeId.startsWith('user:')) {
      selectionType = 'user'
      selectionValue = nodeId.substring(5)
    }

    setSelectedItem({ type: selectionType, value: selectionValue })
    setActiveTab('logs')
  }

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const getRiskBadgeVariant = (riskScore: number) => {
    if (riskScore >= 0.8) return 'destructive'
    if (riskScore >= 0.6) return 'secondary'
    if (riskScore >= 0.4) return 'outline'
    return 'default'
  }

  const exportData = (data: any, filename: string) => {
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}_${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced RITA Analysis</h2>
          <p className="text-muted-foreground">
            Comprehensive threat analytics across all log sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sources">Log Sources</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="communications">IP Communications</TabsTrigger>
          <TabsTrigger value="graph">Graph Analysis</TabsTrigger>
          <TabsTrigger value="logs">Log Viewer</TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Discovered Log Sources
              </CardTitle>
              <CardDescription>
                Available log sources and their characteristics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {Object.entries(logSources).map(([name, source]) => (
                    <Card key={name}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{name}</h4>
                          <Badge variant="outline">{source.count} records</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {source.has_ip_fields && (
                            <Badge variant="default" className="text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              IP Fields
                            </Badge>
                          )}
                          {source.has_application_fields && (
                            <Badge variant="default" className="text-xs">
                              <Server className="h-3 w-3 mr-1" />
                              App Fields
                            </Badge>
                          )}
                          {source.has_user_fields && (
                            <Badge variant="default" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              User Fields
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Fields: {(source.sample_fields || []).slice(0, 5).join(', ')}
                          {(source.sample_fields || []).length > 5 && '...'}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Application Communications
                  </CardTitle>
                  <CardDescription>
                    Discovered application-to-application communications
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportData(applications, 'applications')}
                  disabled={(applications || []).length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (applications || []).length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No application communications found
                </div>
              ) : (
                <div className="space-y-4">
                  {(applications || []).slice(0, 20).map((app, index) => (
                    <Card key={index} className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedItem({type: 'application', value: `${app.source_app}:${app.dest_app}:${app.port}`})}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {app.source_app} → {app.dest_app}
                            </Badge>
                            <Badge variant={getRiskBadgeVariant(app.risk_score)}>
                              Risk: {(app.risk_score * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <Badge variant="secondary">
                            Port {app.port}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Connections:</span>
                            <div className="font-medium">{app.connection_count}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Data:</span>
                            <div className="font-medium">{formatBytes(app.total_bytes)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Protocol:</span>
                            <div className="font-medium">{app.protocol}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sources:</span>
                            <div className="font-medium">{(app.log_sources || []).length}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    IP Communications
                  </CardTitle>
                  <CardDescription>
                    IP-to-IP communication patterns across all sources
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportData(ipCommunications, 'ip_communications')}
                  disabled={(ipCommunications || []).length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (ipCommunications || []).length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No IP communications found
                </div>
              ) : (
                <div className="space-y-4">
                  {(ipCommunications || []).slice(0, 30).map((comm, index) => (
                    <Card key={index} className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleIPClick(comm.source_ip)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-mono text-sm">
                            <span 
                              className="hover:underline cursor-pointer text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleIPClick(comm.source_ip)
                              }}
                            >
                              {comm.source_ip}
                            </span>
                            {' → '}
                            <span 
                              className="hover:underline cursor-pointer text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleIPClick(comm.dest_ip)
                              }}
                            >
                              {comm.dest_ip}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {comm.is_internal_to_external && (
                              <Badge variant="secondary">Internal → External</Badge>
                            )}
                            {comm.is_external_to_internal && (
                              <Badge variant="destructive">External → Internal</Badge>
                            )}
                            {comm.is_internal_to_internal && (
                              <Badge variant="default">Internal → Internal</Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Connections:</span>
                            <div className="font-medium">{comm.connection_count}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ports:</span>
                            <div className="font-medium">{(comm.ports_used || []).length}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Data:</span>
                            <div className="font-medium">{formatBytes(comm.total_bytes)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sources:</span>
                            <div className="font-medium">{(comm.log_sources || []).length}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Risk Indicators:</span>
                            <div className="font-medium">{(comm.risk_indicators || []).length}</div>
                          </div>
                        </div>
                        {(comm.risk_indicators || []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(comm.risk_indicators || []).map((indicator, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">
                                {indicator}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graph">
          <NetworkGraphVisualization 
            timeRange={timeRange} 
            onIpClick={handleIPClick}
          />
        </TabsContent>

        <TabsContent value="logs">
          <LogViewerCard
            selectionType={selectedItem?.type || null}
            selectionValue={selectedItem?.value || null}
            timeRange={timeRange}
            onClose={() => setSelectedItem(null)}
          />
        </TabsContent>
      </Tabs>

      {/* IP Log Viewer Modal */}
      {selectedIP && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <IPLogViewer
            ip={selectedIP}
            timeRange={timeRange}
            onClose={() => setSelectedIP(null)}
          />
        </div>
      )}
    </div>
  )
}

export default EnhancedGraphAnalysis