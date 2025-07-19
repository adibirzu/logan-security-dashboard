import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

interface IndicatorRequest {
  action: 'check' | 'batch' | 'stats' | 'submit'
  indicator?: string
  indicators?: Array<{ value: string; type?: string }>
  type?: string
  compartment_id?: string
  threat_data?: Record<string, unknown>
}

interface IndicatorResult {
  success: boolean
  indicator_value?: string
  indicator_type?: string
  found?: boolean
  count?: number
  indicators?: Array<{
    id: string
    value: string
    type: string
    confidence: number
    threat_types: string[]
    attributes: Array<{
      name: string
      value: string
      attribution: string
    }>
    time_created?: string
    time_updated?: string
    time_last_seen?: string
  }>
  error?: string
}

interface BatchResult {
  success: boolean
  total_checked: number
  found_count: number
  indicators: IndicatorResult[]
}

async function executeOCIThreatIntel(args: string[]): Promise<string> {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'oci_threat_intel.py')
    
    const escapedArgs = args.map(arg => {
      return `'${arg.replace(/'/g, "\\\\'")}'`
    })
    
    const command = `python3 "${scriptPath}" ${escapedArgs.join(' ')}`
    
    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        LOGAN_REGION: process.env.NEXT_PUBLIC_LOGAN_REGION || 'eu-frankfurt-1',
        LOGAN_COMPARTMENT_ID: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID || '',
      },
      timeout: 30000 // 30 second timeout for threat intel queries
    })
    
    if (stderr) {
      console.warn('OCI Threat Intel script warning:', stderr)
    }
    
    return stdout
  } catch (error) {
    console.error('OCI Threat Intel script error:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: IndicatorRequest = await request.json()
    const { action, indicator, indicators, type, compartment_id, threat_data } = body

    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Action is required'
      }, { status: 400 })
    }

    const args: string[] = [action]

    // Build command arguments based on action
    switch (action) {
      case 'check':
        if (!indicator) {
          return NextResponse.json({
            success: false,
            error: 'Indicator value is required for check action'
          }, { status: 400 })
        }
        args.push('--indicator', indicator)
        if (type) args.push('--type', type)
        if (compartment_id) args.push('--compartment', compartment_id)
        break

      case 'batch':
        if (!indicators || !Array.isArray(indicators)) {
          return NextResponse.json({
            success: false,
            error: 'Indicators array is required for batch action'
          }, { status: 400 })
        }
        
        // Create temporary file with indicators
        const tempFile = path.join('/tmp', `indicators_${Date.now()}.json`)
        const fs = require('fs')
        fs.writeFileSync(tempFile, JSON.stringify(indicators))
        
        args.push('--file', tempFile)
        if (compartment_id) args.push('--compartment', compartment_id)
        
        try {
          const result = await executeOCIThreatIntel(args)
          // Clean up temp file
          fs.unlinkSync(tempFile)
          return NextResponse.json(JSON.parse(result))
        } catch (error) {
          // Clean up temp file on error
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile)
          }
          throw error
        }

      case 'stats':
        if (type) args.push('--type', type)
        if (compartment_id) args.push('--compartment', compartment_id)
        break

      case 'submit':
        // Note: Submission functionality may not be available in current OCI API
        return NextResponse.json({
          success: false,
          error: 'Threat data submission not yet available in OCI Threat Intelligence service'
        }, { status: 501 })

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 })
    }

    // Execute the OCI threat intelligence script
    const result = await executeOCIThreatIntel(args)
    const parsedResult = JSON.parse(result)

    return NextResponse.json(parsedResult)

  } catch (error) {
    console.error('OCI Threat Intelligence API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: 'Check OCI configuration and ensure the threat intelligence service is accessible'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'test'
    const indicator = searchParams.get('indicator')
    const type = searchParams.get('type')
    const compartment_id = searchParams.get('compartment_id')

    const args: string[] = [action]

    if (action === 'check' && indicator) {
      args.push('--indicator', indicator)
      if (type) args.push('--type', type)
      if (compartment_id) args.push('--compartment', compartment_id)
    } else if (action === 'stats') {
      if (type) args.push('--type', type)
      if (compartment_id) args.push('--compartment', compartment_id)
    }

    const result = await executeOCIThreatIntel(args)
    const parsedResult = JSON.parse(result)

    return NextResponse.json(parsedResult)

  } catch (error) {
    console.error('OCI Threat Intelligence API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: 'Check OCI configuration and ensure the threat intelligence service is accessible'
    }, { status: 500 })
  }
}