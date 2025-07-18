import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

async function callPythonScript(scriptName: string, args: string[] = []) {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName)
    
    // Properly escape arguments that contain spaces
    const escapedArgs = args.map(arg => {
      if (arg.includes(' ')) {
        return `"${arg.replace(/"/g, '\\"')}"` // Escape quotes and wrap in quotes
      }
      return arg
    })
    
    const command = `python3 "${scriptPath}" ${escapedArgs.join(' ')}`
    
    const { stdout, stderr } = await execAsync(command, {
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
  const { searchParams } = new URL(request.url)
  const eventType = searchParams.get('eventType')
  const severity = searchParams.get('severity') || 'all'
  const timeRange = parseInt(searchParams.get('timeRange') || '60')

  try {
    // Get security events from Python security analyzer
    const result = await callPythonScript('security_analyzer.py', [
      'events',
      '--severity', severity,
      '--time-period', timeRange.toString()
    ])

    if (result.success) {
      let events = result.events || []

      // Filter by event type if specified
      if (eventType && eventType !== 'all') {
        events = events.filter((event: any) => 
          event.type?.toLowerCase().includes(eventType.toLowerCase()) ||
          event.message?.toLowerCase().includes(eventType.toLowerCase())
        )
      }

      return NextResponse.json({
        events: events,
        total: events.length,
        timeRange,
        filters: { eventType, severity }
      })
    } else {
      throw new Error(result.error || 'Failed to get security events')
    }
  } catch (error) {
    console.error('Security Events Error:', error)
    return NextResponse.json({
      events: [],
      total: 0,
      timeRange,
      filters: { eventType, severity },
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
