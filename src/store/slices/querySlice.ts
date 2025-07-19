import { StateCreator } from 'zustand'

export interface QueryResult {
  id: string
  query: string
  timestamp: Date
  duration: number
  recordCount: number
  data: any[]
  error?: string
}

export interface SavedQuery {
  id: string
  name: string
  query: string
  description: string
  category: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  favorite: boolean
}

export interface TimeRange {
  type: 'preset' | 'custom'
  preset?: '1h' | '4h' | '24h' | '48h' | '7d'
  custom?: {
    start: Date
    end: Date
  }
}

export interface QueryState {
  queryHistory: QueryResult[]
  savedQueries: SavedQuery[]
  currentQuery: string
  queryResults: QueryResult | null
  timeRange: TimeRange
  loading: boolean
  error: string | null
}

export interface QueryActions {
  addToHistory: (result: QueryResult) => void
  clearHistory: () => void
  saveQuery: (query: SavedQuery) => void
  updateSavedQuery: (id: string, updates: Partial<SavedQuery>) => void
  deleteSavedQuery: (id: string) => void
  setCurrentQuery: (query: string) => void
  setQueryResults: (results: QueryResult | null) => void
  setTimeRange: (timeRange: TimeRange) => void
  clearQueryResults: () => void
  setQueryLoading: (loading: boolean) => void
  setQueryError: (error: string | null) => void
  clearQueryError: () => void
  toggleQueryFavorite: (id: string) => void
}

export type QuerySlice = QueryState & QueryActions

export const createQuerySlice: StateCreator<
  QuerySlice,
  [],
  [],
  QuerySlice
> = (set, get) => ({
  // Initial state
  queryHistory: [],
  savedQueries: [],
  currentQuery: '',
  queryResults: null,
  timeRange: { type: 'preset', preset: '24h' },
  loading: false,
  error: null,

  // Actions
  addToHistory: (result) => {
    set((state) => ({
      queryHistory: [result, ...state.queryHistory].slice(0, 100), // Keep only latest 100
    }))
  },

  clearHistory: () => set({ queryHistory: [] }),

  saveQuery: (query) => {
    set((state) => ({
      savedQueries: [query, ...state.savedQueries],
    }))
  },

  updateSavedQuery: (id, updates) => {
    set((state) => ({
      savedQueries: state.savedQueries.map((query) =>
        query.id === id 
          ? { ...query, ...updates, updatedAt: new Date() } 
          : query
      ),
    }))
  },

  deleteSavedQuery: (id) => {
    set((state) => ({
      savedQueries: state.savedQueries.filter((query) => query.id !== id),
    }))
  },

  setCurrentQuery: (query) => set({ currentQuery: query }),

  setQueryResults: (results) => set({ queryResults: results }),

  setTimeRange: (timeRange) => set({ timeRange }),

  clearQueryResults: () => set({ queryResults: null }),

  setQueryLoading: (loading) => set({ loading }),

  setQueryError: (error) => set({ error }),

  clearQueryError: () => set({ error: null }),

  toggleQueryFavorite: (id) => {
    set((state) => ({
      savedQueries: state.savedQueries.map((query) =>
        query.id === id ? { ...query, favorite: !query.favorite } : query
      ),
    }))
  },
})