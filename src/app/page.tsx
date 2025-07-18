'use client'

import ModernLayout from '@/components/Layout/ModernLayout'
import ModernDashboard from '@/components/Dashboard/ModernDashboard'

export default function HomePage() {
  return (
    <ModernLayout
      title="Security Dashboard"
      subtitle="Real-time security monitoring and threat intelligence"
    >
      <ModernDashboard />
    </ModernLayout>
  )
}