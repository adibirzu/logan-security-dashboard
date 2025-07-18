'use client'

import React from 'react'
import ModernLayout from '@/components/Layout/ModernLayout'
import { MitreAttackView } from '@/components/MitreAttack/MitreAttackView'

export default function MitreAttackPage() {
  return (
    <ModernLayout
      title="MITRE ATT&CK Framework"
      subtitle="Analyze security events mapped to MITRE ATT&CK tactics and techniques"
    >
      <MitreAttackView timeRangeMinutes={1440} />
    </ModernLayout>
  )
}