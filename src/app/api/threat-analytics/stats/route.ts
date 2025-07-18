import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

async function callPythonScript(scriptName: string, args: string[] = []) {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName)
    
    const escapedArgs = args.map(arg => {
      return `'${arg.replace(/'/g, "\\'")}'`
    })
    
    const command = `python3 "${scriptPath}" ${escapedArgs.join(' ')}`
    
    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        LOGAN_REGION: process.env.NEXT_PUBLIC_LOGAN_REGION || 'eu-frankfurt-1',
        LOGAN_COMPARTMENT_ID: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID || '',
      },
      timeout: 30000
    })
    
    if (stderr) {
      console.warn('Python script warning:', stderr)
    }
    
    return JSON.parse(stdout)
  } catch (error) {
    console.error('Python script error:', error)
    throw error
  }
}

function getTimePeriodMinutes(timeRange: string): number {
  switch (timeRange) {
    case '1h': return 60
    case '6h': return 360
    case '24h': return 1440
    case '7d': return 10080
    case '30d': return 43200
    default: return 1440
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    const timePeriodMinutes = getTimePeriodMinutes(timeRange)

    console.log('Threat Analytics Stats API: Getting stats for', { timeRange, timePeriodMinutes })

    // Get VCN flow threat analytics summary
    const result = await callPythonScript('vcn_analyzer.py', [
      'analyze',
      '--time-period', timePeriodMinutes.toString()
    ])

    if (result.success) {
      return NextResponse.json({
        success: true,
        stats: result.stats || {
          total_threats: 0,
          critical_threats: 0,
          high_threats: 0,
          medium_threats: 0,
          low_threats: 0,
          beacons_detected: 0,
          long_connections: 0,
          dns_tunneling: 0,
          data_exfiltration: 0,
          analysis_time_range: `Last ${timeRange}`
        },
        analysis_timestamp: result.analysis_timestamp
      })
    } else {
      // Return empty stats on error but don't fail completely
      return NextResponse.json({
        success: true,
        stats: {
          total_threats: 0,
          critical_threats: 0,
          high_threats: 0,
          medium_threats: 0,
          low_threats: 0,
          beacons_detected: 0,
          long_connections: 0,
          dns_tunneling: 0,
          data_exfiltration: 0,
          analysis_time_range: `Last ${timeRange}`,
          error: result.error || 'Analysis unavailable'
        },
        analysis_timestamp: new Date().toISOString(),
        warning: result.error || 'Threat analysis data unavailable'
      })
    }
  } catch (error) {
    console.error('Threat Analytics Stats API Error:', error)
    
    // Return graceful fallback
    return NextResponse.json({
      success: true,
      stats: {
        total_threats: 0,
        critical_threats: 0,
        high_threats: 0,
        medium_threats: 0,
        low_threats: 0,
        beacons_detected: 0,
        long_connections: 0,
        dns_tunneling: 0,
        data_exfiltration: 0,
        analysis_time_range: 'Last 24h',
        error: 'Service temporarily unavailable'
      },
      analysis_timestamp: new Date().toISOString(),
      warning: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}