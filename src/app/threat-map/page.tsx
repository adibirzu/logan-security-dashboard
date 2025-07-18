'use client'

import React, { useState } from 'react'
import ModernLayout from '@/components/Layout/ModernLayout'
import dynamic from 'next/dynamic'
import { UnifiedTimeFilter, TimeRange, useTimeRange } from '@/components/TimeFilter/UnifiedTimeFilter'

// Dynamically import the CyberThreatMap component to avoid SSR issues
const CyberThreatMap = dynamic(
  () => import('@/components/ThreatMap/CyberThreatMap').then(mod => ({ default: mod.CyberThreatMap })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading threat map...</p>
      </div>
    )
  }
)

export default function ThreatMapPage() {
  // Unified time filter state
  const [timeRange, setTimeRange] = useState<TimeRange>({
    type: 'preset',
    preset: '1440',
    minutes: 1440
  })
  const { getTimeRangeInMinutes } = useTimeRange(timeRange)
  
  return (
    <ModernLayout
      title="Global Threat Map"
      subtitle="Real-time visualization of cyber threats and attacks worldwide"
    >
      <div className="space-y-6">
        <UnifiedTimeFilter
          value={timeRange}
          onChange={setTimeRange}
          showTitle={true}
        />
        <CyberThreatMap timeRangeMinutes={getTimeRangeInMinutes()} />
      </div>
    </ModernLayout>
  )
}