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
import ThreatIntelligence from './ThreatIntelligence'
import HuntingPlaybooks from './HuntingPlaybooks'
import {
  Target,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Network,
  Eye,
  Brain,
  Zap,
  FileSearch,
  Globe,
  Lock,
  Activity,
  BarChart3,
  Users,
  Server,
  Database,
  Wifi,
  Mail,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  Settings
} from 'lucide-react'

// NIST-based Threat Hunting Framework
interface HuntingMethodology {
  id: string
  name: string
  description: string
  nistFunction: 'Identify' | 'Protect' | 'Detect' | 'Respond' | 'Recover'
  maturityLevel: 'Basic' | 'Intermediate' | 'Advanced'
  techniques: string[]
  queries: HuntingQuery[]
}

interface HuntingQuery {
  id: string
  name: string
  description: string
  ociQuery: string
  mitreAttack: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'network' | 'dns' | 'authentication' | 'lateral_movement' | 'exfiltration' | 'persistence'
  expectedResults: string
  falsePositiveRate: 'low' | 'medium' | 'high'
}

// Active Countermeasures inspired methodologies
const THREAT_HUNTING_METHODOLOGIES: HuntingMethodology[] = [
  {
    id: 'network_behavior_analysis',
    name: 'Network Behavior Analysis',
    description: 'RITA-based network connection analysis for detecting C2 communications and lateral movement',
    nistFunction: 'Detect',
    maturityLevel: 'Intermediate',
    techniques: ['Long Connection Analysis', 'Beacon Detection', 'DNS Tunneling', 'Network Outliers'],
    queries: [
      {
        id: 'long_connections',
        name: 'Long Duration Connections',
        description: 'Detect persistent connections that may indicate C2 communication',
        ociQuery: "* | where 'Event Name' contains 'Connection' and Duration > 3600 | stats count, avg(Duration) by 'Source IP', 'Destination IP' | sort -count",
        mitreAttack: ['T1071.001', 'T1090'],
        severity: 'medium',
        category: 'network',
        expectedResults: 'Persistent connections lasting over 1 hour',
        falsePositiveRate: 'medium'
      },
      {
        id: 'beacon_detection',
        name: 'C2 Beacon Detection',
        description: 'Identify regular communication patterns consistent with C2 beaconing',
        ociQuery: "* | where 'Event Name' contains 'Network' | stats count, stddev(Time) by 'Source IP', 'Destination IP' | where stddev < 300 and count > 10",
        mitreAttack: ['T1071', 'T1573'],
        severity: 'high',
        category: 'network',
        expectedResults: 'Regular communication intervals indicating automated beaconing',
        falsePositiveRate: 'low'
      }
    ]
  },
  {
    id: 'dns_analysis',
    name: 'DNS Traffic Analysis',
    description: 'Advanced DNS analysis for detecting tunneling, DGA domains, and exfiltration',
    nistFunction: 'Detect',
    maturityLevel: 'Advanced',
    techniques: ['DNS Tunneling Detection', 'DGA Analysis', 'DNS Exfiltration', 'Subdomain Analysis'],
    queries: [
      {
        id: 'dns_tunneling',
        name: 'DNS Tunneling Detection',
        description: 'Detect DNS queries with unusual patterns suggesting data tunneling',
        ociQuery: "* | where 'Event Name' contains 'DNS' and 'Query Length' > 100 | stats count, avg('Query Length') by 'Source IP', Domain | sort -count",
        mitreAttack: ['T1071.004', 'T1048.003'],
        severity: 'high',
        category: 'dns',
        expectedResults: 'DNS queries with unusually long query strings',
        falsePositiveRate: 'low'
      },
      {
        id: 'dga_domains',
        name: 'DGA Domain Detection',
        description: 'Identify algorithmically generated domain names',
        ociQuery: "* | where 'Event Name' contains 'DNS' | eval entropy = length(Domain) / log(26) | where entropy > 3.5 | stats count by Domain | sort -count",
        mitreAttack: ['T1568.002'],
        severity: 'medium',
        category: 'dns',
        expectedResults: 'Domains with high entropy suggesting algorithmic generation',
        falsePositiveRate: 'medium'
      }
    ]
  },
  {
    id: 'authentication_anomalies',
    name: 'Authentication Anomaly Hunting',
    description: 'Hunt for unusual authentication patterns and privilege escalation attempts',
    nistFunction: 'Detect',
    maturityLevel: 'Basic',
    techniques: ['Failed Login Analysis', 'Privilege Escalation', 'Account Anomalies', 'Time-based Analysis'],
    queries: [
      {
        id: 'failed_logins',
        name: 'Brute Force Detection',
        description: 'Identify potential brute force attacks through failed login patterns',
        ociQuery: "* | where 'Event Name' contains 'Authentication' and Result = 'Failed' | stats count by 'Source IP', 'User Name' | where count > 20",
        mitreAttack: ['T1110'],
        severity: 'high',
        category: 'authentication',
        expectedResults: 'High volume of failed authentication attempts',
        falsePositiveRate: 'low'
      },
      {
        id: 'privilege_escalation',
        name: 'Privilege Escalation Hunt',
        description: 'Detect unusual privilege changes and administrative access',
        ociQuery: "* | where 'Event Name' contains 'Privilege' or 'Event Name' contains 'Admin' | stats count by 'User Name', 'Event Name' | sort -count",
        mitreAttack: ['T1078', 'T1548'],
        severity: 'critical',
        category: 'authentication',
        expectedResults: 'Unexpected privilege escalations or administrative access',
        falsePositiveRate: 'medium'
      }
    ]
  },
  {
    id: 'lateral_movement',
    name: 'Lateral Movement Detection',
    description: 'Hunt for signs of lateral movement and internal reconnaissance',
    nistFunction: 'Detect',
    maturityLevel: 'Advanced',
    techniques: ['SMB Analysis', 'RDP Monitoring', 'WMI Detection', 'Service Account Abuse'],
    queries: [
      {
        id: 'smb_lateral_movement',
        name: 'SMB Lateral Movement',
        description: 'Detect lateral movement via SMB connections',
        ociQuery: "* | where 'Event Name' contains 'SMB' or Port = 445 | stats count, dc('Destination IP') by 'Source IP' | where dc > 10",
        mitreAttack: ['T1021.002'],
        severity: 'high',
        category: 'lateral_movement',
        expectedResults: 'Single source connecting to multiple SMB targets',
        falsePositiveRate: 'medium'
      },
      {
        id: 'rdp_scanning',
        name: 'RDP Reconnaissance',
        description: 'Identify RDP scanning and connection attempts',
        ociQuery: "* | where Port = 3389 or 'Event Name' contains 'RDP' | stats count by 'Source IP', 'Destination IP' | sort -count",
        mitreAttack: ['T1021.001'],
        severity: 'medium',
        category: 'lateral_movement',
        expectedResults: 'RDP connection attempts across multiple targets',
        falsePositiveRate: 'medium'
      }
    ]
  },
  {
    id: 'data_exfiltration',
    name: 'Data Exfiltration Hunting',
    description: 'Detect data exfiltration attempts and unusual data transfers',
    nistFunction: 'Detect',
    maturityLevel: 'Advanced',
    techniques: ['Large File Transfers', 'Compression Analysis', 'Cloud Upload Detection', 'Email Exfiltration'],
    queries: [
      {
        id: 'large_transfers',
        name: 'Large Data Transfers',
        description: 'Identify unusually large outbound data transfers',
        ociQuery: "* | where Direction = 'Outbound' and 'Bytes Transferred' > 1000000000 | stats sum('Bytes Transferred') by 'Source IP', 'Destination IP' | sort -sum",
        mitreAttack: ['T1041'],
        severity: 'high',
        category: 'exfiltration',
        expectedResults: 'Large outbound data transfers',
        falsePositiveRate: 'medium'
      },
      {
        id: 'cloud_uploads',
        name: 'Cloud Service Uploads',
        description: 'Monitor uploads to cloud storage services',
        ociQuery: "* | where 'Destination Domain' matches '(dropbox|onedrive|googledrive|amazonaws)' and Direction = 'Outbound' | stats count, sum('Bytes Transferred') by 'Source IP', 'Destination Domain'",
        mitreAttack: ['T1567'],
        severity: 'medium',
        category: 'exfiltration',
        expectedResults: 'Uploads to cloud storage services',
        falsePositiveRate: 'high'
      }
    ]
  },
  {
    id: 'persistence_mechanisms',
    name: 'Persistence Mechanism Hunting',
    description: 'Hunt for persistence mechanisms and backdoors',
    nistFunction: 'Detect',
    maturityLevel: 'Intermediate',
    techniques: ['Scheduled Tasks', 'Registry Persistence', 'Service Creation', 'Startup Persistence'],
    queries: [
      {
        id: 'scheduled_tasks',
        name: 'Suspicious Scheduled Tasks',
        description: 'Identify creation of suspicious scheduled tasks',
        ociQuery: "* | where 'Event Name' contains 'Task' and 'Event Name' contains 'Create' | stats count by 'User Name', 'Task Name' | sort -count",
        mitreAttack: ['T1053'],
        severity: 'medium',
        category: 'persistence',
        expectedResults: 'Creation of new scheduled tasks',
        falsePositiveRate: 'medium'
      },
      {
        id: 'new_services',
        name: 'New Service Creation',
        description: 'Detect creation of new Windows services',
        ociQuery: "* | where 'Event Name' contains 'Service' and 'Event Name' contains 'Install' | stats count by 'Service Name', 'User Name' | sort -count",
        mitreAttack: ['T1543.003'],
        severity: 'high',
        category: 'persistence',
        expectedResults: 'Installation of new Windows services',
        falsePositiveRate: 'low'
      }
    ]
  }
]

