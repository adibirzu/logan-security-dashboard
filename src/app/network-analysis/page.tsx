'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import ModernLayout from '@/components/Layout/ModernLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Activity, Shield, Network } from 'lucide-react'
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector'

// Dynamic import to avoid SSR issues with Cytoscape
const NetworkGraphVisualization = dynamic(() => import('@/components/ThreatAnalytics/NetworkGraphVisualization'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96 bg-muted animate-pulse rounded"><Network className="h-8 w-8 animate-spin" /></div>
})

export default function NetworkAnalysisPage() {
  const [timeRange, setTimeRange] = useState('1h')

  const handleIpClick = (ipAddress: string) => {
    console.log('IP clicked:', ipAddress)
    // Could navigate to a detailed IP analysis page
  }

  return (
    <ModernLayout
      title="Network Analysis"
      subtitle="Analyze network traffic patterns and security events"
    >
      <div className="grid gap-6">
        {/* Time Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Network Traffic Analysis
            </CardTitle>
            <CardDescription>
              Interactive network graph visualization of traffic flows and connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <label htmlFor="time-range" className="text-sm font-medium">
                Time Range:
              </label>
              <TimeRangeSelector
                selectedTimeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                className="w-48"
              />
            </div>
          </CardContent>
        </Card>

        {/* Network Graph Visualization */}
        <NetworkGraphVisualization
          timeRange={timeRange}
          onIpClick={handleIpClick}
        />

        {/* Additional Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Traffic Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Additional traffic pattern analysis and metrics will be displayed here.
                The network graph above shows real-time connection data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Network security events and threat indicators will be shown here.
                Click on IP nodes in the graph above for detailed logs.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModernLayout>
  )
}