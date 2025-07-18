import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function calculateTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}

export function getRiskLevelColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (level) {
    case 'critical': return 'text-red-700 bg-red-100 border-red-200'
    case 'high': return 'text-orange-700 bg-orange-100 border-orange-200'
    case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200'
    case 'low': return 'text-green-700 bg-green-100 border-green-200'
    default: return 'text-neutral-600 bg-neutral-100 border-neutral-200'
  }
}

export function getSecurityStatusColor(status: string): string {
  switch (status) {
    case 'operational':
    case 'healthy':
      return 'text-green-700 bg-green-100 border-green-200'
    case 'warning':
    case 'degraded':
      return 'text-yellow-700 bg-yellow-100 border-yellow-200'
    case 'critical':
    case 'error':
      return 'text-red-700 bg-red-100 border-red-200'
    case 'info':
      return 'text-blue-700 bg-blue-100 border-blue-200'
    default:
      return 'text-neutral-600 bg-neutral-100 border-neutral-200'
  }
}

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
