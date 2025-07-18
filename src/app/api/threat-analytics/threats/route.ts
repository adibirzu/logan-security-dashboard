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
      timeout: 45000 // 45 second timeout for threat analysis
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
    const severity = searchParams.get('severity') || 'all'
    const type = searchParams.get('type') || 'all'
    const sortBy = searchParams.get('sortBy') || 'score'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const timePeriodMinutes = getTimePeriodMinutes(timeRange)

    console.log('Threat Analytics API: Getting threats for', { timeRange, severity, type, timePeriodMinutes })

    // Get comprehensive VCN flow threat analysis
    const result = await callPythonScript('vcn_analyzer.py', [
      'analyze',
      '--time-period', timePeriodMinutes.toString()
    ])

    if (result.success) {
      let threats = result.threats || []

      // Filter by severity
      if (severity !== 'all') {
        threats = threats.filter((threat: any) => threat.severity === severity)
      }

      // Filter by type
      if (type !== 'all') {
        threats = threats.filter((threat: any) => threat.type === type)
      }

      // Sort threats
      threats.sort((a: any, b: any) => {
        let aValue = a[sortBy] || 0
        let bValue = b[sortBy] || 0

        // Handle numeric sorting
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
        }

        // Handle string sorting
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'desc' 
            ? bValue.localeCompare(aValue)
            : aValue.localeCompare(bValue)
        }

        return 0
      })

      return NextResponse.json({
        success: true,
        threats: threats,
        total: threats.length,
        filters: { timeRange, severity, type, sortBy, sortOrder },
        analysis_timestamp: result.analysis_timestamp
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Threat analysis failed',
        threats: []
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Threat Analytics API Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      threats: []
    }, { status: 500 })
  }
}