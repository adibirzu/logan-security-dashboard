'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Shield,
  Clock,
  Users,
  CheckCircle,
  Play,
  Pause,
  Square,
  RotateCcw,
  Settings,
  Bell,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Database,
  Network,
  Eye,
  Target,
  Zap,
  Activity,
  TrendingUp,
  Globe,
  Server,
  Lock,
  Search,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Download,
  Upload,
  RefreshCw,
  Calendar,
  Timer,
  BookOpen
} from 'lucide-react'

// Incident severity and status types
type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
type IncidentStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed'
type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'

interface Incident {
  id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  category: string
  source: string
  assignee: string
  reporter: string
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  ttd: number // Time to Detection (minutes)
  ttr: number // Time to Response (minutes)
  tags: string[]
  iocs: string[]
  affectedSystems: string[]
  timeline: IncidentEvent[]
  artifacts: IncidentArtifact[]
  workflowExecutions: string[]
}

interface IncidentEvent {
  id: string
  timestamp: Date
  type: 'detection' | 'response' | 'escalation' | 'containment' | 'resolution' | 'communication'
  description: string
  author: string
  automated: boolean
}

interface IncidentArtifact {
  id: string
  name: string
  type: 'log' | 'pcap' | 'memory_dump' | 'screenshot' | 'document' | 'ioc_list'
  url: string
  size: number
  hash: string
  uploadedAt: Date
  uploadedBy: string
}

interface N8NWorkflow {
  id: string
  name: string
  description: string
  category: 'detection' | 'response' | 'containment' | 'communication' | 'recovery'
  triggers: string[]
  actions: WorkflowAction[]
  status: WorkflowStatus
  lastExecuted?: Date
  executionCount: number
  successRate: number
  avgExecutionTime: number
}

interface WorkflowAction {
  id: string
  name: string
  type: 'http_request' | 'email' | 'slack' | 'jira' | 'pagerduty' | 'script' | 'query'
  config: Record<string, any>
  timeout: number
  retries: number
}


