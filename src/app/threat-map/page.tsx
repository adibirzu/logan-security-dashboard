'use client'

import React from 'react'
import ModernLayout from '@/components/Layout/ModernLayout'
import dynamic from 'next/dynamic'

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
  return (
    <ModernLayout
      title="Global Threat Map"
      subtitle="Real-time visualization of cyber threats and attacks worldwide"
    >
      <CyberThreatMap timeRangeMinutes={1440} />
    </ModernLayout>
  )
}