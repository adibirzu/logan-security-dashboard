import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Search } from 'lucide-react'
import { safeToLocaleString, safeDateToLocaleString } from '@/lib/format'
import { getMaliciousIPStyles } from '@/lib/threat-intelligence'

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

interface ThreatIntelResult {
  isMalicious: boolean
  confidence: number
  threatTypes: string[]
}

interface OptimizedThreatItemProps {
  threat: ThreatAnalysis
  threatIntelResults: Map<string, ThreatIntelResult>
  Icon: React.ComponentType<{ className?: string }>
  threatTypeLabel: string
  severityColors: Record<string, string>
  onCheckSourceIP: (ip: string) => void
  onCheckDestIP: (ip: string) => void
}

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200'
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDuration = (hours: number) => {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-red-600'
  if (score >= 70) return 'text-orange-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-blue-600'
}

export const OptimizedThreatItem = React.memo<OptimizedThreatItemProps>(({
  threat,
  threatIntelResults,
  Icon,
  threatTypeLabel,
  onCheckSourceIP,
  onCheckDestIP
}) => {
  if (!threat) return null

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-full bg-gray-100">
            <Icon className="h-5 w-5 text-gray-600" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{threatTypeLabel}</h3>
              <Badge className={SEVERITY_COLORS[threat.severity]}>
                {threat.severity.toUpperCase()}
              </Badge>
              <span className={`font-medium ${getScoreColor(threat.score)}`}>
                Score: {threat.score}%
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-4">
                <span>
                  Source:{' '}
                  <span className={getMaliciousIPStyles(threat.source_ip).textColor || 'text-foreground'}>
                    {threat.source_ip}
                  </span>
                  {threatIntelResults.get(threat.source_ip)?.isMalicious && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      Malicious
                    </Badge>
                  )}
                </span>
                <span>
                  Destination:{' '}
                  <span className={getMaliciousIPStyles(threat.destination_ip).textColor || 'text-foreground'}>
                    {threat.destination_ip}
                  </span>
                  {threatIntelResults.get(threat.destination_ip)?.isMalicious && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      Malicious
                    </Badge>
                  )}
                </span>
                {threat.destination_host && (
                  <span>Host: {threat.destination_host}</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span>Connections: {safeToLocaleString(threat.connection_count)}</span>
                <span>Data: {formatBytes(threat.bytes_transferred)}</span>
                <span>Duration: {formatDuration(threat.duration_hours)}</span>
                <span>Confidence: {threat.confidence}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span>First Seen: {safeDateToLocaleString(threat.first_seen)}</span>
                <span>Last Seen: {safeDateToLocaleString(threat.last_seen)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <Progress value={threat.score} className="w-24" />
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onCheckSourceIP(threat.source_ip)}
              title="Check source IP in Threat Intelligence"
            >
              <Search className="h-4 w-4 mr-2" />
              Check Source IP
            </Button>
            {threat.destination_ip && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCheckDestIP(threat.destination_ip)}
                title="Check destination IP in Threat Intelligence"
              >
                <Search className="h-4 w-4 mr-2" />
                Check Dest IP
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

OptimizedThreatItem.displayName = 'OptimizedThreatItem'