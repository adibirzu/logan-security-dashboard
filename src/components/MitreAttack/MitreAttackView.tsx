'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertCircle
} from 'lucide-react';
import { getMCPApi } from '@/lib/api/mcp-api';
import { MitreAttackLayer } from '@/lib/mitre-attack/layer-generator';
import { getMitreTechniqueById } from '@/lib/mitre-attack/technique-mappings';
import { MitreNavigator } from './MitreNavigator';
import { type TechniqueHitData, type MitreTechniqueDetail } from '@/lib/mitre-attack/mitre-framework';

interface MitreAttackViewProps {
  timeRangeMinutes: number;
}

export function MitreAttackView({ timeRangeMinutes }: MitreAttackViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [mitreLayer, setMitreLayer] = useState<MitreAttackLayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [techniqueHits, setTechniqueHits] = useState<TechniqueHitData[]>([]);
  const [rawTechniques, setRawTechniques] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customSearchResults, setCustomSearchResults] = useState<any[] | null>(null);

  const fetchMitreLayer = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setMitreLayer(null);
    setTechniqueHits([]);
    setRawTechniques([]);

    try {
      // First, fetch some log data to map to MITRE ATT&CK techniques
      const api = getMCPApi();
      const logResponse = await api.searchLogs('*', { maxCount: 500, timeRange: timeRangeMinutes });

      if (!logResponse.success || !logResponse.data || logResponse.data.length === 0) {
        setError('No log data found for MITRE ATT&CK mapping in the selected time range.');
        setIsLoading(false);
        return;
      }

      // Then, send the log data to the API to generate the MITRE ATT&CK layer
      const response = await fetch('/api/mitre/layer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logDataArray: logResponse.data,
          layerName: `OCI Security Events (${timeRangeMinutes}m)`
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMitreLayer(result.layer);
        
        // Convert layer techniques to TechniqueHitData format for the navigator
        const hits: TechniqueHitData[] = (result.layer.techniques || []).map((tech: any) => ({
          techniqueId: tech.techniqueID,
          count: tech.score || 1, // Use score as count, default to 1
          color: tech.color || '#e5e7eb',
          metadata: {
            lastSeen: new Date().toISOString(),
            severity: tech.score > 5 ? 'high' : tech.score > 2 ? 'medium' : 'low',
            sources: ['OCI Logs']
          }
        }));
        
        setTechniqueHits(hits);
        
        // Create raw techniques for the techniques tab
        const rawTechs = (result.layer.techniques || []).map((tech: any) => ({
          id: tech.techniqueID,
          name: getMitreTechniqueById(tech.techniqueID)?.name || 'Unknown Technique',
          description: tech.comment || 'No description available',
          count: tech.score || 1,
          severity: tech.score > 5 ? 'high' : tech.score > 2 ? 'medium' : 'low',
          lastSeen: new Date().toISOString(),
          sources: ['OCI Logs']
        }));
        
        setRawTechniques(rawTechs);
      } else {
        setError(result.error || 'Failed to generate MITRE ATT&CK layer.');
      }
    } catch (err: any) {
      console.error('Error fetching MITRE ATT&CK layer:', err);
      setError(err.message || 'An unexpected error occurred while fetching MITRE ATT&CK layer.');
    } finally {
      setIsLoading(false);
    }
  }, [timeRangeMinutes]);

  useEffect(() => {
    fetchMitreLayer();
  }, [fetchMitreLayer]);

  const handleDownloadLayer = () => {
    if (mitreLayer) {
      const jsonString = JSON.stringify(mitreLayer, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mitreLayer.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      // If no search term, just fetch default data
      fetchMitreLayer();
      return;
    }

    setIsSearching(true);
    setError(null);
    setCustomSearchResults(null);

    try {
      // Use the custom search term to query logs
      const api = getMCPApi();
      const logResponse = await api.searchLogs(searchTerm, { 
        maxCount: 500, 
        timeRange: timeRangeMinutes 
      });

      if (!logResponse.success || !logResponse.data || logResponse.data.length === 0) {
        setError(`No log data found for search term: "${searchTerm}"`);
        setIsSearching(false);
        return;
      }

      setCustomSearchResults(logResponse.data);

      // Generate MITRE layer from search results
      const response = await fetch('/api/mitre/layer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logDataArray: logResponse.data,
          layerName: `Custom Search: ${searchTerm} (${timeRangeMinutes}m)`
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMitreLayer(result.layer);
        
        // Convert layer techniques to TechniqueHitData format for the navigator
        const hits: TechniqueHitData[] = (result.layer.techniques || []).map((tech: any) => ({
          techniqueId: tech.techniqueID,
          count: tech.score || 1,
          color: tech.color || '#e5e7eb',
          metadata: {
            lastSeen: new Date().toISOString(),
            severity: tech.score > 5 ? 'high' : tech.score > 2 ? 'medium' : 'low',
            sources: ['Custom Search'],
            searchTerm: searchTerm
          }
        }));
        
        setTechniqueHits(hits);
        
        // Create raw techniques for the techniques tab
        const rawTechs = (result.layer.techniques || []).map((tech: any) => ({
          id: tech.techniqueID,
          name: getMitreTechniqueById(tech.techniqueID)?.name || 'Unknown Technique',
          description: tech.comment || 'No description available',
          count: tech.score || 1,
          severity: tech.score > 5 ? 'high' : tech.score > 2 ? 'medium' : 'low',
          lastSeen: new Date().toISOString(),
          sources: ['Custom Search'],
          searchTerm: searchTerm
        }));
        
        setRawTechniques(rawTechs);
      } else {
        setError(result.error || 'Failed to generate MITRE ATT&CK layer from search results.');
      }
    } catch (err: any) {
      console.error('Error searching and analyzing logs:', err);
      setError(err.message || 'An unexpected error occurred while searching logs.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleTechniqueClick = (technique: MitreTechniqueDetail, hitData?: TechniqueHitData) => {
    setSelectedTechnique(technique.id);
    console.log('Technique clicked:', technique, hitData);
  };

  const handleNavigatorExport = () => {
    handleDownloadLayer();
  };

  const stats = {
    totalTechniques: rawTechniques.length,
    highSeverity: rawTechniques.filter(t => t.severity === 'high').length,
    mediumSeverity: rawTechniques.filter(t => t.severity === 'medium').length,
    lowSeverity: rawTechniques.filter(t => t.severity === 'low').length,
    totalEvents: rawTechniques.reduce((sum, t) => sum + t.count, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MITRE ATT&CK Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Analyze security events mapped to MITRE ATT&CK techniques from OCI logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchMitreLayer} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownloadLayer}
            disabled={!mitreLayer}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Layer
          </Button>
          <Button 
            variant="outline"
            disabled={!mitreLayer}
            onClick={() => window.open('https://mitre-attack.github.io/attack-navigator/', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Navigator
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search custom query for MITRE analysis (e.g., failed login or brute force)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isSearching || isLoading}>
              <Search className={`h-4 w-4 mr-2 ${isSearching ? 'animate-spin' : ''}`} />
              {isSearching ? 'Searching...' : 'Search & Analyze'}
            </Button>
            <Button variant="outline" type="button" onClick={() => setSearchTerm('')}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </form>
          
          {/* Quick Example Queries */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Example Security Queries:</h4>
            <div className="flex flex-wrap gap-2">
              {[
                'failed login',
                'brute force',
                'privilege escalation', 
                'suspicious network',
                '* | where severity = "high"',
                '* | where message contains "unauthorized"'
              ].map((example) => (
                <Button
                  key={example}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setSearchTerm(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Techniques</p>
                <p className="text-2xl font-bold">{stats.totalTechniques}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Severity</p>
                <p className="text-2xl font-bold text-red-600">{stats.highSeverity}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Medium Severity</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.mediumSeverity}</p>
              </div>
              <Shield className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Severity</p>
                <p className="text-2xl font-bold text-green-600">{stats.lowSeverity}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix">ATT&CK Matrix</TabsTrigger>
          <TabsTrigger value="techniques">Techniques</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4">
          <MitreNavigator
            techniqueHits={techniqueHits}
            title="MITRE ATT&CK Navigator"
            description="Interactive visualization of security techniques detected in your OCI logs"
            onTechniqueClick={handleTechniqueClick}
            onExport={handleNavigatorExport}
            showLegend={true}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="techniques" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detected Techniques</CardTitle>
              <CardDescription>
                {rawTechniques.length} technique{rawTechniques.length !== 1 ? 's' : ''} detected in the last {timeRangeMinutes} minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rawTechniques.map((technique) => (
                  <div 
                    key={technique.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedTechnique(technique.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {technique.id}
                        </code>
                        <span className="font-medium">{technique.name}</span>
                        <Badge variant={
                          technique.severity === 'high' ? 'destructive' :
                          technique.severity === 'medium' ? 'default' : 'secondary'
                        }>
                          {technique.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{technique.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{technique.count}</div>
                      <div className="text-sm text-gray-500">events</div>
                    </div>
                  </div>
                ))}
                {rawTechniques.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    No techniques detected in the selected time range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technique Timeline</CardTitle>
              <CardDescription>
                Timeline view of detected techniques over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">Timeline visualization coming soon...</p>
                <p className="text-sm text-gray-400 mt-2">
                  This feature will show technique detection patterns over time
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
