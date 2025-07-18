'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Clock, 
  Calendar as CalendarIcon,
  ChevronDown,
  RotateCcw
} from 'lucide-react'
import { format } from 'date-fns'

export interface TimeRange {
  type: 'preset' | 'custom'
  preset?: string
  startDate?: Date
  endDate?: Date
  startTime?: string
  endTime?: string
  minutes?: number
}

export interface UnifiedTimeFilterProps {
  value: TimeRange
  onChange: (timeRange: TimeRange) => void
  className?: string
  showTitle?: boolean
}

const TIME_PRESETS = [
  { value: '60', label: '1 Hour', minutes: 60 },
  { value: '240', label: '4 Hours', minutes: 240 },
  { value: '1440', label: '24 Hours', minutes: 1440 },
  { value: '2880', label: '48 Hours', minutes: 2880 },
  { value: 'custom', label: 'Custom Range', minutes: 0 }
]

export function UnifiedTimeFilter({ 
  value, 
  onChange, 
  className, 
  showTitle = true 
}: UnifiedTimeFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(value.startDate)
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(value.endDate)
  const [tempStartTime, setTempStartTime] = useState(value.startTime || '00:00')
  const [tempEndTime, setTempEndTime] = useState(value.endTime || '23:59')

  useEffect(() => {
    if (value.type === 'custom') {
      setTempStartDate(value.startDate)
      setTempEndDate(value.endDate)
      setTempStartTime(value.startTime || '00:00')
      setTempEndTime(value.endTime || '23:59')
    }
  }, [value])

  const handlePresetChange = (preset: string) => {
    if (preset === 'custom') {
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      
      onChange({
        type: 'custom',
        preset,
        startDate: yesterday,
        endDate: now,
        startTime: '00:00',
        endTime: '23:59'
      })
    } else {
      const selectedPreset = TIME_PRESETS.find(p => p.value === preset)
      onChange({
        type: 'preset',
        preset,
        minutes: selectedPreset?.minutes || 60
      })
    }
  }

  const handleCustomRangeApply = () => {
    if (tempStartDate && tempEndDate) {
      onChange({
        type: 'custom',
        preset: 'custom',
        startDate: tempStartDate,
        endDate: tempEndDate,
        startTime: tempStartTime,
        endTime: tempEndTime
      })
      setIsCalendarOpen(false)
    }
  }

  const handleReset = () => {
    onChange({
      type: 'preset',
      preset: '1440',
      minutes: 1440
    })
  }

  const getDisplayText = () => {
    if (value.type === 'preset') {
      const preset = TIME_PRESETS.find(p => p.value === value.preset)
      return preset?.label || 'Unknown'
    } else if (value.type === 'custom' && value.startDate && value.endDate) {
      const start = format(value.startDate, 'MMM dd, yyyy')
      const end = format(value.endDate, 'MMM dd, yyyy')
      return `${start} ${value.startTime} - ${end} ${value.endTime}`
    }
    return 'Select Time Range'
  }

  const getRangeDescription = () => {
    if (value.type === 'preset') {
      const preset = TIME_PRESETS.find(p => p.value === value.preset)
      return `Last ${preset?.label.toLowerCase()}`
    } else if (value.type === 'custom' && value.startDate && value.endDate) {
      const diffMs = value.endDate.getTime() - value.startDate.getTime()
      const diffHours = Math.round(diffMs / (1000 * 60 * 60))
      const diffDays = Math.round(diffHours / 24)
      
      if (diffDays > 1) {
        return `${diffDays} days selected`
      } else {
        return `${diffHours} hours selected`
      }
    }
    return 'No range selected'
  }

  return (
    <div className={className}>
      {showTitle && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Time Range Filter
            </CardTitle>
            <CardDescription>
              {getRangeDescription()}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Select 
            value={value.preset || '1440'} 
            onValueChange={handlePresetChange}
          >
            <SelectTrigger className="w-full">
              <Clock className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {TIME_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {value.type === 'custom' && (
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-start">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {getDisplayText()}
                <ChevronDown className="h-4 w-4 ml-auto" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Start Date</Label>
                      <Calendar
                        mode="single"
                        selected={tempStartDate}
                        onSelect={setTempStartDate}
                        className="rounded-md border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">End Date</Label>
                      <Calendar
                        mode="single"
                        selected={tempEndDate}
                        onSelect={setTempEndDate}
                        className="rounded-md border"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Time Range</Label>
                  <div className="flex gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Start Time</Label>
                      <Input
                        type="time"
                        value={tempStartTime}
                        onChange={(e) => setTempStartTime(e.target.value)}
                        className="w-24"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End Time</Label>
                      <Input
                        type="time"
                        value={tempEndTime}
                        onChange={(e) => setTempEndTime(e.target.value)}
                        className="w-24"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCalendarOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCustomRangeApply}
                    disabled={!tempStartDate || !tempEndDate}
                  >
                    Apply Range
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          title="Reset to 24 hours"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Hook for time range calculations
export function useTimeRange(timeRange: TimeRange) {
  const getTimeRangeInMinutes = (): number => {
    if (timeRange.type === 'preset') {
      return timeRange.minutes || 1440
    } else if (timeRange.type === 'custom' && timeRange.startDate && timeRange.endDate) {
      const diffMs = timeRange.endDate.getTime() - timeRange.startDate.getTime()
      return Math.round(diffMs / (1000 * 60))
    }
    return 1440
  }

  const getDateRange = (): { startDate: Date; endDate: Date } => {
    if (timeRange.type === 'custom' && timeRange.startDate && timeRange.endDate) {
      // Parse time strings and apply to dates
      const [startHours, startMinutes] = (timeRange.startTime || '00:00').split(':').map(Number)
      const [endHours, endMinutes] = (timeRange.endTime || '23:59').split(':').map(Number)
      
      const startDate = new Date(timeRange.startDate)
      startDate.setHours(startHours, startMinutes, 0, 0)
      
      const endDate = new Date(timeRange.endDate)
      endDate.setHours(endHours, endMinutes, 59, 999)
      
      return { startDate, endDate }
    } else {
      // Calculate preset range
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - (getTimeRangeInMinutes() * 60 * 1000))
      return { startDate, endDate }
    }
  }

  const getOCITimeFilter = (): string => {
    const minutes = getTimeRangeInMinutes()
    
    if (timeRange.type === 'custom' && timeRange.startDate && timeRange.endDate) {
      const { startDate, endDate } = getDateRange()
      return `Time >= '${startDate.toISOString()}' and Time <= '${endDate.toISOString()}'`
    } else {
      return `Time > dateRelative(${minutes}m)`
    }
  }

  return {
    getTimeRangeInMinutes,
    getDateRange,
    getOCITimeFilter
  }
}