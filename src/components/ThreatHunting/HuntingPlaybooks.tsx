'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  BookOpen,
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Target,
  Search,
  Shield,
  Brain,
  Zap,
  FileText,
  Settings,
  Plus,
  Eye,
  TrendingUp,
  Activity,
  Database,
  Network,
  Globe,
  Lock,
  Users,
  Server
} from 'lucide-react'

interface PlaybookStep {
  id: string
  name: string
  description: string
  query: string
  expectedResults: string
  automated: boolean
  timeout: number
  dependencies: string[]
}

interface HuntingPlaybook {
  id: string
  name: string
  description: string
  category: 'apt' | 'ransomware' | 'insider' | 'lateral_movement' | 'exfiltration' | 'persistence'
  maturityLevel: 'basic' | 'intermediate' | 'advanced'
  estimatedDuration: number
  steps: PlaybookStep[]
  triggers: string[]
  mitreAttack: string[]
  author: string
  version: string
  lastUpdated: Date
  successCriteria: string[]
}

interface PlaybookExecution {
  id: string
  playbookId: string
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  currentStep: number
  startTime: Date
  endTime?: Date
  findings: number
  analyst: string
  stepResults: Array<{
    stepId: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
    startTime?: Date
    endTime?: Date
    results?: any
    findings?: number
  }>
}

