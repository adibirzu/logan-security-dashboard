# Ludus API Integration Architecture

## Overview

This document provides the technical architecture and implementation details for integrating Ludus Cloud API into the Logan Security Dashboard.

## API Client Implementation

### Core Client Class

```typescript
// /lib/ludus/client.ts
import { LudusConfig, Range, VM, Template, User, AnsibleRole } from './types';

export class LudusClient {
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: LudusConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.headers = {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  // Range Management
  async getRanges(): Promise<Range[]> {
    const response = await fetch(`${this.baseUrl}/ranges`, {
      headers: this.headers,
    });
    return response.json();
  }

  async getRange(rangeId: string): Promise<Range> {
    const response = await fetch(`${this.baseUrl}/ranges/${rangeId}`, {
      headers: this.headers,
    });
    return response.json();
  }

  async createRange(config: RangeCreateRequest): Promise<Range> {
    const response = await fetch(`${this.baseUrl}/ranges`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(config),
    });
    return response.json();
  }

  async deployRange(rangeId: string): Promise<void> {
    await fetch(`${this.baseUrl}/ranges/${rangeId}/deploy`, {
      method: 'POST',
      headers: this.headers,
    });
  }

  async destroyRange(rangeId: string): Promise<void> {
    await fetch(`${this.baseUrl}/ranges/${rangeId}`, {
      method: 'DELETE',
      headers: this.headers,
    });
  }

  // VM Management
  async getRangeVMs(rangeId: string): Promise<VM[]> {
    const response = await fetch(`${this.baseUrl}/ranges/${rangeId}/vms`, {
      headers: this.headers,
    });
    return response.json();
  }

  async powerOnVM(rangeId: string, vmId: string): Promise<void> {
    await fetch(`${this.baseUrl}/ranges/${rangeId}/vms/${vmId}/power/on`, {
      method: 'POST',
      headers: this.headers,
    });
  }

  async powerOffVM(rangeId: string, vmId: string): Promise<void> {
    await fetch(`${this.baseUrl}/ranges/${rangeId}/vms/${vmId}/power/off`, {
      method: 'POST',
      headers: this.headers,
    });
  }

  // Template Management
  async getTemplates(): Promise<Template[]> {
    const response = await fetch(`${this.baseUrl}/templates`, {
      headers: this.headers,
    });
    return response.json();
  }

  async buildTemplate(templateId: string): Promise<void> {
    await fetch(`${this.baseUrl}/templates/${templateId}/build`, {
      method: 'POST',
      headers: this.headers,
    });
  }

  // Ansible Integration
  async installAnsibleRole(rangeId: string, role: AnsibleRole): Promise<void> {
    await fetch(`${this.baseUrl}/ranges/${rangeId}/ansible/roles`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(role),
    });
  }

  async runAnsiblePlaybook(rangeId: string, playbook: string, tags?: string[]): Promise<void> {
    await fetch(`${this.baseUrl}/ranges/${rangeId}/ansible/run`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ playbook, tags }),
    });
  }

  // User Management
  async getUsers(): Promise<User[]> {
    const response = await fetch(`${this.baseUrl}/users`, {
      headers: this.headers,
    });
    return response.json();
  }

  async createUser(user: UserCreateRequest): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(user),
    });
    return response.json();
  }

  // Testing State
  async setTestingState(rangeId: string, enabled: boolean): Promise<void> {
    await fetch(`${this.baseUrl}/ranges/${rangeId}/testing`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({ enabled }),
    });
  }

  // Snapshots
  async createSnapshot(rangeId: string, name: string): Promise<void> {
    await fetch(`${this.baseUrl}/ranges/${rangeId}/snapshots`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ name }),
    });
  }

  async revertSnapshot(rangeId: string, snapshotId: string): Promise<void> {
    await fetch(`${this.baseUrl}/ranges/${rangeId}/snapshots/${snapshotId}/revert`, {
      method: 'POST',
      headers: this.headers,
    });
  }
}
```

