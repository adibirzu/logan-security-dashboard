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
    
    // Get dashboard statistics from Python security analyzer
    const result = await callPythonScript('security_analyzer.py', ['stats', '--time-period', timePeriod])
    
    if (result.success) {
      return NextResponse.json({
        totalEvents: result.total_events || 0,
        criticalAlerts: result.critical_alerts || 0,
        resolvedThreats: result.resolved_threats || 0,
        activeMonitoring: result.active_monitoring || false,
        lastUpdate: new Date().toISOString(),
        threatLevel: result.threat_level || 'unknown',
        systemHealth: result.system_health || 0,
        failedLogins: result.failed_logins || 0,
        privilegeEscalations: result.privilege_escalations || 0,
        blockedConnections: result.blocked_connections || 0,
        uniqueSources: result.unique_sources || 0,
        success: true,
        connectionStatus: result.connection_status || 'unknown'
      })
    } else {
      throw new Error(result.error || 'Failed to get dashboard stats')
    }

  } catch (error) {
    console.error('Dashboard Stats Error:', error)
    return NextResponse.json({
      totalEvents: 0,
      criticalAlerts: 0,
      resolvedThreats: 0,
      activeMonitoring: false,
      lastUpdate: new Date().toISOString(),
      threatLevel: 'unknown',
      systemHealth: 0,
      failedLogins: 0,
      privilegeEscalations: 0,
      blockedConnections: 0,
      uniqueSources: 0,
      success: false,
      connectionStatus: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
