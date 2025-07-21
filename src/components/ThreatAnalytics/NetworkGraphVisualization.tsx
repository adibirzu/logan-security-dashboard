'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Network, 
  Activity, 
  RefreshCw,
  Globe,
  Server,
  Download,
  Eye,
  EyeOff,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Settings
} from 'lucide-react'
import { formatBytes } from '@/lib/format'
import { getTimePeriodMinutes, parseCustomTimeRange } from '@/lib/timeUtils'

// Dynamically import Cytoscape to avoid SSR issues
import dynamic from 'next/dynamic'

interface GraphNode {
  id: string
  label: string
  type: string
  connections: number
  bytesTransferred: number
  firstSeen: string
  lastSeen: string
  principal?: string
}

interface GraphEdge {
  id: string
  source: string
  target: string
  weight: number
  bytes: number
  packets: number
  protocols: string[]
  actions: string[]
  logs: Array<{
    time: string
    sourcePort: string
    destPort: string
    protocol: string
    action: string
    bytes: number
    packets: number
    logSource: string
  }>
}

interface GraphData {
  success: boolean
  nodes: GraphNode[]
  edges: GraphEdge[]
  statistics: {
    nodeCount: number
    edgeCount: number
    totalConnections: number
    totalBytes: number
    timeRange: string
  }
}

interface GraphFilters {
  timeRange: string
  ipFilter: string
  subnetFilter: string
  minConnections: number
  minBytes: number
  maxNodes: number
  maxEdges: number
  includeInternal: boolean
  includeExternal: boolean
  includeInbound: boolean
  includeOutbound: boolean
  actionFilters: string[]
  logSourceFilters: string[]
  nodeTypes: string[]
  protocolFilters: string[]
}

interface NetworkGraphVisualizationProps {
  timeRange: string
  onIpClick?: (ip: string) => void
}

// Dynamic import for Cytoscape component to avoid SSR issues
const CytoscapeComponent = dynamic(() => import('react-cytoscapejs'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><RefreshCw className="h-6 w-6 animate-spin" /></div>
}) as any

const NODE_TYPE_COLORS = {
  ip: '#3b82f6',      // Blue
  user: '#10b981',    // Green
  process: '#f59e0b', // Yellow
  port: '#8b5cf6',    // Purple
  service: '#06b6d4', // Cyan
  host: '#ef4444',    // Red
  unknown: '#6b7280'  // Gray
}

const LAYOUT_OPTIONS = {
  'cose': 'Force-directed',
  'circle': 'Circular',
  'grid': 'Grid',
  'breadthfirst': 'Hierarchical',
  'concentric': 'Concentric'
}

