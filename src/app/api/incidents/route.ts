import { NextRequest, NextResponse } from 'next/server'
import { getOracleMCPClient } from '@/lib/database/oracle-client'
import { v4 as uuidv4 } from 'uuid'

// Interface for incidents stored in database
interface Incident {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed'
  category: string
  source: string
  assignee?: string
  reporter: string
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  ttd: number // Time to Detection (minutes)
  ttr: number // Time to Response (minutes)
  tags: string[]
  iocs: string[] // Indicators of Compromise
  affectedSystems: string[]
  timeline: TimelineEvent[]
  artifacts: string[]
  workflowExecutions: string[]
}

interface TimelineEvent {
  id: string
  timestamp: Date
  type: 'detection' | 'response' | 'containment' | 'resolution'
  description: string
  author: string
  automated: boolean
}

// Fallback incidents for when database is not available
const fallbackIncidents = [
  {
    id: 'INC-2024-001',
    title: 'Suspicious PowerShell Activity Detected',
    description: 'Multiple PowerShell execution attempts with encoded commands detected on server WEB-01',
    severity: 'high',
    status: 'investigating',
    category: 'Malware',
    source: 'EDR Alert',
    assignee: 'John Doe',
    reporter: 'Security System',
    createdAt: new Date('2024-07-18T10:30:00Z'),
    updatedAt: new Date('2024-07-18T11:15:00Z'),
    resolvedAt: undefined,
    ttd: 15, // Time to Detection (minutes)
    ttr: 45, // Time to Response (minutes)
    tags: ['powershell', 'lateral-movement', 'apt'],
    iocs: ['powershell.exe', '185.159.157.131'],
    affectedSystems: ['WEB-01', 'DB-02'],
    timeline: [
      {
        id: 'evt-1',
        timestamp: new Date('2024-07-18T10:30:00Z'),
        type: 'detection',
        description: 'Suspicious PowerShell activity detected by EDR',
        author: 'Security System',
        automated: true
      },
      {
        id: 'evt-2',
        timestamp: new Date('2024-07-18T10:45:00Z'),
        type: 'response',
        description: 'Incident assigned to SOC analyst',
        author: 'John Doe',
        automated: false
      }
    ],
    artifacts: [],
    workflowExecutions: ['wf-exec-001', 'wf-exec-002']
  },
  {
    id: 'INC-2024-002',
    title: 'Potential Data Exfiltration Event',
    description: 'Large volume of data transferred to external IP address from database server',
    severity: 'critical',
    status: 'contained',
    category: 'Data Breach',
    source: 'DLP Alert',
    assignee: 'Jane Smith',
    reporter: 'DLP System',
    createdAt: new Date('2024-07-18T08:15:00Z'),
    updatedAt: new Date('2024-07-18T09:30:00Z'),
    resolvedAt: undefined,
    ttd: 5,
    ttr: 20,
    tags: ['data-exfiltration', 'database', 'critical'],
    iocs: ['77.83.38.138', 'sqlserver.exe'],
    affectedSystems: ['DB-PROD-01'],
    timeline: [
      {
        id: 'evt-3',
        timestamp: new Date('2024-07-18T08:15:00Z'),
        type: 'detection',
        description: 'DLP alert triggered for large data transfer',
        author: 'DLP System',
        automated: true
      },
      {
        id: 'evt-4',
        timestamp: new Date('2024-07-18T08:35:00Z'),
        type: 'containment',
        description: 'Network access blocked for affected server',
        author: 'n8n Workflow',
        automated: true
      }
    ],
    artifacts: [],
    workflowExecutions: ['wf-exec-003', 'wf-exec-004']
  }
]

