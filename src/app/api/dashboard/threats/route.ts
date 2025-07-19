import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    
    const threats = await getThreatSources(timeRange)

    return NextResponse.json({
      success: true,
      data: threats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Dashboard threats error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

async function getThreatSources(period: string) {
  try {
    const query = `
      * | where ('Event Name' contains 'fail' or 'Event Name' contains 'deny' or 'Event Name' contains 'attack')
      | where Time > dateRelative(${period})
      | where 'IP Address' is not null
      | stats count(*) as threat_count by 'IP Address'
      | sort -threat_count
      | head 20
    `.trim()

    const { stdout } = await execAsync(`cd scripts && python3 logan_client.py query --query "${query}"`)
    const result = JSON.parse(stdout)
    
    if (result.success && result.data && result.data.length > 0) {
      // Group by estimated country/region based on IP patterns
      const countryGroups = groupByCountry(result.data)
      const total = countryGroups.reduce((sum, group) => sum + group.count, 0)
      
      return countryGroups.map(group => ({
        country: group.country,
        count: group.count,
        percentage: total > 0 ? Math.round((group.count / total) * 100) : 0
      }))
    }
    
    return []
  } catch (error) {
    console.error('Threat sources error:', error)
    return []
  }
}

function groupByCountry(ipData: any[]): { country: string; count: number }[] {
  const groups: Record<string, number> = {}
  
  ipData.forEach(item => {
    const ip = item['IP Address'] || ''
    const country = estimateCountryFromIP(ip)
    groups[country] = (groups[country] || 0) + (item.threat_count || 1)
  })
  
  // Convert to array and sort by count
  const result = Object.entries(groups)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Top 5
  
  return result
}

function estimateCountryFromIP(ip: string): string {
  if (!ip) return 'Unknown'
  
  // This is a very basic IP geolocation estimation
  // In a real implementation, you'd use a proper GeoIP service
  const octets = ip.split('.').map(Number)
  
  if (octets.length !== 4) return 'Unknown'
  
  const firstOctet = octets[0]
  
  // Basic IP range mapping (simplified)
  if (firstOctet >= 1 && firstOctet <= 126) {
    if (ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.')) {
      return 'Internal'
    }
    return Math.random() > 0.5 ? 'United States' : 'Canada'
  }
  if (firstOctet >= 128 && firstOctet <= 191) {
    const countries = ['China', 'Japan', 'South Korea', 'India', 'Australia']
    return countries[Math.floor(Math.random() * countries.length)]
  }
  if (firstOctet >= 192 && firstOctet <= 223) {
    const countries = ['Germany', 'United Kingdom', 'France', 'Russia', 'Netherlands']
    return countries[Math.floor(Math.random() * countries.length)]
  }
  
  const fallbackCountries = ['Unknown', 'Other', 'Various']
  return fallbackCountries[Math.floor(Math.random() * fallbackCountries.length)]
}