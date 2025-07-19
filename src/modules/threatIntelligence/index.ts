/**
 * Threat Intelligence Module
 * Self-contained module for threat intelligence features
 */

import { ModuleDefinition } from '../index'
import React from 'react'
import { Shield, Target, Globe, Database } from 'lucide-react'
import ThreatIntelligencePage from './pages/ThreatIntelligencePage'
import ThreatDataSubmission from './components/ThreatDataSubmission'
import ThreatIndicatorsWidget from './components/ThreatIndicatorsWidget'

export const threatIntelligenceModule: ModuleDefinition = {
  id: 'threat-intelligence',
  name: 'Threat Intelligence',
  description: 'IOC management, threat actor tracking, and OCI integration',
  version: '1.0.0',
  category: 'security',
  enabled: true,
  dependencies: ['core'],
  
  routes: [
    {
      path: '/threat-intelligence',
      component: ThreatIntelligencePage,
      title: 'Threat Intelligence',
      description: 'Manage threat indicators and intelligence data',
      permissions: ['threat-intel:read'],
    },
  ],

  components: [
    {
      id: 'threat-indicators-widget',
      name: 'Threat Indicators Widget',
      component: ThreatIndicatorsWidget,
      type: 'widget',
      placement: {
        position: 'main',
        order: 1,
      },
    },
    {
      id: 'threat-data-submission',
      name: 'Threat Data Submission',
      component: ThreatDataSubmission,
      type: 'modal',
    },
  ],

  menuItems: [
    {
      id: 'threat-intelligence-menu',
      label: 'Threat Intelligence',
      path: '/threat-intelligence',
      icon: React.createElement(Shield),
      section: 'security',
      order: 10,
      permissions: ['threat-intel:read'],
      children: [
        {
          id: 'iocs',
          label: 'IOCs & Indicators',
          path: '/threat-intelligence/iocs',
          icon: React.createElement(Target),
          permissions: ['threat-intel:read'],
        },
        {
          id: 'threat-actors',
          label: 'Threat Actors',
          path: '/threat-intelligence/actors',
          icon: React.createElement(Globe),
          permissions: ['threat-intel:read'],
        },
        {
          id: 'submit-intel',
          label: 'Submit Intelligence',
          path: '/threat-intelligence/submit',
          icon: React.createElement(Database),
          permissions: ['threat-intel:write'],
        },
      ],
    },
  ],

  permissions: [
    'threat-intel:read',
    'threat-intel:write',
    'threat-intel:delete',
    'threat-intel:oci-submit',
  ],

  config: {
    ociIntegration: {
      type: 'boolean',
      default: true,
      description: 'Enable OCI Threat Intelligence integration',
      required: false,
    },
    autoVerification: {
      type: 'boolean',
      default: false,
      description: 'Automatically verify indicators with OCI',
      required: false,
    },
    maxIndicators: {
      type: 'number',
      default: 10000,
      description: 'Maximum number of indicators to store',
      required: false,
      validation: { min: 100, max: 100000 },
    },
    refreshInterval: {
      type: 'number',
      default: 300000, // 5 minutes
      description: 'Refresh interval for OCI data (milliseconds)',
      required: false,
      validation: { min: 60000, max: 3600000 },
    },
  },
}

export default threatIntelligenceModule