/**
 * Threat Indicators Widget Component
 * Dashboard widget for displaying threat indicators summary
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useThreatIntel } from '@/store'
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default function ThreatIndicatorsWidget() {
  const { indicators, ociConnectionStatus } = useThreatIntel()

  const stats = {
    total: indicators.length,
    critical: indicators.filter(i => i.severity === 'critical').length,
    ociVerified: indicators.filter(i => i.ociVerified).length,
    recent: indicators.filter(i => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return i.lastSeen > oneDayAgo
    }).length,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Threat Indicators</CardTitle>
          <Badge className={getStatusColor(ociConnectionStatus)}>
            {ociConnectionStatus === 'connected' ? 'OCI Connected' : 
             ociConnectionStatus === 'error' ? 'OCI Error' : 'OCI Unknown'}
          </Badge>
        </div>
        <CardDescription>IOCs and threat intelligence summary</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Critical</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">OCI Verified</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.ociVerified}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Last 24h</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.recent}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}