# Ansible Integration for Management Agent Deployment

## Overview

This document details the Ansible integration architecture for deploying Logan Security management agents and hunting rules across Ludus cyber ranges.

## Architecture Design

### Integration Components

```
┌────────────────────────────────────────────────────────────┐
│                    Logan Dashboard                          │
├────────────────────────────────────────────────────────────┤
│              Ansible Controller Interface                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Playbook    │  │   Inventory  │  │     Variable     │ │
│  │  Manager     │  │   Generator  │  │     Manager      │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
├────────────────────────────────────────────────────────────┤
│                 Ansible Execution Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   AWX/Tower  │  │  Ansible     │  │    Callback      │ │
│  │  Integration │  │  Runner      │  │    Plugins       │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
├────────────────────────────────────────────────────────────┤
│                   Ludus Integration                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │    Range     │  │      VM      │  │   Credential     │ │
│  │   Discovery  │  │  Targeting   │  │   Management     │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## Ansible Playbooks

### 1. Logan Agent Deployment Playbook

```yaml
# /ansible/playbooks/deploy-logan-agent.yml
---
- name: Deploy Logan Security Agent
  hosts: all
  gather_facts: yes
  become: yes
  vars:
    logan_version: "{{ logan_agent_version | default('latest') }}"
    logan_api_endpoint: "{{ lookup('env', 'LOGAN_API_ENDPOINT') }}"
    logan_api_key: "{{ lookup('env', 'LOGAN_AGENT_API_KEY') }}"
    
  tasks:
    - name: Detect OS family
      set_fact:
        is_windows: "{{ ansible_os_family == 'Windows' }}"
        is_linux: "{{ ansible_os_family in ['Debian', 'RedHat', 'Suse'] }}"

    - name: Include OS-specific variables
      include_vars: "{{ item }}"
      with_first_found:
        - "vars/{{ ansible_distribution }}-{{ ansible_distribution_major_version }}.yml"
        - "vars/{{ ansible_distribution }}.yml"
        - "vars/{{ ansible_os_family }}.yml"
        - "vars/default.yml"

    - name: Deploy Windows Agent
      include_tasks: tasks/windows-agent.yml
      when: is_windows

    - name: Deploy Linux Agent
      include_tasks: tasks/linux-agent.yml
      when: is_linux

    - name: Configure agent
      template:
        src: logan-agent.conf.j2
        dest: "{{ logan_config_path }}"
        mode: '0600'
      notify: restart logan agent

    - name: Start and enable Logan agent
      service:
        name: logan-agent
        state: started
        enabled: yes

    - name: Verify agent connection
      uri:
        url: "{{ logan_api_endpoint }}/api/agents/verify"
        method: POST
        headers:
          Authorization: "Bearer {{ logan_api_key }}"
        body_format: json
        body:
          agent_id: "{{ ansible_hostname }}"
      register: verify_result
      retries: 3
      delay: 10

  handlers:
    - name: restart logan agent
      service:
        name: logan-agent
        state: restarted
```

### 2. Windows Agent Tasks

```yaml
# /ansible/tasks/windows-agent.yml
---
- name: Create Logan directory
  win_file:
    path: C:\Program Files\Logan
    state: directory

- name: Download Logan agent installer
  win_get_url:
    url: "{{ logan_download_url }}/logan-agent-{{ logan_version }}-windows.msi"
    dest: C:\temp\logan-agent.msi

- name: Install Logan agent
  win_package:
    path: C:\temp\logan-agent.msi
    state: present
    arguments:
      - /quiet
      - /norestart
      - APIENDPOINT={{ logan_api_endpoint }}
      - APIKEY={{ logan_api_key }}

- name: Configure Windows Firewall for Logan
  win_firewall_rule:
    name: Logan Agent
    localport: 5985
    action: allow
    direction: in
    protocol: tcp
    state: present
    enabled: yes

