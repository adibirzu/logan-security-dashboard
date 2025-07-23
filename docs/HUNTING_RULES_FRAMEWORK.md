# Hunting Rules Integration Framework

## Overview

The Hunting Rules Integration Framework provides a comprehensive system for creating, managing, and deploying threat hunting rules across Ludus cyber ranges integrated with Logan Security Dashboard. This framework supports multiple rule formats (YARA, Sigma, custom Logan rules) and enables automated threat detection and response.

## Architecture

### Framework Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Logan Security Dashboard                    │
├─────────────────────────────────────────────────────────────┤
│                 Hunting Rules Engine                         │
│  ┌───────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │     Rule      │  │      Rule      │  │     Rule      │  │
│  │    Editor     │  │   Validator    │  │   Compiler    │  │
│  └───────────────┘  └────────────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                  Rule Storage Layer                          │
│  ┌───────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │     YARA      │  │     Sigma      │  │  Custom Logan │  │
│  │     Rules     │  │     Rules      │  │     Rules     │  │
│  └───────────────┘  └────────────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                 Deployment Pipeline                          │
│  ┌───────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │    Ansible    │  │     Agent      │  │   Monitoring  │  │
│  │  Integration  │  │   Deployment   │  │   & Alerts    │  │
│  └───────────────┘  └────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Rule Types and Schemas

```typescript
// /lib/hunting-rules/types.ts
export interface HuntingRule {
  id: string;
  name: string;
  description: string;
  type: 'yara' | 'sigma' | 'logan' | 'custom';
  category: RuleCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  author: string;
  created_at: Date;
  updated_at: Date;
  tags: string[];
  mitre_techniques: string[];
  enabled: boolean;
  schedule?: RuleSchedule;
  actions?: RuleAction[];
}

export interface YaraRule extends HuntingRule {
  type: 'yara';
  content: string;
  imports?: string[];
}

export interface SigmaRule extends HuntingRule {
  type: 'sigma';
  logsource: {
    product?: string;
    service?: string;
    category?: string;
  };
  detection: {
    selection?: Record<string, any>;
    filter?: Record<string, any>;
    condition: string;
  };
  fields?: string[];
  falsepositives?: string[];
  level: 'low' | 'medium' | 'high' | 'critical';
}

export interface LoganRule extends HuntingRule {
  type: 'logan';
  query: string;
  datasources: string[];
  threshold?: {
    count: number;
    timewindow: string;
  };
  correlation?: {
    group_by: string[];
    join_fields: string[];
  };
}

export interface RuleSchedule {
  type: 'cron' | 'interval' | 'realtime';
  expression?: string; // cron expression
  interval?: number; // seconds
  timezone?: string;
}

export interface RuleAction {
  type: 'alert' | 'isolate' | 'block' | 'collect' | 'custom';
  parameters: Record<string, any>;
  conditions?: ActionCondition[];
}
```

### 2. Rule Editor Component

