import { NextRequest, NextResponse } from 'next/server'

// Trigger n8n workflows from the Logan dashboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowId, incidentId, data, priority } = body

    if (!workflowId) {
      return NextResponse.json({
        success: false,
        error: 'workflowId is required'
      }, { status: 400 })
    }

    console.log('Triggering n8n workflow:', {
      workflowId,
      incidentId,
      priority: priority || 'normal',
      timestamp: new Date().toISOString()
    })

    // In a real implementation, this would make an HTTP call to n8n
    const n8nResult = await triggerN8NWorkflow(workflowId, {
      incidentId,
      data,
      priority,
      source: 'logan-dashboard',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      executionId: n8nResult.executionId,
      status: n8nResult.status,
      message: `Workflow ${workflowId} triggered successfully`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error triggering n8n workflow:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger workflow',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Mock function to simulate n8n workflow triggering
// In a real implementation, this would use n8n's REST API
async function triggerN8NWorkflow(workflowId: string, payload: any) {
  // Simulate API call to n8n
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'
  
  try {
    // This would be a real HTTP call to n8n
    // const response = await fetch(`${n8nWebhookUrl}/${workflowId}`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.N8N_API_KEY}`
    //   },
    //   body: JSON.stringify(payload)
    // })

    // Mock response for demo
    const mockExecutionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`Mock n8n workflow triggered: ${workflowId}`)
    console.log(`Mock execution ID: ${mockExecutionId}`)
    console.log('Payload:', payload)

    // Simulate workflow execution delay
    setTimeout(() => {
      console.log(`Mock workflow ${workflowId} completed successfully`)
    }, 2000 + Math.random() * 3000)

    return {
      executionId: mockExecutionId,
      status: 'running',
      workflowId,
      startedAt: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error calling n8n API:', error)
    throw new Error('Failed to trigger n8n workflow')
  }
}

// GET endpoint to check n8n connection status
export async function GET() {
  try {
    // In a real implementation, this would check n8n health
    const n8nStatus = await checkN8NStatus()
    
    return NextResponse.json({
      status: 'connected',
      n8nVersion: n8nStatus.version,
      activeWorkflows: n8nStatus.activeWorkflows,
      lastCheck: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Connection failed',
      lastCheck: new Date().toISOString()
    })
  }
}

// Mock function to check n8n status
async function checkN8NStatus() {
  // In a real implementation, this would call n8n's health endpoint
  return {
    version: '1.0.0',
    activeWorkflows: 15,
    status: 'healthy'
  }
}