- name: Install Sysmon for enhanced logging
  block:
    - name: Download Sysmon
      win_get_url:
        url: https://download.sysinternals.com/files/Sysmon.zip
        dest: C:\temp\sysmon.zip

    - name: Extract Sysmon
      win_unzip:
        src: C:\temp\sysmon.zip
        dest: C:\temp\sysmon

    - name: Install Sysmon with Logan config
      win_command: |
        C:\temp\sysmon\Sysmon64.exe -accepteula -i C:\Program Files\Logan\sysmon-config.xml

- name: Configure Windows Event Log forwarding
  win_template:
    src: windows-event-forwarding.xml.j2
    dest: C:\Program Files\Logan\event-forwarding.xml
  notify: restart windows event log
```

### 3. Linux Agent Tasks

```yaml
# /ansible/tasks/linux-agent.yml
---
- name: Add Logan repository key
  apt_key:
    url: "{{ logan_repo_key_url }}"
    state: present
  when: ansible_os_family == "Debian"

- name: Add Logan repository
  apt_repository:
    repo: "{{ logan_apt_repo }}"
    state: present
  when: ansible_os_family == "Debian"

- name: Install Logan agent package
  package:
    name: logan-agent
    state: present

- name: Install dependencies
  package:
    name:
      - python3
      - python3-pip
      - auditd
      - rsyslog
    state: present

- name: Configure auditd rules for Logan
  template:
    src: audit.rules.j2
    dest: /etc/audit/rules.d/logan.rules
  notify: restart auditd

- name: Configure rsyslog for Logan
  template:
    src: rsyslog-logan.conf.j2
    dest: /etc/rsyslog.d/50-logan.conf
  notify: restart rsyslog

- name: Deploy OSSEC agent for host IDS
  include_role:
    name: ossec-agent
  vars:
    ossec_server_ip: "{{ logan_api_endpoint | urlsplit('hostname') }}"
    ossec_agent_config_profiles:
      - docker
      - ssh_integrity_check

- name: Set up file integrity monitoring
  copy:
    src: fim-config.yml
    dest: /etc/logan/fim-config.yml
  notify: restart logan agent
