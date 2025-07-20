'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Network, 
  AlertTriangle, 
  Globe, 
  Eye, 
  Download,
  Shield,
  Wifi,
  ExternalLink,
  MapPin,
  Activity,
  XCircle
} from 'lucide-react';
import { batchCheckIPThreatIntelligence, getMaliciousIPStyles } from '@/lib/threat-intelligence';

interface IPCommunication {
  source_ip: string;
  dest_ip: string;
  ports_used: number[];
  protocols: string[];
  actions: string[];
  connection_count: number;
  total_bytes: number;
  first_seen: string;
  last_seen: string;
  log_sources: string[];
  sample_logs: any[];
  is_internal_to_internal: boolean;
  is_internal_to_external: boolean;
  is_external_to_internal: boolean;
  geo_info: any;
  risk_indicators: string[];
}

interface IPCommunicationsData {
  success: boolean;
  ip_communications: IPCommunication[];
  total_communications: number;
  analysis_timestamp: string;
  time_range: string;
  error?: string;
}

interface RITAIPCommunicationsProps {
  timeRange?: string;
}

export function RITAIPCommunications({ timeRange = '6h' }: RITAIPCommunicationsProps) {
  const [data, setData] = useState<IPCommunicationsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedComm, setSelectedComm] = useState<IPCommunication | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCommIndex, setSelectedCommIndex] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'internal' | 'external' | 'risky'>('all');
  const [threatIntelResults, setThreatIntelResults] = useState<Map<string, {
    isMalicious: boolean
    confidence: number
    threatTypes: string[]
  }>>(new Map());

  const loadCommunicationsData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rita/communications?timeRange=${timeRange}`);
      const result = await response.json();
      setData(result);
      
      // Batch check all IPs for threat intelligence
      if (result.success && result.ip_communications) {
        const allIPs = new Set<string>()
        result.ip_communications.forEach((comm: IPCommunication) => {
          if (comm.source_ip) allIPs.add(comm.source_ip)
          if (comm.dest_ip) allIPs.add(comm.dest_ip)
        })
        
        if (allIPs.size > 0) {
          const threatIntelResults = await batchCheckIPThreatIntelligence(Array.from(allIPs))
          setThreatIntelResults(threatIntelResults)
        }
      }
    } catch (error) {
      console.error('Error loading communications data:', error);
      setData({
        success: false,
        ip_communications: [],
        total_communications: 0,
        analysis_timestamp: new Date().toISOString(),
        time_range: timeRange,
        error: 'Failed to load communications data'
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadCommunicationsData();
  }, [timeRange, loadCommunicationsData]);

  const getCommunicationType = (comm: IPCommunication) => {
    if (comm.is_internal_to_internal) return 'internal';
    if (comm.is_internal_to_external) return 'outbound';
    if (comm.is_external_to_internal) return 'inbound';
    return 'unknown';
  };

  const getCommunicationIcon = (comm: IPCommunication) => {
    const type = getCommunicationType(comm);
    switch (type) {
      case 'internal': return Wifi;
      case 'outbound': return ExternalLink;
      case 'inbound': return MapPin;
      default: return Network;
    }
  };

  const getCommunicationBadgeVariant = (comm: IPCommunication) => {
    if (comm.risk_indicators.length > 0) return 'destructive';
    if (comm.is_external_to_internal) return 'secondary';
    return 'outline';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFilteredCommunications = () => {
    if (!data?.ip_communications) return [];
    
    return data.ip_communications.filter(comm => {
      switch (filterType) {
        case 'internal':
          return comm.is_internal_to_internal;
        case 'external':
          return comm.is_internal_to_external || comm.is_external_to_internal;
        case 'risky':
          return comm.risk_indicators.length > 0;
        default:
          return true;
      }
    });
  };

  const exportData = () => {
    const communications = getFilteredCommunications();
    if (!communications.length) return;
    
    const csvContent = [
      'Source IP,Dest IP,Ports,Protocols,Actions,Connections,Bytes,Type,Risk Indicators,First Seen,Last Seen',
      ...communications.map(comm => [
        comm.source_ip,
        comm.dest_ip,
        comm.ports_used.join(';'),
        comm.protocols.join(';'),
        comm.actions.join(';'),
        comm.connection_count,
        comm.total_bytes,
        getCommunicationType(comm),
        comm.risk_indicators.join(';'),
        comm.first_seen,
        comm.last_seen
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rita-communications-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCommunications = getFilteredCommunications();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 animate-spin" />
            IP Communications Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground">Analyzing IP communications...</div>
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
              <Network className="w-5 h-5" />
              RITA IP Communications
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                disabled={!filteredCommunications.length}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadCommunicationsData}
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
                    <div className="text-2xl font-bold">{data.total_communications}</div>
                    <div className="text-sm text-muted-foreground">Total Communications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {data.ip_communications.filter(comm => comm.is_internal_to_internal).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Internal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">
                      {data.ip_communications.filter(comm => comm.is_internal_to_external || comm.is_external_to_internal).length}
                    </div>
                    <div className="text-sm text-muted-foreground">External</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {data.ip_communications.filter(comm => comm.risk_indicators.length > 0).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Risky</div>
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    {data?.error || 'Failed to load communications analysis data'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {data?.success && data.ip_communications.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                IP Communications ({filteredCommunications.length})
              </CardTitle>
              <div className="flex gap-1">
                {['all', 'internal', 'external', 'risky'].map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType(type as any)}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredCommunications.map((comm, index) => {
                const CommIcon = getCommunicationIcon(comm);
                const communicationType = getCommunicationType(comm);
                
                return (
                  <React.Fragment key={index}>
                    <div
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        if (selectedCommIndex === index && showDetails) {
                          // Close if clicking the same item
                          setSelectedComm(null);
                          setShowDetails(false);
                          setSelectedCommIndex(null);
                        } else {
                          // Open new details
                          setSelectedComm(comm);
                          setShowDetails(true);
                          setSelectedCommIndex(index);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <CommIcon className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium truncate ${getMaliciousIPStyles(comm.source_ip).textColor || ''}`}>
                              {comm.source_ip}
                            </span>
                            {threatIntelResults.get(comm.source_ip)?.isMalicious && (
                              <Badge variant="destructive" className="text-xs">
                                Malicious
                              </Badge>
                            )}
                            <span className="text-muted-foreground">→</span>
                            <span className={`font-medium truncate ${getMaliciousIPStyles(comm.dest_ip).textColor || ''}`}>
                              {comm.dest_ip}
                            </span>
                            {threatIntelResults.get(comm.dest_ip)?.isMalicious && (
                              <Badge variant="destructive" className="text-xs">
                                Malicious
                              </Badge>
                            )}
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                communicationType === 'internal' ? 'border-blue-500 text-blue-500' :
                                communicationType === 'outbound' ? 'border-orange-500 text-orange-500' :
                                communicationType === 'inbound' ? 'border-purple-500 text-purple-500' :
                                ''
                              }`}
                            >
                              {communicationType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Ports: {comm.ports_used.slice(0, 3).join(', ')}{comm.ports_used.length > 3 ? '...' : ''}</span>
                            {comm.risk_indicators.length > 0 && (
                              <div className="flex gap-1">
                                {comm.risk_indicators.map((indicator, i) => (
                                  <Badge key={i} variant="destructive" className="text-xs">
                                    {indicator.replace('_', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-sm">
                          <div className="font-medium">{comm.connection_count.toLocaleString()} connections</div>
                          <div className="text-muted-foreground">{formatBytes(comm.total_bytes)}</div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Communication Details - Show directly under clicked item */}
                    {showDetails && selectedComm && selectedCommIndex === index && (
                      <div className="mt-3 mb-3">
                        <Card className="bg-muted/30">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Globe className="w-4 h-4" />
                                Communication Details: {selectedComm.source_ip} → {selectedComm.dest_ip}
                              </CardTitle>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDetails(false);
                                  setSelectedComm(null);
                                  setSelectedCommIndex(null);
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
                                    <span>{selectedComm.source_ip}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Destination:</span>
                                    <span>{selectedComm.dest_ip}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Type:</span>
                                    <Badge variant="outline">{getCommunicationType(selectedComm)}</Badge>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Protocols:</span>
                                    <span>{selectedComm.protocols.join(', ')}</span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Statistics</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Connections:</span>
                                    <span>{selectedComm.connection_count.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Bytes:</span>
                                    <span>{formatBytes(selectedComm.total_bytes)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">First Seen:</span>
                                    <span>{new Date(selectedComm.first_seen).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Last Seen:</span>
                                    <span>{new Date(selectedComm.last_seen).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2">Ports Used ({selectedComm.ports_used.length})</h4>
                                <div className="flex flex-wrap gap-1">
                                  {selectedComm.ports_used.map((port, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {port}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Actions</h4>
                                <div className="flex flex-wrap gap-1">
                                  {selectedComm.actions.map((action, i) => (
                                    <Badge 
                                      key={i} 
                                      variant={action === 'ACCEPT' ? 'outline' : 'destructive'}
                                      className="text-xs"
                                    >
                                      {action}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {selectedComm.risk_indicators.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-red-500" />
                                  Risk Indicators
                                </h4>
                                <div className="flex flex-wrap gap-1">
                                  {selectedComm.risk_indicators.map((indicator, i) => (
                                    <Badge key={i} variant="destructive" className="text-xs">
                                      {indicator.replace('_', ' ')}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {selectedComm.sample_logs && selectedComm.sample_logs.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Sample Logs ({selectedComm.sample_logs.length})</h4>
                                <div className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
                                  <pre className="text-xs font-mono text-muted-foreground">
                                    {JSON.stringify(selectedComm.sample_logs, null, 2)}
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
              
              {filteredCommunications.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No communications found for the selected filter
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}