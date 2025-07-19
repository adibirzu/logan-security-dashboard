import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { getTimePeriodMinutes } from '@/lib/timeUtils'

const execAsync = promisify(exec)

async function callEnhancedIngestion(action: string, args: string[] = []) {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'enhanced_log_ingestion.py')
    
    const escapedArgs = args.map(arg => {
      return `'${arg.replace(/'/g, "\\'")}'`
    })
    
    const command = `python3 "${scriptPath}" ${action} ${escapedArgs.join(' ')}`
    
    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        LOGAN_REGION: process.env.NEXT_PUBLIC_LOGAN_REGION || 'eu-frankfurt-1',
        LOGAN_COMPARTMENT_ID: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID || '',
      },
      timeout: 300000, // 5 minute timeout for large datasets
      maxBuffer: 100 * 1024 * 1024 // 100MB buffer for large responses
    })
    
    if (stderr) {
      console.warn('Enhanced ingestion warning:', stderr)
    }
    
    return JSON.parse(stdout)
  } catch (error) {
    console.error('Enhanced ingestion error:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'sources'
    const timeRange = searchParams.get('timeRange') || '24h'
    const maxRecords = searchParams.get('maxRecords') || '10000'
    
    const timePeriodMinutes = getTimePeriodMinutes(timeRange)
    
    console.log('Enhanced Ingestion API:', { action, timeRange, timePeriodMinutes, maxRecords })

    let result: any = {}

    switch (action) {
      case 'sources':
        result = await callEnhancedIngestion('sources')
        break
      
      case 'vcn':
        result = await callEnhancedIngestion('vcn', [
          '--time-period', timePeriodMinutes.toString(),
          '--max-records', maxRecords
        ])
        break
      
      case 'waf':
        result = await callEnhancedIngestion('waf', [
          '--time-period', timePeriodMinutes.toString(),
          '--max-records', maxRecords
        ])
        break
      
      case 'lb':
        result = await callEnhancedIngestion('lb', [
          '--time-period', timePeriodMinutes.toString(),
          '--max-records', maxRecords
        ])
        break
      
      case 'all':
        result = await callEnhancedIngestion('all', [
          '--time-period', timePeriodMinutes.toString()
        ])
        break
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Supported actions: sources, vcn, waf, lb, all`
        }, { status: 400 })
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        ...result,
        api_metadata: {
          action,
          time_range: timeRange,
          time_period_minutes: timePeriodMinutes,
          max_records: parseInt(maxRecords),
          timestamp: new Date().toISOString()
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Enhanced ingestion failed',
        action
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Enhanced Ingestion API Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      action: 'unknown'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, timeRange = '24h', maxRecords = 10000, sources = [] } = body
    
    const timePeriodMinutes = getTimePeriodMinutes(timeRange)
    
    console.log('Enhanced Ingestion API POST:', { action, timeRange, timePeriodMinutes, maxRecords, sources })

    if (action === 'multi-source') {
      // Handle multiple source ingestion
      const results: any = {
        success: true,
        timestamp: new Date().toISOString(),
        time_period_minutes: timePeriodMinutes,
        sources: {}
      }

      for (const source of sources) {
        try {
          const sourceResult = await callEnhancedIngestion(source, [
            '--time-period', timePeriodMinutes.toString(),
            '--max-records', maxRecords.toString()
          ])
          results.sources[source] = sourceResult
        } catch (error) {
          results.sources[source] = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }

      // Overall success if any source succeeded
      results.success = Object.values(results.sources).some((result: any) => result.success)

      return NextResponse.json(results)
    } else {
      // Single action via POST
      const result = await callEnhancedIngestion(action, [
        '--time-period', timePeriodMinutes.toString(),
        '--max-records', maxRecords.toString()
      ])

      return NextResponse.json({
        success: result.success,
        ...result,
        api_metadata: {
          action,
          time_range: timeRange,
          time_period_minutes: timePeriodMinutes,
          max_records: maxRecords,
          timestamp: new Date().toISOString()
        }
      })
    }
  } catch (error) {
    console.error('Enhanced Ingestion API POST Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}