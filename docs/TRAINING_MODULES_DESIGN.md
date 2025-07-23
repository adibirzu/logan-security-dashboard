# Blue/Red Team Training Modules Interface Design

## Overview

This document outlines the design for interactive blue and red team training modules integrated with Ludus cyber ranges, providing hands-on cybersecurity training experiences.

## Training Module Architecture

### Core Components

```typescript
// /lib/training/types.ts
export interface TrainingModule {
  id: string;
  name: string;
  type: 'blue_team' | 'red_team' | 'purple_team';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  description: string;
  objectives: string[];
  prerequisites: string[];
  estimated_duration: number; // minutes
  points: number;
  tags: string[];
  mitre_techniques?: string[];
}

export interface TrainingScenario {
  id: string;
  module_id: string;
  name: string;
  story: string;
  initial_access?: InitialAccess;
  infrastructure: RangeRequirements;
  tasks: Task[];
  hints: Hint[];
  solutions: Solution[];
  scoring: ScoringCriteria;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  scenario_id: string;
  range_id: string;
  status: 'setup' | 'in_progress' | 'completed' | 'failed';
  score: number;
  started_at: Date;
  completed_at?: Date;
  findings: Finding[];
  artifacts: Artifact[];
}
```

## Blue Team Training Modules

### 1. Incident Response Training

```typescript
// /components/training/blue-team/IncidentResponseModule.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Timer, Shield, AlertTriangle } from 'lucide-react';

export function IncidentResponseModule() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Incident: Suspicious Network Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Initial Alert
              </h4>
              <p className="text-sm mt-2">
                Multiple failed authentication attempts detected from IP 192.168.1.100
                targeting domain controller. Investigate and contain the threat.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                title="Time Elapsed"
                value="12:34"
                icon={<Timer className="h-4 w-4" />}
              />
              <MetricCard
                title="Progress"
                value="3/7 Tasks"
                progress={43}
              />
            </div>

            <TaskList
              tasks={[
                { id: '1', name: 'Identify attack source', completed: true },
                { id: '2', name: 'Check logs for lateral movement', completed: true },
                { id: '3', name: 'Isolate affected systems', completed: true },
                { id: '4', name: 'Collect forensic evidence', active: true },
                { id: '5', name: 'Analyze malware samples', locked: true },
                { id: '6', name: 'Write incident report', locked: true },
                { id: '7', name: 'Implement countermeasures', locked: true },
              ]}
            />

            <ToolPanel
              tools={[
                { name: 'Splunk', status: 'connected', url: 'http://siem.range.local' },
                { name: 'Wireshark', status: 'ready', action: 'launch' },
                { name: 'Volatility', status: 'ready', action: 'launch' },
                { name: 'YARA', status: 'ready', action: 'launch' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <InvestigationConsole />
      <EvidenceCollector />
      <IncidentTimeline />
    </div>
  );
}
```

### 2. Threat Hunting Interface

```typescript
// /components/training/blue-team/ThreatHuntingInterface.tsx
export function ThreatHuntingInterface() {
  const [hypothesis, setHypothesis] = useState('');
  const [queries, setQueries] = useState<HuntQuery[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Threat Hunting Workbench</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="hypothesis">
              <TabsList>
                <TabsTrigger value="hypothesis">Hypothesis</TabsTrigger>
                <TabsTrigger value="queries">Queries</TabsTrigger>
                <TabsTrigger value="findings">Findings</TabsTrigger>
                <TabsTrigger value="iocs">IOCs</TabsTrigger>
              </TabsList>

              <TabsContent value="hypothesis">
                <HypothesisBuilder
                  value={hypothesis}
                  onChange={setHypothesis}
                  suggestions={[
                    'Attacker using PowerShell for persistence',
                    'Data exfiltration via DNS tunneling',
                    'Privilege escalation through service exploitation',
                  ]}
                />
              </TabsContent>

              <TabsContent value="queries">
                <QueryBuilder
                  dataSources={['windows_events', 'network_flows', 'dns_logs']}
                  onExecute={(query) => executeHuntQuery(query)}
                />
              </TabsContent>

              <TabsContent value="findings">
                <FindingsGrid findings={findings} />
              </TabsContent>

              <TabsContent value="iocs">
                <IOCManager />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <DataExplorer />
      </div>

      <div className="col-span-4 space-y-6">
        <MitreAttackNavigator
          techniques={['T1055', 'T1053', 'T1059.001']}
          onSelectTechnique={(technique) => addToHypothesis(technique)}
        />
        
        <HuntingPlaybooks />
        <ThreatIntelligenceFeed />
      </div>
    </div>
  );
}
```

