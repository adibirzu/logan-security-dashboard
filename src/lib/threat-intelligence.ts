export interface ThreatIntelResult {
  isMalicious: boolean
  confidence: number
  threatTypes: string[]
}

const ipCache = new Map<string, ThreatIntelResult>()

/**
 * Query the backend threat intelligence API for a list of IPs.
 * Results are cached in-memory for the session.
 */
export async function batchCheckIPThreatIntelligence(ips: string[]): Promise<Map<string, ThreatIntelResult>> {
  const uniqueIps = Array.from(new Set(ips))
  const ipsToQuery = uniqueIps.filter(ip => !ipCache.has(ip))

  if (ipsToQuery.length > 0) {
    try {
      const response = await fetch('/api/threat-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch',
          indicators: ipsToQuery.map(ip => ({ value: ip, type: 'ip' }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.indicators)) {
          for (const item of data.indicators) {
            const result: ThreatIntelResult = {
              isMalicious: item.found || false,
              confidence: item.indicators?.[0]?.confidence || 0,
              threatTypes: item.indicators?.[0]?.threat_types || []
            }
            ipCache.set(item.indicator_value, result)
          }
        }
      } else {
        console.error('Threat intelligence API error:', await response.text())
      }
    } catch (err) {
      console.error('Failed to fetch threat intelligence:', err)
    }
  }

  const result = new Map<string, ThreatIntelResult>()
  uniqueIps.forEach(ip => {
    const info = ipCache.get(ip) || { isMalicious: false, confidence: 0, threatTypes: [] }
    result.set(ip, info)
  })
  return result
}

export function getMaliciousIPStyles(ip: string): { textColor?: string } {
  const info = ipCache.get(ip)
  if (info?.isMalicious) {
    return { textColor: 'text-red-600' }
  }
  return {}
}
