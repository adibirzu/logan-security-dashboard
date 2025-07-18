import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const compartmentId = searchParams.get('compartment_id')
    
    const scriptPath = path.join(process.cwd(), 'scripts', 'oci_compute_client.py')
    const args = ['list']
    
    if (compartmentId) {
      args.push('--compartment-id', compartmentId)
    }
    
    const result = await executeComputeScript(scriptPath, args)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in compute instances API:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

async function executeComputeScript(scriptPath: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [scriptPath, ...args], {
      env: {
        ...process.env,
        LOGAN_REGION: process.env.NEXT_PUBLIC_LOGAN_REGION || 'eu-frankfurt-1',
        LOGAN_COMPARTMENT_ID: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID || ''
      }
    })
    
    let stdout = ''
    let stderr = ''
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    pythonProcess.on('close', (code) => {
      if (stderr) {
        console.error('Python script stderr:', stderr)
      }
      
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`)
        resolve({ success: false, error: `Script exited with code ${code}`, stderr })
        return
      }
      
      try {
        const result = JSON.parse(stdout)
        resolve(result)
      } catch (parseError) {
        console.error('Failed to parse Python output:', parseError)
        resolve({ success: false, error: 'Failed to parse response', stdout, stderr })
      }
    })
    
    pythonProcess.on('error', (error) => {
      console.error('Python process error:', error)
      resolve({ success: false, error: error.message })
    })
  })
}