### 3. Security Monitoring Dashboard

```typescript
// /components/training/blue-team/SecurityMonitoringDashboard.tsx
export function SecurityMonitoringDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Critical Alerts"
          value="3"
          trend="+2"
          status="critical"
        />
        <MetricCard
          title="Suspicious Activities"
          value="12"
          trend="+5"
          status="warning"
        />
        <MetricCard
          title="Failed Logins"
          value="47"
          trend="-10"
          status="info"
        />
        <MetricCard
          title="Systems Monitored"
          value="156"
          trend="0"
          status="success"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <RealTimeEventStream
            filters={{
              severity: ['critical', 'high'],
              sources: ['firewall', 'ids', 'endpoint'],
            }}
          />
        </div>
        
        <div className="col-span-4">
          <TopThreatsWidget />
          <AffectedAssetsMap />
        </div>
      </div>

      <AlertTriageWorkflow />
    </div>
  );
}
```

## Red Team Training Modules

### 1. Penetration Testing Lab

```typescript
// /components/training/red-team/PenetrationTestingLab.tsx
export function PenetrationTestingLab() {
  const [currentPhase, setCurrentPhase] = useState<AttackPhase>('reconnaissance');
  const [tools, setTools] = useState<Tool[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);

  return (
    <div className="space-y-6">
      <AttackPhaseTracker
        phases={[
          { id: 'reconnaissance', name: 'Reconnaissance', status: 'in_progress' },
          { id: 'scanning', name: 'Scanning', status: 'pending' },
          { id: 'exploitation', name: 'Exploitation', status: 'pending' },
          { id: 'post_exploitation', name: 'Post-Exploitation', status: 'pending' },
          { id: 'reporting', name: 'Reporting', status: 'pending' },
        ]}
        currentPhase={currentPhase}
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Attack Console</CardTitle>
            </CardHeader>
            <CardContent>
              <TerminalEmulator
                onCommand={handleCommand}
                tools={['nmap', 'metasploit', 'burp', 'sqlmap', 'hydra']}
              />
            </CardContent>
          </Card>

          <TargetInformation targets={targets} />
        </div>

        <div className="col-span-4">
          <ToolKit tools={tools} onSelectTool={setActiveTool} />
          <ExploitDatabase />
          <PayloadGenerator />
        </div>
      </div>

      <VulnerabilityExplorer />
    </div>
  );
}
```

### 2. Social Engineering Simulator

```typescript
// /components/training/red-team/SocialEngineeringSimulator.tsx
export function SocialEngineeringSimulator() {
  return (
    <div className="space-y-6">
      <ScenarioSetup
        scenarios={[
          {
            name: 'Phishing Campaign',
            description: 'Create and launch a targeted phishing campaign',
            difficulty: 'intermediate',
          },
          {
            name: 'Vishing Attack',
            description: 'Simulate voice phishing to obtain credentials',
            difficulty: 'advanced',
          },
          {
            name: 'Physical Breach',
            description: 'Plan and execute physical security assessment',
            difficulty: 'expert',
          },
        ]}
      />

      <PhishingEmailBuilder
        templates={[
          'IT Support Request',
          'CEO Fraud',
          'Invoice Scam',
          'Security Alert',
        ]}
        targetProfiles={[
          { role: 'Finance', susceptibility: 'high' },
          { role: 'HR', susceptibility: 'medium' },
          { role: 'IT Admin', susceptibility: 'low' },
        ]}
      />

      <CampaignMetrics
        metrics={{
          emails_sent: 100,
          emails_opened: 45,
          links_clicked: 23,
          credentials_harvested: 12,
          reports_submitted: 8,
        }}
      />

      <PsychologicalTacticsGuide />
    </div>
  );
}
```

### 3. Advanced Exploitation Techniques

