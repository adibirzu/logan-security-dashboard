'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  ComposedChart,
  Treemap,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { 
  Download, 
  Maximize2, 
  Settings, 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon,
  Activity,
  Map,
  Layers,
  Target,
  Zap
} from 'lucide-react'

interface DataPoint {
  [key: string]: any
}

interface VisualizationProps {
  data: DataPoint[]
  title?: string
  onExport?: (format: 'png' | 'svg' | 'csv' | 'json') => void
  interactive?: boolean
  height?: number
}

const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98',
  '#f0e68c', '#ffa07a', '#20b2aa', '#ff6347', '#9370db'
]

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#65a30d',
  info: '#2563eb'
}

export function TimeSeriesChart({ data, title = "Time Series Analysis", height = 400 }: VisualizationProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line')

  const processedData = useMemo(() => {
    if (!data.length) return []
    
    // Group data by time intervals (hourly)
    const timeGroups = data.reduce((acc, item) => {
      const timeKey = item.Time ? new Date(item.Time).toISOString().slice(0, 13) + ':00:00' : 'Unknown'
      if (!acc[timeKey]) {
        acc[timeKey] = { time: timeKey, count: 0, events: [] }
      }
      acc[timeKey].count++
      acc[timeKey].events.push(item)
      return acc
    }, {} as Record<string, any>)

    return Object.values(timeGroups).sort((a: any, b: any) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    )
  }, [data])

  const availableMetrics = useMemo(() => {
    if (!data.length) return []
    const keys = Object.keys(data[0]).filter(key => 
      typeof data[0][key] === 'number' || key === 'count'
    )
    return keys
  }, [data])

  const ChartComponent = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </span>
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(label) => new Date(label).toLocaleString()}
              formatter={(value, name) => [value, name]}
            />
            <Legend />
            {chartType === 'line' && (
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke={CHART_COLORS[0]} 
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[0] }}
              />
            )}
            {chartType === 'area' && (
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke={CHART_COLORS[0]} 
                fill={CHART_COLORS[0]}
                fillOpacity={0.6}
              />
            )}
            {chartType === 'bar' && (
              <Bar dataKey="count" fill={CHART_COLORS[0]} />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function SecurityHeatmap({ data, title = "Security Events Heatmap", height = 400 }: VisualizationProps) {
  const heatmapData = useMemo(() => {
    if (!data.length) return []

    // Create a heatmap based on IP addresses and event types
    const ipEventMap = data.reduce((acc, item) => {
      const ip = item['IP Address'] || item['Source IP'] || 'Unknown'
      const eventType = item['Event Type'] || item['Event Name'] || 'Unknown'
      
      const key = `${ip}-${eventType}`
      if (!acc[key]) {
        acc[key] = { ip, eventType, count: 0, severity: 'low' }
      }
      acc[key].count++
      
      // Determine severity based on count
      if (acc[key].count > 100) acc[key].severity = 'critical'
      else if (acc[key].count > 50) acc[key].severity = 'high'
      else if (acc[key].count > 20) acc[key].severity = 'medium'
      
      return acc
    }, {} as Record<string, any>)

    return Object.values(ipEventMap)
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <Treemap
            data={heatmapData}
            dataKey="count"
            aspectRatio={4/3}
            stroke="#fff"
            fill={CHART_COLORS[0]}
          >
            <Tooltip 
              formatter={(value, name, props) => [
                `Count: ${value}`,
                `${props.payload.ip} - ${props.payload.eventType}`
              ]}
            />
          </Treemap>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function NetworkTopology({ data, title = "Network Topology", height = 500 }: VisualizationProps) {
  const networkData = useMemo(() => {
    if (!data.length) return []

    // Create network connections based on source and destination IPs
    const connections = data.reduce((acc, item) => {
      const sourceIP = item['Source IP'] || item['IP Address']
      const destIP = item['Destination IP'] || item['Target IP']
      
      if (sourceIP && destIP) {
        const key = `${sourceIP}-${destIP}`
        if (!acc[key]) {
          acc[key] = { source: sourceIP, destination: destIP, count: 0 }
        }
        acc[key].count++
      }
      
      return acc
    }, {} as Record<string, any>)

    return Object.values(connections)
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart data={networkData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="source" />
            <YAxis dataKey="destination" />
            <Tooltip 
              formatter={(value, name, props) => [
                `Connections: ${props.payload.count}`,
                `${props.payload.source} → ${props.payload.destination}`
              ]}
            />
            <Scatter 
              dataKey="count" 
              fill={CHART_COLORS[2]}
              r={8}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function ThreatRadar({ data, title = "Threat Analysis Radar", height = 400 }: VisualizationProps) {
  const radarData = useMemo(() => {
    if (!data.length) return []

    // Calculate threat metrics
    const metrics = {
      'Failed Logins': 0,
      'Privilege Escalation': 0,
      'Network Anomalies': 0,
      'Data Access': 0,
      'System Errors': 0,
      'Suspicious IPs': 0
    }

    data.forEach(item => {
      const eventName = item['Event Name'] || ''
      const eventType = item['Event Type'] || ''
      const securityResult = item['Security Result'] || ''

      if (eventName.includes('login') && securityResult === 'denied') {
        metrics['Failed Logins']++
      }
      if (eventName.includes('privilege') || eventName.includes('sudo')) {
        metrics['Privilege Escalation']++
      }
      if (eventType.includes('network') || eventType.includes('connection')) {
        metrics['Network Anomalies']++
      }
      if (eventName.includes('access') || eventName.includes('file')) {
        metrics['Data Access']++
      }
      if (eventName.includes('error') || eventName.includes('fail')) {
        metrics['System Errors']++
      }
    })

    // Normalize values to 0-100 scale
    const maxValue = Math.max(...Object.values(metrics))
    return Object.entries(metrics).map(([category, value]) => ({
      category,
      value: maxValue > 0 ? (value / maxValue) * 100 : 0,
      fullMark: 100
    }))
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar
              name="Threat Level"
              dataKey="value"
              stroke={SEVERITY_COLORS.high}
              fill={SEVERITY_COLORS.high}
              fillOpacity={0.6}
              strokeWidth={2}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function MultiMetricDashboard({ data, title = "Multi-Metric Dashboard", height = 600 }: VisualizationProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const processedMetrics = useMemo(() => {
    if (!data.length) return { summary: [], trends: [], distribution: [] }

    // Summary metrics
    const summary = [
      { name: 'Total Events', value: data.length, change: '+12%', positive: true },
      { name: 'Unique Sources', value: new Set(data.map(d => d['Log Source'])).size, change: '+5%', positive: true },
      { name: 'Failed Events', value: data.filter(d => d['Security Result'] === 'denied').length, change: '-8%', positive: false },
      { name: 'Critical Alerts', value: data.filter(d => d['Event Name']?.includes('critical')).length, change: '+15%', positive: false }
    ]

    // Trends by hour
    const hourlyTrends = data.reduce((acc, item) => {
      const hour = item.Time ? new Date(item.Time).getHours() : 0
      if (!acc[hour]) acc[hour] = { hour, events: 0, failed: 0, success: 0 }
      acc[hour].events++
      if (item['Security Result'] === 'denied') acc[hour].failed++
      else acc[hour].success++
      return acc
    }, {} as Record<number, any>)

    const trends = Object.values(hourlyTrends).sort((a: any, b: any) => a.hour - b.hour)

    // Distribution by log source
    const sourceDistribution = data.reduce((acc, item) => {
      const source = item['Log Source'] || 'Unknown'
      if (!acc[source]) acc[source] = { name: source, value: 0, events: [] }
      acc[source].value++
      acc[source].events.push(item)
      return acc
    }, {} as Record<string, any>)

    const distribution = Object.values(sourceDistribution)

    return { summary, trends, distribution }
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {processedMetrics.summary.map((metric, index) => (
                <Card key={metric.name}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{metric.name}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-bold">{metric.value.toLocaleString()}</p>
                        <Badge variant={metric.positive ? "default" : "destructive"}>
                          {metric.change}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <ResponsiveContainer width="100%" height={height - 100}>
              <ComposedChart data={processedMetrics.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={(value) => `${value}:00`} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="events" fill={CHART_COLORS[0]} name="Total Events" />
                <Line type="monotone" dataKey="failed" stroke={SEVERITY_COLORS.high} name="Failed Events" />
                <Line type="monotone" dataKey="success" stroke={SEVERITY_COLORS.low} name="Successful Events" />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="distribution">
            <ResponsiveContainer width="100%" height={height - 100}>
              <PieChart>
                <Pie
                  data={processedMetrics.distribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {processedMetrics.distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export function AdvancedVisualizationSuite({ data, title = "Advanced Analytics", onExport }: VisualizationProps) {
  const [activeChart, setActiveChart] = useState('timeseries')

  const chartComponents = {
    timeseries: TimeSeriesChart,
    heatmap: SecurityHeatmap,
    network: NetworkTopology,
    radar: ThreatRadar,
    dashboard: MultiMetricDashboard
  }

  const ActiveComponent = chartComponents[activeChart as keyof typeof chartComponents]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {title}
            </span>
            <div className="flex items-center gap-2">
              <Select value={activeChart} onValueChange={setActiveChart}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timeseries">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Time Series
                    </div>
                  </SelectItem>
                  <SelectItem value="heatmap">
                    <div className="flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      Security Heatmap
                    </div>
                  </SelectItem>
                  <SelectItem value="network">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Network Topology
                    </div>
                  </SelectItem>
                  <SelectItem value="radar">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Threat Radar
                    </div>
                  </SelectItem>
                  <SelectItem value="dashboard">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Multi-Metric Dashboard
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {onExport && (
                <Button variant="outline" size="sm" onClick={() => onExport('png')}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <ActiveComponent 
        data={data} 
        title={`${title} - ${activeChart}`}
        onExport={onExport}
        interactive={true}
        height={500}
      />
    </div>
  )
}