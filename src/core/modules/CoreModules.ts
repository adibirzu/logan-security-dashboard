/**
 * Core Modules Registration
 * Defines all the core security modules for the Logan Security Dashboard
 */

import { 
  Database, 
  Shield, 
  TrendingUp, 
  Target, 
  Map, 
  Settings, 
  Server, 
  BarChart3, 
  Eye, 
  Search,
  HardDrive,
  Zap,
  AlertTriangle,
  Users,
  HelpCircle
} from 'lucide-react'

import { ModuleDefinition, moduleRegistry } from './ModuleRegistry'

// Import page components (these will be lazy-loaded in production)
import QueryBuilderPage from '@/app/query-builder/page'
import ThreatAnalyticsPage from '@/app/threat-analytics/page'
import MitreAttackPage from '@/app/mitre-attack/page'
import ThreatHuntingPage from '@/app/threat-hunting/page'
import IncidentResponsePage from '@/app/incident-response/page'
import ThreatMapPage from '@/app/threat-map/page'
import SettingsPage from '@/app/settings/page'
import ComputePage from '@/app/compute/page'
import LogSourcesPage from '@/app/log-sources/page'
import RitaDiscoveryPage from '@/app/rita-discovery/page'
import StorageAnalyticsPage from '@/app/storage-analytics/page'
import SecurityOverviewPage from '@/app/security-overview/page'
import QueryLogsPage from '@/app/query-logs/page'
import NetworkAnalysisPage from '@/app/network-analysis/page'
import HelpPage from '@/app/help/page'