```typescript
// /components/training/red-team/AdvancedExploitation.tsx
export function AdvancedExploitation() {
  const [exploitChain, setExploitChain] = useState<ExploitStep[]>([]);

  return (
    <div className="space-y-6">
      <ExploitChainBuilder
        chain={exploitChain}
        onAddStep={addExploitStep}
        availableExploits={[
          {
            name: 'CVE-2021-44228 (Log4Shell)',
            type: 'rce',
            difficulty: 'easy',
            reliability: 'high',
          },
          {
            name: 'MS17-010 (EternalBlue)',
            type: 'rce',
            difficulty: 'medium',
            reliability: 'medium',
          },
          {
            name: 'Zerologon (CVE-2020-1472)',
            type: 'privilege_escalation',
            difficulty: 'hard',
            reliability: 'high',
          },
        ]}
      />

      <div className="grid grid-cols-2 gap-6">
        <BufferOverflowLab />
        <WebExploitationSandbox />
      </div>

      <PostExploitationToolkit
        tools={[
          'Mimikatz',
          'BloodHound',
          'PowerSploit',
          'Empire',
          'Cobalt Strike',
        ]}
      />

      <C2FrameworkInterface />
    </div>
  );
}
```

## Purple Team Collaboration

### Collaborative Exercise Platform

```typescript
// /components/training/purple-team/CollaborativeExercise.tsx
export function CollaborativeExercise() {
  const [redTeamActions, setRedTeamActions] = useState<Action[]>([]);
  const [blueTeamResponses, setBlueTeamResponses] = useState<Response[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  return (
    <div className="space-y-6">
      <TeamCommunicationPanel
        redTeamChannel="/chat/red-team"
        blueTeamChannel="/chat/blue-team"
        whiteTeamChannel="/chat/white-team"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-6">
          <RedTeamActionPanel
            onAction={(action) => {
              recordAction(action);
              notifyBlueTeam(action);
            }}
          />
        </div>

        <div className="col-span-6">
          <BlueTeamResponsePanel
            incomingAlerts={getActiveAlerts()}
            onResponse={(response) => {
              recordResponse(response);
              evaluateEffectiveness(response);
            }}
          />
        </div>
      </div>

      <ExerciseTimeline events={timeline} />
      <LiveScoreboard teams={['red', 'blue']} />
      <LessonsLearnedCollector />
    </div>
  );
}
```

## Scenario Configuration

### Blue Team Scenarios

```yaml
scenarios:
  - id: "ransomware-response"
    name: "Ransomware Incident Response"
    type: "blue_team"
    difficulty: "intermediate"
    story: |
      Multiple workstations in the accounting department are displaying 
      ransomware messages. Initial reports indicate files are being encrypted.
    objectives:
      - Identify patient zero
      - Contain the spread
      - Preserve evidence
      - Recover critical data
    infrastructure:
      domain_controller: 1
      workstations: 5
      file_server: 1
      backup_server: 1
    tools:
      - name: "EDR Console"
        type: "crowdstrike"
      - name: "Network Monitor"
        type: "wireshark"
      - name: "SIEM"
        type: "splunk"
    scoring:
      time_to_contain: 30
      systems_protected: 40
      evidence_collected: 20
      recovery_success: 10

  - id: "apt-detection"
    name: "Advanced Persistent Threat Detection"
    type: "blue_team"
    difficulty: "advanced"
    story: |
      Unusual network traffic patterns suggest potential APT activity.
      No alerts have been triggered by existing security tools.
    objectives:
      - Develop threat hypothesis
      - Hunt for indicators
      - Map attack timeline
      - Identify compromised assets
```

### Red Team Scenarios

```yaml
scenarios:
  - id: "corporate-breach"
    name: "Corporate Network Breach"
    type: "red_team"
    difficulty: "intermediate"
    story: |
      You've been hired to test the security of MegaCorp's network.
      Your goal is to access the CEO's email without being detected.
    objectives:
      - Gain initial foothold
      - Escalate privileges
      - Move laterally to executive subnet
      - Access email server
    constraints:
      - No denial of service
      - Avoid detection for 48 hours
      - Document all vulnerabilities
    infrastructure:
      external_web: 1
      dmz_servers: 3
      internal_network: "complex"
      domain_size: "medium"
    scoring:
      stealth: 40
      objectives_completed: 40
      vulnerabilities_found: 20

  - id: "cloud-exploitation"
    name: "Cloud Infrastructure Attack"
    type: "red_team"
    difficulty: "expert"
    story: |
      Target organization uses multi-cloud architecture.
      Find and exploit misconfigurations to access sensitive data.
    objectives:
      - Enumerate cloud resources
      - Exploit IAM misconfigurations
      - Access S3 buckets
      - Pivot between cloud accounts
```

