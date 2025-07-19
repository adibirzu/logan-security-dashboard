import { NextRequest, NextResponse } from 'next/server'

// TODO: Replace this with a database
const incidents = [
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
  return NextResponse.json({
    success: true,
    data: incidents
  })
}

export async function POST(request: NextRequest) {
  const newIncident = await request.json()
  newIncident.id = `INC-2024-${String(incidents.length + 1).padStart(3, '0')}`
  newIncident.createdAt = new Date()
  newIncident.updatedAt = new Date()
  incidents.unshift(newIncident)

  return NextResponse.json({
    success: true,
    data: newIncident
  }, { status: 201 })
}