const HUNTING_PLAYBOOKS: HuntingPlaybook[] = [
  {
    id: 'playbook-apt-lateral',
    name: 'APT Lateral Movement Detection',
    description: 'Comprehensive playbook for detecting advanced persistent threat lateral movement patterns',
    category: 'apt',
    maturityLevel: 'advanced',
    estimatedDuration: 120,
    author: 'Security Team',
    version: '2.1',
    lastUpdated: new Date('2024-07-15'),
    triggers: ['high_severity_alert', 'multiple_failed_logins', 'unusual_network_activity'],
    mitreAttack: ['T1021', 'T1078', 'T1055', 'T1090'],
    successCriteria: [
      'Identify pivot points and compromised systems',
      'Map attack progression timeline',
      'Identify data access patterns',
      'Generate actionable IOCs'
    ],
    steps: [
      {
        id: 'step-1',
        name: 'Initial Compromise Detection',
        description: 'Identify initial entry points and compromised accounts',
        query: "* | where 'Event Name' contains 'Authentication' and Result = 'Failed' | stats count by 'Source IP', 'User Name' | where count > 10",
        expectedResults: 'Failed authentication attempts indicating brute force or credential stuffing',
        automated: true,
        timeout: 300,
        dependencies: []
      },
      {
        id: 'step-2',
        name: 'Successful Authentication Analysis',
        description: 'Analyze successful logins following failed attempts',
        query: "* | where 'Event Name' contains 'Authentication' and Result = 'Success' and 'User Name' in (prev_failed_users) | stats count by 'Source IP', 'User Name', Time",
        expectedResults: 'Successful logins after failed attempts from same sources',
        automated: true,
        timeout: 300,
        dependencies: ['step-1']
      },
      {
        id: 'step-3',
        name: 'Lateral Movement Detection',
        description: 'Identify lateral movement via SMB, RDP, and other protocols',
        query: "* | where (Port = 445 or Port = 3389 or 'Event Name' contains 'SMB') and 'Source IP' in (compromised_ips) | stats dc('Destination IP') by 'Source IP'",
        expectedResults: 'Single sources connecting to multiple internal targets',
        automated: true,
        timeout: 600,
        dependencies: ['step-2']
      },
      {
        id: 'step-4',
        name: 'Privilege Escalation Hunt',
        description: 'Hunt for privilege escalation attempts and service account abuse',
        query: "* | where 'Event Name' contains 'Privilege' or 'Event Name' contains 'Service' | stats count by 'User Name', 'Event Name' | sort -count",
        expectedResults: 'Unusual privilege changes or service account activities',
        automated: true,
        timeout: 300,
        dependencies: ['step-3']
      },
      {
        id: 'step-5',
        name: 'Data Access Pattern Analysis',
        description: 'Analyze file access patterns and data staging activities',
        query: "* | where 'Event Name' contains 'File' and 'User Name' in (escalated_users) | stats count, sum('File Size') by 'User Name', 'File Path'",
        expectedResults: 'Unusual file access patterns or large data movements',
        automated: false,
        timeout: 900,
        dependencies: ['step-4']
      },
      {
        id: 'step-6',
        name: 'Timeline Reconstruction',
        description: 'Reconstruct attack timeline and generate IOCs',
        query: "* | where 'Source IP' in (attack_ips) or 'User Name' in (compromised_users) | sort Time | stats list(Event) by Time",
        expectedResults: 'Complete attack timeline with key events',
        automated: false,
        timeout: 600,
        dependencies: ['step-5']
      }
    ]
  },
  {
    id: 'playbook-ransomware',
    name: 'Ransomware Attack Investigation',
    description: 'Rapid response playbook for ransomware incident investigation and containment',
    category: 'ransomware',
    maturityLevel: 'intermediate',
    estimatedDuration: 90,
    author: 'IR Team',
    version: '1.5',
    lastUpdated: new Date('2024-07-10'),
    triggers: ['file_encryption_detected', 'ransom_note_found', 'mass_file_changes'],
    mitreAttack: ['T1486', 'T1490', 'T1489', 'T1529'],
    successCriteria: [
      'Identify patient zero',
      'Determine encryption scope',
      'Identify ransomware family',
      'Generate containment recommendations'
    ],
    steps: [
      {
        id: 'rw-step-1',
        name: 'Encryption Event Detection',
        description: 'Identify file encryption activities and affected systems',
        query: "* | where 'Event Name' contains 'File' and ('File Extension' matches '\\.(encrypted|locked|crypto)' or 'Process Name' contains 'crypt')",
        expectedResults: 'File encryption events and ransomware processes',
        automated: true,
        timeout: 180,
        dependencies: []
      },
      {
        id: 'rw-step-2',
        name: 'Patient Zero Identification',
        description: 'Identify the initial infection point and vector',
        query: "* | where Time < earliest_encryption_time and ('Event Name' contains 'Process' or 'Event Name' contains 'Email' or 'Event Name' contains 'Web')",
        expectedResults: 'Initial infection vector (email, web, removable media)',
        automated: true,
        timeout: 300,
        dependencies: ['rw-step-1']
      },
      {
        id: 'rw-step-3',
        name: 'Lateral Spread Analysis',
        description: 'Track ransomware propagation across the network',
        query: "* | where 'Process Name' contains ransomware_indicators | stats dc('Computer Name') by Time | sort Time",
        expectedResults: 'Timeline of ransomware spread across systems',
        automated: true,
        timeout: 240,
        dependencies: ['rw-step-2']
      },
      {
        id: 'rw-step-4',
        name: 'Impact Assessment',
        description: 'Assess the scope and impact of the ransomware attack',
        query: "* | where 'Event Name' contains 'File' and 'Computer Name' in (infected_systems) | stats count, sum('File Size') by 'Computer Name', 'File Type'",
        expectedResults: 'Scope of encrypted files and affected data types',
        automated: true,
        timeout: 300,
        dependencies: ['rw-step-3']
      }
    ]
  },
  {
    id: 'playbook-insider-threat',
    name: 'Insider Threat Investigation',
    description: 'Behavioral analysis playbook for detecting malicious insider activities',
    category: 'insider',
    maturityLevel: 'advanced',
    estimatedDuration: 180,
    author: 'Behavioral Analytics Team',
    version: '1.2',
    lastUpdated: new Date('2024-07-08'),
    triggers: ['unusual_access_patterns', 'off_hours_activity', 'data_exfiltration_indicators'],
    mitreAttack: ['T1078', 'T1530', 'T1020', 'T1041'],
    successCriteria: [
      'Establish baseline behavior',
      'Identify anomalous activities',
      'Assess data access patterns',
      'Determine intent and risk level'
    ],
    steps: [
      {
        id: 'it-step-1',
        name: 'Behavioral Baseline Analysis',
        description: 'Establish normal behavioral patterns for the user',
        query: "* | where 'User Name' = target_user and Time > dateRelative(30d) | stats avg(count) by hour(Time), dayofweek(Time)",
        expectedResults: 'Normal access patterns and working hours',
        automated: true,
        timeout: 600,
        dependencies: []
      },
      {
        id: 'it-step-2',
        name: 'Anomalous Access Detection',
        description: 'Identify unusual access patterns and off-hours activities',
        query: "* | where 'User Name' = target_user and (hour(Time) < 7 or hour(Time) > 19 or dayofweek(Time) in (1,7))",
        expectedResults: 'Off-hours or weekend access attempts',
        automated: true,
        timeout: 300,
        dependencies: ['it-step-1']
      },
      {
        id: 'it-step-3',
        name: 'Data Access Pattern Analysis',
        description: 'Analyze data access patterns for sensitive information',
        query: "* | where 'User Name' = target_user and ('File Path' contains 'sensitive' or 'Database' contains 'HR' or 'Database' contains 'Finance')",
        expectedResults: 'Access to sensitive data repositories',
        automated: true,
        timeout: 400,
        dependencies: ['it-step-2']
      },
      {
        id: 'it-step-4',
        name: 'Exfiltration Indicators',
        description: 'Hunt for data exfiltration indicators and large transfers',
        query: "* | where 'User Name' = target_user and ('Bytes Transferred' > 100000000 or 'Event Name' contains 'USB' or 'Event Name' contains 'Email')",
        expectedResults: 'Large data transfers or removable media usage',
        automated: true,
        timeout: 300,
        dependencies: ['it-step-3']
      }
    ]
  }
]

