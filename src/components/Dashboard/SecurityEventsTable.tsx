'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getMCPApi } from '@/lib/api/mcp-api'
import { SecurityEvent, SecurityEventType, Severity } from '@/types'
import { AlertCircle, AlertTriangle, Shield, Activity } from 'lucide-react'

interface SecurityEventsTableProps {
  eventType?: SecurityEventType
  severity?: Severity
  timeRange?: number // minutes
}

function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-50'
    case 'high': return 'text-orange-600 bg-orange-50'
    case 'medium': return 'text-yellow-600 bg-yellow-50'
    case 'low': return 'text-blue-600 bg-blue-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

function getSeverityIcon(severity: Severity) {
  switch (severity) {
    case 'critical': return <AlertCircle className="h-4 w-4" />
    case 'high': return <AlertTriangle className="h-4 w-4" />
    case 'medium': return <Shield className="h-4 w-4" />
    case 'low': return <Activity className="h-4 w-4" />
  }
}

function formatTimestamp(timestamp: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export function SecurityEventsTable({ eventType, severity, timeRange = 1440 }: SecurityEventsTableProps) {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    try {
      const api = getMCPApi()
      const data = await api.getSecurityEvents({ eventType, severity, timeRange })
      setEvents(data)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
      setLoading(false)
    }
  }, [eventType, severity, timeRange])

  useEffect(() => {
    loadEvents()
    const interval = setInterval(loadEvents, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [eventType, severity, timeRange, loadEvents])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
          <CardDescription>Loading events...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-500">
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">Error loading events: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Events</CardTitle>
        <CardDescription>
          {events.length} events in the last {timeRange >= 1440 ? `${timeRange / 1440} days` : `${timeRange / 60} hours`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No security events found</p>
          ) : (
            events.slice(0, 10).map((event) => (
              <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                        {getSeverityIcon(event.severity)}
                        {event.severity.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium">{event.message}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
                        <span>Source: {event.source}</span>
                        <span>IP: {event.sourceIp}</span>
                        {event.user && <span>User: {event.user}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span>Type: {event.type.replace(/_/g, ' ')}</span>
                        <span>Action: {event.action}</span>
                        {event.details?.attempts && <span>Attempts: {event.details.attempts}</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
