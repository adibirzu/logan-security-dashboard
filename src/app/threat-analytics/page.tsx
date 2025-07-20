import dynamic from 'next/dynamic'
import ModernLayout from '@/components/Layout/ModernLayout'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Lazy load the heavy ThreatAnalyticsPage component
const ThreatAnalyticsPage = dynamic(
  () => import('@/components/ThreatAnalytics/ThreatAnalyticsPage'),
  {
    loading: () => (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-lg">Loading Threat Analytics...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  }
)

export default function ThreatAnalytics() {
  return (
    <ModernLayout
      title="Threat Analytics"
      subtitle="Advanced threat detection and network behavior analysis"
    >
      <Suspense fallback={
        <div className="space-y-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-lg">Initializing...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      }>
        <ThreatAnalyticsPage />
      </Suspense>
    </ModernLayout>
  )
}