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
    const fieldType = searchParams.get('field_type')
    const isSystem = searchParams.get('is_system')
    const usedSourcesOnly = searchParams.get('used_sources_only')
    const timePeriodDays = searchParams.get('time_period_days') || '7'
    
    // Prepare arguments for Python script
    const args = ['list_fields']
    
    if (fieldType) {
      args.push('--field-type', fieldType)
    }
    
    if (isSystem !== null) {
      args.push('--is-system', isSystem === 'true' ? 'True' : 'False')
    }
    
    if (usedSourcesOnly === 'true') {
      args.push('--used-sources-only')
      args.push('--time-period-days', timePeriodDays)
    }
    
    console.log('Fields API: args=', args)
    
    // Execute field listing using Python logan client
    const result = await callPythonScript('logan_client.py', args)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        fields: result.fields || [],
        total: result.total_count || 0
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to list fields'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Fields API Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}