import { StateCreator } from 'zustand'

export interface AppState {
  theme: 'light' | 'dark' | 'system'
  loading: boolean
  error: string | null
  notifications: Notification[]
  sidebarCollapsed: boolean
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

export interface AppActions {
  setTheme: (theme: AppState['theme']) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export type AppSlice = AppState & AppActions

export const createAppSlice: StateCreator<
  AppSlice,
  [],
  [],
  AppSlice
> = (set, get) => ({
  // Initial state
  theme: 'system',
  loading: false,
  error: null,
  notifications: [],
  sidebarCollapsed: false,

  // Actions
  setTheme: (theme) => set({ theme }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
  
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    }
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep only latest 50
    }))
  },
  
  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }))
  },
  
  clearNotifications: () => set({ notifications: [] }),
  
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
  },
  
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
})