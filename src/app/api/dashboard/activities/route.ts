import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const activities = await getRecentActivities(limit)

    return NextResponse.json({
      success: true,
      data: activities,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Dashboard activities error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

async function getRecentActivities(limit: number) {
  try {
    const query = `
      * | where Time > dateRelative(24h)
      | fields Time, 'Event Name', 'Log Source', 'Principal Name', 'IP Address', 'Compartment Name'
      | sort -Time
      | head ${limit}
    `.trim()

    const { stdout } = await execAsync(`cd scripts && python3 logan_client.py query --query "${query}"`)
    const result = JSON.parse(stdout)
    
    if (result.success && result.data && result.data.length > 0) {
      return result.data.map((log: any, index: number) => ({
        id: index + 1,
        type: categorizeActivity(log['Event Name'] || ''),
        title: generateTitle(log),
        description: generateDescription(log),
        time: formatTimeAgo(log.Time),
        severity: getSeverity(log['Event Name'] || ''),
        icon: getActivityIcon(log['Event Name'] || '')
      }))
    }
    
    return []
  } catch (error) {
    console.error('Recent activities error:', error)
    return []
  }
}

function categorizeActivity(eventName: string): string {
  const event = eventName.toLowerCase()
  if (event.includes('login') || event.includes('auth')) return 'authentication'
  if (event.includes('network') || event.includes('connection')) return 'network'
  if (event.includes('threat') || event.includes('security')) return 'threat'
  if (event.includes('compliance') || event.includes('audit')) return 'compliance'
  return 'system'
}

function generateTitle(log: any): string {
  const eventName = log['Event Name'] || 'System Event'
  const source = log['Log Source'] || 'Unknown Source'
  
  if (eventName.toLowerCase().includes('login')) {
    return log['Principal Name'] ? `Login activity for ${log['Principal Name']}` : 'User login detected'
  }
  if (eventName.toLowerCase().includes('network')) {
    return 'Network activity detected'
  }
  if (eventName.toLowerCase().includes('threat')) {
    return 'Security threat detected'
  }
  
  return `${eventName} from ${source}`
}

function generateDescription(log: any): string {
  const parts = []
  
  if (log['Principal Name']) {
    parts.push(`User: ${log['Principal Name']}`)
  }
  if (log['IP Address']) {
    parts.push(`IP: ${log['IP Address']}`)
  }
  if (log['Compartment Name']) {
    parts.push(`Compartment: ${log['Compartment Name']}`)
  }
  if (log['Log Source']) {
    parts.push(`Source: ${log['Log Source']}`)
  }
  
  return parts.join(' • ') || 'No additional details available'
}

function formatTimeAgo(timestamp: string): string {
  if (!timestamp) return 'Unknown time'
  
  try {
    const logTime = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - logTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } catch (error) {
    return 'Unknown time'
  }
}

function getSeverity(eventName: string): string {
  const event = eventName.toLowerCase()
  if (event.includes('fail') || event.includes('error') || event.includes('threat')) return 'high'
  if (event.includes('warn') || event.includes('unusual')) return 'medium'
  if (event.includes('info') || event.includes('audit')) return 'low'
  return 'info'
}

function getActivityIcon(eventName: string): string {
  const event = eventName.toLowerCase()
  if (event.includes('login') || event.includes('auth')) return 'Users'
  if (event.includes('network')) return 'Network'
  if (event.includes('threat') || event.includes('security')) return 'AlertTriangle'
  if (event.includes('compliance') || event.includes('audit')) return 'CheckCircle'
  return 'Activity'
}