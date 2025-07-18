'use client'

import { useState } from 'react'
import { StorageUsageMonitor } from '@/components/StorageMonitor/StorageUsageMonitor'
import ModernLayout from '@/components/Layout/ModernLayout'
import { UnifiedTimeFilter, TimeRange, useTimeRange } from '@/components/TimeFilter/UnifiedTimeFilter'

export default function StorageAnalyticsPage() {
  // Unified time filter state
  const [timeRange, setTimeRange] = useState<TimeRange>({
    type: 'preset',
    preset: '1440',
    minutes: 1440
  })
  const { getTimeRangeInMinutes } = useTimeRange(timeRange)
  
  // Convert minutes to days for storage analytics
  const getTimeRangeInDays = (): number => {
    const minutes = getTimeRangeInMinutes()
    const days = Math.max(1, Math.ceil(minutes / 1440))
    return days
  }
  
  return (
    <ModernLayout
      title="Storage Analytics"
      subtitle="OCI Logging Analytics storage usage monitoring and analysis"
    >
      <div className="space-y-6">
        <UnifiedTimeFilter
          value={timeRange}
          onChange={setTimeRange}
          showTitle={true}
        />
        <StorageUsageMonitor timePeriodDays={getTimeRangeInDays()} />
      </div>
    </ModernLayout>
  )
}