export async function GET(request: NextRequest) {
  try {
    const client = getOracleMCPClient()
    
    // Try to get incidents from database
    try {
      const initialized = await client.initialize()
      if (initialized) {
        const result = await client.executeMCPRequest('select', {
          table: 'incidents',
          orderBy: [{ field: 'created_at', direction: 'DESC' }]
        })
        
        if (result.success && result.data) {
          const incidents = result.data.map(mapToIncident)
          return NextResponse.json({
            success: true,
            data: incidents,
            source: 'database'
          })
        }
      }
    } catch (dbError) {
      console.warn('Database not available, using fallback data:', dbError)
    }
    
    // Fallback to in-memory data
    return NextResponse.json({
      success: true,
      data: fallbackIncidents,
      source: 'fallback'
    })
  } catch (error) {
    console.error('Failed to retrieve incidents:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve incidents'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const newIncidentData = await request.json()
    
    // Validate required fields
    if (!newIncidentData.title || !newIncidentData.description || !newIncidentData.severity) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: title, description, and severity are required'
      }, { status: 400 })
    }

    const client = getOracleMCPClient()
    const incidentId = uuidv4()
    
    const newIncident: Incident = {
      id: incidentId,
      title: newIncidentData.title,
      description: newIncidentData.description,
      severity: newIncidentData.severity,
      status: newIncidentData.status || 'open',
      category: newIncidentData.category || 'Security',
      source: newIncidentData.source || 'Manual',
      assignee: newIncidentData.assignee,
      reporter: newIncidentData.reporter || 'System',
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: newIncidentData.resolvedAt ? new Date(newIncidentData.resolvedAt) : undefined,
      ttd: newIncidentData.ttd || 0,
      ttr: newIncidentData.ttr || 0,
      tags: newIncidentData.tags || [],
      iocs: newIncidentData.iocs || [],
      affectedSystems: newIncidentData.affectedSystems || [],
      timeline: newIncidentData.timeline || [{
        id: uuidv4(),
        timestamp: new Date(),
        type: 'detection',
        description: 'Incident created',
        author: newIncidentData.reporter || 'System',
        automated: true
      }],
      artifacts: newIncidentData.artifacts || [],
      workflowExecutions: newIncidentData.workflowExecutions || []
    }

    // Try to save to database
    try {
      const initialized = await client.initialize()
      if (initialized) {
        const result = await client.executeMCPRequest('insert', {
          table: 'incidents',
          data: {
            ...newIncident,
            timeline: JSON.stringify(newIncident.timeline),
            tags: JSON.stringify(newIncident.tags),
            iocs: JSON.stringify(newIncident.iocs),
            affected_systems: JSON.stringify(newIncident.affectedSystems),
            artifacts: JSON.stringify(newIncident.artifacts),
            workflow_executions: JSON.stringify(newIncident.workflowExecutions)
          }
        })
        
        if (result.success) {
          return NextResponse.json({
            success: true,
            data: newIncident,
            source: 'database'
          }, { status: 201 })
        }
      }
    } catch (dbError) {
      console.warn('Database not available, using fallback storage:', dbError)
    }

    // Fallback: add to in-memory array (ensure all fields are defined for fallback array)
    const fallbackIncident = {
      ...newIncident,
      assignee: newIncident.assignee || 'Unassigned'
    }
    fallbackIncidents.unshift(fallbackIncident as any)
    
    return NextResponse.json({
      success: true,
      data: newIncident,
      source: 'fallback'
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create incident:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create incident',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to map database row to Incident object
function mapToIncident(row: any): Incident {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    category: row.category,
    source: row.source,
    assignee: row.assignee,
    reporter: row.reporter,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    ttd: row.ttd || 0,
    ttr: row.ttr || 0,
    tags: row.tags ? JSON.parse(row.tags) : [],
    iocs: row.iocs ? JSON.parse(row.iocs) : [],
    affectedSystems: row.affected_systems ? JSON.parse(row.affected_systems) : [],
    timeline: row.timeline ? JSON.parse(row.timeline) : [],
    artifacts: row.artifacts ? JSON.parse(row.artifacts) : [],
    workflowExecutions: row.workflow_executions ? JSON.parse(row.workflow_executions) : []
  }
}