### Type Definitions

```typescript
// /lib/ludus/types.ts
export interface LudusConfig {
  apiKey: string;
  baseUrl: string;
}

export interface Range {
  id: string;
  name: string;
  status: 'building' | 'built' | 'deployed' | 'failed' | 'destroying';
  user_id: string;
  config: RangeConfig;
  created_at: string;
  deployed_at?: string;
  last_deployment?: string;
  vms: VM[];
}

export interface RangeConfig {
  name: string;
  description?: string;
  ludus: {
    vpc_cidr: string;
    region: string;
    availability_zone?: string;
  };
  domain?: {
    fqdn: string;
    netbios_name: string;
    dc_ip?: string;
  };
  networks?: Network[];
  vms: VMConfig[];
}

export interface VM {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  os: string;
  template: string;
  power_state: 'on' | 'off' | 'suspended';
  snapshot_count: number;
  ansible_managed: boolean;
}

export interface VMConfig {
  name: string;
  hostname: string;
  template: string;
  vcpus?: number;
  memory?: number;
  network_interfaces?: NetworkInterface[];
  ansible_roles?: string[];
  provisioning_scripts?: string[];
}

export interface Template {
  id: string;
  name: string;
  os_family: 'windows' | 'linux';
  os_version: string;
  description: string;
  min_vcpus: number;
  min_memory: number;
  disk_size: number;
  last_built?: string;
}

export interface AnsibleRole {
  name: string;
  source: string;
  version?: string;
  variables?: Record<string, any>;
}

export interface User {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  proxmox_user: string;
  created_at: string;
  allowed_ranges?: string[];
}

export interface RangeCreateRequest {
  name: string;
  config: RangeConfig;
  auto_deploy?: boolean;
  tags?: string[];
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  is_admin?: boolean;
}
```

## API Routes Implementation

### Range Management Routes

```typescript
// /app/api/ludus/ranges/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LudusClient } from '@/lib/ludus/client';
import { getServerSession } from '@/lib/auth';

const client = new LudusClient({
  apiKey: process.env.LUDUS_API_KEY!,
  baseUrl: process.env.LUDUS_API_URL!,
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ranges = await client.getRanges();
    
    // Filter ranges based on user permissions
    const userRanges = session.user.is_admin 
      ? ranges 
      : ranges.filter(r => r.user_id === session.user.id);

    return NextResponse.json(userRanges);
  } catch (error) {
    console.error('Error fetching ranges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ranges' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate range configuration
    const validation = validateRangeConfig(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors },
        { status: 400 }
      );
    }

    // Add user context to range
    const rangeConfig = {
      ...body,
      user_id: session.user.id,
      created_by: session.user.username,
    };

    const range = await client.createRange(rangeConfig);

    // Log range creation
    await logActivity({
      user_id: session.user.id,
      action: 'range_created',
      resource_type: 'range',
      resource_id: range.id,
      details: { name: range.name },
    });

    return NextResponse.json(range);
  } catch (error) {
    console.error('Error creating range:', error);
    return NextResponse.json(
      { error: 'Failed to create range' },
      { status: 500 }
    );
  }
}
```

### Ansible Integration Routes

