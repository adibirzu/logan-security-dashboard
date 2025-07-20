'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

interface ThreatIntel {
  id: number
  type: string
  title: string
  description: string
  severity: string
  confidence: string
  iocs: number
  lastSeen: string
  affected_regions: string[]
}

interface ThreatIntelTabProps {
  threatData: ThreatIntel[]
  getSeverityColor: (severity: string) => string
}

export default function ThreatIntelTab({ threatData, getSeverityColor }: ThreatIntelTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest Threat Intelligence</CardTitle>
        <CardDescription>Recent threat indicators and campaign updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(threatData || []).map((threat) => (
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
  )
}