interface HuntingSession {
  id: string
  name: string
  methodology: string
  status: 'planning' | 'active' | 'analyzing' | 'completed'
  startTime: Date
  endTime?: Date
  findings: number
  queries: string[]
  analyst: string
}

export default function ThreatHuntingFramework() {
  const [selectedMethodology, setSelectedMethodology] = useState<HuntingMethodology>(THREAT_HUNTING_METHODOLOGIES[0])
  const [activeSessions, setActiveSessions] = useState<HuntingSession[]>([])
  const [activeTab, setActiveTab] = useState('methodologies')
  const [huntingMetrics, setHuntingMetrics] = useState({
    totalHunts: 12,
    activeHunts: 3,
    findings: 8,
    avgDuration: 4.2,
    successRate: 67
  })

  // Check for tab parameter in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')
      if (tabParam && ['methodologies', 'active-sessions', 'playbooks', 'intelligence'].includes(tabParam)) {
        setActiveTab(tabParam)
      }
    }
  }, [])

  const startHuntingSession = (methodology: HuntingMethodology) => {
    const newSession: HuntingSession = {
      id: `hunt-${Date.now()}`,
      name: `${methodology.name} Hunt`,
      methodology: methodology.id,
      status: 'planning',
      startTime: new Date(),
      findings: 0,
      queries: methodology.queries.map(q => q.id),
      analyst: 'Security Analyst'
    }
    
    setActiveSessions([...activeSessions, newSession])
    toast.success(`Started hunting session: ${newSession.name}`)
  }

  const executeQuery = async (query: HuntingQuery) => {
    toast.info(`Executing: ${query.name}`)
    // Implementation would call the actual query execution API
    // For now, simulate execution
    setTimeout(() => {
      toast.success(`Query completed: ${query.expectedResults}`)
    }, 2000)
  }

  const getNistFunctionColor = (func: string) => {
    switch (func) {
      case 'Identify': return 'bg-blue-100 text-blue-800'
      case 'Protect': return 'bg-green-100 text-green-800'
      case 'Detect': return 'bg-yellow-100 text-yellow-800'
      case 'Respond': return 'bg-orange-100 text-orange-800'
      case 'Recover': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Threat Hunting Framework</h1>
          <p className="text-muted-foreground">NIST-aligned proactive threat detection based on Active Countermeasures methodologies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Hunts</p>
                <p className="text-lg font-semibold">{huntingMetrics.totalHunts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Hunts</p>
                <p className="text-lg font-semibold">{huntingMetrics.activeHunts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Findings</p>
                <p className="text-lg font-semibold">{huntingMetrics.findings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-lg font-semibold">{huntingMetrics.avgDuration}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-lg font-semibold">{huntingMetrics.successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="methodologies">Hunting Methodologies</TabsTrigger>
          <TabsTrigger value="active-sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="intelligence">Threat Intel</TabsTrigger>
        </TabsList>

        <TabsContent value="methodologies" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Methodology List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>NIST-Based Methodologies</CardTitle>
                  <CardDescription>Select a hunting methodology to explore techniques and queries</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {THREAT_HUNTING_METHODOLOGIES.map((methodology) => (
                        <Card 
                          key={methodology.id}
                          className={`p-3 cursor-pointer transition-colors ${
                            selectedMethodology.id === methodology.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedMethodology(methodology)}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">{methodology.name}</h4>
                              <Badge className={getNistFunctionColor(methodology.nistFunction)} variant="outline">
                                {methodology.nistFunction}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{methodology.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {methodology.maturityLevel}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {methodology.queries.length} queries
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

            {/* Selected Methodology Details */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        {selectedMethodology.name}
                      </CardTitle>
                      <CardDescription>{selectedMethodology.description}</CardDescription>
                    </div>
                    <Button onClick={() => startHuntingSession(selectedMethodology)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Hunt
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Methodology Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">NIST Function</Label>
                      <Badge className={getNistFunctionColor(selectedMethodology.nistFunction)}>
                        {selectedMethodology.nistFunction}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Maturity Level</Label>
                      <Badge variant="outline">{selectedMethodology.maturityLevel}</Badge>
                    </div>
                  </div>

                  {/* Techniques */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Hunting Techniques</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedMethodology.techniques.map((technique) => (
                        <Badge key={technique} variant="secondary">
                          {technique}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Queries */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Detection Queries</Label>
                    <div className="space-y-4">
                      {selectedMethodology.queries.map((query) => (
                        <Card key={query.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">{query.name}</h4>
                                <p className="text-sm text-muted-foreground">{query.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getSeverityColor(query.severity)}>
                                  {query.severity}
                                </Badge>
                                <Button size="sm" onClick={() => executeQuery(query)}>
                                  <Play className="h-3 w-3 mr-1" />
                                  Run
                                </Button>
                              </div>
                            </div>
                            
                            {/* MITRE ATT&CK Techniques */}
                            <div className="flex items-center gap-2">
                              <Shield className="h-3 w-3 text-muted-foreground" />
                              <div className="flex gap-1">
                                {query.mitreAttack.map((technique) => (
                                  <Badge key={technique} variant="outline" className="text-xs">
                                    {technique}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Query */}
                            <div className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
                              {query.ociQuery}
                            </div>

                            {/* Expected Results */}
                            <div className="text-xs text-muted-foreground">
                              <strong>Expected:</strong> {query.expectedResults} | 
                              <strong> False Positive Rate:</strong> {query.falsePositiveRate}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="active-sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Hunting Sessions</CardTitle>
              <CardDescription>Monitor ongoing threat hunting activities</CardDescription>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Hunting Sessions</h3>
                  <p className="text-muted-foreground">Start a hunt from the methodologies tab to begin threat hunting</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSessions.map((session) => (
                    <Card key={session.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{session.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Started: {session.startTime.toLocaleString()} | Analyst: {session.analyst}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{session.status}</Badge>
                          <Badge variant="secondary">{session.findings} findings</Badge>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playbooks" className="space-y-6">
          <HuntingPlaybooks />
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <ThreatIntelligence />
        </TabsContent>
      </Tabs>
    </div>
  )
}