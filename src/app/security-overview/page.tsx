'use client'

import { useState, useEffect } from 'react'
import ModernLayout from '@/components/Layout/ModernLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Users, 
  Server, 
  Globe,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Network,
  Database,
  BarChart3,
  Target,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  FileText,
  Settings
} from 'lucide-react'

// Enhanced security metrics with more detail
const securityMetrics = [
  {
    title: 'Threat Detection Rate',
    value: '98.7',
    unit: '%',
    change: '+1.2%',
    trend: 'up',
    icon: Target,
    color: 'emerald',
    description: 'Successful threat identification',
    details: {
      threats_detected: 1247,
      false_positives: 16,
      avg_detection_time: '2.3s'
    }
  },
  {
    title: 'Active Incidents',
    value: '7',
    unit: '',
    change: '-12%',
    trend: 'down',
    icon: AlertTriangle,
    color: 'red',
    description: 'Currently investigating',
    details: {
      critical: 1,
      high: 2,
      medium: 4,
      avg_resolution_time: '24h'
    }
  },
  {
    title: 'Security Events',
    value: '156K',
    unit: '/day',
    change: '+8.3%',
    trend: 'up',
    icon: Activity,
    color: 'blue',
    description: 'Daily event volume',
    details: {
      ingested: 156000,
      processed: 155840,
      errors: 160
    }
  },
  {
    title: 'Compliance Score',
    value: '96.4',
    unit: '%',
    change: '+0.8%',
    trend: 'up',
    icon: CheckCircle,
    color: 'green',
    description: 'Regulatory compliance',
    details: {
      frameworks: 8,
      controls: 247,
      exceptions: 9
    }
  }
]

// Security frameworks and their compliance status
const complianceFrameworks = [
  { name: 'SOC 2 Type II', score: 98, status: 'compliant', lastAudit: '2024-01-15' },
  { name: 'ISO 27001', score: 95, status: 'compliant', lastAudit: '2024-01-10' },
  { name: 'PCI DSS', score: 97, status: 'compliant', lastAudit: '2024-01-20' },
  { name: 'GDPR', score: 94, status: 'compliant', lastAudit: '2024-01-08' },
  { name: 'HIPAA', score: 99, status: 'compliant', lastAudit: '2024-01-12' },
  { name: 'NIST CSF', score: 92, status: 'partial', lastAudit: '2024-01-05' }
]

// Security infrastructure components
const infrastructureHealth = [
  {
    category: 'Detection Systems',
    components: [
      { name: 'SIEM Platform', status: 'healthy', uptime: 99.9, lastCheck: '1m ago' },
      { name: 'IDS/IPS', status: 'healthy', uptime: 99.8, lastCheck: '2m ago' },
      { name: 'EDR Agents', status: 'warning', uptime: 98.5, lastCheck: '1m ago' },
      { name: 'Network Monitoring', status: 'healthy', uptime: 99.7, lastCheck: '30s ago' }
    ]
  },
  {
    category: 'Cloud Security',
    components: [
      { name: 'OCI Security Zones', status: 'healthy', uptime: 100, lastCheck: '45s ago' },
      { name: 'Cloud Workload Protection', status: 'healthy', uptime: 99.6, lastCheck: '1m ago' },
      { name: 'Identity & Access Management', status: 'healthy', uptime: 99.9, lastCheck: '2m ago' },
      { name: 'Data Loss Prevention', status: 'healthy', uptime: 99.4, lastCheck: '1m ago' }
    ]
  },
  {
    category: 'Threat Intelligence',
    components: [
      { name: 'Threat Feed Ingestion', status: 'healthy', uptime: 99.8, lastCheck: '30s ago' },
      { name: 'IOC Processing', status: 'healthy', uptime: 99.5, lastCheck: '1m ago' },
      { name: 'Attribution Engine', status: 'degraded', uptime: 95.2, lastCheck: '3m ago' },
      { name: 'Threat Hunting Platform', status: 'healthy', uptime: 99.7, lastCheck: '45s ago' }
    ]
  }
]

// Recent threat intelligence
const threatIntelligence = [
  {
    id: 1,
    type: 'APT Campaign',
    title: 'APT29 targeting cloud infrastructure',
    description: 'Advanced persistent threat group targeting cloud service providers',
    severity: 'critical',
    confidence: 'high',
    iocs: 15,
    lastSeen: '2h ago',
    affected_regions: ['US', 'EU', 'APAC']
  },
  {
    id: 2,
    type: 'Malware Family',
    title: 'New ransomware variant detected',
    description: 'LockBit 3.0 variant with improved evasion techniques',
    severity: 'high',
    confidence: 'medium',
    iocs: 8,
    lastSeen: '6h ago',
    affected_regions: ['EU', 'NA']
  },
  {
    id: 3,
    type: 'Vulnerability',
    title: 'Critical RCE in web framework',
    description: 'Zero-day vulnerability in popular web application framework',
    severity: 'critical',
    confidence: 'high',
    iocs: 23,
    lastSeen: '12h ago',
    affected_regions: ['Global']
  }
]

