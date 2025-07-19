import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createAppSlice, AppSlice } from './slices/appSlice'
import { createThreatIntelSlice, ThreatIntelSlice } from './slices/threatIntelSlice'
import { createQuerySlice, QuerySlice } from './slices/querySlice'
import { createSecuritySlice, SecuritySlice } from './slices/securitySlice'

export type RootState = AppSlice & 
  ThreatIntelSlice & 
  QuerySlice & 
  SecuritySlice

export const useStore = create<RootState>()(
  devtools(
    (...a) => ({
      ...createAppSlice(...a),
      ...createThreatIntelSlice(...a),
      ...createQuerySlice(...a),
      ...createSecuritySlice(...a),
    }),
    {
      name: 'logan-security-store',
    }
  )
)

// Selector hooks for better performance
export const useAppState = () => useStore((state) => ({
  theme: state.theme,
  loading: state.loading,
  error: state.error,
  setTheme: state.setTheme,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError,
}))

export const useThreatIntel = () => useStore((state) => ({
  indicators: state.indicators,
  threatActors: state.threatActors,
  campaigns: state.campaigns,
  ociConnectionStatus: state.ociConnectionStatus,
  addIndicator: state.addIndicator,
  updateIndicator: state.updateIndicator,
  removeIndicator: state.removeIndicator,
  setOciConnectionStatus: state.setOciConnectionStatus,
  batchUpdateIndicators: state.batchUpdateIndicators,
}))

export const useQuery = () => useStore((state) => ({
  queryHistory: state.queryHistory,
  savedQueries: state.savedQueries,
  currentQuery: state.currentQuery,
  queryResults: state.queryResults,
  timeRange: state.timeRange,
  addToHistory: state.addToHistory,
  saveQuery: state.saveQuery,
  setCurrentQuery: state.setCurrentQuery,
  setQueryResults: state.setQueryResults,
  setTimeRange: state.setTimeRange,
  clearQueryResults: state.clearQueryResults,
}))

export const useSecurity = () => useStore((state) => ({
  securityEvents: state.securityEvents,
  alerts: state.alerts,
  incidents: state.incidents,
  securityMetrics: state.securityMetrics,
  addSecurityEvent: state.addSecurityEvent,
  addAlert: state.addAlert,
  updateIncident: state.updateIncident,
  updateSecurityMetrics: state.updateSecurityMetrics,
  clearSecurityEvents: state.clearSecurityEvents,
}))