## Gamification Elements

### Achievement System

```typescript
// /lib/training/achievements.ts
export const achievements = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Complete your first training scenario',
    icon: '🩸',
    points: 10,
  },
  {
    id: 'defender',
    name: 'Defender of the Realm',
    description: 'Successfully defend against 10 attacks',
    icon: '🛡️',
    points: 50,
  },
  {
    id: 'ghost',
    name: 'Ghost in the Machine',
    description: 'Complete a red team scenario without detection',
    icon: '👻',
    points: 100,
  },
  {
    id: 'incident_commander',
    name: 'Incident Commander',
    description: 'Lead 5 successful incident responses',
    icon: '👮',
    points: 75,
  },
  {
    id: 'purple_heart',
    name: 'Purple Heart',
    description: 'Complete 10 purple team exercises',
    icon: '💜',
    points: 150,
  },
];
```

### Leaderboard Component

```typescript
// /components/training/Leaderboard.tsx
export function Leaderboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Leaderboard</CardTitle>
        <Tabs defaultValue="weekly">
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="all-time">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leaders.map((user, index) => (
            <LeaderboardEntry
              key={user.id}
              rank={index + 1}
              user={user}
              score={user.score}
              trend={user.trend}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Progress Tracking

### User Dashboard

```typescript
// /components/training/UserDashboard.tsx
export function UserTrainingDashboard() {
  return (
    <div className="space-y-6">
      <SkillRadar
        skills={{
          'Incident Response': 75,
          'Threat Hunting': 60,
          'Forensics': 45,
          'Network Security': 80,
          'Malware Analysis': 55,
          'Penetration Testing': 70,
          'Social Engineering': 40,
          'Cloud Security': 65,
        }}
      />

      <CertificationProgress
        certifications={[
          {
            name: 'Blue Team Fundamentals',
            progress: 80,
            modules_completed: 8,
            total_modules: 10,
          },
          {
            name: 'Advanced Threat Hunting',
            progress: 45,
            modules_completed: 9,
            total_modules: 20,
          },
        ]}
      />

      <RecentActivity
        activities={[
          {
            type: 'scenario_completed',
            name: 'Ransomware Response',
            score: 92,
            time: '2 hours ago',
          },
          {
            type: 'achievement_unlocked',
            name: 'Speed Demon',
            description: 'Complete scenario in under 30 minutes',
            time: '1 day ago',
          },
        ]}
      />

      <RecommendedTraining
        recommendations={[
          {
            name: 'Memory Forensics Deep Dive',
            reason: 'Improve forensics skills',
            difficulty: 'intermediate',
          },
          {
            name: 'Cloud Security Fundamentals',
            reason: 'New trending topic',
            difficulty: 'beginner',
          },
        ]}
      />
    </div>
  );
}
```

## Integration with Logan Dashboard

### Training Module Launcher

```typescript
// /components/integration/TrainingLauncher.tsx
export function TrainingLauncher({ event }: { event: SecurityEvent }) {
  const { createRange, deployRange } = useLudusStore();
  const router = useRouter();

  const handleLaunchTraining = async () => {
    // Generate training scenario based on security event
    const scenario = generateScenarioFromEvent(event);
    
    // Create Ludus range for training
    const rangeConfig = {
      name: `Training-${event.type}-${Date.now()}`,
      ...scenario.infrastructure,
    };
    
    const range = await createRange(rangeConfig);
    await deployRange(range.id);
    
    // Navigate to training interface
    router.push(`/training/${scenario.type}/${scenario.id}?range=${range.id}`);
  };

  return (
    <Button onClick={handleLaunchTraining}>
      Launch Training Scenario
    </Button>
  );
}
```

This comprehensive training module design provides an engaging, educational platform for both blue and red team members to enhance their cybersecurity skills through hands-on practice in realistic scenarios.