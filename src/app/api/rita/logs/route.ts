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
      timeout: 45000 // 45 second timeout for log retrieval
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
    const selectionType = searchParams.get('selectionType')
    const selectionValue = searchParams.get('selectionValue')
    const timeRange = searchParams.get('timeRange') || '1h'
    const timePeriodMinutes = getTimePeriodMinutes(timeRange)

    if (!selectionType || !selectionValue) {
      return NextResponse.json({
        success: false,
        error: 'Selection type and value are required'
      }, { status: 400 })
    }

    console.log('RITA Logs API: Getting logs for selection', { 
      selectionType, 
      selectionValue, 
      timeRange, 
      timePeriodMinutes 
    })

    // Get logs for the specific selection
    const result = await callPythonScript('rita_simple.py', [
      'logs',
      '--time-period', timePeriodMinutes.toString(),
      '--selection-type', selectionType,
      '--selection-value', selectionValue
    ])

    if (result.success) {
      return NextResponse.json({
        success: true,
        logs: result.logs || [],
        total_logs: result.total_logs || 0,
        selection_type: result.selection_type,
        selection_value: result.selection_value,
        analysis_timestamp: result.analysis_timestamp,
        time_range: timeRange
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Log retrieval failed',
        logs: []
      }, { status: 500 })
    }
  } catch (error) {
    console.error('RITA Logs API Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: []
    }, { status: 500 })
  }
}