interface DashboardStats {
  totalEvents: number;
  criticalAlerts: number;
  failedLogins: number;
  systemHealth: number;
  lastUpdate: string;
}

export default function SecurityOverviewPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/mcp/dashboard-stats')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }
      const data = await response.json()
      setStats(data)
      setLastUpdate(new Date(data.lastUpdate))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStats()
    setRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'degraded':
        return 'text-orange-600 bg-orange-100'
      case 'critical':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-100 border-green-200'
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'text-green-600'
    if (score >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <ModernLayout
      title="Security Overview"
      subtitle="Comprehensive security posture and threat landscape analysis"
    >
      <div className="space-y-8">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-green-600 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              All Systems Operational
            </Badge>
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Security Overview</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
            <TabsTrigger value="intelligence">Threat Intel</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Security Metrics */}
            {loading && <p>Loading security metrics...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
                    <Activity className="h-5 w-5 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats?.totalEvents || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Critical Alerts</CardTitle>
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats?.criticalAlerts || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Failed Logins</CardTitle>
                    <Users className="h-5 w-5 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats?.failedLogins || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">System Health</CardTitle>
                    <Shield className="h-5 w-5 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats?.systemHealth || 0}%</div>
                    <Progress value={stats?.systemHealth || 0} className="w-full h-2 mt-2" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Security Operations</CardTitle>
                <CardDescription>Quick access to key security functions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[
                    { name: 'Incident Response', icon: AlertTriangle, href: '/incidents', color: 'red' },
                    { name: 'Threat Hunting', icon: Target, href: '/threat-analytics', color: 'orange' },
                    { name: 'Vulnerability Scan', icon: Shield, href: '/vulnerabilities', color: 'blue' },
                    { name: 'Access Review', icon: Users, href: '/access-review', color: 'green' },
                    { name: 'Asset Inventory', icon: Database, href: '/assets', color: 'purple' },
                    { name: 'Security Reports', icon: FileText, href: '/reports', color: 'gray' }
                  ].map((action) => {
                    const Icon = action.icon
                    return (
                      <Button
                        key={action.name}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-xs text-center">{action.name}</span>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Compliance Frameworks */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Frameworks</CardTitle>
                  <CardDescription>Current compliance status across all frameworks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(complianceFrameworks || []).map((framework) => (
                      <div key={framework.name} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{framework.name}</p>
                          <p className="text-sm text-gray-500">Last audit: {framework.lastAudit}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className={`font-semibold ${getComplianceColor(framework.score)}`}>
                              {framework.score}%
                            </p>
                            <Progress value={framework.score} className="w-20 h-2" />
                          </div>
                          <Badge className={framework.status === 'compliant' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {framework.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Summary</CardTitle>
                  <CardDescription>Overall compliance metrics and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600">96.4%</div>
                      <p className="text-gray-500">Overall Compliance Score</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">6</div>
                        <p className="text-sm text-gray-500">Frameworks</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">247</div>
                        <p className="text-sm text-gray-500">Controls</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">9</div>
                        <p className="text-sm text-gray-500">Exceptions</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-sm text-gray-500">Violations</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="infrastructure" className="space-y-6">
            {(infrastructureHealth || []).map((category) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle>{category.category}</CardTitle>
                  <CardDescription>Health and performance monitoring</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(category.components || []).map((component) => (
                      <div key={component.name} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{component.name}</p>
                          <p className="text-sm text-gray-500">Last check: {component.lastCheck}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-sm font-medium">{component.uptime}% uptime</p>
                          </div>
                          <Badge className={getStatusColor(component.status)}>
                            {component.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Latest Threat Intelligence</CardTitle>
                <CardDescription>Recent threat indicators and campaign updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(threatIntelligence || []).map((threat) => (
                    <div key={threat.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline">{threat.type}</Badge>
                            <Badge className={getSeverityColor(threat.severity)}>
                              {threat.severity}
                            </Badge>
                            <span className="text-xs text-gray-500">{threat.lastSeen}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900">{threat.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{threat.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Confidence: {threat.confidence}</span>
                            <span>IOCs: {threat.iocs}</span>
                            <span>Regions: {threat.affected_regions.join(', ')}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  )
}