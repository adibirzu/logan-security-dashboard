'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Activity, 
  AlertTriangle, 
  Network, 
  Eye, 
  Download,
  TrendingUp,
  Server,
  Globe,
  Shield,
  Search,
  Filter,
  XCircle
} from 'lucide-react';
import { formatDuration } from '@/lib/timeUtils';
import { batchCheckIPThreatIntelligence, getMaliciousIPStyles } from '@/lib/threat-intelligence';

interface Application {
  source_app: string;
  dest_app: string;
  source_ip: string;
  dest_ip: string;
  port: number;
  protocol: string;
  connection_count: number;
  total_bytes: number;
  first_seen: string;
  last_seen: string;
  log_sources: string[];
  sample_logs: any[];
  risk_score: number;
}

interface ApplicationAnalysisData {
  success: boolean;
  applications: Application[];
  total_applications: number;
  analysis_timestamp: string;
  time_range: string;
  error?: string;
}

interface RITAApplicationAnalysisProps {
  timeRange?: string;
}

export function RITAApplicationAnalysis({ timeRange = '6h' }: RITAApplicationAnalysisProps) {
  const [data, setData] = useState<ApplicationAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAppIndex, setSelectedAppIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [threatIntelResults, setThreatIntelResults] = useState<Map<string, {
    isMalicious: boolean
    confidence: number
    threatTypes: string[]
  }>>(new Map());

  const loadApplicationData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rita/applications?timeRange=${timeRange}`);
      const result = await response.json();
      setData(result);
      
      // Batch check all IPs for threat intelligence
      if (result.success && result.applications) {
        const allIPs = new Set<string>()
        result.applications.forEach((app: Application) => {
          if (app.source_ip) allIPs.add(app.source_ip)
          if (app.dest_ip) allIPs.add(app.dest_ip)
        })
        
        if (allIPs.size > 0) {
          const threatIntelResults = await batchCheckIPThreatIntelligence(Array.from(allIPs))
          setThreatIntelResults(threatIntelResults)
        }
      }
    } catch (error) {
      console.error('Error loading application data:', error);
      setData({
        success: false,
        applications: [],
        total_applications: 0,
        analysis_timestamp: new Date().toISOString(),
        time_range: timeRange,
        error: 'Failed to load application data'
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadApplicationData();
  }, [timeRange, loadApplicationData]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search or filter changes
  }, [searchTerm, riskFilter]);

  const getFilteredApplications = () => {
    if (!data?.applications) return [];
    
    return data.applications.filter(app => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        app.source_ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.dest_ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.dest_app.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.source_app.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Risk filter
      const riskLevel = getRiskLabel(app.risk_score).toLowerCase();
      const matchesRisk = riskFilter === 'all' || riskLevel.includes(riskFilter);
      
      return matchesSearch && matchesRisk;
    });
  };

  const getPaginatedApplications = () => {
    const filtered = getFilteredApplications();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredApplications();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  const getRiskBadgeVariant = (riskScore: number) => {
    if (riskScore >= 0.7) return 'destructive';
    if (riskScore >= 0.4) return 'secondary';
    return 'outline';
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore >= 0.7) return 'High Risk';
    if (riskScore >= 0.4) return 'Medium Risk';
    return 'Low Risk';
  };

  const getPortCategoryIcon = (port: number) => {
    if ([80, 443].includes(port)) return Globe;
    if ([22, 23, 3389].includes(port)) return Shield;
    if ([21, 22, 25, 53, 80, 110, 143, 443, 993, 995].includes(port)) return Server;
    return Network;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const exportData = () => {
    if (!data?.applications) return;
    
    const csvContent = [
      'Source App,Dest App,Source IP,Dest IP,Port,Protocol,Connections,Bytes,Risk Score,First Seen,Last Seen',
      ...data.applications.map(app => [
        app.source_app,
        app.dest_app,
        app.source_ip,
        app.dest_ip,
        app.port,
        app.protocol,
        app.connection_count,
        app.total_bytes,
        app.risk_score.toFixed(3),
        app.first_seen,
        app.last_seen
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rita-applications-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 animate-spin" />
            Application Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground">Analyzing application communications...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              RITA Application Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                disabled={!data?.applications?.length}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadApplicationData}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3">
              {data?.success ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{data.total_applications}</div>
                    <div className="text-sm text-muted-foreground">Applications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {data.applications.filter(app => app.risk_score >= 0.7).length}
                    </div>
                    <div className="text-sm text-muted-foreground">High Risk</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">
                      {data.applications.filter(app => app.risk_score >= 0.4 && app.risk_score < 0.7).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Medium Risk</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {data.applications.reduce((sum, app) => sum + app.connection_count, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Connections</div>
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    {data?.error || 'Failed to load application analysis data'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {data?.success && data.applications.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Application Communications ({getFilteredApplications().length} of {data.applications.length})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search IPs, apps..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 h-8"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {['all', 'high', 'medium', 'low'].map((risk) => (
                    <Button
                      key={risk}
                      variant={riskFilter === risk ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRiskFilter(risk as any)}
                      className="h-8 text-xs capitalize"
                    >
                      <Filter className="w-3 h-3 mr-1" />
                      {risk}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 w-full overflow-hidden">
              {getPaginatedApplications().map((app, index) => {
                const PortIcon = getPortCategoryIcon(app.port);
                return (
                  <React.Fragment key={index}>
                      <div
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer w-full"
                    onClick={() => {
                      if (selectedAppIndex === index && showDetails) {
                        // Close if clicking the same item
                        setSelectedApp(null);
                        setShowDetails(false);
                        setSelectedAppIndex(null);
                      } else {
                        // Open new details
                        setSelectedApp(app);
                        setShowDetails(true);
                        setSelectedAppIndex(index);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <PortIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium truncate max-w-32 sm:max-w-none">{app.source_app}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium truncate max-w-32 sm:max-w-none">{app.dest_app}</span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {app.protocol}:{app.port}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          <span className={getMaliciousIPStyles(app.source_ip).textColor || 'text-muted-foreground'}>
                            {app.source_ip}
                          </span>
                          {threatIntelResults.get(app.source_ip)?.isMalicious && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              Malicious
                            </Badge>
                          )}
                          <span className="mx-1">→</span>
                          <span className={getMaliciousIPStyles(app.dest_ip).textColor || 'text-muted-foreground'}>
                            {app.dest_ip}
                          </span>
                          {threatIntelResults.get(app.dest_ip)?.isMalicious && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              Malicious
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 self-start sm:self-center">
                      <div className="text-right text-sm min-w-0">
                        <div className="font-medium text-xs sm:text-sm">{app.connection_count.toLocaleString()} connections</div>
                        <div className="text-muted-foreground text-xs">{formatBytes(app.total_bytes)}</div>
                      </div>
                      <Badge variant={getRiskBadgeVariant(app.risk_score)} className="flex-shrink-0">
                        {getRiskLabel(app.risk_score)}
                      </Badge>
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    </div>
                    
                    {/* Application Details - Show directly under clicked item */}
                    {showDetails && selectedApp && selectedAppIndex === index && (
                      <div className="mt-3 mb-3">
                        <Card className="bg-muted/30">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <TrendingUp className="w-4 h-4" />
                                Application Details: {selectedApp.source_app} → {selectedApp.dest_app}
                              </CardTitle>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDetails(false);
                                  setSelectedApp(null);
                                  setSelectedAppIndex(null);
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2">Communication Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Source:</span>
                                    <span>{selectedApp.source_ip}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Destination:</span>
                                    <span>{selectedApp.dest_ip}:{selectedApp.port}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Protocol:</span>
                                    <span>{selectedApp.protocol}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Risk Score:</span>
                                    <Badge variant={getRiskBadgeVariant(selectedApp.risk_score)}>
                                      {(selectedApp.risk_score * 100).toFixed(1)}%
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Statistics</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Connections:</span>
                                    <span>{selectedApp.connection_count.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Bytes:</span>
                                    <span>{formatBytes(selectedApp.total_bytes)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">First Seen:</span>
                                    <span>{new Date(selectedApp.first_seen).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Last Seen:</span>
                                    <span>{new Date(selectedApp.last_seen).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {selectedApp.sample_logs && selectedApp.sample_logs.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Sample Logs ({selectedApp.sample_logs.length})</h4>
                                <div className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
                                  <pre className="text-xs font-mono text-muted-foreground">
                                    {JSON.stringify(selectedApp.sample_logs, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
              
              {getFilteredApplications().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No applications found matching the current filters
                </div>
              )}
            </div>
            
            {/* Pagination Controls */}
            {getTotalPages() > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredApplications().length)} of {getFilteredApplications().length} applications
                </div>
                <div className="flex gap-2 justify-center sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    {getTotalPages() > 5 && (
                      <>
                        <span className="px-2 text-muted-foreground self-center">...</span>
                        <Button
                          variant={currentPage === getTotalPages() ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(getTotalPages())}
                          className="w-8 h-8 p-0"
                        >
                          {getTotalPages()}
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === getTotalPages()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}