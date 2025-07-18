'use client'

import ModernLayout from '@/components/Layout/ModernLayout'
import IncidentResponseFramework from '@/components/IncidentResponse/IncidentResponseFramework'

export default function IncidentResponsePage() {
  return (
    <ModernLayout
      title="Incident Response"
      subtitle="Automated incident management and response workflows with n8n integration"
    >
      <IncidentResponseFramework />
    </ModernLayout>
  )
}