```typescript
// /components/hunting-rules/RuleEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MonacoEditor } from '@/components/ui/monaco-editor';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function RuleEditor() {
  const [rule, setRule] = useState<Partial<HuntingRule>>({
    type: 'sigma',
    severity: 'medium',
    enabled: true,
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview, setPreview] = useState<string>('');

  const handleValidate = async () => {
    const result = await validateRule(rule);
    setValidation(result);
    
    if (result.valid) {
      const compiled = await compileRule(rule);
      setPreview(compiled);
    }
  };

  const handleSave = async () => {
    if (!validation?.valid) {
      await handleValidate();
      return;
    }

    try {
      const response = await fetch('/api/hunting-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (response.ok) {
        const savedRule = await response.json();
        router.push(`/hunting-rules/${savedRule.id}`);
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Hunting Rule</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={rule.type} onValueChange={(type) => setRule({ ...rule, type })}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sigma">Sigma</TabsTrigger>
              <TabsTrigger value="yara">YARA</TabsTrigger>
              <TabsTrigger value="logan">Logan Query</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="sigma">
              <SigmaRuleEditor
                value={rule as SigmaRule}
                onChange={setRule}
              />
            </TabsContent>

            <TabsContent value="yara">
              <YaraRuleEditor
                value={rule as YaraRule}
                onChange={setRule}
              />
            </TabsContent>

            <TabsContent value="logan">
              <LoganRuleEditor
                value={rule as LoganRule}
                onChange={setRule}
              />
            </TabsContent>

            <TabsContent value="custom">
              <CustomRuleEditor
                value={rule}
                onChange={setRule}
              />
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-4">
            <RuleMetadata rule={rule} onChange={setRule} />
            <MitreMappingSelector
              selected={rule.mitre_techniques || []}
              onChange={(techniques) => setRule({ ...rule, mitre_techniques: techniques })}
            />
            <RuleScheduleConfig
              schedule={rule.schedule}
              onChange={(schedule) => setRule({ ...rule, schedule })}
            />
            <RuleActionsConfig
              actions={rule.actions || []}
              onChange={(actions) => setRule({ ...rule, actions })}
            />
          </div>

          {validation && (
            <Alert variant={validation.valid ? 'default' : 'destructive'}>
              <AlertDescription>
                {validation.valid ? 'Rule is valid' : validation.errors.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-6 flex gap-4">
            <Button onClick={handleValidate}>Validate</Button>
            <Button onClick={handleSave} variant="default">
              Save Rule
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Compiled Rule Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              <code>{preview}</code>
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 3. Sigma Rule Editor

```typescript
// /components/hunting-rules/SigmaRuleEditor.tsx
export function SigmaRuleEditor({ value, onChange }: RuleEditorProps<SigmaRule>) {
  const [yamlContent, setYamlContent] = useState('');

  useEffect(() => {
    // Convert rule object to YAML
    const yaml = convertToYaml(value);
    setYamlContent(yaml);
  }, [value]);

  const handleYamlChange = (newYaml: string) => {
    setYamlContent(newYaml);
    try {
      const parsed = parseYaml(newYaml);
      onChange(parsed);
    } catch (error) {
      // Handle parse error
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Log Source</label>
          <LogSourceSelector
            value={value.logsource}
            onChange={(logsource) => onChange({ ...value, logsource })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Detection Level</label>
          <Select
            value={value.level}
            onValueChange={(level) => onChange({ ...value, level })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Detection Logic</label>
        <MonacoEditor
          height="400px"
          language="yaml"
          value={yamlContent}
          onChange={handleYamlChange}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            theme: 'vs-dark',
          }}
        />
      </div>

      <SigmaRuleBuilder
        detection={value.detection}
        onChange={(detection) => onChange({ ...value, detection })}
      />
    </div>
  );
}
```

### 4. Rule Validation Service

```typescript
// /lib/hunting-rules/validator.ts
export class RuleValidator {
  async validate(rule: HuntingRule): Promise<ValidationResult> {
    const validators = {
      yara: this.validateYaraRule,
      sigma: this.validateSigmaRule,
      logan: this.validateLoganRule,
      custom: this.validateCustomRule,
    };

    const validator = validators[rule.type];
    if (!validator) {
      return {
        valid: false,
        errors: [`Unknown rule type: ${rule.type}`],
      };
    }

    return validator.call(this, rule);
  }

  private async validateYaraRule(rule: YaraRule): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate YARA syntax
    try {
      const yaraParser = new YaraParser();
      yaraParser.parse(rule.content);
    } catch (error) {
      errors.push(`YARA syntax error: ${error.message}`);
    }

    // Validate imports
    if (rule.imports) {
      const validImports = ['pe', 'elf', 'cuckoo', 'magic', 'hash', 'math'];
      const invalidImports = rule.imports.filter(i => !validImports.includes(i));
      if (invalidImports.length > 0) {
        errors.push(`Invalid imports: ${invalidImports.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async validateSigmaRule(rule: SigmaRule): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate required fields
    if (!rule.logsource || (!rule.logsource.product && !rule.logsource.service)) {
      errors.push('Logsource must specify product or service');
    }

    // Validate detection logic
    if (!rule.detection || !rule.detection.condition) {
      errors.push('Detection must include a condition');
    } else {
      // Validate condition syntax
      const conditionErrors = this.validateSigmaCondition(
        rule.detection.condition,
        rule.detection
      );
      errors.push(...conditionErrors);
    }

    // Validate field references
    if (rule.fields) {
      const fieldErrors = this.validateFieldReferences(rule.fields, rule.detection);
      errors.push(...fieldErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateSigmaCondition(
    condition: string,
    detection: any
  ): string[] {
    const errors: string[] = [];
    const validOperators = ['and', 'or', 'not', 'all', 'of', 'them'];
    const tokens = condition.split(/\s+/);

    // Check for valid selection references
    const selections = Object.keys(detection).filter(k => k !== 'condition');
    tokens.forEach(token => {
      if (!validOperators.includes(token) && !selections.includes(token)) {
        if (!/^\d+$/.test(token) && token !== '(' && token !== ')') {
          errors.push(`Unknown selection reference: ${token}`);
        }
      }
    });

    return errors;
  }

  private async validateLoganRule(rule: LoganRule): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate query syntax
    try {
      const response = await fetch('/api/logan/validate-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: rule.query }),
      });

      if (!response.ok) {
        const result = await response.json();
        errors.push(`Query syntax error: ${result.error}`);
      }
    } catch (error) {
      errors.push(`Failed to validate query: ${error.message}`);
    }

    // Validate datasources
    if (!rule.datasources || rule.datasources.length === 0) {
      errors.push('At least one datasource must be specified');
    }

    // Validate threshold
    if (rule.threshold) {
      if (rule.threshold.count <= 0) {
        errors.push('Threshold count must be greater than 0');
      }
      if (!this.isValidTimeWindow(rule.threshold.timewindow)) {
        errors.push('Invalid time window format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private isValidTimeWindow(timewindow: string): boolean {
    const pattern = /^\d+[smhd]$/;
    return pattern.test(timewindow);
  }
}
```

### 5. Rule Compiler

```typescript
// /lib/hunting-rules/compiler.ts
export class RuleCompiler {
  async compile(rule: HuntingRule): Promise<CompiledRule> {
    const compilers = {
      yara: this.compileYaraRule,
      sigma: this.compileSigmaRule,
      logan: this.compileLoganRule,
      custom: this.compileCustomRule,
    };

    const compiler = compilers[rule.type];
    if (!compiler) {
      throw new Error(`No compiler for rule type: ${rule.type}`);
    }

    return compiler.call(this, rule);
  }

  private async compileYaraRule(rule: YaraRule): Promise<CompiledRule> {
    // Add metadata to YARA rule
    const metadata = `
    meta:
        name = "${rule.name}"
        description = "${rule.description}"
        author = "${rule.author}"
        date = "${new Date().toISOString()}"
        severity = "${rule.severity}"
        mitre = "${rule.mitre_techniques.join(', ')}"
    `;

    // Insert metadata into rule content
    const compiledContent = rule.content.replace(
      /rule\s+\w+\s*{/,
      `$&\n${metadata}`
    );

    return {
      type: 'yara',
      content: compiledContent,
      binary: await this.compileYaraToBinary(compiledContent),
    };
  }

  private async compileSigmaRule(rule: SigmaRule): Promise<CompiledRule> {
    // Convert Sigma to backend format (e.g., Splunk, Elasticsearch)
    const backends = ['splunk', 'elasticsearch', 'logan'];
    const compiledQueries: Record<string, string> = {};

    for (const backend of backends) {
      compiledQueries[backend] = await this.convertSigmaToBackend(rule, backend);
    }

    return {
      type: 'sigma',
      content: JSON.stringify(rule, null, 2),
      queries: compiledQueries,
    };
  }

  private async convertSigmaToBackend(
    rule: SigmaRule,
    backend: string
  ): Promise<string> {
    const converter = new SigmaConverter(backend);
    return converter.convert(rule);
  }

  private async compileLoganRule(rule: LoganRule): Promise<CompiledRule> {
    // Optimize Logan query
    const optimizedQuery = await this.optimizeLoganQuery(rule.query);

    // Generate execution plan
    const executionPlan = {
      query: optimizedQuery,
      datasources: rule.datasources,
      parallel: rule.datasources.length > 1,
      cache_key: this.generateCacheKey(rule),
      estimated_cost: await this.estimateQueryCost(optimizedQuery),
    };

    return {
      type: 'logan',
      content: optimizedQuery,
      execution_plan: executionPlan,
    };
  }

  private async optimizeLoganQuery(query: string): Promise<string> {
    const response = await fetch('/api/logan/optimize-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    return result.optimized_query;
  }
}
```

### 6. Rule Deployment Manager

```typescript
// /components/hunting-rules/RuleDeploymentManager.tsx
export function RuleDeploymentManager() {
  const [rules, setRules] = useState<HuntingRule[]>([]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [deploymentTargets, setDeploymentTargets] = useState<DeploymentTarget[]>([]);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({});

  const handleDeploy = async () => {
    const deployment = {
      rules: selectedRules,
      targets: deploymentTargets,
      options: {
        validate_before_deploy: true,
        rollback_on_failure: true,
        parallel_deployment: true,
      },
    };

    try {
      const response = await fetch('/api/hunting-rules/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployment),
      });

      if (!response.ok) throw new Error('Deployment failed');

      // Monitor deployment progress
      const deploymentId = await response.json();
      await monitorDeployment(deploymentId);
    } catch (error) {
      console.error('Deployment error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deploy Hunting Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <RuleSelector
              rules={rules}
              selected={selectedRules}
              onSelectionChange={setSelectedRules}
            />

            <TargetSelector
              targets={availableTargets}
              selected={deploymentTargets}
              onSelectionChange={setDeploymentTargets}
            />

            <DeploymentOptions
              options={deploymentOptions}
              onChange={setDeploymentOptions}
            />

            <DeploymentValidation
              rules={selectedRules}
              targets={deploymentTargets}
            />

            <Button
              onClick={handleDeploy}
              disabled={selectedRules.length === 0 || deploymentTargets.length === 0}
              className="w-full"
            >
              Deploy Rules
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeploymentProgress status={deploymentStatus} />
    </div>
  );
}
```

## Integration with Logan Dashboard

### 1. Rule Execution Engine

```typescript
// /lib/hunting-rules/execution-engine.ts
export class RuleExecutionEngine {
  private executors: Map<string, RuleExecutor>;
  private scheduler: RuleScheduler;
  private alertManager: AlertManager;

  constructor() {
    this.executors = new Map([
      ['yara', new YaraExecutor()],
      ['sigma', new SigmaExecutor()],
      ['logan', new LoganExecutor()],
    ]);
    this.scheduler = new RuleScheduler();
    this.alertManager = new AlertManager();
  }

  async executeRule(rule: HuntingRule, context?: ExecutionContext): Promise<ExecutionResult> {
    const executor = this.executors.get(rule.type);
    if (!executor) {
      throw new Error(`No executor for rule type: ${rule.type}`);
    }

    const startTime = Date.now();
    let result: ExecutionResult;

    try {
      // Execute the rule
      result = await executor.execute(rule, context);

      // Process matches
      if (result.matches && result.matches.length > 0) {
        await this.processMatches(rule, result.matches);
      }

      // Execute actions if conditions are met
      if (rule.actions && result.matches.length > 0) {
        await this.executeActions(rule, result);
      }

      // Log execution
      await this.logExecution(rule, result, Date.now() - startTime);

    } catch (error) {
      result = {
        rule_id: rule.id,
        success: false,
        error: error.message,
        execution_time: Date.now() - startTime,
      };
    }

    return result;
  }

  private async processMatches(rule: HuntingRule, matches: Match[]): Promise<void> {
    // Enrich matches with additional context
    const enrichedMatches = await this.enrichMatches(matches);

    // Create alerts
    for (const match of enrichedMatches) {
      await this.alertManager.createAlert({
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        match_data: match,
        timestamp: new Date(),
        status: 'new',
      });
    }
  }

  private async executeActions(rule: HuntingRule, result: ExecutionResult): Promise<void> {
    for (const action of rule.actions) {
      if (this.shouldExecuteAction(action, result)) {
        await this.executeAction(action, result);
      }
    }
  }

  private async executeAction(action: RuleAction, result: ExecutionResult): Promise<void> {
    switch (action.type) {
      case 'alert':
        await this.sendAlert(action.parameters, result);
        break;
      case 'isolate':
        await this.isolateHost(action.parameters.hostname);
        break;
      case 'block':
        await this.blockIndicator(action.parameters);
        break;
      case 'collect':
        await this.collectForensics(action.parameters);
        break;
      case 'custom':
        await this.executeCustomAction(action);
        break;
    }
  }
}
```

### 2. Real-time Rule Monitoring

```typescript
// /components/hunting-rules/RuleMonitoring.tsx
export function RuleMonitoring() {
  const [activeRules, setActiveRules] = useState<ActiveRule[]>([]);
  const [executionStats, setExecutionStats] = useState<ExecutionStats>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Subscribe to real-time updates
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/rules/monitoring`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'execution_update':
          updateExecutionStats(data.stats);
          break;
        case 'new_alert':
          setAlerts(prev => [data.alert, ...prev]);
          break;
        case 'rule_status_change':
          updateRuleStatus(data.rule_id, data.status);
          break;
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Active Rules"
          value={activeRules.length}
          icon={<Shield className="h-4 w-4" />}
        />
        <MetricCard
          title="Executions (24h)"
          value={executionStats.total_executions || 0}
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          title="Matches Found"
          value={executionStats.total_matches || 0}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg Execution Time"
          value={`${executionStats.avg_execution_time || 0}ms`}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rule Execution Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ExecutionTimeline
            data={executionStats.timeline}
            height={200}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <ActiveRulesTable
          rules={activeRules}
          onToggleRule={toggleRule}
          onEditRule={editRule}
        />
        
        <RecentAlertsPanel
          alerts={alerts}
          onInvestigate={investigateAlert}
        />
      </div>

      <RulePerformanceMetrics rules={activeRules} />
    </div>
  );
}
```

### 3. Rule Library Management

```typescript
// /components/hunting-rules/RuleLibrary.tsx
export function RuleLibrary() {
  const [rules, setRules] = useState<HuntingRule[]>([]);
  const [filters, setFilters] = useState<RuleFilters>({});
  const [view, setView] = useState<'grid' | 'list'>('grid');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Hunting Rules Library</h1>
        <div className="flex gap-4">
          <Button onClick={() => router.push('/hunting-rules/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
          <Button variant="outline" onClick={importRules}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      <RuleFilters
        filters={filters}
        onChange={setFilters}
        categories={availableCategories}
        tags={availableTags}
      />

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {filteredRules.length} rules found
        </p>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === 'grid' ? (
        <RuleGrid
          rules={filteredRules}
          onSelect={selectRule}
          onDeploy={deployRule}
        />
      ) : (
        <RuleList
          rules={filteredRules}
          onSelect={selectRule}
          onDeploy={deployRule}
        />
      )}
    </div>
  );
}
```

## Pre-built Hunting Rules

### 1. Persistence Detection Rules

```yaml
# /hunting-rules/library/persistence/scheduled_task_creation.yml
title: Suspicious Scheduled Task Creation
id: 92626ddd-662c-49e3-ac59-f6535f12d189
status: stable
description: Detects creation of scheduled tasks that may be used for persistence
author: Logan Security Team
date: 2024/01/20
tags:
  - attack.persistence
  - attack.t1053.005
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4698
    TaskName|contains:
      - '\Microsoft\Windows\CurrentVersion\Run'
      - '\Users\Public\'
      - 'AppData\Local\Temp'
    TaskContent|contains:
      - 'powershell'
      - 'cmd.exe'
      - 'wscript'
      - 'cscript'
  filter:
    TaskName|startswith:
      - '\Microsoft\Windows\Windows Defender\'
      - '\Microsoft\Windows\Updates\'
  condition: selection and not filter
falsepositives:
  - Software installations
  - Administrative scripts
level: medium
```

### 2. Lateral Movement Detection

```yara
// /hunting-rules/library/lateral_movement/psexec_activity.yar
rule PsExec_Service_Creation
{
    meta:
        description = "Detects PsExec service creation for lateral movement"
        author = "Logan Security Team"
        date = "2024-01-20"
        severity = "high"
        mitre = "T1021.002"
        
    strings:
        $service1 = "PSEXESVC" wide ascii
        $service2 = "psexec" nocase
        $pipe1 = "\\\\%s\\pipe\\psexesvc" wide ascii
        $pipe2 = "\\psexesvc" wide ascii
        $cmd1 = "-accepteula" nocase
        $cmd2 = "\\\\*" nocase
        
    condition:
        (any of ($service*) and any of ($pipe*)) or
        (all of ($cmd*) and $service2)
}
```

### 3. Data Exfiltration Detection

```typescript
// /hunting-rules/library/exfiltration/dns_tunneling.logan
{
  "name": "DNS Tunneling Detection",
  "type": "logan",
  "query": `
    SELECT 
      source_ip,
      dns_query,
      COUNT(*) as query_count,
      AVG(LENGTH(dns_query)) as avg_query_length,
      MAX(LENGTH(dns_query)) as max_query_length
    FROM dns_logs
    WHERE 
      time >= NOW() - INTERVAL '1 hour'
      AND dns_query NOT IN (SELECT domain FROM alexa_top_1m)
    GROUP BY source_ip, dns_query
    HAVING 
      query_count > 100
      AND avg_query_length > 50
      AND max_query_length > 200
  `,
  "datasources": ["dns_logs"],
  "threshold": {
    "count": 1,
    "timewindow": "1h"
  },
  "severity": "high",
  "actions": [
    {
      "type": "alert",
      "parameters": {
        "priority": "high",
        "notify": ["soc-team@example.com"]
      }
    },
    {
      "type": "block",
      "parameters": {
        "block_type": "dns",
        "duration": 3600
      }
    }
  ]
}
```

## API Endpoints

### Rule Management API

```typescript
// /app/api/hunting-rules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { RuleValidator } from '@/lib/hunting-rules/validator';
import { RuleCompiler } from '@/lib/hunting-rules/compiler';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filters = {
    type: searchParams.get('type'),
    category: searchParams.get('category'),
    severity: searchParams.get('severity'),
    enabled: searchParams.get('enabled') === 'true',
  };

  const rules = await db.huntingRules.findMany({
    where: filters,
    orderBy: { updated_at: 'desc' },
  });

  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const rule = await request.json();
  
  // Validate rule
  const validator = new RuleValidator();
  const validation = await validator.validate(rule);
  
  if (!validation.valid) {
    return NextResponse.json(
      { errors: validation.errors },
      { status: 400 }
    );
  }

  // Compile rule
  const compiler = new RuleCompiler();
  const compiled = await compiler.compile(rule);

  // Save rule
  const savedRule = await db.huntingRules.create({
    data: {
      ...rule,
      compiled: compiled,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  return NextResponse.json(savedRule);
}
```

This comprehensive Hunting Rules Integration Framework provides a complete solution for creating, managing, and deploying threat hunting rules across the Logan Security Dashboard and Ludus cyber ranges.