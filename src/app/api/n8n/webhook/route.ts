import { NextRequest, NextResponse } from 'next/server'

// n8n webhook endpoint for receiving workflow notifications and triggers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowId, executionId, status, data, timestamp } = body

    console.log('n8n Webhook received:', {
      workflowId,
      executionId,
      status,
      timestamp: timestamp || new Date().toISOString()
    })

    // Handle different workflow statuses
    switch (status) {
      case 'running':
        console.log(`Workflow ${workflowId} started execution ${executionId}`)
        break
      
      case 'success':
        console.log(`Workflow ${workflowId} completed successfully`)
        // Update incident status, notify teams, etc.
        await handleWorkflowSuccess(workflowId, executionId, data)
        break
      
      case 'error':
        console.log(`Workflow ${workflowId} failed:`, data?.error)
        // Handle workflow failures, alert on-call, etc.
        await handleWorkflowError(workflowId, executionId, data)
        break
      
      case 'waiting':
        console.log(`Workflow ${workflowId} is waiting for input`)
        // Handle workflows waiting for manual approval or input
        await handleWorkflowWaiting(workflowId, executionId, data)
        break
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('n8n webhook error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Handle successful workflow completion
async function handleWorkflowSuccess(workflowId: string, executionId: string, data: any) {
  try {
    // Update incident if this was an incident response workflow
    if (data?.incidentId) {
      // In a real implementation, this would update the incident in a database
      console.log(`Updating incident ${data.incidentId} with workflow results`)
      
      // Example actions:
      // - Update incident status
      // - Add timeline entry
      // - Collect artifacts
      // - Send notifications
    }

    // Log successful automation
    console.log(`Workflow automation completed for ${workflowId}`)
    
  } catch (error) {
    console.error('Error handling workflow success:', error)
  }
}

// Handle workflow failures
async function handleWorkflowError(workflowId: string, executionId: string, data: any) {
  try {
    // Alert on-call team about workflow failure
    console.log(`Workflow ${workflowId} failed - alerting on-call team`)
    
    // In a real implementation:
    // - Send PagerDuty alert
    // - Create fallback incident
    // - Escalate to manual response
    // - Log failure metrics
    
  } catch (error) {
    console.error('Error handling workflow failure:', error)
  }
}

// Handle workflows waiting for input
async function handleWorkflowWaiting(workflowId: string, executionId: string, data: any) {
  try {
    // Notify analysts that manual input is required
    console.log(`Workflow ${workflowId} requires manual input`)
    
    // In a real implementation:
    // - Send Slack notification to SOC
    // - Create pending approval in UI
    // - Set reminder timers
    // - Update incident status
    
  } catch (error) {
    console.error('Error handling workflow waiting:', error)
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Logan Security Dashboard n8n Webhook Endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  })
}