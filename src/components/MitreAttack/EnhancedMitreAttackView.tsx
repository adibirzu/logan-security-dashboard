'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Download, 
  ExternalLink, 
  AlertTriangle, 
  Shield, 
  Target,
  TrendingUp,
  Filter,
  RefreshCw,
  AlertCircle,
  Database,
  Clock,
  BarChart3,
  Eye,
  Activity,
  Zap,
  Users,
  Server
} from 'lucide-react';

interface TechniqueResult {
  techniqueId: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastSeen: string;
  tactics: string[];
  name: string;
  description: string;
}

interface MitreStats {
  totalTechniques: number;
  totalEvents: number;
  tacticsCovered: string[];
  severityBreakdown: Record<string, number>;
  topTechniques: TechniqueResult[];
  coverage: {
    totalPossibleTechniques: number;
    detectedTechniques: number;
    coveragePercentage: number;
  };
}

interface EnhancedMitreAttackViewProps {
  timeRangeMinutes: number;
}

export function EnhancedMitreAttackView({ timeRangeMinutes }: EnhancedMitreAttackViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [techniques, setTechniques] = useState<TechniqueResult[]>([]);
  const [stats, setStats] = useState<MitreStats | null>(null);
  const [mitreLayer, setMitreLayer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<TechniqueResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTactic, setSelectedTactic] = useState<string>('all');
  const [navigatorUrl, setNavigatorUrl] = useState<string>('');

  const fetchMitreData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setTechniques([]);
    setStats(null);
    setMitreLayer(null);

    try {
      const response = await fetch('/api/mitre/sysmon-techniques', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRangeMinutes
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch MITRE data');
      }

      setTechniques(data.techniques || []);
      setStats(data.stats || null);
      setMitreLayer(data.layer || null);
      setNavigatorUrl(data.navigatorUrl || '');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [timeRangeMinutes]);

  useEffect(() => {
    fetchMitreData();
  }, [fetchMitreData]);

  const filteredTechniques = techniques.filter(tech => {
    const matchesSearch = tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tech.techniqueId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTactic = selectedTactic === 'all' || tech.tactics.includes(selectedTactic);
    return matchesSearch && matchesTactic;
  });

  const getSeverityColor = (severity: string) => {
    const colors = {
      'low': 'bg-blue-100 text-blue-800 border-blue-200',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'high': 'bg-orange-100 text-orange-800 border-orange-200',
      'critical': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const getTacticIcon = (tactic: string) => {
    const icons: Record<string, any> = {
      'initial-access': Target,
      'execution': Zap,
      'persistence': Shield,
      'privilege-escalation': TrendingUp,
      'defense-evasion': Eye,
      'credential-access': Users,
      'discovery': Search,
      'lateral-movement': Activity,
      'collection': Database,
      'command-and-control': Server,
      'exfiltration': Download,
      'impact': AlertTriangle
    };
    return icons[tactic] || AlertCircle;
  };

  const exportToNavigator = () => {
    if (navigatorUrl) {
      window.open(navigatorUrl, '_blank');
    }
  };

  const downloadLayer = () => {
    if (mitreLayer) {
      const blob = new Blob([JSON.stringify(mitreLayer, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mitre-layer-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced MITRE ATT&CK Analysis</h2>
          <p className="text-muted-foreground">
            Real-time Windows Sysmon technique detection and mapping
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchMitreData}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {mitreLayer && (
            <>
              <Button
                onClick={exportToNavigator}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Navigator
              </Button>
              <Button
                onClick={downloadLayer}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Techniques Detected</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTechniques}</div>
              <p className="text-xs text-muted-foreground">
                {stats.coverage.coveragePercentage}% coverage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Sysmon events analyzed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tactics Covered</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tacticsCovered.length}</div>
              <p className="text-xs text-muted-foreground">
                of 14 MITRE tactics
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Techniques</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.severityBreakdown.critical || 0}</div>
              <p className="text-xs text-muted-foreground">
                High-priority threats
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Coverage Progress */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">MITRE ATT&CK Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Windows Techniques Detected</span>
                <span>{stats.coverage.detectedTechniques} / {stats.coverage.totalPossibleTechniques}</span>
              </div>
              <Progress value={stats.coverage.coveragePercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Coverage: {stats.coverage.coveragePercentage}%</span>
                <span>Based on real Sysmon events</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="techniques" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="techniques">Techniques</TabsTrigger>
          <TabsTrigger value="tactics">Tactics</TabsTrigger>
          <TabsTrigger value="matrix">Matrix View</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="techniques">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detected Techniques</CardTitle>
                  <CardDescription>
                    MITRE ATT&CK techniques identified from Windows Sysmon events
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTactic}
                    onChange={(e) => setSelectedTactic(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="all">All Tactics</option>
                    {stats?.tacticsCovered.map(tactic => (
                      <option key={tactic} value={tactic}>
                        {tactic.charAt(0).toUpperCase() + tactic.slice(1).replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Search techniques..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm w-48"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading MITRE data...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTechniques.map((technique) => (
                    <div
                      key={technique.techniqueId}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedTechnique(technique)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {technique.techniqueId}
                        </Badge>
                        <div>
                          <div className="font-medium">{technique.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {technique.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-bold">{technique.count}</div>
                          <div className="text-xs text-muted-foreground">events</div>
                        </div>
                        <Badge className={getSeverityColor(technique.severity)}>
                          {technique.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tactics">
          <Card>
            <CardHeader>
              <CardTitle>Tactics Overview</CardTitle>
              <CardDescription>
                MITRE ATT&CK tactics detected in your environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.tacticsCovered.map((tactic) => {
                    const Icon = getTacticIcon(tactic);
                    const tacticTechniques = techniques.filter(t => t.tactics.includes(tactic));
                    const totalEvents = tacticTechniques.reduce((sum, t) => sum + t.count, 0);
                    
                    return (
                      <Card key={tactic} className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <h3 className="font-medium capitalize">
                            {tactic.replace('-', ' ')}
                          </h3>
                        </div>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold">{tacticTechniques.length}</div>
                          <div className="text-sm text-muted-foreground">
                            {totalEvents} events
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle>MITRE ATT&CK Matrix</CardTitle>
              <CardDescription>
                Visual representation of detected techniques across the ATT&CK framework
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Matrix visualization will be implemented here
                </p>
                <Button
                  onClick={exportToNavigator}
                  className="mt-4"
                  disabled={!navigatorUrl}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in MITRE Navigator
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Technique Timeline</CardTitle>
              <CardDescription>
                Timeline of technique detection over the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Timeline visualization will be implemented here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Technique Detail Modal */}
      {selectedTechnique && (
        <Card className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedTechnique.name}</h3>
                <Badge variant="outline" className="mt-1">
                  {selectedTechnique.techniqueId}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTechnique(null)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedTechnique.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Event Count</h4>
                  <div className="text-2xl font-bold">{selectedTechnique.count}</div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Severity</h4>
                  <Badge className={getSeverityColor(selectedTechnique.severity)}>
                    {selectedTechnique.severity}
                  </Badge>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tactics</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedTechnique.tactics.map(tactic => (
                    <Badge key={tactic} variant="secondary" className="text-xs">
                      {tactic.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Last Seen</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedTechnique.lastSeen).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}