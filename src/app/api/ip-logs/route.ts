import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

async function getIPLogs(ip: string, timeRangeMinutes: number = 1440) {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'logan_client.py')
    
    // Create a comprehensive query to find all logs related to this IP
    const query = `
      * | where 'Source IP' = '${ip}' or 'Destination IP' = '${ip}' or 'IP Address' = '${ip}' or 'Client IP' = '${ip}'
      | fields Time, 'Event Name', 'Log Source', 'Source IP', 'Destination IP', 'Destination Port', Action, 'User Name', 'Event Type'
      | sort -Time
      | head 1000
    `.trim()

    const command = `python3 "${scriptPath}" search --query "${query}" --time-period ${timeRangeMinutes}`
    
    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        LOGAN_REGION: process.env.NEXT_PUBLIC_LOGAN_REGION || 'eu-frankfurt-1',
        LOGAN_COMPARTMENT_ID: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID || '',
      },
      timeout: 60000 // 1 minute timeout
    })
    
    if (stderr) {
      console.warn('IP logs script warning:', stderr)
    }
    
    return JSON.parse(stdout)
  } catch (error) {
    console.error('Error fetching IP logs:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ip = searchParams.get('ip')
    const timeRange = searchParams.get('timeRange') || '24h'
    
    if (!ip) {
      return NextResponse.json({
        success: false,
        error: 'IP address is required'
      }, { status: 400 })
    }

    // Validate IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(ip)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid IP address format'
      }, { status: 400 })
    }

    // Convert time range to minutes
    const getTimeRangeMinutes = (range: string): number => {
      switch (range) {
        case '1h': return 60
        case '6h': return 360
        case '24h': return 1440
        case '7d': return 10080
        case '30d': return 43200
        default: return 1440
      }
    }

    const timeRangeMinutes = getTimeRangeMinutes(timeRange)
    const result = await getIPLogs(ip, timeRangeMinutes)

    if (result.success) {
      // Categorize the logs by type
      const logs = result.results || []
      const categorized = {
        network: logs.filter((log: any) => 
          log['Log Source']?.includes('VCN') || 
          log['Event Name']?.includes('Connection') ||
          log['Event Name']?.includes('Network')
        ),
        authentication: logs.filter((log: any) => 
          log['Event Name']?.includes('Authentication') || 
          log['Event Name']?.includes('Login') ||
          log['Event Name']?.includes('Logon')
        ),
        security: logs.filter((log: any) => 
          log['Log Source']?.includes('Security') ||
          log['Event Name']?.includes('Security') ||
          log['Event Name']?.includes('Alert')
        ),
        other: logs.filter((log: any) => 
          !log['Log Source']?.includes('VCN') && 
          !log['Event Name']?.includes('Connection') &&
          !log['Event Name']?.includes('Network') &&
          !log['Event Name']?.includes('Authentication') &&
          !log['Event Name']?.includes('Login') &&
          !log['Event Name']?.includes('Logon') &&
          !log['Log Source']?.includes('Security') &&
          !log['Event Name']?.includes('Security') &&
          !log['Event Name']?.includes('Alert')
        )
      }

      return NextResponse.json({
        success: true,
        ip: ip,
        timeRange: timeRange,
        totalLogs: logs.length,
        categories: {
          network: categorized.network.length,
          authentication: categorized.authentication.length,
          security: categorized.security.length,
          other: categorized.other.length
        },
        logs: categorized,
        allLogs: logs
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fetch IP logs'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('IP logs API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}