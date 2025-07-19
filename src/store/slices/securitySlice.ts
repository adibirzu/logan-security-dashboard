import { StateCreator } from 'zustand'

export interface SecurityEvent {
  id: string
  timestamp: Date
  type: 'alert' | 'incident' | 'threat' | 'anomaly'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  source: string
  sourceIP?: string
  targetIP?: string
  user?: string
  techniques?: string[]
  indicators?: string[]
  status: 'open' | 'investigating' | 'resolved' | 'false_positive'
  assignee?: string
  tags: string[]
  metadata: Record<string, any>
}

export interface Alert {
  id: string
  ruleId: string
  ruleName: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  source: string
  count: number
  firstSeen: Date
  lastSeen: Date
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed'
  assignee?: string
  escalated: boolean
  falsePositive: boolean
  relatedEvents: string[]
}

export interface Incident {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: string
  team?: string
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  timeline: IncidentTimelineEntry[]
  artifacts: IncidentArtifact[]
  relatedAlerts: string[]
  relatedEvents: string[]
  tags: string[]
}

export interface IncidentTimelineEntry {
  id: string
  timestamp: Date
  type: 'created' | 'updated' | 'note' | 'action' | 'escalated' | 'resolved'
  actor: string
  title: string
  description: string
  metadata?: Record<string, any>
}

export interface IncidentArtifact {
  id: string
  name: string
  type: 'file' | 'screenshot' | 'log' | 'pcap' | 'memory_dump' | 'other'
  size: number
  hash: string
  uploadedAt: Date
  uploadedBy: string
  url: string
  metadata?: Record<string, any>
}

export interface SecurityMetrics {
  alertsLast24h: number
  incidentsOpen: number
  threatLevel: 'low' | 'medium' | 'high' | 'critical'
  systemHealth: 'healthy' | 'warning' | 'critical'
  lastUpdated: Date
  mttr: number // Mean Time To Resolution in minutes
  mtbd: number // Mean Time Between Detection in minutes
  falsePositiveRate: number
  coverage: {
    networks: number
    endpoints: number
    applications: number
  }
}

export interface SecurityState {
  securityEvents: SecurityEvent[]
  alerts: Alert[]
  incidents: Incident[]
  securityMetrics: SecurityMetrics | null
  loading: boolean
  error: string | null
}

export interface SecurityActions {
  addSecurityEvent: (event: SecurityEvent) => void
  updateSecurityEvent: (id: string, updates: Partial<SecurityEvent>) => void
  removeSecurityEvent: (id: string) => void
  clearSecurityEvents: () => void
  addAlert: (alert: Alert) => void
  updateAlert: (id: string, updates: Partial<Alert>) => void
  acknowledgeAlert: (id: string, assignee?: string) => void
  resolveAlert: (id: string) => void
  escalateAlert: (id: string) => void
  createIncident: (incident: Incident) => void
  updateIncident: (id: string, updates: Partial<Incident>) => void
  addIncidentTimelineEntry: (incidentId: string, entry: IncidentTimelineEntry) => void
  addIncidentArtifact: (incidentId: string, artifact: IncidentArtifact) => void
  assignIncident: (id: string, assignee: string) => void
  resolveIncident: (id: string) => void
  updateSecurityMetrics: (metrics: SecurityMetrics) => void
  setSecurityLoading: (loading: boolean) => void
  setSecurityError: (error: string | null) => void
  clearSecurityError: () => void
}

export type SecuritySlice = SecurityState & SecurityActions

export const createSecuritySlice: StateCreator<
  SecuritySlice,
  [],
  [],
  SecuritySlice
> = (set, get) => ({
  // Initial state
  securityEvents: [],
  alerts: [],
  incidents: [],
  securityMetrics: null,
  loading: false,
  error: null,

  // Security Events Actions
  addSecurityEvent: (event) => {
    set((state) => ({
      securityEvents: [event, ...state.securityEvents].slice(0, 1000), // Keep latest 1000
    }))
  },

  updateSecurityEvent: (id, updates) => {
    set((state) => ({
      securityEvents: state.securityEvents.map((event) =>
        event.id === id ? { ...event, ...updates } : event
      ),
    }))
  },

  removeSecurityEvent: (id) => {
    set((state) => ({
      securityEvents: state.securityEvents.filter((event) => event.id !== id),
    }))
  },

  clearSecurityEvents: () => set({ securityEvents: [] }),

  // Alerts Actions
  addAlert: (alert) => {
    set((state) => ({
      alerts: [alert, ...state.alerts],
    }))
  },

  updateAlert: (id, updates) => {
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, ...updates } : alert
      ),
    }))
  },

  acknowledgeAlert: (id, assignee) => {
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id 
          ? { ...alert, status: 'acknowledged' as const, assignee } 
          : alert
      ),
    }))
  },

  resolveAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, status: 'resolved' as const } : alert
      ),
    }))
  },

  escalateAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, escalated: true } : alert
      ),
    }))
  },

  // Incidents Actions
  createIncident: (incident) => {
    set((state) => ({
      incidents: [incident, ...state.incidents],
    }))
  },

  updateIncident: (id, updates) => {
    set((state) => ({
      incidents: state.incidents.map((incident) =>
        incident.id === id 
          ? { ...incident, ...updates, updatedAt: new Date() } 
          : incident
      ),
    }))
  },

  addIncidentTimelineEntry: (incidentId, entry) => {
    set((state) => ({
      incidents: state.incidents.map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              timeline: [entry, ...incident.timeline],
              updatedAt: new Date(),
            }
          : incident
      ),
    }))
  },

  addIncidentArtifact: (incidentId, artifact) => {
    set((state) => ({
      incidents: state.incidents.map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              artifacts: [artifact, ...incident.artifacts],
              updatedAt: new Date(),
            }
          : incident
      ),
    }))
  },

  assignIncident: (id, assignee) => {
    set((state) => ({
      incidents: state.incidents.map((incident) =>
        incident.id === id 
          ? { ...incident, assignee, updatedAt: new Date() } 
          : incident
      ),
    }))
  },

  resolveIncident: (id) => {
    set((state) => ({
      incidents: state.incidents.map((incident) =>
        incident.id === id
          ? {
              ...incident,
              status: 'resolved' as const,
              resolvedAt: new Date(),
              updatedAt: new Date(),
            }
          : incident
      ),
    }))
  },

  updateSecurityMetrics: (metrics) => set({ securityMetrics: metrics }),

  setSecurityLoading: (loading) => set({ loading }),

  setSecurityError: (error) => set({ error }),

  clearSecurityError: () => set({ error: null }),
})