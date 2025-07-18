import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Return a comprehensive list of OCI log sources
    // This represents all possible log source types available in OCI Logging Analytics
    const allSources = [
      {
        name: 'OCI Audit Logs',
        description: 'API calls and configuration changes across all OCI services',
        category: 'Security'
      },
      {
        name: 'OCI VCN Flow Unified Schema Logs',
        description: 'Network traffic and connection logs from Virtual Cloud Networks',
        category: 'Network'
      },
      {
        name: 'OCI WAF Logs',
        description: 'Web Application Firewall security events and blocked requests',
        category: 'Security'
      },
      {
        name: 'Windows Security Events',
        description: 'Windows operating system security and authentication events',
        category: 'Operating System'
      },
      {
        name: 'Windows Sysmon Events',
        description: 'Windows System Monitor detailed process and network monitoring',
        category: 'Operating System'
      },
      {
        name: 'com.oraclecloud.logging.custom.Suricatalogs',
        description: 'Suricata Intrusion Detection System alerts and signatures',
        category: 'Security'
      },
      {
        name: 'Linux Secure Logs',
        description: 'Linux authentication and authorization events',
        category: 'Operating System'
      },
      {
        name: 'Linux System Logs',
        description: 'Linux operating system kernel and service messages',
        category: 'Operating System'
      },
      {
        name: 'OCI Compute Instance Logs',
        description: 'Compute instance boot and system diagnostics',
        category: 'Infrastructure'
      },
      {
        name: 'OCI Load Balancer Logs',
        description: 'Load balancer access and error logs',
        category: 'Network'
      },
      {
        name: 'OCI Object Storage Logs',
        description: 'Object storage access and data management events',
        category: 'Storage'
      },
      {
        name: 'OCI Database Audit Logs',
        description: 'Database security and access audit events',
        category: 'Database'
      },
      {
        name: 'OCI Functions Logs',
        description: 'Serverless function execution and error logs',
        category: 'Application'
      },
      {
        name: 'OCI Container Engine Logs',
        description: 'Kubernetes cluster and container orchestration logs',
        category: 'Container'
      },
      {
        name: 'OCI API Gateway Logs',
        description: 'API gateway request and response logging',
        category: 'Application'
      }
    ]

    return NextResponse.json({
      success: true,
      sources: allSources,
      total: allSources.length,
      note: 'Comprehensive list of OCI Logging Analytics source types'
    })
    
  } catch (error) {
    console.error('Sources API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      sources: [],
      total: 0
    }, { status: 500 })
  }
}