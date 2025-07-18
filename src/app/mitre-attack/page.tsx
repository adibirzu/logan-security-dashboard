'use client'

import React, { useState } from 'react'
import ModernLayout from '@/components/Layout/ModernLayout'
import { MitreAttackView } from '@/components/MitreAttack/MitreAttackView'
import { EnhancedMitreAttackView } from '@/components/MitreAttack/EnhancedMitreAttackView'
import { UnifiedTimeFilter, TimeRange, useTimeRange } from '@/components/TimeFilter/UnifiedTimeFilter'

export default function MitreAttackPage() {
  // Unified time filter state
  const [timeRange, setTimeRange] = useState<TimeRange>({
    type: 'preset',
    preset: '1440',
    minutes: 1440
  })
  const { getTimeRangeInMinutes } = useTimeRange(timeRange)
  
  return (
    <ModernLayout
      title="MITRE ATT&CK Framework"
      subtitle="Analyze security events mapped to MITRE ATT&CK tactics and techniques"
    >
      <div className="space-y-6">
        <UnifiedTimeFilter
          value={timeRange}
          onChange={setTimeRange}
          showTitle={true}
        />
        <EnhancedMitreAttackView timeRangeMinutes={getTimeRangeInMinutes()} />
      </div>
    </ModernLayout>
  )
}