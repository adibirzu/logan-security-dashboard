'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult 
} from '@hello-pangea/dnd'
import {
  Grid3X3,
  Plus,
  Settings,
  Trash2,
  Edit,
  Maximize2,
  Minimize2,
  RefreshCw,
  Download,
  Share,
  Layout,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Shield,
  Database,
  Network,
  AlertTriangle,
  TrendingUp,
  Users,
  Server,
  Lock
} from 'lucide-react'

// Widget types and configurations
interface Widget {
  id: string
  type: string
  title: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  config: WidgetConfig
  data?: any[]
  refreshInterval?: number
  lastUpdated?: string
}

interface WidgetConfig {
  query?: string
  timePeriod?: number
  chartType?: string
  maxResults?: number
  groupBy?: string
  filters?: Record<string, any>
  thresholds?: Record<string, number>
  colors?: string[]
}

interface DashboardLayout {
  id: string
  name: string
  widgets: Widget[]
  created: string
  lastModified: string
}

const WIDGET_TYPES = [
  {
    id: 'security-overview',
    name: 'Security Overview',
    icon: Shield,
    description: 'Real-time security metrics and alerts',
    defaultConfig: {
      timePeriod: 1440,
      chartType: 'summary',
      thresholds: { critical: 10, high: 25, medium: 50 }
    }
  },
  {
    id: 'failed-logins',
    name: 'Failed Logins',
    icon: Lock,
    description: 'Track failed authentication attempts',
    defaultConfig: {
      query: "'Security Result' = denied and 'Event Name' contains 'login'",
      timePeriod: 240,
      chartType: 'line'
    }
  },
  {
    id: 'top-sources',
    name: 'Top Log Sources',
    icon: Database,
    description: 'Most active log sources',
    defaultConfig: {
      query: "* | stats count by 'Log Source' | sort count desc",
      chartType: 'pie',
      maxResults: 10
    }
  },
  {
    id: 'network-activity',
    name: 'Network Activity',
    icon: Network,
    description: 'Network connections and traffic',
    defaultConfig: {
      query: "'Log Source' contains 'Network' | stats count by 'Source IP'",
      chartType: 'bar',
      maxResults: 15
    }
  },
  {
    id: 'error-trends',
    name: 'Error Trends',
    icon: TrendingUp,
    description: 'System error patterns over time',
    defaultConfig: {
      query: "'Event Name' contains 'error' or 'Event Name' contains 'fail'",
      timePeriod: 720,
      chartType: 'area'
    }
  },
  {
    id: 'user-activity',
    name: 'User Activity',
    icon: Users,
    description: 'User authentication and actions',
    defaultConfig: {
      query: "'Principal Name' != null | stats count by 'Principal Name'",
      chartType: 'table',
      maxResults: 20
    }
  },
  {
    id: 'system-health',
    name: 'System Health',
    icon: Server,
    description: 'System performance and health metrics',
    defaultConfig: {
      query: "'Log Source' contains 'System' | stats count by 'Event Type'",
      chartType: 'gauge'
    }
  },
  {
    id: 'threat-indicators',
    name: 'Threat Indicators',
    icon: AlertTriangle,
    description: 'Potential security threats and anomalies',
    defaultConfig: {
      query: "'Event Name' contains 'threat' or 'Event Name' contains 'malware'",
      timePeriod: 360,
      chartType: 'alert'
    }
  }
]

const CHART_TYPES = [
  { value: 'line', label: 'Line Chart', icon: LineChart },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'pie', label: 'Pie Chart', icon: PieChart },
  { value: 'area', label: 'Area Chart', icon: Activity },
  { value: 'table', label: 'Data Table', icon: Grid3X3 },
  { value: 'summary', label: 'Summary Cards', icon: Layout },
  { value: 'gauge', label: 'Gauge Chart', icon: TrendingUp },
  { value: 'alert', label: 'Alert List', icon: AlertTriangle }
]

interface InteractiveDashboardProps {
  onQueryExecute: (query: string, options: any) => Promise<any>
  onSaveLayout?: (layout: DashboardLayout) => void
  onLoadLayout?: (layoutId: string) => Promise<DashboardLayout>
  savedLayouts?: DashboardLayout[]
}