export default function HuntingPlaybooks() {
  const [playbooks] = useState<HuntingPlaybook[]>(HUNTING_PLAYBOOKS)
  const [executions, setExecutions] = useState<PlaybookExecution[]>([])
  const [selectedPlaybook, setSelectedPlaybook] = useState<HuntingPlaybook | null>(null)
  const [selectedExecution, setSelectedExecution] = useState<PlaybookExecution | null>(null)

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'apt': return 'bg-red-100 text-red-800'
      case 'ransomware': return 'bg-orange-100 text-orange-800'
      case 'insider': return 'bg-purple-100 text-purple-800'
      case 'lateral_movement': return 'bg-yellow-100 text-yellow-800'
      case 'exfiltration': return 'bg-blue-100 text-blue-800'
      case 'persistence': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMaturityColor = (level: string) => {
    switch (level) {
      case 'basic': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const executePlaybook = (playbook: HuntingPlaybook) => {
    const newExecution: PlaybookExecution = {
      id: `exec-${Date.now()}`,
      playbookId: playbook.id,
      status: 'running',
      currentStep: 0,
      startTime: new Date(),
      findings: 0,
      analyst: 'Security Analyst',
      stepResults: playbook.steps.map(step => ({
        stepId: step.id,
        status: 'pending'
      }))
    }
    
    setExecutions([...executions, newExecution])
    setSelectedExecution(newExecution)
    toast.success(`Started playbook execution: ${playbook.name}`)
  }

  const executeStep = (execution: PlaybookExecution, stepIndex: number) => {
    const updatedExecution = { ...execution }
    updatedExecution.stepResults[stepIndex] = {
      ...updatedExecution.stepResults[stepIndex],
      status: 'running',
      startTime: new Date()
    }
    
    // Simulate step execution
    setTimeout(() => {
      updatedExecution.stepResults[stepIndex] = {
        ...updatedExecution.stepResults[stepIndex],
        status: 'completed',
        endTime: new Date(),
        findings: Math.floor(Math.random() * 10) + 1
      }
      updatedExecution.currentStep = stepIndex + 1
      updatedExecution.findings += updatedExecution.stepResults[stepIndex].findings || 0
      
      if (stepIndex === execution.stepResults.length - 1) {
        updatedExecution.status = 'completed'
        updatedExecution.endTime = new Date()
      }
      
      setExecutions(executions.map(e => e.id === execution.id ? updatedExecution : e))
      toast.success(`Step completed: ${selectedPlaybook?.steps[stepIndex].name}`)
    }, 2000)
    
    setExecutions(executions.map(e => e.id === execution.id ? updatedExecution : e))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hunting Playbooks</h2>
          <p className="text-muted-foreground">Automated threat hunting workflows and investigation procedures</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Playbook
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      <Tabs defaultValue="library" className="space-y-6">
        <TabsList>
          <TabsTrigger value="library">Playbook Library</TabsTrigger>
          <TabsTrigger value="executions">Active Executions</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Playbook List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Available Playbooks</CardTitle>
                  <CardDescription>Select a playbook to view details and execute</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {playbooks.map((playbook) => (
                        <Card 
                          key={playbook.id}
                          className={`p-3 cursor-pointer transition-colors ${
                            selectedPlaybook?.id === playbook.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedPlaybook(playbook)}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">{playbook.name}</h4>
                              <Badge className={getCategoryColor(playbook.category)} variant="outline">
                                {playbook.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{playbook.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge className={getMaturityColor(playbook.maturityLevel)} variant="outline">
                                {playbook.maturityLevel}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {playbook.steps.length} steps
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                ~{playbook.estimatedDuration}m
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Playbook Details */}
            <div className="lg:col-span-2">
              {selectedPlaybook ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          {selectedPlaybook.name}
                        </CardTitle>
                        <CardDescription>{selectedPlaybook.description}</CardDescription>
                      </div>
                      <Button onClick={() => executePlaybook(selectedPlaybook)}>
                        <Play className="h-4 w-4 mr-2" />
                        Execute
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Playbook Metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Category</Label>
                        <Badge className={getCategoryColor(selectedPlaybook.category)}>
                          {selectedPlaybook.category}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Maturity</Label>
                        <Badge className={getMaturityColor(selectedPlaybook.maturityLevel)}>
                          {selectedPlaybook.maturityLevel}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Duration</Label>
                        <Badge variant="outline">~{selectedPlaybook.estimatedDuration}m</Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Version</Label>
                        <Badge variant="outline">v{selectedPlaybook.version}</Badge>
                      </div>
                    </div>

                    {/* MITRE ATT&CK Techniques */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">MITRE ATT&CK Coverage</Label>
                      <div className="flex flex-wrap gap-1">
                        {selectedPlaybook.mitreAttack.map((technique) => (
                          <Badge key={technique} variant="outline" className="text-xs">
                            {technique}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Success Criteria */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Success Criteria</Label>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                        {selectedPlaybook.successCriteria.map((criteria, index) => (
                          <li key={index}>{criteria}</li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    {/* Playbook Steps */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Execution Steps</Label>
                      <div className="space-y-4">
                        {selectedPlaybook.steps.map((step, index) => (
                          <Card key={step.id} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      Step {index + 1}
                                    </Badge>
                                    <h4 className="font-medium">{step.name}</h4>
                                    {step.automated && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Zap className="h-3 w-3 mr-1" />
                                        Auto
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {step.timeout}s timeout
                                </div>
                              </div>

                              {/* Dependencies */}
                              {step.dependencies.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs">Depends on:</Label>
                                  <div className="flex gap-1">
                                    {step.dependencies.map((dep) => (
                                      <Badge key={dep} variant="outline" className="text-xs">
                                        {dep}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Query */}
                              <div className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                                {step.query}
                              </div>

                              {/* Expected Results */}
                              <div className="text-xs text-muted-foreground">
                                <strong>Expected:</strong> {step.expectedResults}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a Playbook</h3>
                    <p className="text-muted-foreground">Choose a playbook from the library to view details and execute</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="executions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Executions List */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Active Executions</CardTitle>
                  <CardDescription>Currently running playbook executions</CardDescription>
                </CardHeader>
                <CardContent>
                  {executions.filter(e => e.status === 'running' || e.status === 'paused').length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Active Executions</h3>
                      <p className="text-muted-foreground">Execute a playbook to see active sessions here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {executions
                        .filter(e => e.status === 'running' || e.status === 'paused')
                        .map((execution) => {
                          const playbook = playbooks.find(p => p.id === execution.playbookId)
                          return (
                            <Card 
                              key={execution.id}
                              className={`p-3 cursor-pointer transition-colors ${
                                selectedExecution?.id === execution.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                              }`}
                              onClick={() => setSelectedExecution(execution)}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-sm">{playbook?.name}</h4>
                                  <Badge className={getStatusColor(execution.status)}>
                                    {execution.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Step {execution.currentStep + 1} of {playbook?.steps.length}</span>
                                  <span>{execution.findings} findings</span>
                                </div>
                                <Progress 
                                  value={(execution.currentStep / (playbook?.steps.length || 1)) * 100} 
                                  className="h-2"
                                />
                              </div>
                            </Card>
                          )
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Execution Details */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Execution Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedExecution ? (
                    <div className="space-y-4">
                      {(() => {
                        const playbook = playbooks.find(p => p.id === selectedExecution.playbookId)
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Status</Label>
                                <Badge className={getStatusColor(selectedExecution.status)}>
                                  {selectedExecution.status}
                                </Badge>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Progress</Label>
                                <div className="text-sm">{selectedExecution.currentStep}/{playbook?.steps.length} steps</div>
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Timeline</Label>
                              <div className="text-sm text-muted-foreground">
                                Started: {selectedExecution.startTime.toLocaleString()}
                                {selectedExecution.endTime && (
                                  <div>Ended: {selectedExecution.endTime.toLocaleString()}</div>
                                )}
                              </div>
                            </div>

                            <Separator />

                            <div>
                              <Label className="text-sm font-medium mb-2 block">Step Progress</Label>
                              <ScrollArea className="h-64">
                                <div className="space-y-2">
                                  {selectedExecution.stepResults.map((result, index) => {
                                    const step = playbook?.steps[index]
                                    return (
                                      <div key={result.stepId} className="flex items-center justify-between p-2 border rounded">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            {index + 1}
                                          </Badge>
                                          <span className="text-sm">{step?.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {result.findings && (
                                            <Badge variant="secondary" className="text-xs">
                                              {result.findings} findings
                                            </Badge>
                                          )}
                                          <Badge 
                                            className={getStatusColor(result.status)}
                                            variant="outline"
                                          >
                                            {result.status}
                                          </Badge>
                                          {result.status === 'pending' && index === selectedExecution.currentStep && (
                                            <Button 
                                              size="sm" 
                                              onClick={() => executeStep(selectedExecution, index)}
                                            >
                                              <Play className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </ScrollArea>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Select an execution to view details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>Past playbook executions and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  Execution history and analytics will show completed playbook runs, success rates, 
                  and performance metrics for continuous improvement.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}