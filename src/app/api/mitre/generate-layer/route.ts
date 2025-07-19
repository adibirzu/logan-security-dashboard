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
      // Always wrap arguments in single quotes to prevent shell expansion
      // and escape any single quotes within the argument
      return `'${arg.replace(/'/g, "'\\''")}'`;
    })

    const command = `python3 "${scriptPath}" ${escapedArgs.join(' ')}`

    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        LOGAN_REGION: process.env.NEXT_PUBLIC_LOGAN_REGION || 'eu-frankfurt-1',
        LOGAN_COMPARTMENT_ID: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID || '',
      },
      timeout: 60000 // 60 second timeout
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, timeRangeMinutes } = body

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query is required'
      }, { status: 400 })
    }

    const result = await callPythonScript('mitre_layer_generator.py', [query, timeRangeMinutes.toString()])

    if (result.success) {
      return NextResponse.json({
        success: true,
        layer: result.layer
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to generate MITRE layer'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Generate MITRE Layer Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
