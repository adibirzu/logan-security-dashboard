import { StateCreator } from 'zustand'

export interface ThreatIndicator {
  id: string
  type: 'ip' | 'domain' | 'hash' | 'email' | 'url' | 'cve'
  value: string
  source: string
  confidence: 'low' | 'medium' | 'high' | number
  severity: 'low' | 'medium' | 'high' | 'critical'
  firstSeen: Date
  lastSeen: Date
  tags: string[]
  description: string
  references: string[]
  huntingQueries: string[]
  ociVerified?: boolean
  ociData?: {
    threatTypes: string[]
    attributes: Array<{
      name: string
      value: string
      attribution: string
    }>
    timeCreated?: string
    timeUpdated?: string
    timeLastSeen?: string
  }
}

export interface ThreatActor {
  id: string
  name: string
  aliases: string[]
  groups: string[]
  country: string
  motivation: string[]
  targets: string[]
  techniques: string[]
  campaigns: string[]
  lastActivity: Date
}

export interface Campaign {
  id: string
  name: string
  actor: string
  startDate: Date
  endDate?: Date
  targets: string[]
  techniques: string[]
  iocs: string[]
  description: string
  status: 'active' | 'dormant' | 'concluded'
}

export interface ThreatIntelState {
  indicators: ThreatIndicator[]
  threatActors: ThreatActor[]
  campaigns: Campaign[]
  ociConnectionStatus: 'unknown' | 'connected' | 'error'
  loading: boolean
  error: string | null
}

export interface ThreatIntelActions {
  addIndicator: (indicator: ThreatIndicator) => void
  updateIndicator: (id: string, updates: Partial<ThreatIndicator>) => void
  removeIndicator: (id: string) => void
  batchUpdateIndicators: (indicators: ThreatIndicator[]) => void
  setOciConnectionStatus: (status: ThreatIntelState['ociConnectionStatus']) => void
  setThreatIntelLoading: (loading: boolean) => void
  setThreatIntelError: (error: string | null) => void
  clearThreatIntelError: () => void
  addThreatActor: (actor: ThreatActor) => void
  updateThreatActor: (id: string, updates: Partial<ThreatActor>) => void
  addCampaign: (campaign: Campaign) => void
  updateCampaign: (id: string, updates: Partial<Campaign>) => void
}

export type ThreatIntelSlice = ThreatIntelState & ThreatIntelActions

export const createThreatIntelSlice: StateCreator<
  ThreatIntelSlice,
  [],
  [],
  ThreatIntelSlice
> = (set, get) => ({
  // Initial state
  indicators: [],
  threatActors: [],
  campaigns: [],
  ociConnectionStatus: 'unknown',
  loading: false,
  error: null,

  // Actions
  addIndicator: (indicator) => {
    set((state) => ({
      indicators: [indicator, ...state.indicators],
    }))
  },

  updateIndicator: (id, updates) => {
    set((state) => ({
      indicators: state.indicators.map((indicator) =>
        indicator.id === id ? { ...indicator, ...updates } : indicator
      ),
    }))
  },

  removeIndicator: (id) => {
    set((state) => ({
      indicators: state.indicators.filter((indicator) => indicator.id !== id),
    }))
  },

  batchUpdateIndicators: (indicators) => {
    set((state) => {
      const existingIds = new Set(state.indicators.map(i => i.id))
      const newIndicators = indicators.filter(i => !existingIds.has(i.id))
      const updatedIndicators = state.indicators.map(existing => {
        const update = indicators.find(i => i.id === existing.id)
        return update ? { ...existing, ...update } : existing
      })
      return {
        indicators: [...newIndicators, ...updatedIndicators]
      }
    })
  },

  setOciConnectionStatus: (status) => set({ ociConnectionStatus: status }),

  setThreatIntelLoading: (loading) => set({ loading }),

  setThreatIntelError: (error) => set({ error }),

  clearThreatIntelError: () => set({ error: null }),

  addThreatActor: (actor) => {
    set((state) => ({
      threatActors: [actor, ...state.threatActors],
    }))
  },

  updateThreatActor: (id, updates) => {
    set((state) => ({
      threatActors: state.threatActors.map((actor) =>
        actor.id === id ? { ...actor, ...updates } : actor
      ),
    }))
  },

  addCampaign: (campaign) => {
    set((state) => ({
      campaigns: [campaign, ...state.campaigns],
    }))
  },

  updateCampaign: (id, updates) => {
    set((state) => ({
      campaigns: state.campaigns.map((campaign) =>
        campaign.id === id ? { ...campaign, ...updates } : campaign
      ),
    }))
  },
})