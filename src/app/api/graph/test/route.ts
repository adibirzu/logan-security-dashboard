import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    // Path to the mock graph test script
    const scriptPath = path.join(process.cwd(), 'scripts', 'test_graph_mock.py')
    
    // Execute the Python script
    const pythonProcess = spawn('python3', [scriptPath])
    
    let stdout = ''
    let stderr = ''

    // Collect output
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    // Wait for the process to complete
    const result = await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const mockResult = JSON.parse(stdout)
            resolve(mockResult)
          } catch (error) {
            reject(new Error('Failed to parse mock graph result'))
          }
        } else {
          reject(new Error(`Mock graph generation failed with code ${code}: ${stderr}`))
        }
      })

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start mock graph generation: ${error.message}`))
      })
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Mock graph generation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}