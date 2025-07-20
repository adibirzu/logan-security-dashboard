'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OptimizedStatsCard, LoadingSkeleton } from '@/components/ui/optimized-card'
import { OptimizedThreatItem } from './OptimizedThreatItem'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UnifiedTimeFilter, TimeRange, useTimeRange } from '@/components/TimeFilter/UnifiedTimeFilter'
import { 
  AlertTriangle, 
  Activity, 
  Shield, 
  Network, 
  Clock, 
  Target,
  TrendingUp,
  Search,
  RefreshCw,
  ArrowUpDown,
  Filter,
  Loader2,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { safeToLocaleString, safeDateToLocaleString } from '@/lib/format'
import { batchCheckIPThreatIntelligence, getMaliciousIPStyles } from '@/lib/threat-intelligence'
import VCNBeaconAnalysis from './VCNBeaconAnalysis'
import VCNLongConnectionAnalysis from './VCNLongConnectionAnalysis'
import NetworkGraphVisualization from './NetworkGraphVisualization'
import EnhancedGraphAnalysis from './EnhancedGraphAnalysis'
import IPLogViewer from './IPLogViewer'

interface ThreatAnalysis {
  id: string
  type: 'beacon' | 'long_connection' | 'dns_tunneling' | 'data_exfiltration'
  severity: 'critical' | 'high' | 'medium' | 'low'
  score: number
  source_ip: string
  destination_ip: string
  destination_host?: string
  first_seen: string
  last_seen: string
  connection_count: number
  bytes_transferred: number
  duration_hours: number
  confidence: number
  details: any
}

interface ThreatStats {
  total_threats: number
  critical_threats: number
  high_threats: number
  medium_threats: number
  low_threats: number
  beacons_detected: number
  long_connections: number
  dns_tunneling: number
  data_exfiltration: number
  analysis_time_range: string
}

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200'
}

const THREAT_TYPE_ICONS = {
  beacon: Target,
  long_connection: Clock,
  dns_tunneling: Network,
  data_exfiltration: TrendingUp
}

const THREAT_TYPE_LABELS = {
  beacon: 'Beaconing Activity',
  long_connection: 'Long Connections',
  dns_tunneling: 'DNS Tunneling',
  data_exfiltration: 'Data Exfiltration'
}

