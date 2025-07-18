'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Database, RefreshCw, Search, Clock, Filter, TrendingUp, Activity } from 'lucide-react'
import { getMCPApi } from '@/lib/api/mcp-api'
import { safeToLocaleString } from '@/lib/format'
import ModernLayout from '@/components/Layout/ModernLayout'

// Time period options in minutes for consistent time formatting
const TIME_PERIODS = [
  { value: '60', label: '1 hour' },
  { value: '240', label: '4 hours' },
  { value: '480', label: '8 hours' },
  { value: '1440', label: '24 hours' },
  { value: '4320', label: '3 days' },
  { value: '10080', label: '7 days' },
  { value: '43200', label: '30 days' }
]

interface LogSource {
  name: string
  record_count: number
  last_activity?: string
  status?: string
  description?: string
}

export default function LogSourcesPage() {
  const [logSources, setLogSources] = useState<LogSource[]>([])
  const [allSources, setAllSources] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('1440')
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'activity'>('count')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showActiveOnly, setShowActiveOnly] = useState(false)

  const loadLogSources = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Load sources with data for the time period
      const timeMinutes = parseInt(selectedTimePeriod)
      const response = await fetch(`/api/mcp/log-groups?time_period=${timeMinutes}`)
      const data = await response.json()
      
      if (data.success) {
        setLogSources(data.sources || [])
      } else {
        setError(data.error || 'Failed to load log sources')
      }
      
      // Also load all available sources from OCI
      try {
        const allSourcesResponse = await fetch('/api/mcp/sources')
        const allSourcesData = await allSourcesResponse.json()
        
        if (allSourcesData.success) {
          setAllSources(allSourcesData.sources || [])
        }
      } catch (err) {
        console.warn('Could not load all sources:', err)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [selectedTimePeriod])

  useEffect(() => {
    loadLogSources()
  }, [selectedTimePeriod, loadLogSources])

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return 'Unknown'
      
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)
      
      if (diffMinutes < 1) return 'Just now'
      if (diffMinutes < 60) return `${diffMinutes}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    } catch {
      return 'Unknown'
    }
  }

  const getSourcesForDisplay = () => {
    let sourcesToDisplay = [...logSources]
    
    // Add sources from all sources that don't appear in active sources
    if (!showActiveOnly) {
      const activeSourceNames = new Set(logSources.map(s => s.name))
      const inactiveSources = allSources
        .filter(s => !activeSourceNames.has(s.name))
        .map(s => ({
          name: s.name,
          record_count: 0,
          status: 'inactive',
          description: s.description
        }))
      
      sourcesToDisplay = [...sourcesToDisplay, ...inactiveSources]
    }
    
    // Filter by search term
    if (searchTerm) {
      sourcesToDisplay = sourcesToDisplay.filter(source =>
        source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (source.description && source.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    // Filter active only
    if (showActiveOnly) {
      sourcesToDisplay = sourcesToDisplay.filter(source => source.record_count > 0)
    }
    
    // Sort
    sourcesToDisplay.sort((a, b) => {
      let aVal, bVal
      
      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'count':
          aVal = a.record_count
          bVal = b.record_count
          break
        case 'activity':
          aVal = a.last_activity ? new Date(a.last_activity).getTime() : 0
          bVal = b.last_activity ? new Date(b.last_activity).getTime() : 0
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })
    
    return sourcesToDisplay
  }

  const displaySources = getSourcesForDisplay()
  const totalActiveLog = logSources.length
  const totalEvents = logSources.reduce((sum, source) => sum + source.record_count, 0)

  return (
    <ModernLayout
      title="Log Sources"
      subtitle="Data sources and ingestion monitoring"
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Database className="h-8 w-8 text-primary" />
            <div className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full font-medium">
              {totalActiveLog} active sources
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogSources}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActiveLog}</div>
              <p className="text-xs text-muted-foreground">
                Generating logs in last {TIME_PERIODS.find(p => p.value === selectedTimePeriod)?.label}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeToLocaleString(totalEvents)}</div>
              <p className="text-xs text-muted-foreground">
                Events processed in selected period
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Sources</CardTitle>
              <Database className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allSources.length}</div>
              <p className="text-xs text-muted-foreground">
                Total configured log sources
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter and Analysis</CardTitle>
            <CardDescription>
              Configure time period and filter options for log source analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {/* Time Period Selector */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedTimePeriod} onValueChange={setSelectedTimePeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="flex-1 min-w-60">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search log sources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <Select value={sortBy} onValueChange={(value: 'name' | 'count' | 'activity') => setSortBy(value)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Event Count</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="activity">Last Activity</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Desc</SelectItem>
                  <SelectItem value="asc">Asc</SelectItem>
                </SelectContent>
              </Select>

              {/* Active Only Filter */}
              <Button
                variant={showActiveOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Active Only
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-500">
            <CardContent className="text-center py-6">
              <p className="text-red-500">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="mb-6">
            <CardContent className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Loading log sources...</p>
            </CardContent>
          </Card>
        )}

        {/* Log Sources Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displaySources.map((source, index) => (
              <Card key={`${source.name}-${index}`} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-medium break-words">
                        {source.name}
                      </CardTitle>
                      {source.description && (
                        <CardDescription className="mt-1">
                          {source.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge 
                      variant={source.record_count > 0 ? "default" : "secondary"}
                      className={source.record_count > 0 ? "bg-green-100 text-green-800" : ""}
                    >
                      {source.record_count > 0 ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Events</span>
                      <span className="font-medium text-lg">
                        {safeToLocaleString(source.record_count)}
                      </span>
                    </div>
                    
                    {source.last_activity && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Activity</span>
                        <span className="text-sm">
                          {formatTimestamp(source.last_activity)}
                        </span>
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: totalEvents > 0 
                              ? `${Math.min(100, (source.record_count / Math.max(...displaySources.map(s => s.record_count))) * 100)}%`
                              : '0%'
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Relative activity in selected period
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && displaySources.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No log sources found</h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Try adjusting your search terms or filters'
                  : 'No log sources match the current criteria'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModernLayout>
  )
}