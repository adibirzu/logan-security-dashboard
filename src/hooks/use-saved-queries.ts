'use client'

import { useState, useEffect } from 'react'

export interface SavedQuery {
  id: string
  name: string
  query: string
  category: 'predefined' | 'custom'
  lastExecuted?: Date
  successful?: boolean
  description?: string
}

const STORAGE_KEY = 'logan-saved-queries'

// Predefined OCI Logging Analytics queries organized by category
let PREDEFINED_QUERIES: SavedQuery[] = [
  // Overview and General Analytics
  {
    id: 'log_sources_overview',
    name: 'Log Sources Overview',
    category: 'predefined',
    query: "* | stats count as logrecords by 'Log Source' | sort -logrecords",
    description: 'Overview of all log sources and their record counts.'
  },
  {
    id: 'recent_audit_events',
    name: 'Recent OCI Audit Events',
    category: 'predefined',
    query: "'Log Source' = 'OCI Audit Logs' | head 10",
    description: 'Shows the 10 most recent OCI audit events.'
  },
  {
    id: 'audit_events_by_type',
    name: 'OCI Audit Events by Type',
    category: 'predefined',
    query: "'Log Source' = 'OCI Audit Logs' | stats count by 'Event Type' | sort -count | head 10",
    description: 'Shows top OCI audit event types by frequency.'
  },
  
  // Network Traffic Analysis
  {
    id: 'all_network_traffic',
    name: 'VCN Flow Logs Summary',
    category: 'predefined',
    query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | stats count by Action | sort -count",
    description: 'Shows VCN flow logs grouped by action (accept/reject).'
  },
  {
    id: 'top_10_denied_connections',
    name: 'VCN Flow Rejected Traffic',
    category: 'predefined',
    query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Action in ('reject') | head 10",
    description: 'Shows recent rejected network connections from VCN Flow Logs.'
  },
  {
    id: 'top_10_destination_ports',
    name: 'Top 10 Destination Ports by Traffic',
    category: 'predefined',
    query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | eval vol = unit('Content Size Out', byte) | stats sum(vol) as Volume by 'Destination Port' | top 10 Volume",
    description: 'Shows top 10 destination ports by traffic volume.'
  },
  {
    id: 'network_data_traffic_analytics',
    name: 'Network Data Traffic Analytics',
    category: 'predefined',
    query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | eval 'Content Size Out' = unit('Content Size Out', byte) | link span = 15minute Time, 'Source IP' | stats sum('Content Size Out') as 'Data Transfer' | classify 'Start Time', 'Source IP', 'Data Transfer' as 'Data Transfer Analysis'",
    description: 'Time-series analysis of network data transfer patterns.'
  },
  
  // Authentication and Login Analysis
  {
    id: 'top_10_windows_failed_logins',
    name: 'Top 10 Windows Failed Logins',
    category: 'predefined',
    query: "'Log Source' = 'Windows Security Events' and 'Security Result' = denied | fields 'Security Actor Endpoint Account', 'Security Category', 'Security Result', 'Security Command', 'Security Action', 'Security Actor Endpoint Name', 'Security Destination Endpoint Network Name', 'Security Destination Resource' | stats count by 'Security Destination Endpoint Account' | sort -Count | head 10",
    description: 'Top 10 Windows accounts with failed login attempts.'
  },
  {
    id: 'failed_ssh_logins_by_destination',
    name: 'Failed SSH Logins by Destination',
    category: 'predefined',
    query: "'Security Original Name' in (sshd, ssh) and 'Security Category' = authentication.login and 'Security Result' = denied | fields 'Security Actor Endpoint Network Address' as Destination | timestats count as Count by Destination",
    description: 'Failed SSH login attempts grouped by destination.'
  },
  
  // Suricata IDS Analysis
  {
    id: 'suricata_signatures',
    name: 'Suricata Signatures Overview',
    category: 'predefined',
    query: "'Log Source' = com.oraclecloud.logging.custom.Suricatalogs | fields SuricataSignature, SuricataSignatureID | stats count as logrecords by SuricataSignature | sort -logrecords",
    description: 'Overview of Suricata IDS signatures and their frequency.'
  },
  {
    id: 'suricata_signature_ids',
    name: 'Suricata Signature IDs',
    category: 'predefined',
    query: "'Log Source' = com.oraclecloud.logging.custom.Suricatalogs | fields SuricataSignature, SuricataSignatureID | stats count as logrecords by SuricataSignatureID | sort -logrecords",
    description: 'Suricata signature IDs ranked by detection frequency.'
  },
  {
    id: 'suricata_signature_percentage',
    name: 'Suricata Alert Signatures',
    category: 'predefined',
    query: "'Log Source' = com.oraclecloud.logging.custom.Suricatalogs and 'Event Type' = alert | fields SuricataSignature, SuricataSignatureID, 'Event Type', -'Host Name (Server)', -Entity, -'Entity Type', -'Problem Priority', -Label, -'Log Source' | stats count as logrecords by SuricataSignature",
    description: 'Suricata alert signatures with occurrence statistics.'
  },
  {
    id: 'suricata_destination_ip_percentage',
    name: 'Suricata Alert Destinations',
    category: 'predefined',
    query: "'Log Source' = com.oraclecloud.logging.custom.Suricatalogs and 'Event Type' = alert | fields SuricataSignature, SuricataSignatureID, 'Event Type', -'Host Name (Server)', -Entity, -'Entity Type', -'Problem Priority', -Label, -'Log Source' | stats count as logrecords by 'Destination IP'",
    description: 'Destination IPs targeted in Suricata alerts.'
  },
  
  // Geographic and Visual Analysis
  {
    id: 'map_allow_deny',
    name: 'Geographic Network Actions Map',
    category: 'predefined',
    query: "'Client Coordinates' != null and Action != null | geostats count by Action | highlightgroups color = red [ * | where Action = reject ] | highlightgroups color = green [ * | where Action in (accept, allow, alert) ] | highlightgroups color = blue [ * | where Action in (drop) ] | sort -Action",
    description: 'Geographical visualization of network actions (allow/deny/drop).'
  },
  
  // Windows Security Analysis
  {
    id: 'technique_ids_windows',
    name: 'Windows MITRE Technique IDs',
    category: 'predefined',
    query: "'Log Source' = 'Windows Sysmon Events' and Technique_id != T1574.002 | fields Technique_id",
    description: 'MITRE ATT&CK technique IDs from Windows Sysmon events.'
  },
  {
    id: 'windows_sysmon_detected_events',
    name: 'Windows Sysmon Events with MITRE Lookup',
    category: 'predefined',
    query: "'Log Source' = 'Windows Sysmon Events' and 'Event ID' != null | stats count by 'Event ID' | sort -Count | lookup table = MITRE select 'Event ID' as 'Event ID', 'Event Name', Channel, 'Audit Category', 'OSSEM Id' using 'Event ID' | fields 'Event ID', 'Event Name', Channel, 'Audit Category', 'OSSEM Id'",
    description: 'Windows Sysmon events enriched with MITRE ATT&CK data.'
  },
  
  // WAF Analysis
  {
    id: 'waf_requests_protection_capabilities',
    name: 'WAF Protection Capabilities',
    category: 'predefined',
    query: "'Log Source' = 'OCI WAF Logs' and 'Security Module' not like in ('%requestAccessControl%', '%responseAccessControl%', '%requestRateLimiting%', '%requestProtection%') and 'Security Module' != null and 'Request Protection Rule IDs Data' != null | rename 'Request Protection Rule IDs' as 'Request Protection Capabilities' | stats count by 'Request Protection Capabilities' | sort -Count | lookup table = 'Web Application Firewall Protection Capabilities' select Key as Key, Name, Description, Tags, _Version using 'Request Protection Capabilities' = 'Protection Capabilities' | fields Name, Key, Description, _Version | rename _Version as Version",
    description: 'WAF request protection capabilities with detailed lookup.'
  },
  {
    id: 'waf_protection_rules',
    name: 'WAF Protection Rules by Client',
    category: 'predefined',
    query: "'Log Source' = 'OCI WAF Logs' and 'Request Protection Rule IDs' != null | stats count('Host IP Address (Client)') by 'Request Protection Rule IDs', 'Host IP Address (Client)'",
    description: 'WAF protection rules triggered by client IP addresses.'
  }
]