export default function ThreatAnalyticsPage() {
  const router = useRouter()
  const [threats, setThreats] = useState<ThreatAnalysis[]>([])
  const [stats, setStats] = useState<ThreatStats | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Unified time filter state
  const [timeRange, setTimeRange] = useState<TimeRange>({
    type: 'preset',
    preset: '1440',
    minutes: 1440
  })
  const { getTimeRangeInMinutes } = useTimeRange(timeRange)
  
  const [selectedSeverity, setSelectedSeverity] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [sortBy, setSortBy] = useState('score')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedIp, setSelectedIp] = useState<string | null>(null)
  const [loadedCount, setLoadedCount] = useState(50)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [threatIntelResults, setThreatIntelResults] = useState<Map<string, {
    isMalicious: boolean
    confidence: number
    threatTypes: string[]
  }>>(new Map())
  
  // Convert new TimeRange format to legacy string format for existing components
  const getLegacyTimeRangeString = (): string => {
    const minutes = getTimeRangeInMinutes()
    if (minutes <= 60) return '1h'
    if (minutes <= 360) return '6h'
    if (minutes <= 1440) return '24h'
    if (minutes <= 10080) return '7d'
    return '30d'
  }

  const loadThreatAnalysis = useCallback(async (limit = 20) => {
    setLoading(true)
    try {
      const timeRangeMinutes = getTimeRangeInMinutes()
      const [threatsResponse, statsResponse] = await Promise.all([
        fetch(`/api/threat-analytics/threats?timeRange=${timeRangeMinutes}m&severity=${selectedSeverity}&type=${selectedType}&sortBy=${sortBy}&sortOrder=${sortOrder}&limit=${limit}`),
        fetch(`/api/threat-analytics/stats?timeRange=${timeRangeMinutes}m`)
      ])

      if (threatsResponse.ok) {
        const threatsData = await threatsResponse.json()
        const newThreats = threatsData.threats || []
        setThreats(newThreats)
        setHasMore(newThreats.length === limit)
        setLoadedCount(newThreats.length)
        
        // Batch check all IPs for threat intelligence
        const allIPs = new Set<string>()
        newThreats.forEach((threat: ThreatAnalysis) => {
          if (threat.source_ip) allIPs.add(threat.source_ip)
          if (threat.destination_ip) allIPs.add(threat.destination_ip)
        })
        
        if (allIPs.size > 0) {
          const threatIntelResults = await batchCheckIPThreatIntelligence(Array.from(allIPs))
          setThreatIntelResults(threatIntelResults)
        }
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats || null)
      }
    } catch (error) {
      console.error('Failed to load threat analysis:', error)
    } finally {
      setLoading(false)
    }
  }, [getTimeRangeInMinutes, selectedSeverity, selectedType, sortBy, sortOrder])

  const loadMoreThreats = useCallback(async () => {
    if (!hasMore || loadingMore) return
    
    setLoadingMore(true)
    try {
      const timeRangeMinutes = getTimeRangeInMinutes()
      const response = await fetch(`/api/threat-analytics/threats?timeRange=${timeRangeMinutes}m&severity=${selectedSeverity}&type=${selectedType}&sortBy=${sortBy}&sortOrder=${sortOrder}&limit=30&offset=${loadedCount}`)
      
      if (response.ok) {
        const data = await response.json()
        const newThreats = data.threats || []
        setThreats(prev => [...prev, ...newThreats])
        setHasMore(newThreats.length === 30)
        setLoadedCount(prev => prev + newThreats.length)
      }
    } catch (error) {
      console.error('Failed to load more threats:', error)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loadingMore, getTimeRangeInMinutes, selectedSeverity, selectedType, sortBy, sortOrder, loadedCount])

  useEffect(() => {
    // Reset pagination when filters change
    setLoadedCount(20)
    setHasMore(true)
    loadThreatAnalysis()
  }, [timeRange, selectedSeverity, selectedType, sortBy, sortOrder, loadThreatAnalysis])

  const getThreatIcon = (type: string) => {
    const IconComponent = THREAT_TYPE_ICONS[type as keyof typeof THREAT_TYPE_ICONS] || Activity
    return IconComponent
  }

  // These functions are now moved to OptimizedThreatItem

  // Navigate to threat intelligence with IP pre-filled
  const navigateToThreatIntelligence = (ip: string) => {
    // Store the IP in localStorage for the threat intelligence page to pick up
    localStorage.setItem('threat-intel-search', ip)
    router.push('/threat-hunting?tab=intelligence')
  }

  // Component to render clickable IP addresses
  const ClickableIP = ({ ip }: { ip: string }) => (
    <button
      onClick={() => navigateToThreatIntelligence(ip)}
      className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
      title={`Search ${ip} in threat intelligence`}
    >
      {ip}
    </button>
  )

  const filteredThreats = (threats || []).filter(threat => {
    if (!threat) return false
    if (selectedSeverity !== 'all' && threat.severity !== selectedSeverity) return false
    if (selectedType !== 'all' && threat.type !== selectedType) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Unified Time Filter */}
      <UnifiedTimeFilter
        value={timeRange}
        onChange={setTimeRange}
        showTitle={true}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Enhanced RITA Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Advanced threat detection and correlation analysis for OCI VCN Flow Logs with RITA-style behavioral analytics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="oracle-outline"
            size="sm"
            onClick={() => loadThreatAnalysis()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <OptimizedStatsCard
            title="Total Threats"
            value={stats.total_threats}
            subtitle={stats.analysis_time_range}
            icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          />
          <OptimizedStatsCard
            title="Critical Threats"
            value={stats.critical_threats}
            subtitle="Requires immediate attention"
            icon={<Shield className="h-4 w-4 text-red-500" />}
            className="text-red-600"
          />
          <OptimizedStatsCard
            title="Beacons Detected"
            value={stats.beacons_detected}
            subtitle="Potential C2 communication"
            icon={<Target className="h-4 w-4 text-orange-500" />}
          />
          <OptimizedStatsCard
            title="Long Connections"
            value={stats.long_connections}
            subtitle="Extended duration sessions"
            icon={<Clock className="h-4 w-4 text-yellow-500" />}
          />
          <OptimizedStatsCard
            title="DNS Tunneling"
            value={stats.dns_tunneling}
            subtitle="Covert channel attempts"
            icon={<Network className="h-4 w-4 text-blue-500" />}
          />
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="threats" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="threats">Overview</TabsTrigger>
          <TabsTrigger value="enhanced">Enhanced RITA</TabsTrigger>
          <TabsTrigger value="beacons">Beacon Analysis</TabsTrigger>
          <TabsTrigger value="connections">Long Connections</TabsTrigger>
          <TabsTrigger value="dns">DNS Analysis</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
        </TabsList>

        <TabsContent value="threats">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detected Threats</CardTitle>
                  <CardDescription>
                    Network threats identified through behavioral analysis
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                    <SelectTrigger className="w-32">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="beacon">Beacons</SelectItem>
                      <SelectItem value="long_connection">Long Connections</SelectItem>
                      <SelectItem value="dns_tunneling">DNS Tunneling</SelectItem>
                      <SelectItem value="data_exfiltration">Data Exfiltration</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>Analyzing network traffic...</span>
                </div>
              ) : filteredThreats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No threats detected in the selected time range</p>
                  <p className="text-sm">Try expanding the time range or adjusting filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredThreats.map((threat) => {
                    if (!threat) return null
                    const Icon = getThreatIcon(threat.type)
                    return (
                      <OptimizedThreatItem
                        key={threat.id}
                        threat={threat}
                        threatIntelResults={threatIntelResults}
                        Icon={Icon}
                        threatTypeLabel={THREAT_TYPE_LABELS[threat.type]}
                        severityColors={SEVERITY_COLORS}
                        onCheckSourceIP={(ip) => {
                          window.open(`/threat-hunting?tab=intelligence&ip=${encodeURIComponent(ip)}`, '_blank')
                        }}
                        onCheckDestIP={(ip) => {
                          window.open(`/threat-hunting?tab=intelligence&ip=${encodeURIComponent(ip)}`, '_blank')
                        }}
                      />
                    )
                  })}
                  
                  {/* Load More Button */}
                  {hasMore && !loading && filteredThreats.length > 0 && (
                    <div className="flex justify-center pt-4">
                      <Button 
                        variant="outline" 
                        onClick={loadMoreThreats}
                        disabled={loadingMore}
                        className="min-w-32"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            Load More Threats
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({loadedCount} loaded)
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enhanced">
          <EnhancedGraphAnalysis 
            timeRange={`${getTimeRangeInMinutes()}m`} 
            onIpClick={setSelectedIp}
          />
        </TabsContent>

        <TabsContent value="beacons">
          <VCNBeaconAnalysis 
            timeRange={`${getTimeRangeInMinutes()}m`} 
            onIpClick={setSelectedIp}
          />
        </TabsContent>

        <TabsContent value="connections">
          <VCNLongConnectionAnalysis 
            timeRange={`${getTimeRangeInMinutes()}m`} 
            onIpClick={setSelectedIp}
          />
        </TabsContent>

        <TabsContent value="dns">
          <Card>
            <CardHeader>
              <CardTitle>DNS Tunneling Analysis</CardTitle>
              <CardDescription>
                Detection of potential DNS-based covert channels and data exfiltration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enhanced DNS analysis with VCN flow correlation coming soon</p>
                <p className="text-sm">Analyzing DNS queries for tunneling patterns...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlations">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Analysis Correlations</CardTitle>
              <CardDescription>
                Advanced correlation analysis across multiple threat detection methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Beacon + Long Connection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const safeThreats = filteredThreats || []
                        const beacons = safeThreats.filter(t => t?.type === 'beacon')
                        const longConns = safeThreats.filter(t => t?.type === 'long_connection')
                        return beacons.length > 0 && longConns.length > 0 ? Math.min(beacons.length, longConns.length) : 0
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Overlapping threat indicators
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">High Risk IPs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Set((filteredThreats || []).map(t => t?.source_ip).filter(Boolean)).size}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Unique source IPs across threats
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Critical Correlation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {(filteredThreats || []).filter(t => t?.severity === 'critical').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Critical threat events
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-4">Threat Correlation Matrix</h4>
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Advanced correlation analysis coming soon</p>
                  <p className="text-sm">Building relationships between different threat types...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* IP Log Viewer Modal */}
      {selectedIp && (
        <IPLogViewer
          ip={selectedIp}
          timeRange={`${getTimeRangeInMinutes()}m`}
          onClose={() => setSelectedIp(null)}
        />
      )}
    </div>
  )
}