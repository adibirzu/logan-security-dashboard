'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Database, HardDrive, Archive, Clock, RefreshCw } from 'lucide-react'

interface StorageUsage {
  total_storage_bytes: number
  active_data_bytes: number
  archived_data_bytes: number
  recalled_data_bytes: number
  time_period_days: number
  time_start: string
  time_end: string
}

interface StorageUsageMonitorProps {
  className?: string
}

export function StorageUsageMonitor({ className }: StorageUsageMonitorProps) {
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState('30')

  const loadStorageUsage = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/mcp/storage-usage?time_period_days=${timePeriod}`)
      const data = await response.json()
      
      if (data.success) {
        setStorageUsage(data.storage_usage)
      } else {
        setError(data.error || 'Failed to load storage usage')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [timePeriod])

  useEffect(() => {
    loadStorageUsage()
  }, [loadStorageUsage])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const getStoragePercentage = (value: number, total: number): number => {
    return total > 0 ? (value / total) * 100 : 0
  }

  const timePeriodOptions = [
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
    { value: '90', label: '90 days' },
    { value: '180', label: '180 days' },
    { value: '365', label: '1 year' }
  ]

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage Usage Monitor
              </CardTitle>
              <CardDescription>
                OCI Logging Analytics storage consumption overview
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-32">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timePeriodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={loadStorageUsage}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading storage usage...</span>
            </div>
          ) : storageUsage ? (
            <>
              {/* Total Storage Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Database className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Storage</p>
                        <p className="text-2xl font-bold">{formatBytes(storageUsage.total_storage_bytes)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Database className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Data</p>
                        <p className="text-2xl font-bold">{formatBytes(storageUsage.active_data_bytes)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Archive className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Archived Data</p>
                        <p className="text-2xl font-bold">{formatBytes(storageUsage.archived_data_bytes)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Recalled Data</p>
                        <p className="text-2xl font-bold">{formatBytes(storageUsage.recalled_data_bytes)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Storage Breakdown */}
              <div className="space-y-4">
                <h4 className="font-medium">Storage Breakdown</h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Active Data</span>
                      <span>{getStoragePercentage(storageUsage.active_data_bytes, storageUsage.total_storage_bytes).toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={getStoragePercentage(storageUsage.active_data_bytes, storageUsage.total_storage_bytes)}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Archived Data</span>
                      <span>{getStoragePercentage(storageUsage.archived_data_bytes, storageUsage.total_storage_bytes).toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={getStoragePercentage(storageUsage.archived_data_bytes, storageUsage.total_storage_bytes)}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Recalled Data</span>
                      <span>{getStoragePercentage(storageUsage.recalled_data_bytes, storageUsage.total_storage_bytes).toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={getStoragePercentage(storageUsage.recalled_data_bytes, storageUsage.total_storage_bytes)}
                      className="h-2"
                    />
                  </div>
                </div>
              </div>

              {/* Time Period Info */}
              <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
                <p><strong>Period:</strong> {timePeriod} days</p>
                <p><strong>From:</strong> {new Date(storageUsage.time_start).toLocaleString()}</p>
                <p><strong>To:</strong> {new Date(storageUsage.time_end).toLocaleString()}</p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No storage usage data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}