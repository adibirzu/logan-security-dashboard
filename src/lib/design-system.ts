/**
 * Logan Security Dashboard Design System
 * Modern UX baseline with comprehensive design tokens and utilities
 */

// Color System - Security-focused palette
export const colors = {
  // Primary brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },
  
  // Security status colors
  security: {
    critical: '#dc2626',    // Red 600
    high: '#ea580c',       // Orange 600
    medium: '#ca8a04',     // Yellow 600
    low: '#16a34a',        // Green 600
    info: '#0284c7',       // Sky 600
    success: '#059669',    // Emerald 600
  },
  
  // Neutral grays for backgrounds and text
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },
  
  // Accent colors for data visualization
  accent: {
    blue: '#3b82f6',
    indigo: '#6366f1',
    purple: '#8b5cf6',
    pink: '#ec4899',
    rose: '#f43f5e',
    orange: '#f97316',
    amber: '#f59e0b',
    yellow: '#eab308',
    lime: '#84cc16',
    green: '#22c55e',
    emerald: '#10b981',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    sky: '#0ea5e9'
  }
}

// Typography Scale
export const typography = {
  fonts: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
    display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif']
  },
  
  scale: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
    '7xl': '4.5rem',   // 72px
  },
  
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800'
  }
}

// Spacing System (8pt grid)
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem'       // 384px
}

// Border Radius Scale
export const radius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px'
}

// Shadow System
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: '0 0 #0000'
}

// Z-Index Scale
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modalBackdrop: '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070'
}

// Animation & Transitions
export const animations = {
  durations: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms'
  },
  
  easings: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
}

// Breakpoint System
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
}

// Component Design Tokens
export const components = {
  card: {
    padding: spacing[6],
    radius: radius.lg,
    shadow: shadows.sm,
    borderWidth: '1px'
  },
  
  button: {
    paddingX: spacing[4],
    paddingY: spacing[2],
    radius: radius.md,
    fontSize: typography.scale.sm,
    fontWeight: typography.weights.medium
  },
  
  input: {
    padding: spacing[3],
    radius: radius.md,
    fontSize: typography.scale.sm,
    borderWidth: '1px'
  },
  
  badge: {
    paddingX: spacing[2],
    paddingY: spacing[1],
    radius: radius.base,
    fontSize: typography.scale.xs,
    fontWeight: typography.weights.medium
  }
}

// Utility Functions
export const utils = {
  // Get color with opacity
  withOpacity: (color: string, opacity: number) => {
    return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
  },
  
  // Generate CSS custom properties
  toCSSVariables: (obj: Record<string, any>, prefix = '--') => {
    const variables: Record<string, string> = {}
    
    const flatten = (obj: any, path = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = path ? `${path}-${key}` : key
        
        if (typeof value === 'object' && value !== null) {
          flatten(value, newPath)
        } else {
          variables[`${prefix}${newPath}`] = String(value)
        }
      })
    }
    
    flatten(obj)
    return variables
  }
}

// Security-specific design patterns
export const securityPatterns = {
  // Severity level styling
  severity: {
    critical: {
      bg: colors.security.critical,
      text: colors.neutral[0],
      border: colors.security.critical,
      icon: 'alert-triangle'
    },
    high: {
      bg: colors.security.high,
      text: colors.neutral[0],
      border: colors.security.high,
      icon: 'alert-circle'
    },
    medium: {
      bg: colors.security.medium,
      text: colors.neutral[900],
      border: colors.security.medium,
      icon: 'info'
    },
    low: {
      bg: colors.security.low,
      text: colors.neutral[0],
      border: colors.security.low,
      icon: 'check-circle'
    }
  },
  
  // Status indicators
  status: {
    online: {
      bg: colors.security.success,
      text: colors.neutral[0],
      pulse: true
    },
    offline: {
      bg: colors.neutral[500],
      text: colors.neutral[0],
      pulse: false
    },
    warning: {
      bg: colors.security.medium,
      text: colors.neutral[900],
      pulse: true
    },
    error: {
      bg: colors.security.critical,
      text: colors.neutral[0],
      pulse: true
    }
  }
}

const designSystem = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  zIndex,
  animations,
  breakpoints,
  components,
  utils,
  securityPatterns
}

export default designSystem