// Core security modules
const coreModules: ModuleDefinition[] = [
  {
    id: 'security-overview',
    name: 'Security Overview',
    version: '1.0.0',
    description: 'Comprehensive security metrics dashboard and overview',
    author: 'Logan Security Team',
    dependencies: [],
    category: 'security',
    tags: ['security', 'overview', 'dashboard', 'metrics'],
    permissions: ['security:read'],
    icon: Shield,
    routes: [
      {
        path: '/security-overview',
        component: SecurityOverviewPage,
        name: 'Security Overview',
        description: 'Comprehensive security metrics and analysis',
        icon: Shield
      }
    ],
    api: {
      baseUrl: '/api/dashboard',
      endpoints: {
        metrics: '/api/dashboard/metrics',
        threats: '/api/dashboard/threats',
        activities: '/api/dashboard/activities'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enableRealTimeUpdates: true,
        refreshInterval: 30000
      },
      features: {
        realTimeUpdates: true,
        metricsDisplay: true,
        threatAnalysis: true
      }
    }
  },
  {
    id: 'query-builder',
    name: 'Query Builder',
    version: '2.0.0',
    description: 'Advanced query builder with Logan queries, visualizations, and export capabilities',
    author: 'Logan Security Team',
    dependencies: [],
    category: 'analytics',
    tags: ['queries', 'visualization', 'analytics', 'export'],
    permissions: ['query:read', 'query:write', 'query:execute'],
    icon: Database,
    routes: [
      {
        path: '/query-builder',
        component: QueryBuilderPage,
        name: 'Query Builder',
        description: 'Build queries, execute, and visualize results with Logan queries',
        icon: Database,
        badge: { text: 'Enhanced', variant: 'success' }
      }
    ],
    api: {
      baseUrl: '/api/logan-queries',
      endpoints: {
        queries: '/api/logan-queries',
        execute: '/api/mcp/search',
        export: '/api/stix/export'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        defaultTimeRange: '1440m',
        maxResults: 1000,
        enableExport: true,
        enableVisualization: true
      },
      features: {
        loganQueries: true,
        securityRules: true,
        visualization: true,
        export: true,
        history: true
      }
    }
  },
  {
    id: 'threat-analytics',
    name: 'Threat Analytics',
    version: '1.5.0',
    description: 'Advanced threat detection and analysis with RITA integration',
    author: 'Logan Security Team',
    dependencies: ['query-builder'],
    category: 'security',
    tags: ['threat-detection', 'rita', 'network-analysis', 'security'],
    permissions: ['threat:read', 'threat:analyze'],
    icon: TrendingUp,
    routes: [
      {
        path: '/threat-analytics',
        component: ThreatAnalyticsPage,
        name: 'Threat Analytics',
        description: 'Advanced threat detection and analysis',
        icon: TrendingUp,
        badge: { text: 'Enhanced', variant: 'success' }
      }
    ],
    api: {
      baseUrl: '/api/threat-analytics',
      endpoints: {
        stats: '/api/threat-analytics/stats',
        threats: '/api/threat-analytics/threats',
        rita: '/api/rita/discover'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enableRITA: true,
        enableGraphAnalysis: true,
        enableIPAnalysis: true
      },
      features: {
        rita: true,
        graphAnalysis: true,
        ipAnalysis: true,
        beaconDetection: true
      }
    }
  },
  {
    id: 'mitre-attack',
    name: 'MITRE ATT&CK',
    version: '2.0.0',
    description: 'MITRE ATT&CK framework integration with Windows Sysmon events',
    author: 'Logan Security Team',
    dependencies: ['query-builder'],
    category: 'security',
    tags: ['mitre', 'attack-framework', 'sysmon', 'techniques'],
    permissions: ['mitre:read', 'mitre:analyze'],
    icon: Target,
    routes: [
      {
        path: '/mitre-attack',
        component: MitreAttackPage,
        name: 'MITRE ATT&CK',
        description: 'Analyze security events mapped to MITRE ATT&CK tactics and techniques',
        icon: Target,
        badge: { text: 'Enhanced', variant: 'success' }
      }
    ],
    api: {
      baseUrl: '/api/mitre',
      endpoints: {
        techniques: '/api/mitre/sysmon-techniques',
        layer: '/api/mitre/layer'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enableSysmonEvents: true,
        enableTechniqueMapping: true,
        enableNavigatorExport: true
      },
      features: {
        sysmonEvents: true,
        techniqueMapping: true,
        navigatorExport: true,
        realTimeAnalysis: true
      }
    }
  },
  {
    id: 'threat-hunting',
    name: 'Threat Hunting',
    version: '1.3.0',
    description: 'Proactive threat hunting with playbooks and methodologies',
    author: 'Logan Security Team',
    dependencies: ['query-builder', 'threat-analytics'],
    category: 'security',
    tags: ['threat-hunting', 'playbooks', 'proactive-security'],
    permissions: ['hunt:read', 'hunt:execute'],
    icon: Search,
    routes: [
      {
        path: '/threat-hunting',
        component: ThreatHuntingPage,
        name: 'Threat Hunting',
        description: 'Proactive threat hunting with advanced methodologies',
        icon: Search,
        badge: { text: 'Advanced', variant: 'info' }
      }
    ],
    api: {
      baseUrl: '/api/threat-intelligence',
      endpoints: {
        intelligence: '/api/threat-intelligence',
        indicators: '/api/threat-intelligence'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enablePlaybooks: true,
        enableThreatIntel: true,
        enableAutomation: true
      },
      features: {
        playbooks: true,
        threatIntel: true,
        automation: true,
        indicators: true
      }
    }
  },
  {
    id: 'incident-response',
    name: 'Incident Response',
    version: '1.2.0',
    description: 'Incident response management with n8n workflow integration',
    author: 'Logan Security Team',
    dependencies: ['threat-analytics', 'threat-hunting'],
    category: 'incident-response',
    tags: ['incident-response', 'workflows', 'automation', 'n8n'],
    permissions: ['incident:read', 'incident:write', 'incident:manage'],
    icon: AlertTriangle,
    routes: [
      {
        path: '/incident-response',
        component: IncidentResponsePage,
        name: 'Incident Response',
        description: 'Comprehensive incident response management',
        icon: AlertTriangle,
        badge: { text: 'Pro', variant: 'warning' }
      }
    ],
    api: {
      baseUrl: '/api/n8n',
      endpoints: {
        trigger: '/api/n8n/trigger',
        webhook: '/api/n8n/webhook'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enableN8nIntegration: true,
        enableWorkflows: true,
        enableAutomation: true
      },
      features: {
        n8nIntegration: true,
        workflows: true,
        automation: true,
        timeline: true
      }
    }
  },
  {
    id: 'threat-map',
    name: 'Threat Map',
    version: '1.1.0',
    description: 'Global threat visualization and geographical analysis',
    author: 'Logan Security Team',
    dependencies: ['threat-analytics'],
    category: 'monitoring',
    tags: ['threat-map', 'visualization', 'geography', 'monitoring'],
    permissions: ['map:read', 'map:analyze'],
    icon: Map,
    routes: [
      {
        path: '/threat-map',
        component: ThreatMapPage,
        name: 'Threat Map',
        description: 'Global threat visualization and geographical analysis',
        icon: Map,
        badge: { text: 'Live', variant: 'info' }
      }
    ],
    api: {
      baseUrl: '/api/threat-map',
      endpoints: {
        threats: '/api/threat-map'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enableRealTime: true,
        enableGeolocation: true,
        enableAnimation: true
      },
      features: {
        realTime: true,
        geolocation: true,
        animation: true,
        statistics: true
      }
    }
  },
  {
    id: 'compute-monitoring',
    name: 'Compute Monitoring',
    version: '1.0.0',
    description: 'OCI compute instance monitoring and management',
    author: 'Logan Security Team',
    dependencies: [],
    category: 'monitoring',
    tags: ['compute', 'monitoring', 'oci', 'instances'],
    permissions: ['compute:read', 'compute:monitor'],
    icon: Server,
    routes: [
      {
        path: '/compute',
        component: ComputePage,
        name: 'Compute',
        description: 'Monitor and manage OCI compute instances',
        icon: Server
      }
    ],
    api: {
      baseUrl: '/api/compute',
      endpoints: {
        instances: '/api/compute/instances',
        metrics: '/api/compute/metrics',
        compartments: '/api/compute/compartments'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enableMetrics: true,
        enableCompartments: true,
        refreshInterval: 30000
      },
      features: {
        metrics: true,
        compartments: true,
        drillDown: true
      }
    }
  },
  {
    id: 'storage-analytics',
    name: 'Storage Analytics',
    version: '1.0.0',
    description: 'Storage usage monitoring and analytics',
    author: 'Logan Security Team',
    dependencies: [],
    category: 'monitoring',
    tags: ['storage', 'analytics', 'monitoring', 'usage'],
    permissions: ['storage:read', 'storage:analyze'],
    icon: HardDrive,
    routes: [
      {
        path: '/storage-analytics',
        component: StorageAnalyticsPage,
        name: 'Storage Analytics',
        description: 'Monitor storage usage and performance',
        icon: HardDrive
      }
    ],
    api: {
      baseUrl: '/api/mcp/storage-usage',
      endpoints: {
        usage: '/api/mcp/storage-usage'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enableUsageTracking: true,
        enableAlerts: true
      },
      features: {
        usageTracking: true,
        alerts: true,
        analytics: true
      }
    }
  },
  {
    id: 'settings',
    name: 'Settings',
    version: '1.0.0',
    description: 'Application settings and configuration management',
    author: 'Logan Security Team',
    dependencies: [],
    category: 'compliance',
    tags: ['settings', 'configuration', 'management'],
    permissions: ['settings:read', 'settings:write'],
    icon: Settings,
    routes: [
      {
        path: '/settings',
        component: SettingsPage,
        name: 'Settings',
        description: 'Application settings and service monitoring',
        icon: Settings
      }
    ],
    api: {
      baseUrl: '/api/mcp/health',
      endpoints: {
        health: '/api/mcp/health'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enableHealthChecks: true,
        enableServiceMonitoring: true
      },
      features: {
        healthChecks: true,
        serviceMonitoring: true,
        configuration: true
      }
    }
  },
  {
    id: 'help',
    name: 'Help & Documentation',
    version: '1.0.0',
    description: 'Scoring methodology and system documentation',
    author: 'Logan Security Team',
    dependencies: [],
    category: 'compliance',
    tags: ['help', 'documentation', 'scoring', 'methodology'],
    permissions: ['help:read'],
    icon: HelpCircle,
    routes: [
      {
        path: '/help',
        component: HelpPage,
        name: 'Help',
        description: 'Scoring methodology and system documentation',
        icon: HelpCircle
      }
    ],
    api: {
      baseUrl: '/help',
      endpoints: {},
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enableDocumentation: true,
        enableMethodologyGuide: true
      },
      features: {
        documentation: true,
        methodologyGuide: true,
        scoringExplanation: true
      }
    }
  }
]

