/**
 * Safe formatting utilities that handle undefined/null values
 */

export function safeToLocaleString(value: number | undefined | null, fallback: string = '0'): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback
  }
  return value.toLocaleString()
}

export function safeDateToLocaleString(date: string | Date | number | undefined | null, fallback: string = 'Unknown'): string {
  if (!date) {
    return fallback
  }
  
  try {
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return fallback
    }
    return dateObj.toLocaleString()
  } catch (error) {
    console.warn('Failed to format date:', date, error)
    return fallback
  }
}

export function formatBytes(bytes: number | undefined | null): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) {
    return '0 B'
  }
  
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDuration(hours: number | undefined | null): string {
  if (hours === null || hours === undefined || isNaN(hours)) {
    return '0m'
  }
  
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

export function formatNumber(value: number | undefined | null, fallback: string = '0'): string {
  return safeToLocaleString(value, fallback)
}