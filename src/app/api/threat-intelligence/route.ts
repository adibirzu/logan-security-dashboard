import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

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

function executeOCIThreatIntel(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'oci_threat_intel.py')
    const pythonProcess = spawn('python3', [scriptPath, ...args])
    
    let stdout = ''
    let stderr = ''
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        // Filter out warnings and only show actual errors
        const errorLines = stderr.split('\n').filter(line => 
          line.trim() && 
          !line.includes('VCN Analyzer:') && 
          !line.includes('Python script warning:')
        )
        const actualErrors = errorLines.length > 0 ? errorLines.join('\n') : 'Unknown error'
        reject(new Error(`Python script failed with code ${code}: ${actualErrors}`))
      }
    })
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python script: ${error.message}`))
    })
  })
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
        if (!threat_data) {
          return NextResponse.json({
            success: false,
            error: 'Threat data is required for submit action'
          }, { status: 400 })
        }
        
        // Create temporary file with threat data
        const threatDataFile = path.join('/tmp', `threat_data_${Date.now()}.json`)
        fs.writeFileSync(threatDataFile, JSON.stringify(threat_data))
        
        args.push('--file', threatDataFile)
        if (compartment_id) args.push('--compartment', compartment_id)
        
        try {
          const result = await executeOCIThreatIntel(args)
          // Clean up temp file
          fs.unlinkSync(threatDataFile)
          return NextResponse.json(JSON.parse(result))
        } catch (error) {
          // Clean up temp file on error
          if (fs.existsSync(threatDataFile)) {
            fs.unlinkSync(threatDataFile)
          }
          throw error
        }

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