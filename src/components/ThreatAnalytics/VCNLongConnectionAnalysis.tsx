'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts'
import { Clock, Activity, TrendingUp, Database, AlertTriangle, Timer } from 'lucide-react'

interface LongConnectionData {
  id: string
  source_ip: string
  dest_ip: string
  dest_port: number
  total_duration: number
  total_bytes: number
  total_packets: number
  avg_bytes_per_second: number
  confidence: number
  severity: string
  start_time: string
  end_time: string
}

interface VCNLongConnectionAnalysisProps {
  timeRange: string
  onIpClick?: (ip: string) => void
}

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c', 
  medium: '#d97706',
  low: '#2563eb'
}

const PORT_CATEGORIES: Record<string, number[]> = {
  'Web Traffic': [80, 443, 8080, 8443],
  'Database': [1433, 1521, 3306, 5432, 27017],
  'File Transfer': [21, 22, 989, 990],
  'Remote Access': [22, 3389, 5900, 5901],
  'Email': [25, 110, 143, 993, 995],
  'Other': []
}

export default function VCNLongConnectionAnalysis({ timeRange, onIpClick }: VCNLongConnectionAnalysisProps) {
  const [connections, setConnections] = useState<LongConnectionData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<LongConnectionData | null>(null)

  const loadConnectionData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/threat-analytics/threats?timeRange=${timeRange}&type=long_connection`)
      const data = await response.json()
      
      if (data.success && data.threats) {
        const longConnThreats = data.threats.filter((threat: any) => threat.type === 'long_connection')
        setConnections(longConnThreats)
      }
    } catch (error) {
      console.error('Failed to load long connection data:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    loadConnectionData()
  }, [timeRange, loadConnectionData])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTransferRate = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + '/s'
  }

  const getPortCategory = (port: number): string => {
    for (const [category, ports] of Object.entries(PORT_CATEGORIES)) {
      if (category !== 'Other' && ports.includes(port)) return category
    }
    return 'Other'
  }

  // Data for visualizations
  const durationDistribution = connections.map(conn => ({
    name: `${conn.source_ip}:${conn.dest_port}`,
    duration: conn.total_duration / 3600, // Convert to hours
    bytes: conn.total_bytes,
    rate: conn.avg_bytes_per_second,
    severity: conn.severity,
    confidence: conn.confidence
  }))

  const portCategoryData = connections.reduce((acc, conn) => {
    const category = getPortCategory(conn.dest_port)
    const existing = acc.find(item => item.name === category)
    if (existing) {
      existing.count += 1
      existing.totalDuration += conn.total_duration
      existing.totalBytes += conn.total_bytes
    } else {
      acc.push({
        name: category,
        count: 1,
        totalDuration: conn.total_duration,
        totalBytes: conn.total_bytes
      })
    }
    return acc
  }, [] as Array<{ name: string; count: number; totalDuration: number; totalBytes: number }>)

  const transferRateData = connections.map(conn => ({
    name: conn.source_ip,
    rate: conn.avg_bytes_per_second / 1024, // Convert to KB/s
    duration: conn.total_duration / 3600,
    confidence: conn.confidence,
    severity: conn.severity
  }))

  const severityDistribution = connections.reduce((acc, conn) => {
    const existing = acc.find(item => item.name === conn.severity)
    if (existing) {
      existing.value += 1
    } else {
      acc.push({ name: conn.severity, value: 1 })
    }
    return acc
  }, [] as Array<{ name: string; value: number }>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-500" />
            Long Connection Analysis
          </h2>
          <p className="text-muted-foreground">
            Detection and analysis of abnormally long network connections in VCN flow logs
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {connections.length} long connections detected
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.length}</div>
            <p className="text-xs text-muted-foreground">Long-duration sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Timer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connections.length > 0 ? formatDuration(
                connections.reduce((sum, c) => sum + c.total_duration, 0) / connections.length
              ) : '0m'}
            </div>
            <p className="text-xs text-muted-foreground">Average session length</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Data</CardTitle>
            <Database className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(connections.reduce((sum, c) => sum + c.total_bytes, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Total bytes transferred</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {connections.filter(c => c.confidence > 80).length}
            </div>
            <p className="text-xs text-muted-foreground">&gt;80% confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duration vs Bytes Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Duration vs Data Transfer</CardTitle>
            <CardDescription>
              Connection duration plotted against total bytes transferred
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={durationDistribution.slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="duration" 
                  label={{ value: 'Duration (hours)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Bytes Transferred', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'bytes' ? formatBytes(value as number) : `${value} hours`,
                    name === 'bytes' ? 'Data Transferred' : 'Duration'
                  ]}
                />
                <Area type="monotone" dataKey="bytes" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transfer Rate Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Transfer Rate Analysis</CardTitle>
            <CardDescription>
              Data transfer rates for long connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transferRateData.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'KB/s', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value) => [`${value} KB/s`, 'Transfer Rate']}
                />
                <Bar dataKey="rate" name="Transfer Rate">
                  {transferRateData.slice(0, 15).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Port Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Service Category Analysis</CardTitle>
            <CardDescription>
              Distribution of long connections by service type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={portCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {portCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(SEVERITY_COLORS)[index % Object.values(SEVERITY_COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Level Distribution</CardTitle>
            <CardDescription>
              Classification of long connections by severity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={severityDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Count">
                  {severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Connection Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Connection Analysis</CardTitle>
          <CardDescription>
            Comprehensive view of detected long connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {connections.slice(0, 10).map((connection) => (
              <div 
                key={connection.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedConnection(connection)}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-medium hover:underline cursor-pointer text-blue-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onIpClick) {
                            onIpClick(connection.source_ip)
                          }
                        }}
                      >
                        {connection.source_ip}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span 
                        className="font-medium hover:underline cursor-pointer text-blue-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onIpClick) {
                            onIpClick(connection.dest_ip)
                          }
                        }}
                      >
                        {connection.dest_ip}
                      </span>
                      <span className="font-medium">:{connection.dest_port}</span>
                      <Badge className={
                        connection.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        connection.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        connection.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {connection.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {getPortCategory(connection.dest_port)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>Duration: {formatDuration(connection.total_duration)}</div>
                      <div>Data: {formatBytes(connection.total_bytes)}</div>
                      <div>Rate: {formatTransferRate(connection.avg_bytes_per_second)}</div>
                      <div>Packets: {connection.total_packets.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{connection.confidence}%</div>
                    <Progress value={connection.confidence} className="w-20 h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Connection Information */}
      {selectedConnection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Connection Details: {selectedConnection.source_ip} → {selectedConnection.dest_ip}:{selectedConnection.dest_port}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Connection Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{formatDuration(selectedConnection.total_duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Bytes:</span>
                    <span className="font-medium">{formatBytes(selectedConnection.total_bytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Packets:</span>
                    <span className="font-medium">{selectedConnection.total_packets.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Rate:</span>
                    <span className="font-medium">{formatTransferRate(selectedConnection.avg_bytes_per_second)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Service Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Destination Port:</span>
                    <span className="font-medium">{selectedConnection.dest_port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Category:</span>
                    <span className="font-medium">{getPortCategory(selectedConnection.dest_port)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk Level:</span>
                    <span className={`font-medium ${
                      selectedConnection.severity === 'critical' ? 'text-red-600' :
                      selectedConnection.severity === 'high' ? 'text-orange-600' :
                      selectedConnection.severity === 'medium' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {selectedConnection.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span className="font-medium">{selectedConnection.confidence}%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Start Time:</span>
                    <span className="font-medium">
                      {new Date(selectedConnection.start_time).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>End Time:</span>
                    <span className="font-medium">
                      {new Date(selectedConnection.end_time).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-2">
              <Button variant="outline" size="sm">
                Create Monitoring Rule
              </Button>
              <Button variant="outline" size="sm">
                Investigate Traffic
              </Button>
              <Button variant="outline" size="sm">
                Export Data
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedConnection(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}