```

### 4. Hunting Rules Deployment

```yaml
# /ansible/playbooks/deploy-hunting-rules.yml
---
- name: Deploy Logan Hunting Rules
  hosts: all
  gather_facts: yes
  become: yes
  vars:
    rules_repository: "{{ logan_rules_repo | default('https://github.com/logan-security/hunting-rules') }}"
    
  tasks:
    - name: Clone hunting rules repository
      git:
        repo: "{{ rules_repository }}"
        dest: /opt/logan/hunting-rules
        version: "{{ rules_version | default('main') }}"

    - name: Process rule templates
      template:
        src: "{{ item }}"
        dest: "/etc/logan/rules/{{ item | basename | regex_replace('\\.j2$', '') }}"
      with_fileglob:
        - /opt/logan/hunting-rules/templates/*.j2

    - name: Deploy YARA rules
      copy:
        src: "{{ item }}"
        dest: /etc/logan/yara/
      with_fileglob:
        - /opt/logan/hunting-rules/yara/*.yar

    - name: Deploy Sigma rules
      copy:
        src: "{{ item }}"
        dest: /etc/logan/sigma/
      with_fileglob:
        - /opt/logan/hunting-rules/sigma/*.yml

    - name: Configure scheduled rule execution
      cron:
        name: "Logan rule: {{ item.name }}"
        minute: "{{ item.schedule.minute | default('*/5') }}"
        hour: "{{ item.schedule.hour | default('*') }}"
        job: "/usr/bin/logan-hunt --rule {{ item.file }} --output /var/log/logan/{{ item.name }}.log"
      loop: "{{ logan_scheduled_rules }}"

    - name: Deploy custom detection scripts
      copy:
        src: "{{ item }}"
        dest: /opt/logan/scripts/
        mode: '0755'
      with_fileglob:
        - /opt/logan/hunting-rules/scripts/*.py
        - /opt/logan/hunting-rules/scripts/*.sh

    - name: Reload Logan agent to pick up new rules
      service:
        name: logan-agent
        state: reloaded
```

## Ansible Roles

### 1. Logan Agent Role Structure

```
/ansible/roles/logan-agent/
├── defaults/
│   └── main.yml
├── files/
│   ├── audit.rules
│   ├── sysmon-config.xml
│   └── yara-rules/
├── handlers/
│   └── main.yml
├── meta/
│   └── main.yml
├── tasks/
│   ├── main.yml
│   ├── configure.yml
│   ├── install.yml
│   └── validate.yml
├── templates/
│   ├── logan-agent.conf.j2
│   └── rsyslog-logan.conf.j2
└── vars/
    ├── Debian.yml
    ├── RedHat.yml
    └── Windows.yml
```

### 2. Role Variables

```yaml
# /ansible/roles/logan-agent/defaults/main.yml
---
# Logan Agent Configuration
logan_agent_version: "2.1.0"
logan_agent_port: 5985
logan_agent_log_level: "info"

# API Configuration
logan_api_endpoint: "https://logan.example.com"
logan_api_key: "{{ vault_logan_api_key }}"

# Agent Features
logan_enable_fim: true
logan_enable_process_monitoring: true
logan_enable_network_monitoring: true
logan_enable_registry_monitoring: "{{ ansible_os_family == 'Windows' }}"

# Log Collection
logan_log_sources:
  - type: syslog
    path: /var/log/syslog
    enabled: "{{ ansible_os_family != 'Windows' }}"
  - type: auth
    path: /var/log/auth.log
    enabled: "{{ ansible_os_family != 'Windows' }}"
  - type: windows_security
    channel: Security
    enabled: "{{ ansible_os_family == 'Windows' }}"
  - type: windows_system
    channel: System
    enabled: "{{ ansible_os_family == 'Windows' }}"

# Performance Tuning
logan_max_cpu_percent: 20
logan_max_memory_mb: 512
logan_batch_size: 1000
logan_flush_interval: 30
```

## Integration with Logan Dashboard

### 1. Ansible Controller Interface

```typescript
// /lib/ansible/controller.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';

const execAsync = promisify(exec);

export class AnsibleController {
  private readonly ansiblePath: string;
  private readonly inventoryPath: string;
  private readonly playbookPath: string;

  constructor() {
    this.ansiblePath = process.env.ANSIBLE_PATH || '/usr/bin/ansible-playbook';
    this.inventoryPath = '/tmp/logan-ansible-inventory';
    this.playbookPath = '/opt/logan/ansible/playbooks';
  }

  async deployAgent(rangeId: string, targets: string[]): Promise<DeploymentResult> {
    // Generate dynamic inventory
    const inventory = await this.generateInventory(rangeId, targets);
    await writeFile(this.inventoryPath, inventory);

    // Execute playbook
    const command = `${this.ansiblePath} -i ${this.inventoryPath} ${this.playbookPath}/deploy-logan-agent.yml`;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        env: {
          ...process.env,
          ANSIBLE_HOST_KEY_CHECKING: 'False',
          LOGAN_API_ENDPOINT: process.env.NEXT_PUBLIC_API_URL,
          LOGAN_AGENT_API_KEY: process.env.LOGAN_AGENT_API_KEY,
        },
      });

      return {
        success: true,
        output: stdout,
        errors: stderr,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        errors: error.message,
      };
    }
  }

  async deployHuntingRules(rangeId: string, ruleSet: string): Promise<DeploymentResult> {
    const inventory = await this.generateInventory(rangeId);
    await writeFile(this.inventoryPath, inventory);

    const command = `${this.ansiblePath} -i ${this.inventoryPath} ${this.playbookPath}/deploy-hunting-rules.yml -e rules_set=${ruleSet}`;
    
    return this.executePlaybook(command);
  }

  private async generateInventory(rangeId: string, targets?: string[]): Promise<string> {
    const range = await ludusClient.getRange(rangeId);
    const vms = range.vms.filter(vm => !targets || targets.includes(vm.name));

    const inventory = {
      all: {
        hosts: {},
        vars: {
          ansible_user: 'administrator',
          ansible_ssh_common_args: '-o StrictHostKeyChecking=no',
        },
      },
      windows: {
        hosts: {},
        vars: {
          ansible_connection: 'winrm',
          ansible_winrm_transport: 'ntlm',
          ansible_winrm_server_cert_validation: 'ignore',
        },
      },
      linux: {
        hosts: {},
        vars: {
          ansible_connection: 'ssh',
        },
      },
    };

    vms.forEach(vm => {
      const group = vm.os.toLowerCase().includes('windows') ? 'windows' : 'linux';
      inventory[group].hosts[vm.hostname] = {
        ansible_host: vm.ip,
      };
    });

    return JSON.stringify(inventory, null, 2);
  }
}
```

### 2. UI Components for Ansible Deployment

```typescript
// /components/ansible/AgentDeployment.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function AgentDeployment({ rangeId }: { rangeId: string }) {
  const [deployment, setDeployment] = useState<DeploymentState>({
    status: 'idle',
    progress: 0,
    logs: [],
    results: {},
  });

  const handleDeploy = async () => {
    setDeployment({ ...deployment, status: 'deploying', progress: 0 });
    
    try {
      // Start deployment
      const response = await fetch('/api/ansible/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rangeId,
          playbook: 'deploy-logan-agent.yml',
          targets: 'all',
        }),
      });

      if (!response.ok) throw new Error('Deployment failed');

      // Stream deployment logs
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        lines.forEach(line => {
          try {
            const event = JSON.parse(line);
            handleDeploymentEvent(event);
          } catch (e) {
            // Handle non-JSON output
          }
        });
      }

      setDeployment(prev => ({ ...prev, status: 'completed', progress: 100 }));
    } catch (error) {
      setDeployment(prev => ({ 
        ...prev, 
        status: 'failed', 
        error: error.message 
      }));
    }
  };

  const handleDeploymentEvent = (event: DeploymentEvent) => {
    switch (event.type) {
      case 'task_start':
        setDeployment(prev => ({
          ...prev,
          logs: [...prev.logs, `Starting: ${event.task}`],
        }));
        break;
      
      case 'task_complete':
        setDeployment(prev => ({
          ...prev,
          progress: event.progress,
          results: {
            ...prev.results,
            [event.host]: event.status,
          },
        }));
        break;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Deployment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deployment.status === 'idle' && (
            <Button onClick={handleDeploy} className="w-full">
              Deploy Logan Agents
            </Button>
          )}

          {deployment.status === 'deploying' && (
            <>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Deploying agents...</span>
              </div>
              <Progress value={deployment.progress} />
              <DeploymentLogs logs={deployment.logs} />
            </>
          )}

          {deployment.status === 'completed' && (
            <DeploymentResults results={deployment.results} />
          )}

          {deployment.status === 'failed' && (
            <div className="text-red-600">
              Deployment failed: {deployment.error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Hunting Rules Manager

```typescript
// /components/ansible/HuntingRulesManager.tsx
export function HuntingRulesManager({ rangeId }: { rangeId: string }) {
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [deploymentStatus, setDeploymentStatus] = useState<Record<string, Status>>({});

  useEffect(() => {
    fetchAvailableRuleSets();
  }, []);

  const fetchAvailableRuleSets = async () => {
    const response = await fetch('/api/hunting-rules/sets');
    const data = await response.json();
    setRuleSets(data);
  };

  const handleDeployRules = async () => {
    for (const ruleSetId of selectedRules) {
      setDeploymentStatus(prev => ({
        ...prev,
        [ruleSetId]: 'deploying',
      }));

      try {
        await deployRuleSet(rangeId, ruleSetId);
        setDeploymentStatus(prev => ({
          ...prev,
          [ruleSetId]: 'success',
        }));
      } catch (error) {
        setDeploymentStatus(prev => ({
          ...prev,
          [ruleSetId]: 'failed',
        }));
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hunting Rules Deployment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ruleSets.map(ruleSet => (
              <RuleSetCard
                key={ruleSet.id}
                ruleSet={ruleSet}
                selected={selectedRules.includes(ruleSet.id)}
                onToggle={() => toggleRuleSet(ruleSet.id)}
                status={deploymentStatus[ruleSet.id]}
              />
            ))}
          </div>

          <Button
            onClick={handleDeployRules}
            disabled={selectedRules.length === 0}
            className="w-full"
          >
            Deploy Selected Rules
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Hunting Rules Framework

### 1. Rule Categories

```yaml
# /ansible/hunting-rules/categories.yml
categories:
  - id: persistence
    name: "Persistence Mechanisms"
    rules:
      - registry_run_keys
      - scheduled_tasks
      - services_creation
      - wmi_event_subscription
      
  - id: privilege_escalation
    name: "Privilege Escalation"
    rules:
      - uac_bypass
      - token_manipulation
      - dll_hijacking
      - service_abuse
      
  - id: defense_evasion
    name: "Defense Evasion"
    rules:
      - process_injection
      - timestomp
      - clear_logs
      - disable_security_tools
      
  - id: lateral_movement
    name: "Lateral Movement"
    rules:
      - pass_the_hash
      - remote_desktop
      - wmi_execution
      - psexec_activity
      
  - id: exfiltration
    name: "Data Exfiltration"
    rules:
      - dns_tunneling
      - unusual_network_traffic
      - cloud_storage_access
      - compression_staging
```

### 2. YARA Rules Example

```yara
// /ansible/hunting-rules/yara/suspicious_powershell.yar
rule Encoded_PowerShell_Command
{
    meta:
        description = "Detects encoded PowerShell commands"
        author = "Logan Security"
        severity = "high"
        mitre = "T1059.001"
        
    strings:
        $enc1 = "powershell" nocase
        $enc2 = "-encodedcommand" nocase
        $enc3 = "-enc" nocase
        $enc4 = "-e" nocase
        $b64 = /[A-Za-z0-9+\/]{40,}={0,2}/ 
        
    condition:
        $enc1 and any of ($enc2, $enc3, $enc4) and $b64
}

rule PowerShell_Download_Cradle
{
    meta:
        description = "Detects PowerShell download cradles"
        author = "Logan Security"
        severity = "high"
        
    strings:
        $ps1 = "powershell" nocase
        $download1 = "DownloadString" nocase
        $download2 = "DownloadFile" nocase
        $download3 = "Invoke-WebRequest" nocase
        $download4 = "Invoke-RestMethod" nocase
        $download5 = "wget" nocase
        $download6 = "curl" nocase
        $iex = "IEX" nocase
        $invoke = "Invoke-Expression" nocase
        
    condition:
        $ps1 and any of ($download*) and any of ($iex, $invoke)
}
```

### 3. Sigma Rules Example

```yaml
# /ansible/hunting-rules/sigma/persistence_registry.yml
title: Registry Run Key Persistence
id: 9b0d8a61-5c5a-4b6f-9c5d-0c6b5c8f3e8a
status: stable
description: Detects modifications to registry run keys for persistence
author: Logan Security
date: 2024/01/20
tags:
  - attack.persistence
  - attack.t1547.001
logsource:
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 13
    TargetObject|contains:
      - '\CurrentVersion\Run\'
      - '\CurrentVersion\RunOnce\'
      - '\CurrentVersion\RunServices\'
      - '\CurrentVersion\RunServicesOnce\'
  filter:
    Details|contains:
      - 'C:\Windows\'
      - 'C:\Program Files\'
  condition: selection and not filter
falsepositives:
  - Legitimate software installations
level: medium
```

## Automated Response Actions

### 1. Response Playbooks

```yaml
# /ansible/playbooks/response-isolate-host.yml
---
- name: Isolate Compromised Host
  hosts: "{{ target_host }}"
  gather_facts: no
  become: yes
  vars:
    isolation_vlan: "{{ quarantine_vlan | default('999') }}"
    
  tasks:
    - name: Backup current network configuration
      copy:
        src: /etc/network/interfaces
        dest: /etc/network/interfaces.backup.{{ ansible_date_time.epoch }}
        remote_src: yes
      when: ansible_os_family == "Debian"

    - name: Block all outbound traffic except to Logan
      iptables:
        chain: OUTPUT
        policy: DROP

    - name: Allow Logan agent communication
      iptables:
        chain: OUTPUT
        destination: "{{ logan_api_endpoint | urlsplit('hostname') }}"
        jump: ACCEPT

    - name: Log isolation event
      uri:
        url: "{{ logan_api_endpoint }}/api/events/isolation"
        method: POST
        headers:
          Authorization: "Bearer {{ logan_api_key }}"
        body_format: json
        body:
          host: "{{ ansible_hostname }}"
          reason: "{{ isolation_reason | default('Automated response') }}"
          timestamp: "{{ ansible_date_time.iso8601 }}"

    - name: Send notification
      mail:
        to: "{{ security_team_email | default(lookup('env', 'SECURITY_TEAM_EMAIL')) }}"
        subject: "Host Isolated: {{ ansible_hostname }}"
        body: |
          Host {{ ansible_hostname }} has been automatically isolated.
          Reason: {{ isolation_reason | default('Automated response') }}
          Time: {{ ansible_date_time.iso8601 }}
```

### 2. Integration with Incident Response

```typescript
// /lib/ansible/incident-response.ts
export class AnsibleIncidentResponse {
  async isolateHost(hostname: string, reason: string): Promise<void> {
    const playbook = 'response-isolate-host.yml';
    const extraVars = {
      target_host: hostname,
      isolation_reason: reason,
    };

    await this.executeResponsePlaybook(playbook, extraVars);
  }

  async collectForensics(hostname: string, outputPath: string): Promise<void> {
    const playbook = 'response-collect-forensics.yml';
    const extraVars = {
      target_host: hostname,
      forensics_output: outputPath,
      collection_items: [
        'memory_dump',
        'process_list',
        'network_connections',
        'registry_hives',
        'event_logs',
      ],
    };

    await this.executeResponsePlaybook(playbook, extraVars);
  }

  async blockMaliciousIP(ip: string, duration: number = 3600): Promise<void> {
    const playbook = 'response-block-ip.yml';
    const extraVars = {
      malicious_ip: ip,
      block_duration: duration,
      firewall_targets: 'all:!{{ target_host }}',
    };

    await this.executeResponsePlaybook(playbook, extraVars);
  }

  private async executeResponsePlaybook(
    playbook: string, 
    extraVars: Record<string, any>
  ): Promise<void> {
    const controller = new AnsibleController();
    const result = await controller.executePlaybook(playbook, extraVars);
    
    if (!result.success) {
      throw new Error(`Response action failed: ${result.errors}`);
    }
    
    // Log the response action
    await this.logResponseAction(playbook, extraVars, result);
  }
}
```

## Monitoring and Metrics

### 1. Deployment Metrics Collection

```yaml
# /ansible/playbooks/collect-deployment-metrics.yml
---
- name: Collect Logan Deployment Metrics
  hosts: all
  gather_facts: yes
  tasks:
    - name: Check agent status
      systemd:
        name: logan-agent
      register: agent_status

    - name: Get agent version
      command: logan-agent --version
      register: agent_version
      changed_when: false

    - name: Check connectivity to Logan API
      uri:
        url: "{{ logan_api_endpoint }}/health"
        timeout: 10
      register: api_connectivity
      failed_when: false

    - name: Collect metrics
      set_fact:
        deployment_metrics:
          hostname: "{{ ansible_hostname }}"
          os: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
          agent_status: "{{ agent_status.status.ActiveState }}"
          agent_version: "{{ agent_version.stdout }}"
          api_reachable: "{{ api_connectivity.status == 200 }}"
          last_check: "{{ ansible_date_time.iso8601 }}"

    - name: Send metrics to Logan
      uri:
        url: "{{ logan_api_endpoint }}/api/metrics/deployment"
        method: POST
        headers:
          Authorization: "Bearer {{ logan_api_key }}"
        body_format: json
        body: "{{ deployment_metrics }}"
```

This comprehensive Ansible integration design provides a robust framework for deploying Logan Security agents and hunting rules across Ludus cyber ranges, with full automation capabilities for incident response actions.