export default function NetworkGraphVisualization({ timeRange, onIpClick }: NetworkGraphVisualizationProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [filteredGraphData, setFilteredGraphData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null)
  const [layoutName, setLayoutName] = useState('cose')
  const [showLabels, setShowLabels] = useState(true)
  const [cytoscapeRef, setCytoscapeRef] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<GraphFilters>({
    timeRange: timeRange,
    ipFilter: '',
    subnetFilter: '',
    minConnections: 1,
    minBytes: 0,
    maxNodes: 200,
    maxEdges: 500,
    includeInternal: true,
    includeExternal: true,
    includeInbound: true,
    includeOutbound: true,
    actionFilters: ['ACCEPT', 'REJECT', 'DROP'],
    logSourceFilters: ['VCN Flow Logs', 'Audit Logs', 'Load Balancer Logs', 'WAF Logs'],
    nodeTypes: ['ip', 'user', 'process', 'port', 'service', 'host'],
    protocolFilters: ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS']
  })

  // Use the utility function that handles both string and numeric formats
  const getTimePeriodMinutesWithCustom = (range: string): number => {
    // Handle numeric format (e.g., "1440m", "60m")
    const numericMatch = range.match(/^(\d+)m?$/);
    if (numericMatch) {
      return parseInt(numericMatch[1], 10);
    }
    
    // Handle custom format (e.g., "custom:2024-01-01:2024-01-02")
    if (range.startsWith('custom:')) {
      const customResult = parseCustomTimeRange(range);
      return customResult !== null ? customResult : 1440;
    }
    
    // Handle standard format using utility function
    return getTimePeriodMinutes(range);
  }

  const loadGraphData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/graph/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: getTimePeriodMinutesWithCustom(filters.timeRange || timeRange),
          maxNodes: filters.maxNodes,
          maxEdges: filters.maxEdges
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setGraphData(data)
      } else {
        console.error('Failed to load graph data:', data.error)
      }
    } catch (error) {
      console.error('Failed to load graph data:', error)
    } finally {
      setLoading(false)
    }
  }, [filters.timeRange, filters.maxNodes, filters.maxEdges, timeRange])

  const isInternalIP = (ip: string): boolean => {
    // Check for private IP ranges
    const parts = ip.split('.').map(Number)
    if (parts.length !== 4) return false
    
    // 10.0.0.0/8
    if (parts[0] === 10) return true
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true
    // 127.0.0.0/8 (localhost)
    if (parts[0] === 127) return true
    
    return false
  }

  const matchesIPFilter = (ip: string, filter: string): boolean => {
    if (!filter) return true
    
    // Support comma-separated list
    const filters = filter.split(',').map(f => f.trim())
    return filters.some(f => {
      // Exact match
      if (ip === f) return true
      // Wildcard match (e.g., 192.168.*)
      if (f.includes('*')) {
        const regex = new RegExp('^' + f.replace(/\*/g, '.*') + '$')
        return regex.test(ip)
      }
      return false
    })
  }

  const matchesSubnetFilter = (ip: string, subnet: string): boolean => {
    if (!subnet) return true
    
    try {
      const [network, prefixLength] = subnet.split('/')
      if (!prefixLength) return ip.startsWith(network)
      
      const ipParts = ip.split('.').map(Number)
      const networkParts = network.split('.').map(Number)
      const prefix = parseInt(prefixLength)
      
      const mask = ~((1 << (32 - prefix)) - 1)
      const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3]
      const networkInt = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3]
      
      return (ipInt & mask) === (networkInt & mask)
    } catch {
      return false
    }
  }

  const applyFilters = useCallback(() => {
    if (!graphData || !graphData.nodes || !graphData.edges) return
    
    let filteredNodes = (graphData.nodes || []).filter(node => {
      // Node type filter
      if (!filters.nodeTypes.includes(node.type)) return false
      
      // IP filters
      if (node.type === 'ip') {
        if (!matchesIPFilter(node.id, filters.ipFilter)) return false
        if (!matchesSubnetFilter(node.id, filters.subnetFilter)) return false
        
        const isInternal = isInternalIP(node.id)
        if (isInternal && !filters.includeInternal) return false
        if (!isInternal && !filters.includeExternal) return false
      }
      
      // Connection threshold
      if (node.connections < filters.minConnections) return false
      
      // Bytes threshold
      if (node.bytesTransferred < filters.minBytes) return false
      
      return true
    })
    
    // Limit nodes
    if (filteredNodes.length > filters.maxNodes) {
      // Sort by connections and take top N
      filteredNodes = filteredNodes
        .sort((a, b) => b.connections - a.connections)
        .slice(0, filters.maxNodes)
    }
    
    const nodeIds = new Set(filteredNodes.map(n => n.id))
    
    let filteredEdges = (graphData.edges || []).filter(edge => {
      // Only include edges between filtered nodes
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return false
      
      // Action filters (with safety checks)
      const edgeActions = edge.actions || []
      const hasMatchingAction = edgeActions.some(action => 
        filters.actionFilters.includes(action)
      )
      if (!hasMatchingAction && edgeActions.length > 0) return false
      
      // Protocol filters (with safety checks)
      const edgeProtocols = edge.protocols || []
      const hasMatchingProtocol = edgeProtocols.some(protocol => 
        filters.protocolFilters.includes(protocol)
      )
      if (!hasMatchingProtocol && edgeProtocols.length > 0) return false
      
      // Log source filters (check edge logs with safety checks)
      const edgeLogs = edge.logs || []
      if (edgeLogs.length > 0) {
        const hasMatchingLogSource = edgeLogs.some(log => 
          filters.logSourceFilters.includes(log?.logSource)
        )
        if (!hasMatchingLogSource) return false
      }
      
      return true
    })
    
    // Limit edges
    if (filteredEdges.length > filters.maxEdges) {
      // Sort by weight (connection count) and take top N
      filteredEdges = filteredEdges
        .sort((a, b) => b.weight - a.weight)
        .slice(0, filters.maxEdges)
    }
    
    // Update statistics
    const filteredStats = {
      ...graphData.statistics,
      nodeCount: filteredNodes.length,
      edgeCount: filteredEdges.length,
      totalConnections: filteredNodes.reduce((sum, node) => sum + node.connections, 0),
      totalBytes: filteredNodes.reduce((sum, node) => sum + node.bytesTransferred, 0)
    }
    
    setFilteredGraphData({
      ...graphData,
      nodes: filteredNodes,
      edges: filteredEdges,
      statistics: filteredStats
    })
  }, [graphData, filters])

  useEffect(() => {
    loadGraphData()
  }, [timeRange, loadGraphData])

  useEffect(() => {
    if (graphData) {
      applyFilters()
    }
  }, [graphData, filters, applyFilters])

  const updateFilter = (key: keyof GraphFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({
      timeRange: timeRange,
      ipFilter: '',
      subnetFilter: '',
      minConnections: 1,
      minBytes: 0,
      maxNodes: 200,
      maxEdges: 500,
      includeInternal: true,
      includeExternal: true,
      includeInbound: true,
      includeOutbound: true,
      actionFilters: ['ACCEPT', 'REJECT', 'DROP'],
      logSourceFilters: ['VCN Flow Logs', 'Audit Logs', 'Load Balancer Logs', 'WAF Logs'],
      nodeTypes: ['ip', 'user', 'process', 'port', 'service', 'host'],
      protocolFilters: ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS']
    })
  }

  const formatCytoscapeData = () => {
    const dataToUse = filteredGraphData || graphData
    if (!dataToUse || !dataToUse.nodes || !dataToUse.edges) {
      return { nodes: [], edges: [] }
    }

    const nodes = dataToUse.nodes.map(node => ({
      data: {
        id: node.id,
        label: showLabels ? node.label : '',
        type: node.type,
        connections: node.connections,
        bytesTransferred: node.bytesTransferred,
        principal: node.principal,
        firstSeen: node.firstSeen,
        lastSeen: node.lastSeen,
        size: Math.max(30, Math.min(80, node.connections * 5)),
        color: NODE_TYPE_COLORS[node.type as keyof typeof NODE_TYPE_COLORS] || NODE_TYPE_COLORS.ip
      }
    }))

    const edges = dataToUse.edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        bytes: edge.bytes,
        packets: edge.packets,
        protocols: edge.protocols,
        actions: edge.actions,
        logs: edge.logs,
        width: Math.max(1, Math.min(10, Math.log10(edge.bytes + 1))),
        label: edge.protocols.join(', ')
      }
    }))

    return { nodes, edges }
  }

  const cytoscapeStylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'width': 'data(size)',
        'height': 'data(size)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '12px',
        'color': '#ffffff',
        'text-outline-width': 2,
        'text-outline-color': '#000000',
        'border-width': 2,
        'border-color': '#000000'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 'data(width)',
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#ef4444',
        'background-color': '#dc2626'
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        'width': 6
      }
    }
  ]

  const cytoscapeLayout = {
    name: layoutName,
    animate: true,
    animationDuration: 1000,
    ...(layoutName === 'cose' && {
      nodeRepulsion: 8000,
      nodeOverlap: 20,
      idealEdgeLength: 100,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0
    })
  }

  const handleNodeTap = (event: any) => {
    const nodeId = event.target.id()
    const nodeData = event.target.data()
    setSelectedNode(nodeId)
    setSelectedEdge(null)
    
    // If it's an IP node and we have a click handler, call it
    if (nodeData.type === 'ip' && onIpClick) {
      onIpClick(nodeId)
    }
  }

  const handleEdgeTap = (event: any) => {
    const edgeData = event.target.data()
    const dataToUse = filteredGraphData || graphData
    const edge = dataToUse?.edges.find(e => e.id === edgeData.id)
    if (edge) {
      setSelectedEdge(edge)
      setSelectedNode(null)
    }
  }

  const exportGraphData = () => {
    const dataToExport = filteredGraphData || graphData
    if (!dataToExport) return
    
    const dataStr = JSON.stringify(dataToExport, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const suffix = filteredGraphData ? '-filtered' : ''
    const exportFileDefaultName = `network-graph-${filters.timeRange}${suffix}-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading network graph...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No network data available for the selected time range</p>
            <Button onClick={loadGraphData} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const cytoscapeData = formatCytoscapeData()
  const dataToUse = filteredGraphData || graphData
  const selectedNodeData = dataToUse.nodes.find(n => n.id === selectedNode)
  const statsToUse = dataToUse.statistics

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsToUse.nodeCount}
              {filteredGraphData && graphData.statistics.nodeCount !== statsToUse.nodeCount && (
                <span className="text-sm text-muted-foreground ml-1">
                  / {graphData.statistics.nodeCount}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredGraphData ? 'Filtered' : 'Unique'} addresses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections</CardTitle>
            <Network className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsToUse.edgeCount}
              {filteredGraphData && graphData.statistics.edgeCount !== statsToUse.edgeCount && (
                <span className="text-sm text-muted-foreground ml-1">
                  / {graphData.statistics.edgeCount}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredGraphData ? 'Filtered' : 'Network'} flows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Traffic</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(statsToUse.totalBytes)}</div>
            <p className="text-xs text-muted-foreground">Data transferred</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Range</CardTitle>
            <Server className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsToUse.timeRange}</div>
            <p className="text-xs text-muted-foreground">Analysis period</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Graph Filters</CardTitle>
              {filteredGraphData && (
                <Badge variant="secondary" className="ml-2">
                  Filtered: {statsToUse.nodeCount} nodes, {statsToUse.edgeCount} edges
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                Reset Filters
              </Button>
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    {showFilters ? 'Hide' : 'Show'} Filters
                    {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
          </div>
        </CardHeader>
        
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Time and Basic Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time-range">Time Range</Label>
                  <Select value={filters.timeRange} onValueChange={(value) => updateFilter('timeRange', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15m">Last 15 minutes</SelectItem>
                      <SelectItem value="30m">Last 30 minutes</SelectItem>
                      <SelectItem value="1h">Last hour</SelectItem>
                      <SelectItem value="3h">Last 3 hours</SelectItem>
                      <SelectItem value="6h">Last 6 hours</SelectItem>
                      <SelectItem value="12h">Last 12 hours</SelectItem>
                      <SelectItem value="24h">Last 24 hours</SelectItem>
                      <SelectItem value="2d">Last 2 days</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ip-filter">IP Address Filter</Label>
                  <Input
                    id="ip-filter"
                    placeholder="e.g., 192.168.1.*, 10.0.0.1"
                    value={filters.ipFilter}
                    onChange={(e) => updateFilter('ipFilter', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated IPs, supports wildcards (*)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subnet-filter">Subnet Filter (CIDR)</Label>
                  <Input
                    id="subnet-filter"
                    placeholder="e.g., 192.168.1.0/24"
                    value={filters.subnetFilter}
                    onChange={(e) => updateFilter('subnetFilter', e.target.value)}
                  />
                </div>
              </div>

              {/* Threshold Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Min Connections: {filters.minConnections}</Label>
                  <Slider
                    value={[filters.minConnections]}
                    onValueChange={([value]) => updateFilter('minConnections', value)}
                    max={50}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Min Bytes: {formatBytes(filters.minBytes)}</Label>
                  <Slider
                    value={[filters.minBytes]}
                    onValueChange={([value]) => updateFilter('minBytes', value)}
                    max={1000000}
                    min={0}
                    step={1024}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max Nodes: {filters.maxNodes}</Label>
                  <Slider
                    value={[filters.maxNodes]}
                    onValueChange={([value]) => updateFilter('maxNodes', value)}
                    max={1000}
                    min={10}
                    step={10}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max Edges: {filters.maxEdges}</Label>
                  <Slider
                    value={[filters.maxEdges]}
                    onValueChange={([value]) => updateFilter('maxEdges', value)}
                    max={2000}
                    min={10}
                    step={25}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Include/Exclude Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>IP Types</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-internal"
                        checked={filters.includeInternal}
                        onCheckedChange={(checked) => updateFilter('includeInternal', checked)}
                      />
                      <Label htmlFor="include-internal">Internal IPs</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-external"
                        checked={filters.includeExternal}
                        onCheckedChange={(checked) => updateFilter('includeExternal', checked)}
                      />
                      <Label htmlFor="include-external">External IPs</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Traffic Direction</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-inbound"
                        checked={filters.includeInbound}
                        onCheckedChange={(checked) => updateFilter('includeInbound', checked)}
                      />
                      <Label htmlFor="include-inbound">Inbound</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-outbound"
                        checked={filters.includeOutbound}
                        onCheckedChange={(checked) => updateFilter('includeOutbound', checked)}
                      />
                      <Label htmlFor="include-outbound">Outbound</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-select Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Action Filters</Label>
                  <div className="flex flex-wrap gap-2">
                    {['ACCEPT', 'REJECT', 'DROP', 'ALLOW', 'DENY'].map(action => (
                      <div key={action} className="flex items-center space-x-2">
                        <Checkbox
                          id={`action-${action}`}
                          checked={filters.actionFilters.includes(action)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateFilter('actionFilters', [...filters.actionFilters, action])
                            } else {
                              updateFilter('actionFilters', filters.actionFilters.filter(a => a !== action))
                            }
                          }}
                        />
                        <Label htmlFor={`action-${action}`} className="text-sm">{action}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Protocol Filters</Label>
                  <div className="flex flex-wrap gap-2">
                    {['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS'].map(protocol => (
                      <div key={protocol} className="flex items-center space-x-2">
                        <Checkbox
                          id={`protocol-${protocol}`}
                          checked={filters.protocolFilters.includes(protocol)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateFilter('protocolFilters', [...filters.protocolFilters, protocol])
                            } else {
                              updateFilter('protocolFilters', filters.protocolFilters.filter(p => p !== protocol))
                            }
                          }}
                        />
                        <Label htmlFor={`protocol-${protocol}`} className="text-sm">{protocol}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Log Source Filters */}
              <div className="space-y-3">
                <Label>Log Source Filters</Label>
                <div className="flex flex-wrap gap-4">
                  {['VCN Flow Logs', 'Audit Logs', 'Load Balancer Logs', 'WAF Logs'].map(source => (
                    <div key={source} className="flex items-center space-x-2">
                      <Checkbox
                        id={`source-${source}`}
                        checked={filters.logSourceFilters.includes(source)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilter('logSourceFilters', [...filters.logSourceFilters, source])
                          } else {
                            updateFilter('logSourceFilters', filters.logSourceFilters.filter(s => s !== source))
                          }
                        }}
                      />
                      <Label htmlFor={`source-${source}`} className="text-sm">{source}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Apply Filters Button */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  onClick={() => {
                    updateFilter('timeRange', filters.timeRange)
                    loadGraphData()
                  }}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Apply Time Range & Reload Data
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  Filters are applied automatically
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Main Graph Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Network Connection Graph</CardTitle>
              <CardDescription>
                Interactive visualization of network connections. Click on IP nodes to view detailed logs.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-labels"
                  checked={showLabels}
                  onCheckedChange={setShowLabels}
                />
                <label htmlFor="show-labels" className="text-sm font-medium cursor-pointer">
                  {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </label>
              </div>
              <Select value={layoutName} onValueChange={setLayoutName}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LAYOUT_OPTIONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={exportGraphData}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="oracle-outline"
                size="sm"
                onClick={loadGraphData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Graph Visualization */}
            <div className="lg:col-span-3">
              <div style={{ height: '600px', width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                {typeof window !== 'undefined' && (
                  <CytoscapeComponent
                    elements={[...cytoscapeData.nodes, ...cytoscapeData.edges]}
                    style={{ width: '100%', height: '100%' }}
                    stylesheet={cytoscapeStylesheet}
                    layout={cytoscapeLayout}
                    cy={(cy: any) => {
                      setCytoscapeRef(cy)
                      cy.on('tap', 'node', handleNodeTap)
                      cy.on('tap', 'edge', handleEdgeTap)
                    }}
                  />
                )}
              </div>
            </div>

            {/* Selected Item Details */}
            <div className="space-y-4">
              {selectedNodeData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Selected IP Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <div className="font-medium">IP Address</div>
                      <div className="text-muted-foreground">{selectedNodeData.id}</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Connections</div>
                      <div className="text-muted-foreground">{selectedNodeData.connections}</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Data Transferred</div>
                      <div className="text-muted-foreground">{formatBytes(selectedNodeData.bytesTransferred)}</div>
                    </div>
                    {selectedNodeData.principal && (
                      <div className="text-sm">
                        <div className="font-medium">Principal</div>
                        <div className="text-muted-foreground truncate">{selectedNodeData.principal}</div>
                      </div>
                    )}
                    <div className="text-sm">
                      <div className="font-medium">First Seen</div>
                      <div className="text-muted-foreground">{new Date(selectedNodeData.firstSeen).toLocaleString()}</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Last Seen</div>
                      <div className="text-muted-foreground">{new Date(selectedNodeData.lastSeen).toLocaleString()}</div>
                    </div>
                    {onIpClick && (
                      <Button
                        className="w-full mt-2"
                        size="sm"
                        onClick={() => onIpClick(selectedNodeData.id)}
                      >
                        View Logs
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {selectedEdge && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Connection Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <div className="font-medium">Source → Target</div>
                      <div className="text-muted-foreground text-xs">
                        {selectedEdge.source} → {selectedEdge.target}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Protocols</div>
                      <div className="flex gap-1 flex-wrap">
                        {selectedEdge.protocols.map(protocol => (
                          <Badge key={protocol} variant="outline" className="text-xs">
                            {protocol}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Actions</div>
                      <div className="flex gap-1 flex-wrap">
                        {selectedEdge.actions.map(action => (
                          <Badge 
                            key={action} 
                            variant={action === 'REJECT' ? 'destructive' : 'default'} 
                            className="text-xs"
                          >
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Total Flows</div>
                      <div className="text-muted-foreground">{selectedEdge.weight}</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Data Transferred</div>
                      <div className="text-muted-foreground">{formatBytes(selectedEdge.bytes)}</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Packets</div>
                      <div className="text-muted-foreground">{selectedEdge.packets.toLocaleString()}</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Legend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Node Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(NODE_TYPE_COLORS).filter(([type]) => type !== 'unknown').map(([type, color]) => (
                      <div key={type} className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border border-black" 
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm capitalize">{type}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}