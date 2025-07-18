'use client'

import ModernLayout from '@/components/Layout/ModernLayout'
import ThreatHuntingFramework from '@/components/ThreatHunting/ThreatHuntingFramework'

export default function ThreatHuntingPage() {
  return (
    <ModernLayout
      title="Threat Hunting"
      subtitle="Proactive threat detection using NIST-aligned methodologies and Active Countermeasures techniques"
    >
      <ThreatHuntingFramework />
    </ModernLayout>
  )
}