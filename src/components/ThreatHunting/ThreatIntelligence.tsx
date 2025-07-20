'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import IPLogViewer from './IPLogViewer'
import {
  Globe,
  Shield,
  AlertTriangle,
  Clock,
  Database,
  ExternalLink,
  Search,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Target,
  Zap,
  FileText,
  Hash,
  Wifi,
  Mail,
  Server,
  CheckCircle,
  XCircle,
  Loader2,
  Cloud
} from 'lucide-react'

interface ThreatIntel {
  id: string
  type: 'ip' | 'domain' | 'hash' | 'email' | 'url' | 'cve'
  value: string
  source: string
  confidence: 'low' | 'medium' | 'high' | number
  severity: 'low' | 'medium' | 'high' | 'critical'
  firstSeen: Date
  lastSeen: Date
  tags: string[]
  description: string
  references: string[]
  huntingQueries: string[]
  oci_verified?: boolean
  oci_data?: {
    threat_types: string[]
    attributes: Array<{
      name: string
      value: string
      attribution: string
    }>
    time_created?: string
    time_updated?: string
    time_last_seen?: string
  }
}

interface ThreatActor {
  id: string
  name: string
  aliases: string[]
  groups: string[]
  country: string
  motivation: string[]
  targets: string[]
  techniques: string[]
  campaigns: string[]
  lastActivity: Date
}

interface Campaign {
  id: string
  name: string
  actor: string
  startDate: Date
  endDate?: Date
  targets: string[]
  techniques: string[]
  iocs: string[]
  description: string
  status: 'active' | 'dormant' | 'concluded'
}

const SAMPLE_THREAT_INTEL: ThreatIntel[] = [
  {
    id: 'intel-1',
    type: 'ip',
    value: '185.159.157.131',
    source: 'AlienVault OTX',
    confidence: 'high',
    severity: 'critical',
    firstSeen: new Date('2024-01-15'),
    lastSeen: new Date('2024-07-10'),
    tags: ['malware', 'c2', 'apt29'],
    description: 'Known C2 server associated with APT29 campaigns',
    references: ['https://otx.alienvault.com/indicator/...'],
    huntingQueries: [
      "* | where 'Destination IP' = '185.159.157.131' | stats count by 'Source IP'",
      "* | where 'Source IP' = '185.159.157.131' | stats count by Time"
    ]
  },
  {
    id: 'intel-2',
    type: 'domain',
    value: 'malicious-update.com',
    source: 'Recorded Future',
    confidence: 'medium',
    severity: 'high',
    firstSeen: new Date('2024-03-20'),
    lastSeen: new Date('2024-07-15'),
    tags: ['phishing', 'fake-update', 'malware-delivery'],
    description: 'Domain used for fake software update campaigns',
    references: ['https://recordedfuture.com/...'],
    huntingQueries: [
      "* | where Domain contains 'malicious-update.com' | stats count by 'Source IP'",
      "* | where 'HTTP Host' contains 'malicious-update.com'"
    ]
  },
  {
    id: 'intel-3',
    type: 'hash',
    value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    source: 'VirusTotal',
    confidence: 'high',
    severity: 'critical',
    firstSeen: new Date('2024-06-01'),
    lastSeen: new Date('2024-07-18'),
    tags: ['ransomware', 'lockbit', 'payload'],
    description: 'LockBit ransomware payload hash',
    references: ['https://virustotal.com/...'],
    huntingQueries: [
      "* | where 'File Hash' = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'",
      "* | where 'Process Name' contains 'lockbit'"
    ]
  }
]

const SAMPLE_THREAT_ACTORS: ThreatActor[] = [
  {
    id: 'actor-1',
    name: 'APT29',
    aliases: ['Cozy Bear', 'The Dukes', 'CozyDuke'],
    groups: ['SVR'],
    country: 'Russia',
    motivation: ['espionage', 'intelligence-gathering'],
    targets: ['government', 'diplomatic', 'technology'],
    techniques: ['T1566.001', 'T1071.001', 'T1027', 'T1055'],
    campaigns: ['SolarWinds', 'COVID-19 Research'],
    lastActivity: new Date('2024-07-01')
  },
  {
    id: 'actor-2',
    name: 'Lazarus Group',
    aliases: ['HIDDEN COBRA', 'APT38', 'Zinc'],
    groups: ['RGB'],
    country: 'North Korea',
    motivation: ['financial', 'espionage'],
    targets: ['financial', 'cryptocurrency', 'media'],
    techniques: ['T1566.002', 'T1090', 'T1572', 'T1486'],
    campaigns: ['WannaCry', 'SWIFT Attacks'],
    lastActivity: new Date('2024-06-15')
  }
]

