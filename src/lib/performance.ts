// Performance optimization utilities

// Debounce function for expensive operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle function for high-frequency events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Intersection Observer for lazy loading
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  })
}

// Virtual scrolling helper
export function getVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  itemCount: number,
  overscan = 5
) {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const end = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )
  
  return { start, end }
}

// Memoization helper
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map()
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}

// Preload component function
export function preloadComponent(importFn: () => Promise<any>) {
  if (typeof window !== 'undefined') {
    // Add a small delay to avoid blocking the main thread
    setTimeout(() => {
      importFn().catch(() => {
        // Ignore errors during preload
      })
    }, 100)
  }
}

// Image lazy loading with fallback
export function createImageLoader(src: string, onLoad?: () => void, onError?: () => void) {
  const img = new Image()
  img.onload = () => onLoad?.()
  img.onerror = () => onError?.()
  img.src = src
  return img
}

// Reduce motion for accessibility
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}