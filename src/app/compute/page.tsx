'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Server, Play, Square, RotateCcw, RefreshCw, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ModernLayout from '@/components/Layout/ModernLayout';

interface ComputeInstance {
  id: string;
  display_name: string;
  lifecycle_state: string;
  availability_domain: string;
  compartment_id: string;
  shape: string;
  region: string;
  time_created: string;
  fault_domain?: string;
  image_id?: string;
  shape_config?: {
    ocpus: number;
    memory_in_gbs: number;
    baseline_ocpu_utilization?: string;
  };
  volumes: Array<{
    type: string;
    attachment_id: string;
    volume_id: string;
    lifecycle_state: string;
    device?: string;
    details: {
      id: string;
      display_name: string;
      size_in_gbs: number | string;
      lifecycle_state: string;
      availability_domain?: string;
      vpus_per_gb?: number;
    };
  }>;
  vnics: Array<{
    attachment_id: string;
    vnic_id: string;
    lifecycle_state: string;
    details: {
      id: string;
      display_name: string;
      private_ip: string;
      public_ip?: string;
      subnet_id: string;
      availability_domain: string;
      is_primary: boolean;
    };
  }>;
}

interface ComputeResponse {
  success: boolean;
  instances: ComputeInstance[];
  total_count: number;
  region: string;
  error?: string;
}

export default function ComputePage() {
  const [instances, setInstances] = useState<ComputeInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const fetchInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/compute/instances');
      const data: ComputeResponse = await response.json();
      
      if (data.success) {
        setInstances(data.instances);
        setConnectionStatus('connected');
      } else {
        setError(data.error || 'Failed to fetch instances');
        setConnectionStatus('error');
      }
    } catch (err) {
      setError('Network error: Unable to fetch instances');
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch('/api/compute/test');
      const data = await response.json();
      setConnectionStatus(data.success ? 'connected' : 'error');
      if (!data.success) {
        setError(data.error || 'Connection test failed');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError('Failed to test connection');
    }
  };

  const performInstanceAction = async (instanceId: string, action: 'start' | 'stop' | 'reboot') => {
    try {
      setActionLoading(instanceId);
      
      const response = await fetch(`/api/compute/instances/${instanceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh instances after action
        await fetchInstances();
      } else {
        setError(data.error || `Failed to ${action} instance`);
      }
    } catch (err) {
      setError(`Network error: Failed to ${action} instance`);
    } finally {
      setActionLoading(null);
    }
  };

  const getLifecycleStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'stopped':
        return 'bg-gray-100 text-gray-800';
      case 'stopping':
        return 'bg-yellow-100 text-yellow-800';
      case 'starting':
        return 'bg-blue-100 text-blue-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleCardExpansion = (instanceId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(instanceId)) {
      newExpanded.delete(instanceId);
    } else {
      newExpanded.add(instanceId);
    }
    setExpandedCards(newExpanded);
  };

  useEffect(() => {
    fetchInstances();
    testConnection();
  }, []);

  return (
    <ModernLayout
      title="OCI Compute Management"
      subtitle="Manage and monitor Oracle Cloud Infrastructure compute instances"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-end space-x-4">
          <div className="flex items-center space-x-2">
            {connectionStatus === 'connected' && <CheckCircle className="h-4 w-4 text-green-500" />}
            {connectionStatus === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
            {connectionStatus === 'unknown' && <Loader2 className="h-4 w-4 animate-spin" />}
            <span className="text-sm">
              {connectionStatus === 'connected' && 'Connected'}
              {connectionStatus === 'error' && 'Connection Error'}
              {connectionStatus === 'unknown' && 'Checking...'}
            </span>
          </div>
          <Button onClick={fetchInstances} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="flex items-center p-4">
            <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading compute instances...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Compute Instances ({instances.length})
            </h2>
          </div>

          {instances.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Instances Found</h3>
                <p className="text-muted-foreground">
                  No compute instances were found in the current compartment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {instances.map((instance) => (
                <Card key={instance.id} className="w-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Server className="h-5 w-5" />
                        <div>
                          <CardTitle className="text-lg">{instance.display_name}</CardTitle>
                          <CardDescription>
                            {instance.shape} • {instance.availability_domain}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getLifecycleStateColor(instance.lifecycle_state)}>
                          {instance.lifecycle_state}
                        </Badge>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => performInstanceAction(instance.id, 'start')}
                            disabled={actionLoading === instance.id || instance.lifecycle_state === 'RUNNING'}
                          >
                            {actionLoading === instance.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => performInstanceAction(instance.id, 'stop')}
                            disabled={actionLoading === instance.id || instance.lifecycle_state === 'STOPPED'}
                          >
                            {actionLoading === instance.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Square className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => performInstanceAction(instance.id, 'reboot')}
                            disabled={actionLoading === instance.id || instance.lifecycle_state !== 'RUNNING'}
                          >
                            {actionLoading === instance.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between" 
                    onClick={() => toggleCardExpansion(instance.id)}
                  >
                    <span>{expandedCards.has(instance.id) ? 'Hide Details' : 'Show Details'}</span>
                    {expandedCards.has(instance.id) ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    }
                  </Button>
                  
                  {expandedCards.has(instance.id) && (
                    <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Basic Information */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Basic Information</h4>
                            <div className="text-sm space-y-1">
                              <div><span className="font-medium">Instance ID:</span> {instance.id}</div>
                              <div><span className="font-medium">Region:</span> {instance.region}</div>
                              <div><span className="font-medium">Created:</span> {new Date(instance.time_created).toLocaleDateString()}</div>
                              {instance.fault_domain && (
                                <div><span className="font-medium">Fault Domain:</span> {instance.fault_domain}</div>
                              )}
                            </div>
                          </div>

                          {/* Shape Configuration */}
                          {instance.shape_config && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">Shape Configuration</h4>
                              <div className="text-sm space-y-1">
                                <div><span className="font-medium">OCPUs:</span> {instance.shape_config.ocpus}</div>
                                <div><span className="font-medium">Memory:</span> {instance.shape_config.memory_in_gbs} GB</div>
                                {instance.shape_config.baseline_ocpu_utilization && (
                                  <div><span className="font-medium">Baseline CPU:</span> {instance.shape_config.baseline_ocpu_utilization}</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Storage Volumes */}
                          {instance.volumes.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">Storage Volumes</h4>
                              <div className="text-sm space-y-1">
                                {instance.volumes.map((volume, index) => (
                                  <div key={index} className="p-2 bg-gray-50 rounded">
                                    <div><span className="font-medium">{volume.type}:</span> {volume.details.display_name}</div>
                                    <div>Size: {volume.details.size_in_gbs} GB</div>
                                    <div>State: {volume.details.lifecycle_state}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Network Interfaces */}
                          {instance.vnics.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">Network Interfaces</h4>
                              <div className="text-sm space-y-1">
                                {instance.vnics.map((vnic, index) => (
                                  <div key={index} className="p-2 bg-gray-50 rounded">
                                    <div><span className="font-medium">VNIC:</span> {vnic.details.display_name}</div>
                                    <div>Private IP: {vnic.details.private_ip}</div>
                                    {vnic.details.public_ip && (
                                      <div>Public IP: {vnic.details.public_ip}</div>
                                    )}
                                    <div>Primary: {vnic.details.is_primary ? 'Yes' : 'No'}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )
                  }
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </ModernLayout>
  );
}