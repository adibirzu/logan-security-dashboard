/**
 * Core Module
 * Essential functionality required by all other modules
 */

import { ModuleDefinition } from '../index'
import React from 'react'
import { Home, Settings, Search, FileText } from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'

export const coreModule: ModuleDefinition = {
  id: 'core',
  name: 'Core System',
  description: 'Essential system functionality and navigation',
  version: '1.0.0',
  category: 'core',
  enabled: true,
  
  routes: [
    {
      path: '/',
      component: DashboardPage,
      exact: true,
      title: 'Dashboard',
      description: 'Main security dashboard overview',
    },
    {
      path: '/settings',
      component: SettingsPage,
      title: 'Settings',
      description: 'System configuration and preferences',
      permissions: ['system:settings'],
    },
  ],

  menuItems: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      icon: React.createElement(Home),
      section: 'main',
      order: 0,
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: React.createElement(Settings),
      section: 'main',
      order: 1000,
      permissions: ['system:settings'],
    },
  ],

  permissions: [
    'system:read',
    'system:settings',
    'system:admin',
  ],

  config: {
    theme: {
      type: 'string',
      default: 'system',
      description: 'Default theme preference',
      validation: { enum: ['light', 'dark', 'system'] },
    },
    autoRefresh: {
      type: 'boolean',
      default: true,
      description: 'Enable automatic data refresh',
    },
    refreshInterval: {
      type: 'number',
      default: 30000,
      description: 'Auto refresh interval (milliseconds)',
      validation: { min: 5000, max: 300000 },
    },
  },
}

export default coreModule