```typescript
// /app/api/ludus/ansible/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LudusClient } from '@/lib/ludus/client';
import { validateAnsibleRole } from '@/lib/ludus/validators';

export async function POST(request: NextRequest) {
  try {
    const { rangeId, role, playbook, action } = await request.json();

    switch (action) {
      case 'install_role':
        if (!validateAnsibleRole(role)) {
          return NextResponse.json(
            { error: 'Invalid Ansible role configuration' },
            { status: 400 }
          );
        }
        await client.installAnsibleRole(rangeId, role);
        break;

      case 'run_playbook':
        await client.runAnsiblePlaybook(rangeId, playbook);
        break;

      case 'deploy_agent':
        // Deploy Logan security agent
        await deployLoganAgent(rangeId);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ansible operation failed:', error);
    return NextResponse.json(
      { error: 'Ansible operation failed' },
      { status: 500 }
    );
  }
}

async function deployLoganAgent(rangeId: string) {
  const agentRole = {
    name: 'logan-security-agent',
    source: 'https://github.com/logan-security/ansible-agent',
    variables: {
      logan_api_endpoint: process.env.NEXT_PUBLIC_API_URL,
      logan_api_key: process.env.LOGAN_AGENT_API_KEY,
      log_level: 'info',
      enable_monitoring: true,
    },
  };

  await client.installAnsibleRole(rangeId, agentRole);
  await client.runAnsiblePlaybook(rangeId, 'site.yml', ['agent']);
}
```

## Security Event Integration

### Event-to-Range Converter

```typescript
// /lib/ludus/event-converter.ts
import { SecurityEvent } from '@/types/security';
import { RangeConfig } from '@/lib/ludus/types';

export function convertEventToRangeConfig(event: SecurityEvent): RangeConfig {
  const config: RangeConfig = {
    name: `Investigation-${event.id}-${Date.now()}`,
    description: `Range created for investigating: ${event.title}`,
    ludus: {
      vpc_cidr: '10.0.0.0/16',
      region: 'us-east-1',
    },
    vms: [],
  };

  // Analyze event to determine required infrastructure
  if (event.type === 'authentication_failure') {
    config.vms.push({
      name: 'dc01',
      hostname: 'dc01',
      template: 'windows-2019-dc',
      ansible_roles: ['windows_domain_controller'],
    });
    
    config.vms.push({
      name: 'workstation01',
      hostname: 'ws01',
      template: 'windows-10',
      ansible_roles: ['windows_workstation', 'logging_agent'],
    });
  }

  if (event.indicators?.includes('web_attack')) {
    config.vms.push({
      name: 'webserver',
      hostname: 'web01',
      template: 'ubuntu-20.04',
      ansible_roles: ['nginx', 'modsecurity', 'logging_agent'],
    });
  }

  if (event.requires_attacker_simulation) {
    config.vms.push({
      name: 'attacker',
      hostname: 'kali01',
      template: 'kali-linux',
      ansible_roles: ['penetration_testing_tools'],
    });
  }

  // Add security monitoring
  config.vms.push({
    name: 'siem',
    hostname: 'siem01',
    template: 'security-onion',
    ansible_roles: ['security_monitoring', 'logan_integration'],
  });

  return config;
}
```

## State Management

### Ludus Store

```typescript
// /lib/stores/ludus-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LudusClient } from '@/lib/ludus/client';
import { Range, Template } from '@/lib/ludus/types';

interface LudusState {
  // State
  ranges: Range[];
  activeRange: Range | null;
  templates: Template[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRanges: () => Promise<void>;
  createRange: (config: RangeConfig) => Promise<Range>;
  deployRange: (rangeId: string) => Promise<void>;
  destroyRange: (rangeId: string) => Promise<void>;
  setActiveRange: (range: Range | null) => void;
  fetchTemplates: () => Promise<void>;
}

const client = new LudusClient({
  apiKey: process.env.NEXT_PUBLIC_LUDUS_API_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LUDUS_API_URL!,
});

export const useLudusStore = create<LudusState>()(
  persist(
    (set, get) => ({
      ranges: [],
      activeRange: null,
      templates: [],
      isLoading: false,
      error: null,

      fetchRanges: async () => {
        set({ isLoading: true, error: null });
        try {
          const ranges = await client.getRanges();
          set({ ranges, isLoading: false });
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      },

      createRange: async (config) => {
        set({ isLoading: true, error: null });
        try {
          const range = await client.createRange({ name: config.name, config });
          set((state) => ({
            ranges: [...state.ranges, range],
            isLoading: false,
          }));
          return range;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      deployRange: async (rangeId) => {
        set({ isLoading: true, error: null });
        try {
          await client.deployRange(rangeId);
          await get().fetchRanges(); // Refresh to get updated status
          set({ isLoading: false });
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      destroyRange: async (rangeId) => {
        set({ isLoading: true, error: null });
        try {
          await client.destroyRange(rangeId);
          set((state) => ({
            ranges: state.ranges.filter((r) => r.id !== rangeId),
            activeRange: state.activeRange?.id === rangeId ? null : state.activeRange,
            isLoading: false,
          }));
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      setActiveRange: (range) => {
        set({ activeRange: range });
      },

      fetchTemplates: async () => {
        try {
          const templates = await client.getTemplates();
          set({ templates });
        } catch (error) {
          set({ error: error.message });
        }
      },
    }),
    {
      name: 'ludus-storage',
      partialize: (state) => ({ activeRange: state.activeRange }),
    }
  )
);
```

