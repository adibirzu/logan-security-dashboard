/**
 * Main Dashboard Page
 * Core dashboard with widgets from enabled modules
 */

import React from 'react'
import { moduleRegistry } from '@/modules'
import { useAppState, useSecurity } from '@/store'

export default function DashboardPage() {
  const { loading } = useAppState()
  const { securityMetrics } = useSecurity()

  // Get all widget components from enabled modules
  const widgets = moduleRegistry.getComponentsByType('widget')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time security monitoring and threat analysis
          </p>
        </div>
      </div>

      {/* Dynamic widgets from modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((widget) => {
          const WidgetComponent = widget.component
          return (
            <div key={widget.id}>
              <WidgetComponent />
            </div>
          )
        })}
      </div>

      {/* Security metrics summary */}
      {securityMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <div className="text-2xl font-bold">{securityMetrics.alertsLast24h}</div>
            <p className="text-xs text-muted-foreground">Alerts (24h)</p>
          </div>
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <div className="text-2xl font-bold">{securityMetrics.incidentsOpen}</div>
            <p className="text-xs text-muted-foreground">Open Incidents</p>
          </div>
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <div className={`text-2xl font-bold ${
              securityMetrics.threatLevel === 'critical' ? 'text-red-600' :
              securityMetrics.threatLevel === 'high' ? 'text-orange-600' :
              securityMetrics.threatLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {securityMetrics.threatLevel.toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground">Threat Level</p>
          </div>
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <div className={`text-2xl font-bold ${
              securityMetrics.systemHealth === 'critical' ? 'text-red-600' :
              securityMetrics.systemHealth === 'warning' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {securityMetrics.systemHealth.toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground">System Health</p>
          </div>
        </div>
      )}
    </div>
  )
}