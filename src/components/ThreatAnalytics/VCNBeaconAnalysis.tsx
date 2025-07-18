'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Target, Clock, TrendingUp, Activity, AlertTriangle, Wifi } from 'lucide-react'

interface BeaconData {
  id: string
  source_ip: string
  dest_ip: string
  dest_port: number
  connection_count: number
  avg_interval: number
  consistency_score: number
  confidence: number
  severity: string
  first_seen: string
  last_seen: string
  duration_hours: number
  total_bytes: number
}

interface VCNBeaconAnalysisProps {
  timeRange: string
}

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c', 
  medium: '#d97706',
  low: '#2563eb'
}

export default function VCNBeaconAnalysis({ timeRange }: VCNBeaconAnalysisProps) {
  const [beacons, setBeacons] = useState<BeaconData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBeacon, setSelectedBeacon] = useState<BeaconData | null>(null)

  const loadBeaconData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/threat-analytics/threats?timeRange=${timeRange}&type=beacon`)
      const data = await response.json()
      
      if (data.success && data.threats) {
        const beaconThreats = data.threats.filter((threat: any) => threat.type === 'beacon')
        setBeacons(beaconThreats)
      }
    } catch (error) {
      console.error('Failed to load beacon data:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    loadBeaconData()
  }, [timeRange, loadBeaconData])

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Prepare data for visualizations
  const intervalDistribution = beacons.map(beacon => ({
    name: `${beacon.source_ip}:${beacon.dest_port}`,
    interval: beacon.avg_interval / 60, // Convert to minutes
    consistency: beacon.consistency_score * 100,
    confidence: beacon.confidence,
    severity: beacon.severity,
    connections: beacon.connection_count
  }))

  const temporalPattern = beacons.reduce((acc, beacon) => {
    const hours = Math.floor(beacon.duration_hours)
    const existing = acc.find(item => item.hour === hours)
    if (existing) {
      existing.beacons += 1
    } else {
      acc.push({ hour: hours, beacons: 1 })
    }
    return acc
  }, [] as Array<{ hour: number; beacons: number }>)

  const confidenceDistribution = beacons.map(beacon => ({
    name: beacon.source_ip,
    confidence: beacon.confidence,
    connections: beacon.connection_count,
    severity: beacon.severity
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-orange-500" />
            Beacon Analysis
          </h2>
          <p className="text-muted-foreground">
            Detection and analysis of potential C2 beacon communications in VCN flow logs
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {beacons.length} beacons detected
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beacons</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{beacons.length}</div>
            <p className="text-xs text-muted-foreground">Detected patterns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {beacons.filter(b => b.confidence > 80).length}
            </div>
            <p className="text-xs text-muted-foreground">&gt;80% confidence</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Interval</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {beacons.length > 0 ? formatInterval(
                beacons.reduce((sum, b) => sum + b.avg_interval, 0) / beacons.length
              ) : '0s'}
            </div>
            <p className="text-xs text-muted-foreground">Average beacon interval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(beacons.reduce((sum, b) => sum + b.total_bytes, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Total beacon traffic</p>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Beacon Interval vs Consistency */}
        <Card>
          <CardHeader>
            <CardTitle>Interval vs Consistency Analysis</CardTitle>
            <CardDescription>
              Beacon intervals plotted against consistency scores (higher consistency = more suspicious)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={intervalDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="interval" 
                  name="Interval (minutes)"
                  label={{ value: 'Interval (minutes)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  dataKey="consistency"
                  name="Consistency (%)"
                  label={{ value: 'Consistency (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'interval' ? `${value} min` : `${value}%`,
                    name === 'interval' ? 'Interval' : 'Consistency'
                  ]}
                  labelFormatter={(label) => `Source: ${label}`}
                />
                <Scatter dataKey="consistency" fill="#8884d8">
                  {intervalDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Confidence Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Confidence Distribution</CardTitle>
            <CardDescription>
              Beacon detection confidence levels across detected patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={confidenceDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'confidence' ? `${value}%` : value,
                    name === 'confidence' ? 'Confidence' : 'Connections'
                  ]}
                />
                <Bar dataKey="confidence" name="Confidence">
                  {confidenceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Temporal Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Temporal Distribution</CardTitle>
            <CardDescription>
              When beacon activities occur over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temporalPattern.sort((a, b) => a.hour - b.hour)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" label={{ value: 'Duration (hours)', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Beacon Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => [value, 'Beacons']} />
                <Line type="monotone" dataKey="beacons" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Beacons Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Detected Beacons</CardTitle>
            <CardDescription>
              Highest confidence beacon detections requiring investigation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {beacons.slice(0, 5).map((beacon) => (
                <div 
                  key={beacon.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedBeacon(beacon)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{beacon.source_ip}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{beacon.dest_ip}:{beacon.dest_port}</span>
                        <Badge className={
                          beacon.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          beacon.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          beacon.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {beacon.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {beacon.connection_count} connections • {formatInterval(beacon.avg_interval)} interval
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{beacon.confidence}%</div>
                      <Progress value={beacon.confidence} className="w-16 h-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Beacon Information */}
      {selectedBeacon && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Beacon Details: {selectedBeacon.source_ip} → {selectedBeacon.dest_ip}:{selectedBeacon.dest_port}
            </CardTitle>
            <CardDescription>
              Detailed analysis of selected beacon communication pattern
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Communication Pattern</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Connections:</span>
                    <span className="font-medium">{selectedBeacon.connection_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Interval:</span>
                    <span className="font-medium">{formatInterval(selectedBeacon.avg_interval)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Consistency:</span>
                    <span className="font-medium">{(selectedBeacon.consistency_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{selectedBeacon.duration_hours.toFixed(1)}h</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Data Transfer</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Bytes:</span>
                    <span className="font-medium">{formatBytes(selectedBeacon.total_bytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg per Connection:</span>
                    <span className="font-medium">
                      {formatBytes(selectedBeacon.total_bytes / selectedBeacon.connection_count)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Destination Port:</span>
                    <span className="font-medium">{selectedBeacon.dest_port}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>First Seen:</span>
                    <span className="font-medium">
                      {new Date(selectedBeacon.first_seen).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Seen:</span>
                    <span className="font-medium">
                      {new Date(selectedBeacon.last_seen).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span className="font-medium text-red-600">{selectedBeacon.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-2">
              <Button variant="outline" size="sm">
                Create Alert Rule
              </Button>
              <Button variant="outline" size="sm">
                Block Traffic
              </Button>
              <Button variant="outline" size="sm">
                Export Analysis
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedBeacon(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}