## UI Components

### Range Creation Wizard

```typescript
// /components/cyber-range/RangeCreationWizard.tsx
'use client';

import { useState } from 'react';
import { useLudusStore } from '@/lib/stores/ludus-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';

const steps = [
  { id: 'basics', title: 'Basic Information' },
  { id: 'network', title: 'Network Configuration' },
  { id: 'vms', title: 'Virtual Machines' },
  { id: 'security', title: 'Security Tools' },
  { id: 'review', title: 'Review & Deploy' },
];

export function RangeCreationWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<Partial<RangeConfig>>({
    name: '',
    ludus: {
      vpc_cidr: '10.0.0.0/16',
      region: 'us-east-1',
    },
    vms: [],
  });

  const { createRange, deployRange } = useLudusStore();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDeploy = async () => {
    try {
      const range = await createRange(config as RangeConfig);
      await deployRange(range.id);
      // Navigate to range management
    } catch (error) {
      console.error('Failed to create range:', error);
    }
  };

  return (
    <Card className="p-6">
      <Stepper steps={steps} currentStep={currentStep} />
      
      <div className="mt-8">
        {currentStep === 0 && <BasicInfoStep config={config} onChange={setConfig} />}
        {currentStep === 1 && <NetworkConfigStep config={config} onChange={setConfig} />}
        {currentStep === 2 && <VMSelectionStep config={config} onChange={setConfig} />}
        {currentStep === 3 && <SecurityToolsStep config={config} onChange={setConfig} />}
        {currentStep === 4 && <ReviewStep config={config} />}
      </div>

      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          Back
        </Button>
        
        {currentStep < steps.length - 1 ? (
          <Button onClick={handleNext}>Next</Button>
        ) : (
          <Button onClick={handleDeploy}>Deploy Range</Button>
        )}
      </div>
    </Card>
  );
}
```

## Monitoring & Logging

### Activity Logger

```typescript
// /lib/ludus/activity-logger.ts
import { db } from '@/lib/db';

interface Activity {
  user_id: string;
  action: string;
  resource_type: 'range' | 'vm' | 'template' | 'user';
  resource_id: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

export async function logActivity(activity: Activity) {
  await db.insert('ludus_activities', {
    ...activity,
    timestamp: activity.timestamp || new Date(),
  });
}

export async function getActivities(filters?: {
  user_id?: string;
  resource_type?: string;
  start_date?: Date;
  end_date?: Date;
}) {
  let query = db.select().from('ludus_activities');
  
  if (filters?.user_id) {
    query = query.where('user_id', filters.user_id);
  }
  
  if (filters?.resource_type) {
    query = query.where('resource_type', filters.resource_type);
  }
  
  if (filters?.start_date) {
    query = query.where('timestamp', '>=', filters.start_date);
  }
  
  if (filters?.end_date) {
    query = query.where('timestamp', '<=', filters.end_date);
  }
  
  return query.orderBy('timestamp', 'desc').limit(100);
}
```

