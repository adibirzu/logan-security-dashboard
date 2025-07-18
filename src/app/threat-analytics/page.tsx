import ThreatAnalyticsPage from '@/components/ThreatAnalytics/ThreatAnalyticsPage'
import ModernLayout from '@/components/Layout/ModernLayout'

export default function ThreatAnalytics() {
  return (
    <ModernLayout
      title="Threat Analytics"
      subtitle="Advanced threat detection and network behavior analysis"
    >
      <ThreatAnalyticsPage />
    </ModernLayout>
  )
}