import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

async function callPythonScript(scriptName: string, args: string[] = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName)
    
    const pythonProcess = spawn('python3', [scriptPath, ...args], {
      env: {
        ...process.env,
        LOGAN_REGION: process.env.NEXT_PUBLIC_LOGAN_REGION || 'eu-frankfurt-1',
        LOGAN_COMPARTMENT_ID: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID || '',
      }
    })
    
    let outputData = ''
    let errorData = ''
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString()
    })
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString()
    })
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorData)
        reject(new Error(`Command failed: python3 "${scriptPath}" ${args.join(' ')}\n${errorData}`))
        return
      }
      
      try {
        const result = JSON.parse(outputData)
        resolve(result)
      } catch (parseError) {
        console.error('Failed to parse output:', outputData)
        reject(new Error('Invalid response from Python script'))
      }
    })
    
    pythonProcess.on('error', (error) => {
      console.error('Failed to spawn Python process:', error)
      reject(error)
    })
    
    // Set a timeout
    setTimeout(() => {
      pythonProcess.kill()
      reject(new Error('Python script timeout'))
    }, 30000)
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { ip, timeRange = 60 } = body

    if (!ip) {
      return NextResponse.json({ 
        success: false, 
        error: 'IP address is required' 
      }, { status: 400 })
    }

    // Build the query for IP logs from all sources
    // Query for logs where the IP appears as source or destination
    const query = `('Source IP' = '${ip}' or 'Destination IP' = '${ip}' or 'IP Address' = '${ip}' or 'Host IP Address (Client)' = '${ip}') | head 500`
    
    console.log('Fetching IP logs for:', ip, 'with query:', query)

    // Use the MCP query API through Python script
    const result = await callPythonScript('logan_client.py', [
      'query',
      '--query', query,
      '--time-period', timeRange.toString()
    ])

    const typedResult = result as any
    if (typedResult.success) {
      // Process the results to extract relevant log information
      const logs = (typedResult.results || []).map((log: any) => {
        const logEntry: any = {
          time: log.Time || log.timestamp || new Date().toISOString(),
          logSource: log['Log Source'] || 'Unknown',
          type: determineLogType(log),
          raw: log
        }

        // Extract specific fields based on log source
        if (log['Log Source'] === 'OCI VCN Flow Unified Schema Logs') {
          logEntry.sourceIP = log['Source IP']
          logEntry.destIP = log['Destination IP']
          logEntry.sourcePort = log['Source Port']
          logEntry.destPort = log['Destination Port']
          logEntry.protocol = log.Protocol || log.protocol
          logEntry.action = log.Action || log.action || 'ACCEPT'
          logEntry.bytes = log['Content Size Out'] || log.bytes || 0
          logEntry.packets = log.packets || 0
          logEntry.role = log['Source IP'] === ip ? 'Source' : 'Destination'
        } else if (log['Log Source'] === 'OCI Audit Logs') {
          logEntry.eventName = log['Event Name'] || log.event_name
          logEntry.principal = log['Principal Name'] || log.principal
          logEntry.targetResource = log['Target Resource'] || log.target_resource
        } else if (log['Log Source'] === 'OCI Load Balancer Access Logs') {
          logEntry.method = log['Request Method'] || log.method
          logEntry.url = log['Request URL'] || log.url || log.path
          logEntry.status = log['HTTP Status'] || log.status_code
          logEntry.backendIP = log['Backend IP'] || log.backend_ip
          logEntry.responseTime = log['Response Time'] || log.response_time
        } else if (log['Log Source'] === 'OCI WAF Logs') {
          logEntry.method = log['Request Method'] || log.method
          logEntry.url = log['Request URL'] || log.url || log.path
          logEntry.status = log['HTTP Status'] || log.status_code
          logEntry.action = log.Action || log.action || 'ALLOW'
          logEntry.ruleId = log['Rule ID'] || log.rule_id
          logEntry.countryCode = log['Country Code'] || log.country_code
          logEntry.userAgent = log['User Agent'] || log.user_agent
          logEntry.xForwardedFor = log['X-Forwarded-For'] || log.x_forwarded_for
        }

        return logEntry
      })

      // Get unique log sources
      const logSources = [...new Set(logs.map((log: any) => log.logSource))]

      return NextResponse.json({
        success: true,
        logs,
        totalLogs: logs.length,
        logSources,
        query,
        timeRange
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: typedResult.error || 'Failed to fetch IP logs',
        details: typedResult.details
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in IP logs API:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

function determineLogType(log: any): string {
  const logSource = log['Log Source']
  
  if (logSource?.includes('VCN Flow')) {
    return 'Network Flow'
  } else if (logSource?.includes('Audit')) {
    return 'Audit Event'
  } else if (logSource?.includes('Load Balancer')) {
    return 'HTTP Request'
  } else if (logSource?.includes('WAF')) {
    return 'WAF Event'
  }
  
  return 'Other'
}