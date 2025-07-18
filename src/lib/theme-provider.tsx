'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>({
  theme: 'system',
  setTheme: () => null,
})

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'logan-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme
    if (storedTheme) {
      setTheme(storedTheme)
    }
    setMounted(true)
  }, [storageKey])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }

    // Apply Oracle-specific theme attributes
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.setAttribute('data-theme', 'light')
    }

    localStorage.setItem(storageKey, theme)
  }, [theme, storageKey])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Oracle theme utilities
export const getOracleThemeColors = (theme: Theme) => {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  return {
    primary: isDark ? '#ff5733' : '#C74634',
    secondary: isDark ? '#38bdf8' : '#0ea5e9',
    background: isDark ? '#0a0a0a' : '#ffffff',
    foreground: isDark ? '#f9fafb' : '#111827',
    card: isDark ? '#111827' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    critical: '#dc2626',
  }
}

export const oracleThemeConfig = {
  colors: {
    light: {
      primary: '#C74634',
      secondary: '#0ea5e9',
      accent: '#0ea5e9',
      background: '#ffffff',
      foreground: '#111827',
      card: '#ffffff',
      border: '#e5e7eb',
      muted: '#f9fafb',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#dc2626',
    },
    dark: {
      primary: '#ff5733',
      secondary: '#38bdf8',
      accent: '#38bdf8',
      background: '#0a0a0a',
      foreground: '#f9fafb',
      card: '#111827',
      border: '#374151',
      muted: '#1f2937',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#dc2626',
    },
  },
  animations: {
    transition: 'all 0.3s ease-in-out',
    hover: 'all 0.2s ease-in-out',
  },
  shadows: {
    oracle: '0 4px 6px -1px rgba(199, 70, 52, 0.1), 0 2px 4px -1px rgba(199, 70, 52, 0.06)',
    oracleLg: '0 10px 15px -3px rgba(199, 70, 52, 0.1), 0 4px 6px -2px rgba(199, 70, 52, 0.05)',
  },
}