## Error Handling

### Custom Error Classes

```typescript
// /lib/ludus/errors.ts
export class LudusError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'LudusError';
  }
}

export class RangeCreationError extends LudusError {
  constructor(message: string, details?: any) {
    super(message, 'RANGE_CREATION_FAILED', 400);
    this.details = details;
  }
}

export class AnsibleDeploymentError extends LudusError {
  constructor(message: string, rangeId: string) {
    super(message, 'ANSIBLE_DEPLOYMENT_FAILED', 500);
    this.rangeId = rangeId;
  }
}

export class AuthenticationError extends LudusError {
  constructor() {
    super('Invalid API credentials', 'AUTH_FAILED', 401);
  }
}
```

## Testing

### Integration Tests

```typescript
// /tests/ludus/integration.test.ts
import { LudusClient } from '@/lib/ludus/client';
import { mockServer } from '@/tests/mocks/ludus-server';

describe('Ludus Integration', () => {
  let client: LudusClient;

  beforeAll(() => {
    mockServer.listen();
    client = new LudusClient({
      apiKey: 'test-api-key',
      baseUrl: 'http://localhost:3001',
    });
  });

  afterAll(() => mockServer.close());

  describe('Range Management', () => {
    it('should create and deploy a range', async () => {
      const config = {
        name: 'test-range',
        ludus: { vpc_cidr: '10.0.0.0/16', region: 'us-east-1' },
        vms: [{ name: 'test-vm', template: 'ubuntu-20.04' }],
      };

      const range = await client.createRange({ name: config.name, config });
      expect(range.status).toBe('building');

      await client.deployRange(range.id);
      const deployed = await client.getRange(range.id);
      expect(deployed.status).toBe('deployed');
    });
  });

  describe('Ansible Integration', () => {
    it('should install and run ansible roles', async () => {
      const rangeId = 'test-range-id';
      const role = {
        name: 'test-role',
        source: 'ansible-galaxy',
      };

      await expect(
        client.installAnsibleRole(rangeId, role)
      ).resolves.not.toThrow();

      await expect(
        client.runAnsiblePlaybook(rangeId, 'site.yml')
      ).resolves.not.toThrow();
    });
  });
});
```

## Performance Optimization

### Caching Strategy

```typescript
// /lib/ludus/cache.ts
import { LRUCache } from 'lru-cache';

const rangeCache = new LRUCache<string, Range>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
});

const templateCache = new LRUCache<string, Template[]>({
  max: 1,
  ttl: 1000 * 60 * 60, // 1 hour
});

export function getCachedRange(rangeId: string): Range | undefined {
  return rangeCache.get(rangeId);
}

export function setCachedRange(range: Range): void {
  rangeCache.set(range.id, range);
}

export function invalidateRangeCache(rangeId?: string): void {
  if (rangeId) {
    rangeCache.delete(rangeId);
  } else {
    rangeCache.clear();
  }
}
```

## Deployment Configuration

### Environment Variables

```bash
# .env.production
LUDUS_API_KEY=your-production-api-key
LUDUS_API_URL=https://ludus.your-domain.com/api
LUDUS_ADMIN_MODE=true
LUDUS_MAX_RANGES_PER_USER=5
LUDUS_DEFAULT_REGION=us-east-1
LUDUS_ANSIBLE_TIMEOUT=3600
LUDUS_WEBHOOK_SECRET=your-webhook-secret
```

### Docker Integration

```dockerfile
# Dockerfile.ludus
FROM node:18-alpine

# Install Ansible
RUN apk add --no-cache ansible py3-pip

# Install Python dependencies
RUN pip3 install ansible-core jinja2 pyyaml

# Copy application
WORKDIR /app
COPY . .

# Install dependencies
RUN npm ci --only=production

# Build application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

This architecture provides a robust foundation for integrating Ludus Cloud with the Logan Security Dashboard, enabling seamless cyber range management and security training capabilities.