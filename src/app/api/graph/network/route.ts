import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { getTimePeriodMinutes, parseCustomTimeRange } from '@/lib/timeUtils'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { 
      timeRange = '1h',
      maxNodes = 200,
      maxEdges = 500
    } = body
    
    // Convert time range to minutes
    let timePeriodMinutes: number;
    if (typeof timeRange === 'string') {
      // First try standard time ranges
      timePeriodMinutes = getTimePeriodMinutes(timeRange);
      if (timePeriodMinutes === 60 && timeRange !== '1h') {
        // If not found, try parsing as custom range
        const customMinutes = parseCustomTimeRange(timeRange);
        timePeriodMinutes = customMinutes || 60;
      }
    } else {
      // If it's already a number, use it directly
      timePeriodMinutes = timeRange;
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'graph_extractor.py')
    
    return new Promise<NextResponse>((resolve) => {
      const pythonProcess = spawn('python3', [
        scriptPath, 
        'extract', 
        timePeriodMinutes.toString(),
        maxNodes.toString(),
        maxEdges.toString()
      ])
      
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
          resolve(NextResponse.json({ 
            success: false, 
            error: 'Failed to extract graph data',
            details: errorData
          }, { status: 500 }))
          return
        }
        
        try {
          const result = JSON.parse(outputData)
          resolve(NextResponse.json(result))
        } catch (parseError) {
          console.error('Failed to parse output:', outputData)
          resolve(NextResponse.json({ 
            success: false, 
            error: 'Invalid response from graph extractor',
            details: outputData
          }, { status: 500 }))
        }
      })
      
      pythonProcess.on('error', (error) => {
        console.error('Failed to spawn Python process:', error)
        resolve(NextResponse.json({ 
          success: false, 
          error: 'Failed to execute graph extractor',
          details: error.message
        }, { status: 500 }))
      })
    })
  } catch (error) {
    console.error('Error in graph network API:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}