// Load predefined queries from working-queries.json
const loadPredefinedQueries = async () => {
  try {
    const response = await fetch('/api/working-queries')
    const data = await response.json()
    
    if (data.success && data.data && data.data.queries) {
      PREDEFINED_QUERIES = data.data.queries.map((query: any) => ({
        id: query.id,
        name: query.name,
        category: 'predefined' as const,
        query: query.query,
        description: query.description
      }))
    }
  } catch (error) {
    console.error('Failed to load predefined queries from working-queries.json:', error)
    // Keep the fallback queries if loading fails
  }
}

export function useSavedQueries() {
  const [queries, setQueries] = useState<SavedQuery[]>([])
  const [queryStatus, setQueryStatus] = useState<Record<string, { successful: boolean; lastExecuted: Date }>>({})

  // Load saved queries from localStorage and working-queries.json
  useEffect(() => {
    const loadQueries = async () => {
      try {
        // Load predefined queries from working-queries.json
        await loadPredefinedQueries()
        
        // Load custom queries from localStorage
        const saved = localStorage.getItem(STORAGE_KEY)
        const customQueries = saved ? JSON.parse(saved) : []
        
        // Load query status
        const statusKey = 'logan-query-status'
        const statusData = localStorage.getItem(statusKey)
        const status = statusData ? JSON.parse(statusData) : {}
        
        setQueryStatus(status)
        setQueries([...PREDEFINED_QUERIES, ...customQueries])
      } catch (error) {
        console.error('Error loading saved queries:', error)
        setQueries(PREDEFINED_QUERIES)
      }
    }
    
    loadQueries()
  }, [])

  // Save custom queries to localStorage
  const saveCustomQueries = (customQueries: SavedQuery[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customQueries))
    } catch (error) {
      console.error('Error saving queries:', error)
    }
  }

  // Save query status
  const saveQueryStatus = (status: Record<string, { successful: boolean; lastExecuted: Date }>) => {
    try {
      localStorage.setItem('logan-query-status', JSON.stringify(status))
      setQueryStatus(status)
    } catch (error) {
      console.error('Error saving query status:', error)
    }
  }

  // Add a new custom query
  const saveQuery = (name: string, query: string, description?: string) => {
    console.log('Saving query:', { name, query, description })
    
    const newQuery: SavedQuery = {
      id: `custom-${Date.now()}`,
      name,
      query,
      category: 'custom',
      description
    }

    const customQueries = queries.filter(q => q.category === 'custom')
    const updatedCustomQueries = [...customQueries, newQuery]
    
    console.log('Updated custom queries:', updatedCustomQueries)
    
    saveCustomQueries(updatedCustomQueries)
    setQueries([...PREDEFINED_QUERIES, ...updatedCustomQueries])
    
    console.log('Query saved successfully with ID:', newQuery.id)
    return newQuery.id
  }

  // Delete a custom query
  const deleteQuery = (id: string) => {
    const customQueries = queries.filter(q => q.category === 'custom' && q.id !== id)
    saveCustomQueries(customQueries)
    setQueries([...PREDEFINED_QUERIES, ...customQueries])
  }

  // Update query execution status
  const updateQueryStatus = (queryId: string, successful: boolean) => {
    const newStatus = {
      ...queryStatus,
      [queryId]: {
        successful,
        lastExecuted: new Date()
      }
    }
    saveQueryStatus(newStatus)
  }

  // Get query by ID
  const getQuery = (id: string) => {
    return queries.find(q => q.id === id)
  }

  // Check if query was executed successfully
  const isQuerySuccessful = (queryId: string) => {
    return queryStatus[queryId]?.successful || false
  }

  // Get last execution time
  const getLastExecutionTime = (queryId: string) => {
    return queryStatus[queryId]?.lastExecuted
  }

  return {
    queries,
    saveQuery,
    deleteQuery,
    updateQueryStatus,
    getQuery,
    isQuerySuccessful,
    getLastExecutionTime,
    predefinedQueries: PREDEFINED_QUERIES,
    customQueries: queries.filter(q => q.category === 'custom')
  }
}
