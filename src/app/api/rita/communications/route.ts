import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { getTimePeriodMinutes, parseCustomTimeRange } from '@/lib/timeUtils'

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
      timeout: 120000, // 2 minute timeout for large datasets
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large responses
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

function getTimePeriodMinutesWithCustom(timeRange: string): number {
  // First try the standard time ranges
  const standardMinutes = getTimePeriodMinutes(timeRange);
  if (standardMinutes !== 60 || timeRange === '1h') {
    return standardMinutes;
  }
  
  // If not found, try parsing as custom range
  const customMinutes = parseCustomTimeRange(timeRange);
  return customMinutes || 1440; // Default to 24h
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    const timePeriodMinutes = getTimePeriodMinutesWithCustom(timeRange)

    console.log('RITA IP Communications API: Analyzing communications for', { timeRange, timePeriodMinutes })

    // Get IP communications analysis
    const result = await callPythonScript('rita_simple.py', [
      'communications',
      '--time-period', timePeriodMinutes.toString()
    ])

    if (result.success) {
      return NextResponse.json({
        success: true,
        ip_communications: result.ip_communications || [],
        total_communications: result.total_communications || 0,
        analysis_timestamp: result.analysis_timestamp,
        time_range: timeRange
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'IP communications analysis failed',
        ip_communications: []
      }, { status: 500 })
    }
  } catch (error) {
    console.error('RITA IP Communications API Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      ip_communications: []
    }, { status: 500 })
  }
}