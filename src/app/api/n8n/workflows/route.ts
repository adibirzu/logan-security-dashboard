import { NextRequest, NextResponse } from 'next/server'

// TODO: Replace this with a call to the n8n API
const workflows = [
  {
    id: 'wf-001',
    name: 'Malware Detection Response',
    description: 'Automated response workflow for malware detection alerts',
    category: 'response',
    triggers: ['malware_detected', 'suspicious_process'],
    status: 'idle',
    lastExecuted: new Date('2024-07-18T10:30:00Z'),
    executionCount: 45,
    successRate: 97.8,
    avgExecutionTime: 120,
    actions: [
      {
        id: 'action-1',
        name: 'Create Incident Ticket',
        type: 'jira',
        config: { project: 'SEC', issueType: 'Incident' },
        timeout: 30,
        retries: 3
      },
      {
        id: 'action-2',
        name: 'Notify SOC Team',
        type: 'slack',
        config: { channel: '#soc-alerts', template: 'malware_alert' },
        timeout: 10,
        retries: 2
      },
      {
        id: 'action-3',
        name: 'Isolate Host',
        type: 'http_request',
        config: { endpoint: '/api/edr/isolate', method: 'POST' },
        timeout: 60,
        retries: 1
      }
    ]
  },
  {
    id: 'wf-002',
    name: 'Data Breach Response',
    description: 'Critical incident response for data exfiltration events',
    category: 'containment',
    triggers: ['data_exfiltration', 'dlp_violation'],
    status: 'idle',
    lastExecuted: new Date('2024-07-18T08:15:00Z'),
    executionCount: 12,
    successRate: 100,
    avgExecutionTime: 180,
    actions: [
      {
        id: 'action-4',
        name: 'Block Network Access',
        type: 'http_request',
        config: { endpoint: '/api/firewall/block', method: 'POST' },
        timeout: 30,
        retries: 2
      },
      {
        id: 'action-5',
        name: 'Page On-Call Manager',
        type: 'pagerduty',
        config: { severity: 'critical', escalation_policy: 'data-breach' },
        timeout: 15,
        retries: 3
      },
      {
        id: 'action-6',
        name: 'Collect Evidence',
        type: 'script',
        config: { script: 'collect_network_logs.py' },
        timeout: 300,
        retries: 1
      }
    ]
  },
  {
    id: 'wf-003',
    name: 'Threat Intelligence Enrichment',
    description: 'Enrich incidents with threat intelligence data',
    category: 'detection',
    triggers: ['new_incident', 'ioc_detected'],
    status: 'idle',
    lastExecuted: new Date('2024-07-18T09:45:00Z'),
    executionCount: 156,
    successRate: 95.5,
    avgExecutionTime: 45,
    actions: [
      {
        id: 'action-7',
        name: 'Query Threat Intel APIs',
        type: 'http_request',
        config: { endpoints: ['virustotal', 'alienvault', 'misp'] },
        timeout: 60,
        retries: 2
      },
      {
        id: 'action-8',
        name: 'Update Incident with IOCs',
        type: 'http_request',
        config: { endpoint: '/api/incidents/update', method: 'PATCH' },
        timeout: 30,
        retries: 1
      }
    ]
  }
]

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: workflows
  })
}