// Additional utility modules
const utilityModules: ModuleDefinition[] = [
  {
    id: 'log-sources',
    name: 'Log Sources',
    version: '1.0.0',
    description: 'Dynamic log source discovery and management',
    author: 'Logan Security Team',
    dependencies: ['query-builder'],
    category: 'monitoring',
    tags: ['logs', 'sources', 'discovery'],
    permissions: ['logs:read'],
    icon: Eye,
    routes: [
      {
        path: '/log-sources',
        component: LogSourcesPage,
        name: 'Log Sources',
        description: 'Discover and manage log sources',
        icon: Eye
      }
    ],
    api: {
      baseUrl: '/api/mcp/sources',
      endpoints: {
        sources: '/api/mcp/sources'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enableDiscovery: true,
        enableManagement: true
      },
      features: {
        discovery: true,
        management: true,
        monitoring: true
      }
    }
  },
  {
    id: 'rita-discovery',
    name: 'RITA Discovery',
    version: '1.0.0',
    description: 'Network analysis and discovery with RITA',
    author: 'Logan Security Team',
    dependencies: ['threat-analytics'],
    category: 'analytics',
    tags: ['rita', 'network', 'discovery', 'analysis'],
    permissions: ['rita:read', 'rita:analyze'],
    icon: BarChart3,
    routes: [
      {
        path: '/rita-discovery',
        component: RitaDiscoveryPage,
        name: 'RITA Discovery',
        description: 'Network analysis and discovery',
        icon: BarChart3,
        badge: { text: 'Beta', variant: 'secondary' }
      }
    ],
    api: {
      baseUrl: '/api/rita',
      endpoints: {
        discover: '/api/rita/discover',
        communications: '/api/rita/communications',
        applications: '/api/rita/applications'
      },
      version: '1.0.0'
    },
    config: {
      enabled: true,
      settings: {
        enableNetworkAnalysis: true,
        enableDiscovery: true
      },
      features: {
        networkAnalysis: true,
        discovery: true,
        visualization: true
      }
    }
  }
]

// Register all core modules
export function registerCoreModules() {
  console.log('Registering core modules...')
  
  try {
    [...coreModules, ...utilityModules].forEach(module => {
      moduleRegistry.register(module)
    })
    
    console.log(`Successfully registered ${coreModules.length + utilityModules.length} core modules`)
  } catch (error) {
    console.error('Failed to register core modules:', error)
  }
}

export { coreModules, utilityModules }