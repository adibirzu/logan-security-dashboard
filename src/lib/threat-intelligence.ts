/**
 * Threat Intelligence Utilities
 * Handles detection and styling of malicious IPs based on threat intelligence data
 */

interface ThreatIntelData {
  success: boolean
  found: boolean
  indicators?: Array<{
    id: string
    value: string
    type: string
    confidence: number
    threat_types: string[]
    attributes: Array<{
      name: string
      value: string
      attribution: string
    }>
    time_created?: string
    time_updated?: string
    time_last_seen?: string
  }>
}

// Cache for IP threat intelligence results to avoid repeated API calls
const threatIntelCache = new Map<string, { 
  isMalicious: boolean
  confidence: number
  threatTypes: string[]
  lastChecked: number
}>()

// Cache duration: 30 minutes
const CACHE_DURATION = 30 * 60 * 1000

/**
 * Check if an IP is malicious based on cached threat intelligence data
 */
export function isMaliciousIP(ip: string): boolean {
  const cached = threatIntelCache.get(ip)
  if (cached && Date.now() - cached.lastChecked < CACHE_DURATION) {
    return cached.isMalicious
  }
  return false
}

/**
 * Get threat intelligence details for an IP
 */
export function getThreatIntelDetails(ip: string): {
  isMalicious: boolean
  confidence: number
  threatTypes: string[]
} | null {
  const cached = threatIntelCache.get(ip)
  if (cached && Date.now() - cached.lastChecked < CACHE_DURATION) {
    return {
      isMalicious: cached.isMalicious,
      confidence: cached.confidence,
      threatTypes: cached.threatTypes
    }
  }
  return null
}

/**
 * Check an IP against OCI Threat Intelligence and cache the result
 */
export async function checkIPThreatIntelligence(ip: string): Promise<{
  isMalicious: boolean
  confidence: number
  threatTypes: string[]
}> {
  try {
    // Check cache first
    const cached = threatIntelCache.get(ip)
    if (cached && Date.now() - cached.lastChecked < CACHE_DURATION) {
      return {
        isMalicious: cached.isMalicious,
        confidence: cached.confidence,
        threatTypes: cached.threatTypes
      }
    }

    // Call threat intelligence API
    const response = await fetch('/api/threat-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'check',
        indicator: ip,
        type: 'ip'
      })
    })

    const data: ThreatIntelData = await response.json()
    
    const result = {
      isMalicious: data.success && data.found && (data.indicators?.length || 0) > 0,
      confidence: data.indicators?.[0]?.confidence || 0,
      threatTypes: data.indicators?.[0]?.threat_types || []
    }

    // Cache the result
    threatIntelCache.set(ip, {
      ...result,
      lastChecked: Date.now()
    })

    return result
  } catch (error) {
    console.error('Error checking IP threat intelligence:', error)
    return {
      isMalicious: false,
      confidence: 0,
      threatTypes: []
    }
  }
}

/**
 * Batch check multiple IPs against threat intelligence
 */
export async function batchCheckIPThreatIntelligence(ips: string[]): Promise<Map<string, {
  isMalicious: boolean
  confidence: number
  threatTypes: string[]
}>> {
  const results = new Map<string, {
    isMalicious: boolean
    confidence: number
    threatTypes: string[]
  }>()

  // Filter out already cached IPs
  const uncachedIPs = ips.filter(ip => {
    const cached = threatIntelCache.get(ip)
    if (cached && Date.now() - cached.lastChecked < CACHE_DURATION) {
      results.set(ip, {
        isMalicious: cached.isMalicious,
        confidence: cached.confidence,
        threatTypes: cached.threatTypes
      })
      return false
    }
    return true
  })

  if (uncachedIPs.length === 0) {
    return results
  }

  try {
    const response = await fetch('/api/threat-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'batch',
        indicators: uncachedIPs.map(ip => ({ value: ip, type: 'ip' }))
      })
    })

    const data = await response.json()
    
    if (data.success && data.indicators) {
      data.indicators.forEach((result: any) => {
        if (result.indicator_value) {
          const ipResult = {
            isMalicious: result.found && (result.indicators?.length || 0) > 0,
            confidence: result.indicators?.[0]?.confidence || 0,
            threatTypes: result.indicators?.[0]?.threat_types || []
          }

          results.set(result.indicator_value, ipResult)
          
          // Cache the result
          threatIntelCache.set(result.indicator_value, {
            ...ipResult,
            lastChecked: Date.now()
          })
        }
      })
    }

    // Add default results for IPs not found in response
    uncachedIPs.forEach(ip => {
      if (!results.has(ip)) {
        const defaultResult = {
          isMalicious: false,
          confidence: 0,
          threatTypes: []
        }
        results.set(ip, defaultResult)
        threatIntelCache.set(ip, {
          ...defaultResult,
          lastChecked: Date.now()
        })
      }
    })

  } catch (error) {
    console.error('Error batch checking IP threat intelligence:', error)
    
    // Add default results for all uncached IPs on error
    uncachedIPs.forEach(ip => {
      const defaultResult = {
        isMalicious: false,
        confidence: 0,
        threatTypes: []
      }
      results.set(ip, defaultResult)
    })
  }

  return results
}

/**
 * Get CSS classes for styling malicious IPs
 */
export function getMaliciousIPStyles(ip: string): {
  textColor: string
  backgroundColor: string
  borderColor: string
  badge: string
} {
  const threat = getThreatIntelDetails(ip)
  
  if (threat?.isMalicious) {
    return {
      textColor: 'text-red-700',
      backgroundColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badge: 'bg-red-100 text-red-800 border-red-200'
    }
  }
  
  return {
    textColor: '',
    backgroundColor: '',
    borderColor: '',
    badge: ''
  }
}

/**
 * Clear threat intelligence cache (useful for testing or forcing refresh)
 */
export function clearThreatIntelCache(): void {
  threatIntelCache.clear()
}

/**
 * Get cache statistics for debugging
 */
export function getThreatIntelCacheStats(): {
  size: number
  maliciousCount: number
  oldestEntry: number | null
  newestEntry: number | null
} {
  let maliciousCount = 0
  let oldestEntry: number | null = null
  let newestEntry: number | null = null

  threatIntelCache.forEach(entry => {
    if (entry.isMalicious) maliciousCount++
    
    if (oldestEntry === null || entry.lastChecked < oldestEntry) {
      oldestEntry = entry.lastChecked
    }
    
    if (newestEntry === null || entry.lastChecked > newestEntry) {
      newestEntry = entry.lastChecked
    }
  })

  return {
    size: threatIntelCache.size,
    maliciousCount,
    oldestEntry,
    newestEntry
  }
}