// Utility functions for styling
const getSeverityColor = (severity: IncidentSeverity) => {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusColor = (status: IncidentStatus) => {
  switch (status) {
    case 'open': return 'bg-red-100 text-red-800 border-red-200'
    case 'investigating': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'contained': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getWorkflowStatusColor = (status: WorkflowStatus) => {
  switch (status) {
    case 'running': return 'bg-blue-100 text-blue-800'
    case 'completed': return 'bg-green-100 text-green-800'
    case 'failed': return 'bg-red-100 text-red-800'
    case 'paused': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function IncidentResponseFramework() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [workflows, setWorkflows] = useState<N8NWorkflow[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8NWorkflow | null>(null)
  const [activeTab, setActiveTab] = useState('incidents')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isCreatingIncident, setIsCreatingIncident] = useState(false)

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch('/api/incidents')
        const data = await response.json()
        if (data.success) {
          setIncidents(data.data)
        } else {
          toast.error('Failed to load incidents')
        }
      } catch (error) {
        console.error('Error loading incidents:', error)
        toast.error('Failed to load incidents')
      }
    }

    const fetchWorkflows = async () => {
      try {
        const response = await fetch('/api/n8n/workflows')
        const data = await response.json()
        if (data.success) {
          setWorkflows(data.data)
        } else {
          toast.error('Failed to load workflows')
        }
      } catch (error) {
        console.error('Error loading workflows:', error)
        toast.error('Failed to load workflows')
      }
    }

    fetchIncidents()
    fetchWorkflows()
  }, [])

  // Metrics calculation
  const metrics = {
    totalIncidents: incidents.length,
    openIncidents: incidents.filter(i => ['open', 'investigating'].includes(i.status)).length,
    criticalIncidents: incidents.filter(i => i.severity === 'critical').length,
    avgTTR: incidents.length > 0 ? incidents.reduce((sum, i) => sum + i.ttr, 0) / incidents.length : 0,
    avgTTD: incidents.length > 0 ? incidents.reduce((sum, i) => sum + i.ttd, 0) / incidents.length : 0,
    activeWorkflows: workflows.filter(w => w.status === 'running').length,
    workflowSuccess: workflows.length > 0 ? workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length : 0
  }



  const triggerWorkflow = (workflowId: string, incidentId?: string) => {
    const workflow = workflows.find(w => w.id === workflowId)
    if (!workflow) return

    toast.info(`Triggering workflow: ${workflow.name}`)
    
    // Simulate workflow execution
    const updatedWorkflow = { ...workflow, status: 'running' as WorkflowStatus }
    setWorkflows(workflows.map(w => w.id === workflowId ? updatedWorkflow : w))

    setTimeout(() => {
      updatedWorkflow.status = 'completed'
      updatedWorkflow.lastExecuted = new Date()
      updatedWorkflow.executionCount += 1
      setWorkflows(workflows.map(w => w.id === workflowId ? updatedWorkflow : w))
      toast.success(`Workflow completed: ${workflow.name}`)
    }, 3000)
  }

  const createIncident = async (incident: Partial<Incident>) => {
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(incident)
      })
      const data = await response.json()
      if (data.success) {
        setIncidents([data.data, ...incidents])
        setSelectedIncident(data.data)
        toast.success(`Incident created: ${data.data.id}`)
      } else {
        toast.error('Failed to create incident')
      }
    } catch (error) {
      console.error('Error creating incident:', error)
      toast.error('Failed to create incident')
    }
  }

  const filteredIncidents = incidents.filter(incident => {
    if (filterSeverity !== 'all' && incident.severity !== filterSeverity) return false
    if (filterStatus !== 'all' && incident.status !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Incident Response</h1>
          <p className="text-muted-foreground">Automated incident management with n8n workflow integration</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreatingIncident} onOpenChange={setIsCreatingIncident}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Incident</DialogTitle>
                <DialogDescription>Manually create a new security incident</DialogDescription>
              </DialogHeader>
              <CreateIncidentForm onSubmit={createIncident} onCancel={() => setIsCreatingIncident(false)} />
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
                <p className="text-lg font-semibold">{metrics.totalIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-lg font-semibold">{metrics.openIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-lg font-semibold">{metrics.criticalIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg TTR</p>
                <p className="text-lg font-semibold">{Math.round(metrics.avgTTR)}m</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg TTD</p>
                <p className="text-lg font-semibold">{Math.round(metrics.avgTTD)}m</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Workflows</p>
                <p className="text-lg font-semibold">{metrics.activeWorkflows}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Workflow Success</p>
                <p className="text-lg font-semibold">{Math.round(metrics.workflowSuccess)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="workflows">n8n Workflows</TabsTrigger>
          <TabsTrigger value="playbooks">Response Playbooks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Incidents List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Active Incidents</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Severity</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="investigating">Investigating</SelectItem>
                          <SelectItem value="contained">Contained</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {filteredIncidents.map((incident) => (
                        <Card 
                          key={incident.id}
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedIncident?.id === incident.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedIncident(incident)}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{incident.id}</span>
                                  <Badge className={getSeverityColor(incident.severity)}>
                                    {incident.severity}
                                  </Badge>
                                  <Badge className={getStatusColor(incident.status)} variant="outline">
                                    {incident.status}
                                  </Badge>
                                </div>
                                <h4 className="font-medium">{incident.title}</h4>
                                <p className="text-sm text-muted-foreground">{incident.description}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Assignee: {incident.assignee}</span>
                              <span>{incident.createdAt.toLocaleDateString()}</span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs">
                              <span className="flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                TTD: {incident.ttd}m
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                TTR: {incident.ttr}m
                              </span>
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {incident.workflowExecutions.length} workflows
                              </span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Incident Details */}
            <div className="lg:col-span-1">
              {selectedIncident ? (
                <IncidentDetails 
                  incident={selectedIncident} 
                  workflows={workflows}
                  onTriggerWorkflow={triggerWorkflow}
                />
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select an Incident</h3>
                    <p className="text-muted-foreground">Choose an incident to view details and actions</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Workflows List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>n8n Automation Workflows</CardTitle>
                  <CardDescription>Automated incident response workflows</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workflows.map((workflow) => (
                      <Card 
                        key={workflow.id}
                        className={`p-4 cursor-pointer transition-colors ${
                          selectedWorkflow?.id === workflow.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedWorkflow(workflow)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{workflow.name}</h4>
                                <Badge className={getWorkflowStatusColor(workflow.status)}>
                                  {workflow.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{workflow.description}</p>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation()
                                triggerWorkflow(workflow.id)
                              }}
                              disabled={workflow.status === 'running'}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              {workflow.status === 'running' ? 'Running' : 'Execute'}
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Executions:</span>
                              <div className="font-medium">{workflow.executionCount}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Success Rate:</span>
                              <div className="font-medium">{workflow.successRate}%</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Avg Time:</span>
                              <div className="font-medium">{workflow.avgExecutionTime}s</div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Workflow Details */}
            <div className="lg:col-span-1">
              {selectedWorkflow ? (
                <WorkflowDetails workflow={selectedWorkflow} />
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a Workflow</h3>
                    <p className="text-muted-foreground">Choose a workflow to view details and configuration</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="playbooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Incident Response Playbooks</CardTitle>
              <CardDescription>Structured response procedures integrated with n8n automation</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <BookOpen className="h-4 w-4" />
                <AlertDescription>
                  Incident response playbooks combining manual procedures with automated n8n workflows 
                  will be implemented here. Each playbook will include decision trees, escalation procedures, 
                  and automated workflow triggers.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                  <p>Response time analytics and trends will be visualized here</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Workflow Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4" />
                  <p>n8n workflow execution metrics and performance analytics</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Incident Details Component
function IncidentDetails({ 
  incident, 
  workflows, 
  onTriggerWorkflow 
}: { 
  incident: Incident
  workflows: N8NWorkflow[]
  onTriggerWorkflow: (workflowId: string, incidentId?: string) => void
}) {
  const relevantWorkflows = workflows.filter(w => 
    w.category === 'response' || w.category === 'containment'
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Incident Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium">ID</Label>
          <div className="text-sm">{incident.id}</div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <div className="flex gap-2">
            <Badge className={getStatusColor(incident.status)}>{incident.status}</Badge>
            <Badge className={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Title</Label>
          <div className="text-sm font-medium">{incident.title}</div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Description</Label>
          <div className="text-sm text-muted-foreground">{incident.description}</div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Affected Systems</Label>
          <div className="flex gap-1 flex-wrap">
            {incident.affectedSystems.map((system) => (
              <Badge key={system} variant="outline" className="text-xs">
                {system}
              </Badge>
            ))}
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">IOCs</Label>
          <div className="flex gap-1 flex-wrap">
            {incident.iocs.map((ioc) => (
              <Badge key={ioc} variant="secondary" className="text-xs font-mono">
                {ioc}
              </Badge>
            ))}
          </div>
        </div>
        
        <Separator />
        
        <div>
          <Label className="text-sm font-medium">Quick Actions</Label>
          <div className="space-y-2 mt-2">
            {relevantWorkflows.slice(0, 3).map((workflow) => (
              <Button 
                key={workflow.id}
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => onTriggerWorkflow(workflow.id, incident.id)}
              >
                <Zap className="h-3 w-3 mr-2" />
                {workflow.name}
              </Button>
            ))}
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Timeline</Label>
          <ScrollArea className="h-32">
            <div className="space-y-2 mt-2">
              {incident.timeline.map((event) => (
                <div key={event.id} className="text-xs border-l-2 border-muted pl-2">
                  <div className="font-medium">{event.description}</div>
                  <div className="text-muted-foreground">
                    {event.timestamp.toLocaleString()} - {event.author}
                    {event.automated && <Badge variant="secondary" className="ml-1 text-xs">Auto</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

// Workflow Details Component
function WorkflowDetails({ workflow }: { workflow: N8NWorkflow }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Workflow Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Name</Label>
          <div className="text-sm font-medium">{workflow.name}</div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <Badge className={getWorkflowStatusColor(workflow.status)}>{workflow.status}</Badge>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Category</Label>
          <Badge variant="outline">{workflow.category}</Badge>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Triggers</Label>
          <div className="flex gap-1 flex-wrap">
            {workflow.triggers.map((trigger) => (
              <Badge key={trigger} variant="secondary" className="text-xs">
                {trigger}
              </Badge>
            ))}
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Performance</Label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Executions: {workflow.executionCount}</div>
            <div>Success: {workflow.successRate}%</div>
            <div>Avg Time: {workflow.avgExecutionTime}s</div>
            <div>Last Run: {workflow.lastExecuted?.toLocaleDateString()}</div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <Label className="text-sm font-medium">Actions ({workflow.actions.length})</Label>
          <ScrollArea className="h-32">
            <div className="space-y-2 mt-2">
              {workflow.actions.map((action, index) => (
                <div key={action.id} className="text-xs border rounded p-2">
                  <div className="font-medium">{index + 1}. {action.name}</div>
                  <div className="text-muted-foreground">Type: {action.type}</div>
                  <div className="text-muted-foreground">Timeout: {action.timeout}s</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

// Create Incident Form Component
function CreateIncidentForm({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (incident: Partial<Incident>) => void
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium' as IncidentSeverity,
    category: '',
    assignee: '',
    tags: '',
    iocs: '',
    affectedSystems: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      iocs: formData.iocs.split(',').map(i => i.trim()).filter(Boolean),
      affectedSystems: formData.affectedSystems.split(',').map(s => s.trim()).filter(Boolean)
    })
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="severity">Severity</Label>
          <Select value={formData.severity} onValueChange={(value: IncidentSeverity) => setFormData({ ...formData, severity: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., Malware, Data Breach"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="assignee">Assignee</Label>
        <Input
          id="assignee"
          value={formData.assignee}
          onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
          placeholder="Security analyst name"
        />
      </div>
      
      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="malware, lateral-movement, apt"
        />
      </div>
      
      <div>
        <Label htmlFor="iocs">IOCs (comma-separated)</Label>
        <Input
          id="iocs"
          value={formData.iocs}
          onChange={(e) => setFormData({ ...formData, iocs: e.target.value })}
          placeholder="185.159.157.131, malicious.exe"
        />
      </div>
      
      <div>
        <Label htmlFor="affectedSystems">Affected Systems (comma-separated)</Label>
        <Input
          id="affectedSystems"
          value={formData.affectedSystems}
          onChange={(e) => setFormData({ ...formData, affectedSystems: e.target.value })}
          placeholder="WEB-01, DB-02"
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Incident
        </Button>
      </div>
    </form>
  )
}