import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { MultitenancyService } from '@/lib/multitenancy/multitenancy-service'
import { MultitenantQueryOptions } from '@/types/multitenancy'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { query, timeRange, options = {} } = await request.json()
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      )
    }

    // Get multitenancy service instance
    const multitenancyService = MultitenancyService.getInstance()
    const activeEnvironments = options.environments 
      ? multitenancyService.getEnvironments().filter(env => 
          env.isActive && options.environments.includes(env.id)
        )
      : multitenancyService.getActiveEnvironments()

    if (activeEnvironments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active environments configured' },
        { status: 400 }
      )
    }

    // Prepare environment configurations for Python script
    const envConfigs = activeEnvironments.map(env => ({
      id: env.id,
      name: env.name,
      authType: env.authType,
      configProfile: env.configProfile,
      compartmentId: env.compartmentId,
      namespace: env.namespace,
      region: env.region
    }))

    // Execute multitenant query
    const queryMode = multitenancyService.getQueryMode()
    const command = `cd scripts && python3 multitenant_logan_client.py query \
      --query "${query.replace(/"/g, '\\"')}" \
      --time-range "${timeRange || '60m'}" \
      --environments '${JSON.stringify(envConfigs)}' \
      ${queryMode === 'parallel' ? '--parallel' : ''} \
      --aggregate "${options.aggregateResults ? 'merge' : 'group'}"`

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    })

    if (stderr && !stderr.includes('Warning')) {
      console.error('Multitenant query error:', stderr)
    }

    const result = JSON.parse(stdout)
    
    // Add execution metadata
    result.metadata = {
      environmentsQueried: activeEnvironments.length,
      queryMode,
      timeRange: timeRange || '60m',
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Multitenant search error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current multitenancy configuration
    const multitenancyService = MultitenancyService.getInstance()
    const environments = multitenancyService.getEnvironments()
    const activeEnvironments = multitenancyService.getActiveEnvironments()
    
    return NextResponse.json({
      success: true,
      data: {
        environments,
        activeCount: activeEnvironments.length,
        totalCount: environments.length,
        queryMode: multitenancyService.getQueryMode()
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get multitenancy configuration'
      },
      { status: 500 }
    )
  }
}