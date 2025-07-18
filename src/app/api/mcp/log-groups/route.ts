import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

async function callPythonScript(scriptName: string, args: string[] = []) {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName)
    
    // Use execFile which properly handles arguments without shell interpretation
    const { stdout, stderr } = await execFileAsync('python3', [scriptPath, ...args], {
      env: {
        ...process.env,
        LOGAN_REGION: process.env.NEXT_PUBLIC_LOGAN_REGION || 'eu-frankfurt-1',
        LOGAN_COMPARTMENT_ID: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID || '',
      },
      timeout: 30000 // 30 second timeout
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timePeriod = searchParams.get('time_period') || '1440' // Default to 24 hours
    
    // Convert minutes to the format expected by Python script
    const timePeriodMinutes = parseInt(timePeriod)
    
    console.log('Log Groups API: time_period=', timePeriodMinutes)
    
    // Execute log sources listing using Python logan client
    const result = await callPythonScript('logan_client.py', ['list_sources', '--time-period', timePeriodMinutes.toString()])

    if (result.success) {
      const sources = (result.sources || []).map((source: any) => ({
        name: source.name || source.source || 'Unknown',
        record_count: source.count || source.events || 0,
        last_activity: source.last_activity || new Date().toISOString(),
        status: source.status || (source.count > 0 ? 'active' : 'inactive'),
        description: source.description || `Log source: ${source.name || source.source}`
      }))

      return NextResponse.json({
        success: true,
        sources: sources,
        total: result.total_sources || sources.length || 0,
        time_period_minutes: timePeriodMinutes,
        note: sources.length > 0 ? 'Real data from OCI Logging Analytics' : 'No data found for the selected time period'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to list log sources'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Log Groups Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      sources: [],
      total: 0
    }, { status: 500 })
  }
}
