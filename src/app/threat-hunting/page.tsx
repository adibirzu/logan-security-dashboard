'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import ModernLayout from '@/components/Layout/ModernLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { LoadingSkeleton } from '@/components/ui/optimized-card'

// Lazy load the heavy ThreatHuntingFramework component
const ThreatHuntingFramework = dynamic(
  () => import('@/components/ThreatHunting/ThreatHuntingFramework'),
  {
    loading: () => (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-lg">Loading Threat Hunting Framework...</span>
            </div>
          </CardContent>
        </Card>
        <LoadingSkeleton />
      </div>
    ),
  }
)

export default function ThreatHuntingPage() {
  return (
    <ModernLayout
      title="Threat Hunting"
      subtitle="Proactive threat detection using NIST-aligned methodologies and Active Countermeasures techniques"
    >
      <Suspense fallback={
        <div className="space-y-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-lg">Initializing threat hunting tools...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      }>
        <ThreatHuntingFramework />
      </Suspense>
    </ModernLayout>
  )
}