export default function InteractiveDashboard({ 
  onQueryExecute, 
  onSaveLayout, 
  onLoadLayout,
  savedLayouts = []
}: InteractiveDashboardProps) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null)
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [showEditWidget, setShowEditWidget] = useState(false)
  const [showSaveLayout, setShowSaveLayout] = useState(false)
  const [layoutName, setLayoutName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [refreshing, setRefreshing] = useState<string[]>([])

  // Widget management functions
  const addWidget = useCallback((widgetType: typeof WIDGET_TYPES[0]) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: widgetType.id,
      title: widgetType.name,
      position: { x: 0, y: 0 },
      size: { width: 400, height: 300 },
      config: { ...widgetType.defaultConfig },
      lastUpdated: new Date().toISOString()
    }
    
    setWidgets(prev => [...prev, newWidget])
    setShowAddWidget(false)
  }, [])

  const updateWidget = useCallback((widgetId: string, updates: Partial<Widget>) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, ...updates, lastUpdated: new Date().toISOString() }
        : widget
    ))
  }, [])

  const deleteWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== widgetId))
  }, [])

  const refreshWidget = useCallback(async (widget: Widget) => {
    if (!widget.config.query) return

    setRefreshing(prev => [...prev, widget.id])
    
    try {
      const data = await onQueryExecute(widget.config.query, {
        timePeriod: widget.config.timePeriod || 1440,
        maxResults: widget.config.maxResults || 100
      })
      
      updateWidget(widget.id, { data: data.results || [] })
    } catch (error) {
      console.error('Failed to refresh widget:', error)
    } finally {
      setRefreshing(prev => prev.filter(id => id !== widget.id))
    }
  }, [onQueryExecute, updateWidget])

  const refreshAllWidgets = useCallback(async () => {
    const promises = widgets
      .filter(widget => widget.config.query)
      .map(widget => refreshWidget(widget))
    
    await Promise.allSettled(promises)
  }, [widgets, refreshWidget])

  // Layout management
  const saveCurrentLayout = useCallback(() => {
    if (!layoutName.trim()) return

    const layout: DashboardLayout = {
      id: `layout-${Date.now()}`,
      name: layoutName,
      widgets: widgets,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }

    onSaveLayout?.(layout)
    setShowSaveLayout(false)
    setLayoutName('')
  }, [layoutName, widgets, onSaveLayout])

  const loadLayout = useCallback(async (layoutId: string) => {
    if (!onLoadLayout) return

    try {
      const layout = await onLoadLayout(layoutId)
      setWidgets(layout.widgets)
    } catch (error) {
      console.error('Failed to load layout:', error)
    }
  }, [onLoadLayout])

  // Drag and drop handling
  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(widgets)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setWidgets(items)
  }, [widgets])

  // Widget rendering
  const renderWidget = useCallback((widget: Widget) => {
    const isRefreshing = refreshing.includes(widget.id)
    const widgetType = WIDGET_TYPES.find(type => type.id === widget.type)
    const IconComponent = widgetType?.icon || Activity

    return (
      <Card key={widget.id} className="relative group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <IconComponent className="h-4 w-4" />
            {widget.title}
          </CardTitle>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedWidget(widget)
                    setShowEditWidget(true)
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteWidget(widget.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshWidget(widget)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last updated: {widget.lastUpdated ? new Date(widget.lastUpdated).toLocaleTimeString() : 'Never'}</span>
              <Badge variant="outline">{widget.config.chartType || 'default'}</Badge>
            </div>
            
            {/* Widget content based on type */}
            <div className="h-48 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded">
              {widget.data ? (
                <div className="text-center">
                  <p className="text-lg font-semibold">{widget.data.length} results</p>
                  <p className="text-sm text-muted-foreground">Data loaded successfully</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <IconComponent className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No data available</p>
                  <p className="text-xs">Click refresh to load data</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }, [isEditing, refreshing, refreshWidget, deleteWidget])

  return (
    <div className="space-y-6">
      {/* Dashboard Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Interactive Dashboard
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {isEditing ? 'Exit Edit' : 'Edit Mode'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAllWidgets}
                disabled={refreshing.length > 0}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing.length > 0 ? 'animate-spin' : ''}`} />
                Refresh All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveLayout(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Save Layout
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Widget Grid */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard" direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {widgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      {renderWidget(widget)}
                    </div>
                  )}
                </Draggable>
              ))}
              
              {/* Add Widget Card */}
              {isEditing && (
                <Card className="border-dashed border-2 border-muted-foreground/25">
                  <CardContent className="flex items-center justify-center h-64">
                    <Button
                      variant="ghost"
                      className="h-full w-full"
                      onClick={() => setShowAddWidget(true)}
                    >
                      <div className="text-center">
                        <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Add Widget</p>
                        <p className="text-xs text-muted-foreground">Choose from available widgets</p>
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Widget Dialog */}
      <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {WIDGET_TYPES.map((widgetType) => {
              const IconComponent = widgetType.icon
              return (
                <Card 
                  key={widgetType.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => addWidget(widgetType)}
                >
                  <CardContent className="p-4">
                    <div className="text-center space-y-2">
                      <IconComponent className="h-8 w-8 mx-auto" />
                      <h3 className="font-medium">{widgetType.name}</h3>
                      <p className="text-xs text-muted-foreground">{widgetType.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Widget Dialog */}
      {selectedWidget && (
        <Dialog open={showEditWidget} onOpenChange={setShowEditWidget}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Widget: {selectedWidget.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Widget Title</Label>
                  <Input
                    value={selectedWidget.title}
                    onChange={(e) => updateWidget(selectedWidget.id, { title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chart Type</Label>
                  <Select
                    value={selectedWidget.config.chartType}
                    onValueChange={(value) => 
                      updateWidget(selectedWidget.id, { 
                        config: { ...selectedWidget.config, chartType: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Query</Label>
                <textarea
                  className="w-full h-24 p-2 border rounded resize-none"
                  value={selectedWidget.config.query || ''}
                  onChange={(e) => 
                    updateWidget(selectedWidget.id, {
                      config: { ...selectedWidget.config, query: e.target.value }
                    })
                  }
                  placeholder="Enter OCI Logging Analytics query..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time Period (minutes)</Label>
                  <Input
                    type="number"
                    value={selectedWidget.config.timePeriod || 1440}
                    onChange={(e) => 
                      updateWidget(selectedWidget.id, {
                        config: { ...selectedWidget.config, timePeriod: parseInt(e.target.value) }
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Results</Label>
                  <Input
                    type="number"
                    value={selectedWidget.config.maxResults || 100}
                    onChange={(e) => 
                      updateWidget(selectedWidget.id, {
                        config: { ...selectedWidget.config, maxResults: parseInt(e.target.value) }
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditWidget(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  refreshWidget(selectedWidget)
                  setShowEditWidget(false)
                }}>
                  Save & Refresh
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Save Layout Dialog */}
      <Dialog open={showSaveLayout} onOpenChange={setShowSaveLayout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Dashboard Layout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Layout Name</Label>
              <Input
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="Enter layout name..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSaveLayout(false)}>
                Cancel
              </Button>
              <Button onClick={saveCurrentLayout} disabled={!layoutName.trim()}>
                Save Layout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}