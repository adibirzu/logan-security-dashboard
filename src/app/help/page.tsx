'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Target,
  CheckCircle,
  Calculator,
  Info,
  BookOpen,
  BarChart3,
  Users,
  Server,
  Database,
  Eye,
  Clock,
  Zap,
  GitBranch,
  Hash,
  Percent
} from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Help & Scoring Methodology</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Understanding how Logan Security Dashboard calculates security metrics and scores
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="security">Security Metrics</TabsTrigger>
          <TabsTrigger value="threats">Threat Analysis</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="formulas">Formulas</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Scoring System Overview
              </CardTitle>
              <CardDescription>
                Logan Security Dashboard uses a comprehensive scoring system based on OCI Logging Analytics data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Key Principles</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Real-time calculation:</strong> All scores are computed from live OCI Logging Analytics data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Time-based analysis:</strong> Metrics consider configurable time windows (1h, 24h, 7d, 30d)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Event-driven scoring:</strong> Based on actual security events, not assumptions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Weighted calculations:</strong> Different event types have varying impact on scores</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Score Ranges</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <span className="font-medium">Excellent</span>
                      <Badge variant="default" className="bg-green-500">90-100</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <span className="font-medium">Good</span>
                      <Badge variant="secondary" className="bg-yellow-500">70-89</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <span className="font-medium">Needs Attention</span>
                      <Badge variant="outline" className="border-orange-500">50-69</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                      <span className="font-medium">Critical</span>
                      <Badge variant="destructive">0-49</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Database className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="font-medium">OCI Audit Logs</div>
                    <div className="text-sm text-muted-foreground">Authentication, authorization events</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Server className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="font-medium">VCN Flow Logs</div>
                    <div className="text-sm text-muted-foreground">Network traffic analysis</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Shield className="h-8 w-8 text-purple-500" />
                  <div>
                    <div className="font-medium">WAF Logs</div>
                    <div className="text-sm text-muted-foreground">Web application security</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Metrics Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Security Score (0-100)
              </CardTitle>
              <CardDescription>
                Overall security posture based on security events and failures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Calculation Method</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div>Query: Events containing &apos;security&apos;, &apos;threat&apos;, or &apos;alert&apos;</div>
                    <div className="text-muted-foreground mt-2">
                      security_score = 100 - (failed_events × 100 / total_events)
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Factors Considered</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Failed authentication attempts
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Security policy violations
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Unusual access patterns
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Successful security validations
                    </li>
                  </ul>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-semibold">Score Interpretation</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded">
                    <div className="font-bold text-green-600">95-100</div>
                    <div>Optimal Security</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded">
                    <div className="font-bold text-yellow-600">80-94</div>
                    <div>Good Security</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded">
                    <div className="font-bold text-orange-600">60-79</div>
                    <div>Review Needed</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded">
                    <div className="font-bold text-red-600">&lt; 60</div>
                    <div>Immediate Action</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-red-500" />
                Active Threats
              </CardTitle>
              <CardDescription>
                Count of unique threat sources and malicious activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                <div>Query: Events containing &apos;threat&apos;, &apos;malware&apos;, or &apos;attack&apos;</div>
                <div className="text-muted-foreground mt-2">
                  active_threats = count(distinct &apos;Principal Name&apos;)
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-3">Threat Categories</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Malware detection events</li>
                    <li>• Suspicious network activity</li>
                    <li>• Attack pattern recognition</li>
                    <li>• Anomalous user behavior</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Trend Indicators</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-red-500" />
                      <span>Increasing: &gt; 10 active threats</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span>Decreasing: ≤ 10 active threats</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Risk Events
              </CardTitle>
              <CardDescription>
                Security events that require attention or investigation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                <div>Query: Events containing &apos;fail&apos;, &apos;error&apos;, or &apos;deny&apos;</div>
                <div className="text-muted-foreground mt-2">
                  risk_events = count(*)
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Event Types Monitored</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <ul className="space-y-2">
                    <li>• Failed login attempts</li>
                    <li>• Access denied events</li>
                    <li>• Resource modification failures</li>
                    <li>• Policy violations</li>
                  </ul>
                  <ul className="space-y-2">
                    <li>• Network connection errors</li>
                    <li>• Service disruptions</li>
                    <li>• Configuration errors</li>
                    <li>• Permission escalation attempts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Threat Analysis Tab */}
        <TabsContent value="threats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-500" />
                Threat Sources Analysis
              </CardTitle>
              <CardDescription>
                Geographic and IP-based threat source identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                <div>Query: Events with &apos;fail&apos;, &apos;deny&apos;, or &apos;attack&apos; + valid IP addresses</div>
                <div className="text-muted-foreground mt-2">
                  Group by IP Address → Estimate country → Calculate percentages
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold">IP Geolocation Method</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Internal networks (10.x, 172.x, 192.168.x) marked as &quot;Internal&quot;</li>
                    <li>• Public IPs grouped by first octet ranges</li>
                    <li>• Geographic mapping based on IP allocation patterns</li>
                    <li>• Unknown/private ranges categorized separately</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Country Rankings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-red-50 dark:bg-red-950 rounded">
                      <span>High Risk Countries</span>
                      <span>&gt; 25% of threats</span>
                    </div>
                    <div className="flex justify-between p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                      <span>Medium Risk Countries</span>
                      <span>10-25% of threats</span>
                    </div>
                    <div className="flex justify-between p-2 bg-green-50 dark:bg-green-950 rounded">
                      <span>Low Risk Countries</span>
                      <span>&lt; 10% of threats</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Recent Activities Classification
              </CardTitle>
              <CardDescription>
                How security events are categorized and prioritized
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold">Event Categories</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span><strong>Authentication:</strong> Login, auth events</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span><strong>Network:</strong> Connection, network events</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span><strong>Threat:</strong> Security, threat events</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <CheckCircle className="h-4 w-4 text-purple-500" />
                      <span><strong>Compliance:</strong> Audit, compliance events</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Severity Levels</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-red-50 dark:bg-red-950 rounded">
                      <span>High</span>
                      <span>fail, error, threat events</span>
                    </div>
                    <div className="flex justify-between p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                      <span>Medium</span>
                      <span>warn, unusual events</span>
                    </div>
                    <div className="flex justify-between p-2 bg-blue-50 dark:bg-blue-950 rounded">
                      <span>Low</span>
                      <span>info, audit events</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-950 rounded">
                      <span>Info</span>
                      <span>routine system events</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Compliance Score
              </CardTitle>
              <CardDescription>
                Percentage of successful audit and compliance checks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                <div>Query: Events containing &apos;audit&apos; or &apos;compliance&apos;</div>
                <div className="text-muted-foreground mt-2">
                  compliance_rate = (passed_audits × 100) / (total_audits + 1)
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Note: +1 in denominator prevents division by zero
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold">Compliance Events</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Audit log reviews</li>
                    <li>• Policy compliance checks</li>
                    <li>• Regulatory requirement validations</li>
                    <li>• Security control assessments</li>
                    <li>• Data protection verifications</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Success Criteria</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Events containing &apos;pass&apos; keyword</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Successful policy validations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Completed audit procedures</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-semibold">Compliance Thresholds</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded">
                    <div className="font-bold text-green-600">≥ 98%</div>
                    <div>Fully Compliant</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded">
                    <div className="font-bold text-yellow-600">95-97%</div>
                    <div>Mostly Compliant</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded">
                    <div className="font-bold text-orange-600">90-94%</div>
                    <div>Needs Improvement</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded">
                    <div className="font-bold text-red-600">&lt; 90%</div>
                    <div>Non-Compliant</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                System Status Monitoring
              </CardTitle>
              <CardDescription>
                Health check methodology for security infrastructure components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold">Monitored Components</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <Database className="h-4 w-4 text-blue-500" />
                      <span>OCI Logging Analytics</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <Target className="h-4 w-4 text-red-500" />
                      <span>Threat Detection Engine</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span>Data Ingestion Pipeline</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span>Alert Processing</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Health Status Criteria</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-green-50 dark:bg-green-950 rounded">
                      <span>Operational</span>
                      <span>&lt; 1000ms response</span>
                    </div>
                    <div className="flex justify-between p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                      <span>Warning</span>
                      <span>&gt; 1000ms response</span>
                    </div>
                    <div className="flex justify-between p-2 bg-red-50 dark:bg-red-950 rounded">
                      <span>Critical</span>
                      <span>Query failure/timeout</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Formulas Tab */}
        <TabsContent value="formulas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-500" />
                Mathematical Formulas
              </CardTitle>
              <CardDescription>
                Detailed mathematical calculations used in scoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Security Score Formula
                </h4>
                <div className="bg-muted p-4 rounded-lg font-mono">
                  <div className="text-sm space-y-2">
                    <div><strong>Input:</strong> security_events = count(*) where &apos;Event Name&apos; contains [&apos;security&apos;, &apos;threat&apos;, &apos;alert&apos;]</div>
                    <div><strong>Input:</strong> failed_events = count(*) where &apos;Event Name&apos; contains &apos;fail&apos;</div>
                    <div className="border-t pt-2 mt-2">
                      <strong>Formula:</strong> security_score = round(100 - (failed_events × 100.0 / (security_events + 1)), 1)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Range: 0-100 | Higher is better | +1 prevents division by zero
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Active Threats Formula
                </h4>
                <div className="bg-muted p-4 rounded-lg font-mono">
                  <div className="text-sm space-y-2">
                    <div><strong>Input:</strong> threat_events = events where &apos;Event Name&apos; contains [&apos;threat&apos;, &apos;malware&apos;, &apos;attack&apos;]</div>
                    <div className="border-t pt-2 mt-2">
                      <strong>Formula:</strong> active_threats = count(distinct &apos;Principal Name&apos;)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Range: 0-∞ | Lower is better | Counts unique threat sources
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Risk Events Formula
                </h4>
                <div className="bg-muted p-4 rounded-lg font-mono">
                  <div className="text-sm space-y-2">
                    <div><strong>Input:</strong> risk_events = events where &apos;Event Name&apos; contains [&apos;fail&apos;, &apos;error&apos;, &apos;deny&apos;]</div>
                    <div className="border-t pt-2 mt-2">
                      <strong>Formula:</strong> risk_count = count(*)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Range: 0-∞ | Lower is better | Total count of risky events
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Compliance Rate Formula
                </h4>
                <div className="bg-muted p-4 rounded-lg font-mono">
                  <div className="text-sm space-y-2">
                    <div><strong>Input:</strong> total_audits = count(*) where &apos;Event Name&apos; contains [&apos;audit&apos;, &apos;compliance&apos;]</div>
                    <div><strong>Input:</strong> passed_audits = count(*) where &apos;Event Name&apos; contains &apos;pass&apos;</div>
                    <div className="border-t pt-2 mt-2">
                      <strong>Formula:</strong> compliance_rate = round((passed_audits × 100.0 / (total_audits + 1)), 1)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Range: 0-100% | Higher is better | +1 prevents division by zero
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Threat Source Distribution
                </h4>
                <div className="bg-muted p-4 rounded-lg font-mono">
                  <div className="text-sm space-y-2">
                    <div><strong>Input:</strong> threat_ips = events with &apos;IP Address&apos; != null and contains [&apos;fail&apos;, &apos;deny&apos;, &apos;attack&apos;]</div>
                    <div><strong>Processing:</strong> group by &apos;IP Address&apos; → estimate_country(ip) → group by country</div>
                    <div className="border-t pt-2 mt-2">
                      <strong>Formula:</strong> percentage = round((country_threats / total_threats) × 100, 1)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Range: 0-100% | Shows geographic distribution of threats
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Algorithm Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-semibold">Time Window Processing</h4>
                <div className="bg-muted p-4 rounded-lg text-sm">
                  <div className="space-y-2">
                    <div><strong>OCI Query Filter:</strong> Time &gt; dateRelative(&#123;period&#125;)</div>
                    <div><strong>Supported Periods:</strong> 1h, 24h, 7d, 30d</div>
                    <div><strong>Default Period:</strong> 24h (last 24 hours)</div>
                    <div><strong>Time Zone:</strong> UTC (OCI Logging Analytics standard)</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">IP Geolocation Algorithm</h4>
                <div className="bg-muted p-4 rounded-lg text-sm">
                  <div className="space-y-2">
                    <div><strong>Private Networks:</strong> 10.x.x.x, 172.16-31.x.x, 192.168.x.x → &quot;Internal&quot;</div>
                    <div><strong>Class A (1-126):</strong> North America region assignment</div>
                    <div><strong>Class B (128-191):</strong> Asia-Pacific region assignment</div>
                    <div><strong>Class C (192-223):</strong> Europe region assignment</div>
                    <div><strong>Fallback:</strong> Unknown/Other for unmatched ranges</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Note: This is a simplified geolocation for demonstration. Production systems should use accurate GeoIP databases.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Trend Calculation</h4>
                <div className="bg-muted p-4 rounded-lg text-sm">
                  <div className="space-y-2">
                    <div><strong>Method:</strong> Compare current period with previous period of same duration</div>
                    <div><strong>Trend Direction:</strong> &quot;up&quot; if current &gt; previous, &quot;down&quot; if current &lt; previous</div>
                    <div><strong>Percentage Change:</strong> ((current - previous) / previous) × 100</div>
                    <div><strong>Display Format:</strong> &quot;+X.X%&quot; for increases, &quot;-X.X%&quot; for decreases</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}