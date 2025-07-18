'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Server, 
  Play, 
  Square, 
  RotateCcw, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  BarChart3,
  Activity,
  Database,
  Network,
  Cpu,
  HardDrive
} from 'lucide-react';

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

interface Compartment {
  id: string;
  name: string;
  description: string;
  lifecycle_state: string;
  is_root: boolean;
}

interface InstanceMetrics {
  instanceId: string;
  cpuUtilization: number;
  memoryUtilization: number;
  networkBytesIn: number;
  networkBytesOut: number;
  diskReadBytes: number;
  diskWriteBytes: number;
  timestamp: string;
}

const REGIONS = [
  { value: 'us-ashburn-1', label: 'US East (Ashburn)' },
  { value: 'us-phoenix-1', label: 'US West (Phoenix)' },
  { value: 'eu-frankfurt-1', label: 'Germany Central (Frankfurt)' },
  { value: 'eu-zurich-1', label: 'Switzerland North (Zurich)' },
  { value: 'ap-mumbai-1', label: 'India West (Mumbai)' },
  { value: 'ap-tokyo-1', label: 'Japan East (Tokyo)' },
  { value: 'uk-london-1', label: 'UK South (London)' },
];

const STORAGE_KEYS = {
  region: 'oci-compute-selected-region',
  compartment: 'oci-compute-selected-compartment'
};

const loadFromStorage = (key: string): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key) || '';
  }
  return '';
};

const saveToStorage = (key: string, value: string): void => {
  if (typeof window !== 'undefined') {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  }
};

