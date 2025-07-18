import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const instanceId = searchParams.get('instance_id')
    const compartmentId = searchParams.get('compartment_id')
    const region = searchParams.get('region')
    
    if (!instanceId && !compartmentId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Either instance_id or compartment_id must be provided' 
      }, { status: 400 })
    }

    // For now, return mock metrics
    // In a real implementation, this would call OCI Monitoring API
    const mockMetrics = generateMockMetrics(instanceId, compartmentId, region)
    
    return NextResponse.json({
      success: true,
      metrics: mockMetrics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in metrics API:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

function generateMockMetrics(instanceId?: string | null, compartmentId?: string | null, region?: string | null) {
  const metrics = []
  
  if (instanceId) {
    // Generate metrics for a specific instance
    metrics.push({
      instanceId,
      cpuUtilization: Math.random() * 100,
      memoryUtilization: Math.random() * 100,
      networkBytesIn: Math.random() * 1000000,
      networkBytesOut: Math.random() * 1000000,
      diskReadBytes: Math.random() * 1000000,
      diskWriteBytes: Math.random() * 1000000,
      diskReadOps: Math.random() * 100,
      diskWriteOps: Math.random() * 100,
      timestamp: new Date().toISOString()
    })
  } else if (compartmentId) {
    // Generate metrics for all instances in compartment (mock data)
    const instanceIds = [
      'ocid1.instance.oc1.eu-frankfurt-1.demo1',
      'ocid1.instance.oc1.eu-frankfurt-1.demo2',
      'ocid1.instance.oc1.eu-frankfurt-1.demo3'
    ]
    
    instanceIds.forEach(id => {
      metrics.push({
        instanceId: id,
        cpuUtilization: Math.random() * 100,
        memoryUtilization: Math.random() * 100,
        networkBytesIn: Math.random() * 1000000,
        networkBytesOut: Math.random() * 1000000,
        diskReadBytes: Math.random() * 1000000,
        diskWriteBytes: Math.random() * 1000000,
        diskReadOps: Math.random() * 100,
        diskWriteOps: Math.random() * 100,
        timestamp: new Date().toISOString()
      })
    })
  }
  
  return metrics
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instanceIds, compartmentId, region, metricNames } = body
    
    if (!instanceIds && !compartmentId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Either instanceIds array or compartmentId must be provided' 
      }, { status: 400 })
    }

    // For now, return mock metrics for multiple instances
    const metrics: any[] = []
    const targetInstanceIds = instanceIds || [
      'ocid1.instance.oc1.eu-frankfurt-1.demo1',
      'ocid1.instance.oc1.eu-frankfurt-1.demo2'
    ]
    
    targetInstanceIds.forEach((instanceId: string) => {
      metrics.push({
        instanceId,
        cpuUtilization: Math.random() * 100,
        memoryUtilization: Math.random() * 100,
        networkBytesIn: Math.random() * 1000000,
        networkBytesOut: Math.random() * 1000000,
        diskReadBytes: Math.random() * 1000000,
        diskWriteBytes: Math.random() * 1000000,
        diskReadOps: Math.random() * 100,
        diskWriteOps: Math.random() * 100,
        timestamp: new Date().toISOString()
      })
    })
    
    return NextResponse.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
      region,
      compartmentId
    })
  } catch (error) {
    console.error('Error in metrics POST API:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}