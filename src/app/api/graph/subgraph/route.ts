import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nodeId = searchParams.get('nodeId')
    const depth = parseInt(searchParams.get('depth') || '2')
    const useNeo4j = searchParams.get('useNeo4j') === 'true'
    
    if (!nodeId) {
      return NextResponse.json(
        { success: false, error: 'Node ID is required' },
        { status: 400 }
      )
    }

    // Path to the graph analyzer script
    const scriptPath = path.join(process.cwd(), 'scripts', 'graph_analyzer.py')
    
    // Build command arguments
    const args = ['subgraph', '--node-id', nodeId, '--depth', depth.toString()]
    
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
            const subgraphResult = JSON.parse(stdout)
            resolve(subgraphResult)
          } catch (error) {
            reject(new Error('Failed to parse subgraph result'))
          }
        } else {
          reject(new Error(`Subgraph analysis failed with code ${code}: ${stderr}`))
        }
      })

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start subgraph analysis: ${error.message}`))
      })
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Subgraph analysis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nodeId, depth = 2, useNeo4j = false, neo4jConfig } = body

    if (!nodeId) {
      return NextResponse.json(
        { success: false, error: 'Node ID is required' },
        { status: 400 }
      )
    }

    // Path to the graph analyzer script
    const scriptPath = path.join(process.cwd(), 'scripts', 'graph_analyzer.py')
    
    // Build command arguments
    const args = ['subgraph', '--node-id', nodeId, '--depth', depth.toString()]
    
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
            const subgraphResult = JSON.parse(stdout)
            resolve(subgraphResult)
          } catch (error) {
            reject(new Error('Failed to parse subgraph result'))
          }
        } else {
          reject(new Error(`Subgraph analysis failed with code ${code}: ${stderr}`))
        }
      })

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start subgraph analysis: ${error.message}`))
      })
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Subgraph analysis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}