export default function EnhancedComputeManagement() {
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedCompartment, setSelectedCompartment] = useState<string>('');
  const [compartments, setCompartments] = useState<Compartment[]>([]);
  const [instances, setInstances] = useState<ComputeInstance[]>([]);
  const [instanceMetrics, setInstanceMetrics] = useState<Map<string, InstanceMetrics>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [loadingCompartments, setLoadingCompartments] = useState(false);
  const [activeTab, setActiveTab] = useState('instances');
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  // Enhanced handlers that save to localStorage
  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    saveToStorage(STORAGE_KEYS.region, region);
    
    // Clear compartment selection when region changes
    setSelectedCompartment('');
    saveToStorage(STORAGE_KEYS.compartment, '');
  };

  const handleCompartmentChange = (compartment: string) => {
    setSelectedCompartment(compartment);
    saveToStorage(STORAGE_KEYS.compartment, compartment);
  };

  const fetchCompartments = useCallback(async (region: string) => {
    if (!region) return;

    try {
      setLoadingCompartments(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('region', region);
      
      const response = await fetch(`/api/compute/compartments?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setCompartments(data.compartments);
        setConnectionStatus('connected');
        
        // Validate the saved compartment selection
        const savedCompartment = selectedCompartment;
        if (savedCompartment && !data.compartments.some((comp: Compartment) => comp.id === savedCompartment)) {
          // Saved compartment is no longer valid, clear it
          setSelectedCompartment('');
          saveToStorage(STORAGE_KEYS.compartment, '');
        }
      } else {
        setError(data.error || 'Failed to fetch compartments');
        setConnectionStatus('error');
      }
    } catch (err) {
      setError('Network error: Unable to fetch compartments');
      setConnectionStatus('error');
    } finally {
      setLoadingCompartments(false);
    }
  }, [selectedCompartment]);

  const fetchInstances = async () => {
    if (!selectedRegion || !selectedCompartment) {
      setError('Please select both region and compartment');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedCompartment) {
        params.append('compartment_id', selectedCompartment);
      }
      
      const response = await fetch(`/api/compute/instances?${params}`);
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
      setConnectionStatus('unknown');
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

  const fetchInstanceMetrics = async (instanceId: string) => {
    try {
      const params = new URLSearchParams();
      params.append('instance_id', instanceId);
      if (selectedRegion) params.append('region', selectedRegion);
      if (selectedCompartment) params.append('compartment_id', selectedCompartment);
      
      const response = await fetch(`/api/compute/metrics?${params}`);
      const data = await response.json();
      
      if (data.success && data.metrics.length > 0) {
        const metrics = data.metrics[0]; // Take the first metrics object
        setInstanceMetrics(prev => new Map(prev.set(instanceId, metrics)));
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
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
      // Fetch metrics when expanding
      if (monitoringEnabled) {
        fetchInstanceMetrics(instanceId);
      }
    }
    setExpandedCards(newExpanded);
  };

  const fetchAllInstanceMetrics = async () => {
    if (instances.length === 0) return;
    
    try {
      const instanceIds = instances.map(instance => instance.id);
      
      const response = await fetch('/api/compute/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceIds,
          compartmentId: selectedCompartment,
          region: selectedRegion,
          metricNames: ['CpuUtilization', 'MemoryUtilization', 'NetworkBytesIn', 'NetworkBytesOut']
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.metrics) {
        const metricsMap = new Map(instanceMetrics);
        data.metrics.forEach((metrics: InstanceMetrics) => {
          metricsMap.set(metrics.instanceId, metrics);
        });
        setInstanceMetrics(metricsMap);
      }
    } catch (err) {
      console.error('Failed to fetch all instance metrics:', err);
    }
  };

  const enableMonitoring = () => {
    setMonitoringEnabled(true);
    // Fetch metrics for all instances
    fetchAllInstanceMetrics();
  };

  useEffect(() => {
    if (selectedRegion) {
      fetchCompartments(selectedRegion);
    }
  }, [selectedRegion, fetchCompartments]);

  // Initialize from localStorage on component mount
  useEffect(() => {
    const savedRegion = loadFromStorage(STORAGE_KEYS.region);
    const savedCompartment = loadFromStorage(STORAGE_KEYS.compartment);
    
    if (savedRegion) {
      setSelectedRegion(savedRegion);
      setRestoredFromStorage(true);
      // Hide the restoration indicator after 3 seconds
      setTimeout(() => setRestoredFromStorage(false), 3000);
    }
    if (savedCompartment) {
      setSelectedCompartment(savedCompartment);
    }
    
    testConnection();
  }, []);

  return (
    <div className="space-y-6">
      {/* Region and Compartment Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            OCI Compute Management
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'unknown' ? 'Testing...' : 'Disconnected'}
            </Badge>
            {restoredFromStorage && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                Settings Restored
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Select region and compartment to manage Oracle Cloud Infrastructure compute instances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Region</label>
              <Select value={selectedRegion} onValueChange={handleRegionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region..." />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Compartment</label>
              <Select 
                value={selectedCompartment} 
                onValueChange={handleCompartmentChange}
                disabled={!selectedRegion || loadingCompartments}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select compartment..." />
                </SelectTrigger>
                <SelectContent>
                  {compartments.map((compartment) => (
                    <SelectItem key={compartment.id} value={compartment.id}>
                      {compartment.name} {compartment.is_root ? '(Root)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end space-x-2">
              <Button
                onClick={fetchInstances}
                disabled={loading || !selectedRegion || !selectedCompartment}
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Load Instances
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={connectionStatus === 'unknown'}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="flex items-center p-4">
            <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content Tabs */}
      {selectedRegion && selectedCompartment && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instances">Instances</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="instances" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading compute instances...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Instances ({instances.length})
                  </h3>
                  {instances.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={enableMonitoring}
                      disabled={monitoringEnabled}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {monitoringEnabled ? 'Monitoring Enabled' : 'Enable Monitoring'}
                    </Button>
                  )}
                </div>

                {instances.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Instances Found</h3>
                      <p className="text-muted-foreground">
                        No compute instances were found in the selected compartment.
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

                              {/* Metrics (if monitoring enabled) */}
                              {monitoringEnabled && instanceMetrics.has(instance.id) && (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">Live Metrics</h4>
                                  <div className="text-sm space-y-1">
                                    {(() => {
                                      const metrics = instanceMetrics.get(instance.id)!;
                                      return (
                                        <>
                                          <div className="flex items-center">
                                            <Cpu className="h-3 w-3 mr-1" />
                                            <span className="font-medium">CPU:</span> {metrics.cpuUtilization.toFixed(1)}%
                                          </div>
                                          <div className="flex items-center">
                                            <Database className="h-3 w-3 mr-1" />
                                            <span className="font-medium">Memory:</span> {metrics.memoryUtilization.toFixed(1)}%
                                          </div>
                                          <div className="flex items-center">
                                            <Network className="h-3 w-3 mr-1" />
                                            <span className="font-medium">Network In:</span> {(metrics.networkBytesIn / 1024).toFixed(0)} KB/s
                                          </div>
                                          <div className="flex items-center">
                                            <HardDrive className="h-3 w-3 mr-1" />
                                            <span className="font-medium">Disk Read:</span> {(metrics.diskReadBytes / 1024).toFixed(0)} KB/s
                                          </div>
                                        </>
                                      );
                                    })()}
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
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Instance Monitoring
                </CardTitle>
                <CardDescription>
                  Monitor performance metrics for your compute instances
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!monitoringEnabled ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Monitoring Not Enabled</h3>
                    <p className="text-muted-foreground mb-4">
                      Enable monitoring from the Instances tab to view performance metrics.
                    </p>
                    <Button onClick={enableMonitoring}>
                      <Activity className="h-4 w-4 mr-2" />
                      Enable Monitoring
                    </Button>
                  </div>
                ) : instances.length === 0 ? (
                  <div className="text-center py-8">
                    <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Instances to Monitor</h3>
                    <p className="text-muted-foreground">
                      Load instances from the Instances tab to view their metrics.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {instances.map((instance) => {
                      const metrics = instanceMetrics.get(instance.id);
                      return (
                        <Card key={instance.id} className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold">{instance.display_name}</h4>
                            <Badge className={getLifecycleStateColor(instance.lifecycle_state)}>
                              {instance.lifecycle_state}
                            </Badge>
                          </div>
                          
                          {metrics ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Cpu className="h-4 w-4 mr-2" />
                                  <span className="text-sm">CPU Usage</span>
                                </div>
                                <span className="text-sm font-medium">{metrics.cpuUtilization.toFixed(1)}%</span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Database className="h-4 w-4 mr-2" />
                                  <span className="text-sm">Memory Usage</span>
                                </div>
                                <span className="text-sm font-medium">{metrics.memoryUtilization.toFixed(1)}%</span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Network className="h-4 w-4 mr-2" />
                                  <span className="text-sm">Network I/O</span>
                                </div>
                                <span className="text-sm font-medium">
                                  {((metrics.networkBytesIn + metrics.networkBytesOut) / 1024).toFixed(0)} KB/s
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <HardDrive className="h-4 w-4 mr-2" />
                                  <span className="text-sm">Disk I/O</span>
                                </div>
                                <span className="text-sm font-medium">
                                  {((metrics.diskReadBytes + metrics.diskWriteBytes) / 1024).toFixed(0)} KB/s
                                </span>
                              </div>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchInstanceMetrics(instance.id)}
                                className="w-full"
                              >
                                <RefreshCw className="h-3 w-3 mr-2" />
                                Refresh Metrics
                              </Button>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <Button
                                size="sm"
                                onClick={() => fetchInstanceMetrics(instance.id)}
                              >
                                <BarChart3 className="h-3 w-3 mr-2" />
                                Load Metrics
                              </Button>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}