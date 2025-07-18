import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { timePeriod = 1440, useNeo4j = false, neo4jConfig } = body

    // Path to the graph analyzer script
    const scriptPath = path.join(process.cwd(), 'scripts', 'graph_analyzer.py')
    
    // Build command arguments
    const args = ['analyze', '--time-period', timePeriod.toString()]
    
    if (useNeo4j && neo4jConfig) {
      args.push('--use-neo4j')
      if (neo4jConfig.uri) args.push('--neo4j-uri', neo4jConfig.uri)
      if (neo4jConfig.user) args.push('--neo4j-user', neo4jConfig.user)
      if (neo4jConfig.password) args.push('--neo4j-password', neo4jConfig.password)
    }

    // Execute the Python script
    const pythonProcess = spawn('python3', [scriptPath, ...args])
    
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
            const analysisResult = JSON.parse(stdout)
            resolve(analysisResult)
          } catch (error) {
            reject(new Error('Failed to parse analysis result'))
          }
        } else {
          reject(new Error(`Analysis failed with code ${code}: ${stderr}`))
        }
      })

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start analysis: ${error.message}`))
      })
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Graph analysis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timePeriod = parseInt(searchParams.get('timePeriod') || '1440')
    const useNeo4j = searchParams.get('useNeo4j') === 'true'
    
    // Path to the graph analyzer script
    const scriptPath = path.join(process.cwd(), 'scripts', 'graph_analyzer.py')
    
    // Build command arguments
    const args = ['analyze', '--time-period', timePeriod.toString()]
    
    if (useNeo4j) {
      args.push('--use-neo4j')
    }

    // Execute the Python script
    const pythonProcess = spawn('python3', [scriptPath, ...args])
    
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
            const analysisResult = JSON.parse(stdout)
            resolve(analysisResult)
          } catch (error) {
            reject(new Error('Failed to parse analysis result'))
          }
        } else {
          reject(new Error(`Analysis failed with code ${code}: ${stderr}`))
        }
      })

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start analysis: ${error.message}`))
      })
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Graph analysis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}