const SAMPLE_CAMPAIGNS: Campaign[] = [
  {
    id: 'campaign-1',
    name: 'Operation CloudHopper',
    actor: 'APT10',
    startDate: new Date('2024-01-01'),
    targets: ['MSPs', 'cloud-providers', 'technology'],
    techniques: ['T1566.001', 'T1078', 'T1021.001'],
    iocs: ['185.159.157.131', 'malicious-update.com'],
    description: 'Large-scale campaign targeting managed service providers',
    status: 'active'
  }
]

interface ThreatIntelligenceProps {
  lookupIp?: string | null
}

export default function ThreatIntelligence({ lookupIp }: ThreatIntelligenceProps = {}) {
  const [threatIntel, setThreatIntel] = useState<ThreatIntel[]>(SAMPLE_THREAT_INTEL)
  const [threatActors] = useState<ThreatActor[]>(SAMPLE_THREAT_ACTORS)
  const [campaigns] = useState<Campaign[]>(SAMPLE_CAMPAIGNS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIntel, setSelectedIntel] = useState<ThreatIntel | null>(null)
  const [loading, setLoading] = useState(false)
  const [ociConnectionStatus, setOciConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown')
  const [newIndicator, setNewIndicator] = useState('')
  const [newIndicatorType, setNewIndicatorType] = useState('ip')
  const [activeTab, setActiveTab] = useState('iocs')
  const [logViewerIP, setLogViewerIP] = useState<string | undefined>()

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ip': return <Wifi className="h-4 w-4" />
      case 'domain': return <Globe className="h-4 w-4" />
      case 'hash': return <Hash className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      case 'url': return <ExternalLink className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
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

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-emerald-100 text-emerald-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredIntel = threatIntel.filter(intel =>
    intel.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    intel.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    intel.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const executeHuntingQuery = (query: string) => {
    toast.info(`Executing hunting query: ${query}`)
    // Implementation would integrate with the query execution system
  }

  // Test OCI Threat Intelligence connection
  const testOCIConnection = async () => {
    try {
      setOciConnectionStatus('unknown')
      const response = await fetch('/api/threat-intelligence?action=test')
      const data = await response.json()
      
      if (data.success) {
        setOciConnectionStatus('connected')
        toast.success('OCI Threat Intelligence connection successful')
      } else {
        setOciConnectionStatus('error')
        toast.error(`Connection failed: ${data.error}`)
      }
    } catch (error) {
      setOciConnectionStatus('error')
      toast.error('Failed to connect to OCI Threat Intelligence service')
    }
  }

  // Check single indicator with OCI
  const checkIndicatorWithOCI = useCallback(async (indicator: string, type?: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/threat-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          indicator,
          type
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.found && data.indicators.length > 0) {
        const ociIndicator = data.indicators[0]
        
        // Update or add the indicator to our threat intel list
        const existingIndex = threatIntel.findIndex(intel => intel.value === indicator)
        
        const enhancedIntel: ThreatIntel = {
          id: existingIndex >= 0 ? threatIntel[existingIndex].id : `oci-${Date.now()}`,
          type: (type || ociIndicator.type) as ThreatIntel['type'],
          value: indicator,
          source: existingIndex >= 0 ? threatIntel[existingIndex].source : 'OCI Threat Intelligence',
          confidence: typeof ociIndicator.confidence === 'number' ? 
            (ociIndicator.confidence > 80 ? 'high' : ociIndicator.confidence > 50 ? 'medium' : 'low') : 
            'medium',
          severity: 'high', // Default based on OCI detection
          firstSeen: ociIndicator.time_created ? new Date(ociIndicator.time_created) : new Date(),
          lastSeen: ociIndicator.time_last_seen ? new Date(ociIndicator.time_last_seen) : new Date(),
          tags: [...(existingIndex >= 0 ? threatIntel[existingIndex].tags : []), ...ociIndicator.threat_types, 'oci-verified'],
          description: existingIndex >= 0 ? 
            threatIntel[existingIndex].description : 
            `Threat indicator verified by OCI Threat Intelligence service`,
          references: existingIndex >= 0 ? threatIntel[existingIndex].references : [],
          huntingQueries: existingIndex >= 0 ? threatIntel[existingIndex].huntingQueries : [
            `* | where '${type === 'ip' ? 'IP Address' : 'Domain'}' = '${indicator}'`,
            `* | where '${type === 'ip' ? 'Source IP' : 'HTTP Host'}' contains '${indicator}'`
          ],
          oci_verified: true,
          oci_data: {
            threat_types: ociIndicator.threat_types,
            attributes: ociIndicator.attributes,
            time_created: ociIndicator.time_created,
            time_updated: ociIndicator.time_updated,
            time_last_seen: ociIndicator.time_last_seen
          }
        }
        
        if (existingIndex >= 0) {
          const updated = [...threatIntel]
          updated[existingIndex] = enhancedIntel
          setThreatIntel(updated)
        } else {
          setThreatIntel(prev => [enhancedIntel, ...prev])
        }
        
        toast.success(`Indicator ${indicator} verified as threat by OCI`)
        return enhancedIntel
      } else {
        toast.info(`Indicator ${indicator} not found in OCI threat intelligence`)
        return null
      }
    } catch (error) {
      toast.error('Failed to check indicator with OCI')
      console.error('OCI check error:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [threatIntel])
<<<<<<< Updated upstream

  // Check for pre-filled search from threat analytics navigation
  useEffect(() => {
    const searchTerm = localStorage.getItem('threat-intel-search')
    if (searchTerm) {
      setSearchQuery(searchTerm)
      setNewIndicator(searchTerm)
      // Auto-detect IP vs domain
      const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(searchTerm)
      setNewIndicatorType(isIP ? 'ip' : 'domain')
      localStorage.removeItem('threat-intel-search') // Clear after use
      
      // If it's an IP, navigate to logs tab and show IP logs
      if (isIP) {
        setActiveTab('logs')
        setLogViewerIP(searchTerm)
        
        // Also check with OCI
        setTimeout(() => {
          checkIndicatorWithOCI(searchTerm, 'ip')
        }, 1000)
      } else {
        // For domains, stay on IOCs tab and check with OCI
        setTimeout(() => {
          checkIndicatorWithOCI(searchTerm, 'domain')
        }, 1000)
      }
    }
  }, [checkIndicatorWithOCI])
=======
>>>>>>> Stashed changes

  // Batch check multiple indicators
  const batchCheckWithOCI = async () => {
    try {
      setLoading(true)
      const indicators = threatIntel.filter(intel => !intel.oci_verified).map(intel => ({
        value: intel.value,
        type: intel.type
      }))
      
      if (indicators.length === 0) {
        toast.info('All indicators already verified with OCI')
        return
      }
      
      const response = await fetch('/api/threat-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch',
          indicators
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        let verifiedCount = 0
        const updatedIntel = [...threatIntel]
        
        data.indicators.forEach((result: any) => {
          if (result.found) {
            const intelIndex = updatedIntel.findIndex(intel => intel.value === result.indicator_value)
            if (intelIndex >= 0 && result.indicators.length > 0) {
              const ociIndicator = result.indicators[0]
              updatedIntel[intelIndex] = {
                ...updatedIntel[intelIndex],
                oci_verified: true,
                tags: [...updatedIntel[intelIndex].tags, 'oci-verified'],
                oci_data: {
                  threat_types: ociIndicator.threat_types,
                  attributes: ociIndicator.attributes,
                  time_created: ociIndicator.time_created,
                  time_updated: ociIndicator.time_updated,
                  time_last_seen: ociIndicator.time_last_seen
                }
              }
              verifiedCount++
            }
          }
        })
        
        setThreatIntel(updatedIntel)
        toast.success(`${verifiedCount} indicators verified with OCI Threat Intelligence`)
      } else {
        toast.error(`Batch verification failed: ${data.error}`)
      }
    } catch (error) {
      toast.error('Failed to batch check indicators with OCI')
      console.error('OCI batch check error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Add new indicator and check with OCI
  const addNewIndicator = async () => {
    if (!newIndicator.trim()) {
      toast.error('Please enter an indicator value')
      return
    }
    
    // Check if already exists
    if (threatIntel.some(intel => intel.value === newIndicator)) {
      toast.error('Indicator already exists')
      return
    }
    
    const result = await checkIndicatorWithOCI(newIndicator, newIndicatorType)
    
    if (!result) {
      // Add as unverified indicator
      const newIntel: ThreatIntel = {
        id: `manual-${Date.now()}`,
        type: newIndicatorType as ThreatIntel['type'],
        value: newIndicator,
        source: 'Manual Entry',
        confidence: 'medium',
        severity: 'medium',
        firstSeen: new Date(),
        lastSeen: new Date(),
        tags: ['manual-entry'],
        description: 'Manually added indicator',
        references: [],
        huntingQueries: [
          `* | where '${newIndicatorType === 'ip' ? 'IP Address' : 'Domain'}' = '${newIndicator}'`
        ],
        oci_verified: false
      }
      
      setThreatIntel(prev => [newIntel, ...prev])
      toast.info('Indicator added (not found in OCI threat intelligence)')
    }
    
    setNewIndicator('')
  }

  // Handle lookup IP from URL parameter
  useEffect(() => {
    if (lookupIp) {
      setNewIndicator(lookupIp)
      setNewIndicatorType('ip')
      // Automatically search for the IP and check with OCI
      checkIndicatorWithOCI(lookupIp, 'ip')
      toast.info(`Looking up IP: ${lookupIp}`)
    }
  }, [lookupIp, checkIndicatorWithOCI])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Threat Intelligence</h2>
          <p className="text-muted-foreground">IOCs, threat actors, and campaign intelligence for hunting</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={testOCIConnection}
            disabled={loading}
          >
            <Cloud className="h-4 w-4 mr-2" />
            {ociConnectionStatus === 'unknown' ? 'Test OCI' : 
             ociConnectionStatus === 'connected' ? 'OCI Connected' : 'OCI Error'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={batchCheckWithOCI}
            disabled={loading || ociConnectionStatus !== 'connected'}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Verify with OCI
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import IOCs
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="iocs">IOCs & Indicators</TabsTrigger>
          <TabsTrigger value="actors">Threat Actors</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="logs">IP Log Analysis</TabsTrigger>
          <TabsTrigger value="feeds">Intel Feeds</TabsTrigger>
        </TabsList>

        <TabsContent value="iocs" className="space-y-6">
          {/* Add New Indicator */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Indicator</CardTitle>
              <CardDescription>Add indicators and verify with OCI Threat Intelligence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter IP, domain, hash, or other indicator..."
                    value={newIndicator}
                    onChange={(e) => setNewIndicator(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNewIndicator()}
                  />
                </div>
                <select 
                  value={newIndicatorType} 
                  onChange={(e) => setNewIndicatorType(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="ip">IP Address</option>
                  <option value="domain">Domain</option>
                  <option value="hash">Hash</option>
                  <option value="email">Email</option>
                  <option value="url">URL</option>
                </select>
                <Button 
                  onClick={addNewIndicator}
                  disabled={loading || !newIndicator.trim()}
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
                  Check & Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* IOC List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Indicators of Compromise</CardTitle>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search IOCs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                      />
                      <Button size="sm" variant="outline">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {filteredIntel.map((intel) => (
                        <Card 
                          key={intel.id}
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedIntel?.id === intel.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedIntel(intel)}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getTypeIcon(intel.type)}
                                <span className="font-medium font-mono text-sm">{intel.value}</span>
                                {intel.oci_verified && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    OCI Verified
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge className={getSeverityColor(intel.severity)}>
                                  {intel.severity}
                                </Badge>
                                <Badge className={getConfidenceColor(typeof intel.confidence === 'string' ? intel.confidence : 'medium')} variant="outline">
                                  {typeof intel.confidence === 'string' ? intel.confidence : `${intel.confidence}%`}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    checkIndicatorWithOCI(intel.value, intel.type)
                                  }}
                                  disabled={loading}
                                  title="Verify with OCI"
                                >
                                  <Cloud className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{intel.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1 flex-wrap">
                                {intel.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">{intel.source}</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* IOC Details */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>IOC Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedIntel ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Indicator</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {getTypeIcon(selectedIntel.type)}
                          <span className="font-mono text-sm">{selectedIntel.value}</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Assessment</Label>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge className={getSeverityColor(selectedIntel.severity)}>
                            {selectedIntel.severity}
                          </Badge>
                          <Badge className={getConfidenceColor(typeof selectedIntel.confidence === 'string' ? selectedIntel.confidence : 'medium')} variant="outline">
                            {typeof selectedIntel.confidence === 'string' ? selectedIntel.confidence : `${selectedIntel.confidence}%`} confidence
                          </Badge>
                          {selectedIntel.oci_verified && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              OCI Verified
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Timeline</Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          <div>First seen: {selectedIntel.firstSeen.toLocaleDateString()}</div>
                          <div>Last seen: {selectedIntel.lastSeen.toLocaleDateString()}</div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Tags</Label>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {selectedIntel.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {selectedIntel.oci_data && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-sm font-medium">OCI Threat Intelligence Data</Label>
                            <div className="space-y-2 mt-2">
                              {selectedIntel.oci_data.threat_types.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium">Threat Types:</span>
                                  <div className="flex gap-1 flex-wrap mt-1">
                                    {selectedIntel.oci_data.threat_types.map((type) => (
                                      <Badge key={type} variant="secondary" className="text-xs">
                                        {type}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {selectedIntel.oci_data.attributes.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium">Attributes:</span>
                                  <div className="space-y-1 mt-1">
                                    {selectedIntel.oci_data.attributes.map((attr, index) => (
                                      <div key={index} className="text-xs bg-muted p-2 rounded">
                                        <div><strong>{attr.name}:</strong> {attr.value}</div>
                                        {attr.attribution && <div className="text-muted-foreground">Attribution: {attr.attribution}</div>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {selectedIntel.oci_data.time_last_seen && (
                                <div className="text-xs text-muted-foreground">
                                  OCI Last Seen: {new Date(selectedIntel.oci_data.time_last_seen).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div>
                        <Label className="text-sm font-medium">Hunting Queries</Label>
                        <div className="space-y-2 mt-2">
                          {selectedIntel.huntingQueries.map((query, index) => (
                            <div key={index} className="space-y-1">
                              <div className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                                {query}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full"
                                onClick={() => executeHuntingQuery(query)}
                              >
                                <Target className="h-3 w-3 mr-1" />
                                Hunt
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">References</Label>
                        <div className="space-y-1 mt-1">
                          {selectedIntel.references.map((ref, index) => (
                            <a 
                              key={index} 
                              href={ref} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              External Source
                            </a>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={() => checkIndicatorWithOCI(selectedIntel.value, selectedIntel.type)}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Cloud className="h-3 w-3 mr-1" />
                          )}
                          {selectedIntel.oci_verified ? 'Refresh OCI Data' : 'Verify with OCI'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Select an IOC to view details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="actors" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {threatActors.map((actor) => (
              <Card key={actor.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{actor.name}</CardTitle>
                    <Badge variant="outline">{actor.country}</Badge>
                  </div>
                  <CardDescription>
                    Last activity: {actor.lastActivity.toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Aliases</Label>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {actor.aliases.map((alias) => (
                        <Badge key={alias} variant="secondary" className="text-xs">
                          {alias}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Motivation</Label>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {actor.motivation.map((motive) => (
                        <Badge key={motive} variant="outline" className="text-xs">
                          {motive}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Targets</Label>
                    <div className="text-sm text-muted-foreground">
                      {actor.targets.join(', ')}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Recent Campaigns</Label>
                    <div className="text-sm text-muted-foreground">
                      {actor.campaigns.slice(0, 2).join(', ')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{campaign.name}</CardTitle>
                      <CardDescription>Associated with {campaign.actor}</CardDescription>
                    </div>
                    <Badge 
                      className={
                        campaign.status === 'active' ? 'bg-red-100 text-red-800' :
                        campaign.status === 'dormant' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{campaign.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Timeline</Label>
                      <div className="text-sm text-muted-foreground">
                        Started: {campaign.startDate.toLocaleDateString()}
                        {campaign.endDate && <div>Ended: {campaign.endDate.toLocaleDateString()}</div>}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Targets</Label>
                      <div className="text-sm text-muted-foreground">
                        {campaign.targets.join(', ')}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">IOCs</Label>
                      <div className="text-sm text-muted-foreground">
                        {campaign.iocs.length} indicators
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">MITRE ATT&CK Techniques</Label>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {campaign.techniques.map((technique) => (
                        <Badge key={technique} variant="outline" className="text-xs">
                          {technique}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <IPLogViewer ip={logViewerIP} />
        </TabsContent>

        <TabsContent value="feeds" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Threat Intelligence Feeds</CardTitle>
              <CardDescription>Configure and manage external threat intelligence sources</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  Integration with threat intelligence feeds like MISP, OTX, VirusTotal, and commercial feeds 
                  will be implemented to provide real-time IOCs and threat actor information.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}