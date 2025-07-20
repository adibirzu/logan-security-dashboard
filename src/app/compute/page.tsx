'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Search,
  Filter,
  Layers,
  MapPin
} from 'lucide-react';
import ModernLayout from '@/components/Layout/ModernLayout';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

interface ComputeInstance {
  id: string;
  display_name: string;
  lifecycle_state: string;
  availability_domain: string;
  compartment_id: string;
  compartment_name?: string;
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
  description?: string;
  lifecycle_state: string;
}

interface Region {
  name: string;
  key: string;
  status: string;
}

// Available OCI regions
const OCI_REGIONS: Region[] = [
  { name: 'US East (Ashburn)', key: 'us-ashburn-1', status: 'active' },
  { name: 'EU Central (Frankfurt)', key: 'eu-frankfurt-1', status: 'active' },
  { name: 'UK South (London)', key: 'uk-london-1', status: 'active' },
  { name: 'US West (Phoenix)', key: 'us-phoenix-1', status: 'active' },
  { name: 'Canada Central (Toronto)', key: 'ca-toronto-1', status: 'active' },
  { name: 'Asia East (Tokyo)', key: 'ap-tokyo-1', status: 'active' },
  { name: 'Asia South (Mumbai)', key: 'ap-mumbai-1', status: 'active' },
  { name: 'Asia Southeast (Sydney)', key: 'ap-sydney-1', status: 'active' },
  { name: 'Brazil East (São Paulo)', key: 'sa-saopaulo-1', status: 'active' }
];

const CACHE_KEYS = {
  REGION: 'logan-compute-region',
  COMPARTMENT: 'logan-compute-compartment',
  INSTANCES: 'logan-compute-instances',
  LAST_FETCH: 'logan-compute-last-fetch'
} as const;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function ComputePage() {
  // Selection state
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedCompartment, setSelectedCompartment] = useState<string>('');
  
  // Data state
  const [instances, setInstances] = useState<ComputeInstance[]>([]);
  const [compartments, setCompartments] = useState<Compartment[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [compartmentsLoading, setCompartmentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load cached values on mount
  useEffect(() => {
    const cachedRegion = localStorage.getItem(CACHE_KEYS.REGION);
    const cachedCompartment = localStorage.getItem(CACHE_KEYS.COMPARTMENT);
    const cachedInstances = localStorage.getItem(CACHE_KEYS.INSTANCES);
    const lastFetch = localStorage.getItem(CACHE_KEYS.LAST_FETCH);
    
    if (cachedRegion) {
      setSelectedRegion(cachedRegion);
    } else {
      // Default to EU Frankfurt
      setSelectedRegion('eu-frankfurt-1');
    }
    
    if (cachedCompartment) {
      setSelectedCompartment(cachedCompartment);
    }
    
    // Load cached instances if recent
    if (cachedInstances && lastFetch) {
      const fetchTime = parseInt(lastFetch);
      if (Date.now() - fetchTime < CACHE_DURATION) {
        try {
          const parsedInstances = JSON.parse(cachedInstances);
          setInstances(parsedInstances);
          setConnectionStatus('connected');
        } catch (e) {
          console.warn('Failed to parse cached instances:', e);
        }
      }
    }
  }, []);

  // Cache data when it changes
  const cacheData = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
      if (key === CACHE_KEYS.INSTANCES) {
        localStorage.setItem(CACHE_KEYS.LAST_FETCH, Date.now().toString());
      }
    } catch (e) {
      console.warn('Failed to cache data:', e);
    }
  }, []);

  const fetchCompartments = useCallback(async (region: string) => {
    if (!region) return;
    
    try {
      setCompartmentsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/compute/compartments?region=${encodeURIComponent(region)}`);
      const data = await response.json();
      
      if (data.success) {
        setCompartments(data.compartments || []);
        // Auto-select the first compartment if none selected
        if (!selectedCompartment && data.compartments?.length > 0) {
          setSelectedCompartment(data.compartments[0].id);
        }
      } else {
        setError(data.error || 'Failed to fetch compartments');
        setCompartments([]);
      }
    } catch (err) {
      setError('Network error: Unable to fetch compartments');
      setCompartments([]);
    } finally {
      setCompartmentsLoading(false);
    }
  }, [selectedCompartment]);

  const fetchInstances = useCallback(async (region?: string, compartmentId?: string) => {
    const targetRegion = region || selectedRegion;
    const targetCompartment = compartmentId || selectedCompartment;
    
    if (!targetRegion || !targetCompartment) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        compartment_id: targetCompartment,
        region: targetRegion
      });
      
      const response = await fetch(`/api/compute/instances?${params}`);
      const data: ComputeResponse = await response.json();
      
      if (data.success) {
        setInstances(data.instances);
        setConnectionStatus('connected');
        
        // Cache the results
        cacheData(CACHE_KEYS.INSTANCES, data.instances);
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
  }, [selectedRegion, selectedCompartment, cacheData]);

  const testConnection = useCallback(async () => {
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
  }, []);

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

  // Handle region selection
  const handleRegionChange = useCallback((region: string) => {
    setSelectedRegion(region);
    setSelectedCompartment(''); // Reset compartment
    setInstances([]); // Clear instances
    cacheData(CACHE_KEYS.REGION, region);
    
    // Fetch compartments for new region
    fetchCompartments(region);
  }, [fetchCompartments, cacheData]);

  // Handle compartment selection
  const handleCompartmentChange = useCallback((compartmentId: string) => {
    setSelectedCompartment(compartmentId);
    cacheData(CACHE_KEYS.COMPARTMENT, compartmentId);
    
    // Fetch instances for new compartment
    if (selectedRegion) {
      fetchInstances(selectedRegion, compartmentId);
    }
  }, [selectedRegion, fetchInstances, cacheData]);

  // Load compartments when region changes
  useEffect(() => {
    if (selectedRegion) {
      fetchCompartments(selectedRegion);
    }
  }, [selectedRegion, fetchCompartments]);

  // Load instances when both region and compartment are selected
  useEffect(() => {
    if (selectedRegion && selectedCompartment) {
      fetchInstances();
    }
  }, [selectedRegion, selectedCompartment, fetchInstances]);

  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, [testConnection]);

  const getLifecycleStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'running':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'stopped':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'stopping':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'starting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'terminated':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  // Filter and paginate instances
  const filteredInstances = useMemo(() => {
    return instances.filter(instance => {
      const matchesSearch = !searchQuery || 
        instance.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        instance.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        instance.shape.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        instance.lifecycle_state.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [instances, searchQuery, statusFilter]);

  const paginatedInstances = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInstances.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInstances, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredInstances.length / itemsPerPage);

  // Summary statistics
  const stats = useMemo(() => {
    const running = instances.filter(i => i.lifecycle_state.toLowerCase() === 'running').length;
    const stopped = instances.filter(i => i.lifecycle_state.toLowerCase() === 'stopped').length;
    const totalOcpus = instances.reduce((sum, i) => sum + (i.shape_config?.ocpus || 0), 0);
    const totalMemory = instances.reduce((sum, i) => sum + (i.shape_config?.memory_in_gbs || 0), 0);
    
    return { running, stopped, totalOcpus, totalMemory };
  }, [instances]);

  return (
    <ModernLayout
      title="OCI Compute Management"
      subtitle="Manage and monitor Oracle Cloud Infrastructure compute instances"
    >
      <div className="space-y-6">
        {/* Region and Compartment Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Region and Compartment Selection
            </CardTitle>
            <CardDescription>
              Select the region and compartment to view compute instances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Region Selector */}
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={selectedRegion} onValueChange={handleRegionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a region" />
                  </SelectTrigger>
                  <SelectContent>
                    {OCI_REGIONS.map((region) => (
                      <SelectItem key={region.key} value={region.key}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Compartment Selector */}
              <div className="space-y-2">
                <Label>Compartment</Label>
                <Select 
                  value={selectedCompartment} 
                  onValueChange={handleCompartmentChange}
                  disabled={!selectedRegion || compartmentsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedRegion ? "Select a region first" :
                      compartmentsLoading ? "Loading compartments..." :
                      "Select a compartment"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {compartments.map((compartment) => (
                      <SelectItem key={compartment.id} value={compartment.id}>
                        {compartment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {compartmentsLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading compartments...
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        {instances.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.running}</div>
                <div className="text-sm text-muted-foreground">Running</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-600">{stats.stopped}</div>
                <div className="text-sm text-muted-foreground">Stopped</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.totalOcpus}</div>
                <div className="text-sm text-muted-foreground">Total OCPUs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.totalMemory}</div>
                <div className="text-sm text-muted-foreground">Total Memory (GB)</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search instances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
                <SelectItem value="starting">Starting</SelectItem>
                <SelectItem value="stopping">Stopping</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
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
            <Button 
              onClick={() => fetchInstances()} 
              disabled={loading || !selectedRegion || !selectedCompartment}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="flex items-center p-4">
              <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading compute instances...</span>
          </div>
        )}

        {/* Instance List */}
        {!loading && (
          <>
            {!selectedRegion || !selectedCompartment ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Select Region and Compartment</h3>
                  <p className="text-muted-foreground">
                    Choose a region and compartment to view compute instances.
                  </p>
                </CardContent>
              </Card>
            ) : filteredInstances.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Instances Found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'No instances match the current filters.'
                      : 'No compute instances found in the selected compartment.'
                    }
                  </p>
                  {(searchQuery || statusFilter !== 'all') && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Compute Instances ({filteredInstances.length})
                  </h2>
                  
                  {/* Pagination Info */}
                  {totalPages > 1 && (
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                  )}
                </div>

                {/* Instance Cards */}
                <div className="grid gap-4">
                  {paginatedInstances.map((instance) => (
                    <Card key={instance.id} className="w-full">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Server className="h-5 w-5" />
                            <div>
                              <CardTitle className="text-lg">{instance.display_name}</CardTitle>
                              <CardDescription>
                                {instance.shape} • {instance.availability_domain}
                                {instance.shape_config && (
                                  <> • {instance.shape_config.ocpus} OCPU • {instance.shape_config.memory_in_gbs} GB RAM</>
                                )}
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
                                title="Start Instance"
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
                                title="Stop Instance"
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
                                title="Reboot Instance"
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
                                <div><span className="font-medium">Instance ID:</span> <span className="font-mono text-xs">{instance.id}</span></div>
                                <div><span className="font-medium">Region:</span> {instance.region}</div>
                                <div><span className="font-medium">Created:</span> {new Date(instance.time_created).toLocaleDateString()}</div>
                                {instance.fault_domain && (
                                  <div><span className="font-medium">Fault Domain:</span> {instance.fault_domain}</div>
                                )}
                              </div>
                            </div>

                            {/* Network Interfaces */}
                            {instance.vnics.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Network Interfaces</h4>
                                <div className="text-sm space-y-1">
                                  {instance.vnics.slice(0, 2).map((vnic, index) => (
                                    <div key={index} className="p-2 bg-gray-50 rounded">
                                      <div><span className="font-medium">VNIC:</span> {vnic.details.display_name}</div>
                                      <div>Private: <span className="font-mono text-xs">{vnic.details.private_ip}</span></div>
                                      {vnic.details.public_ip && (
                                        <div>Public: <span className="font-mono text-xs">{vnic.details.public_ip}</span></div>
                                      )}
                                      <div>Primary: {vnic.details.is_primary ? 'Yes' : 'No'}</div>
                                    </div>
                                  ))}
                                  {instance.vnics.length > 2 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{instance.vnics.length - 2} more VNICs
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Storage Volumes */}
                            {instance.volumes.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Storage Volumes</h4>
                                <div className="text-sm space-y-1">
                                  {instance.volumes.slice(0, 2).map((volume, index) => (
                                    <div key={index} className="p-2 bg-gray-50 rounded">
                                      <div><span className="font-medium">{volume.type}:</span> {volume.details.display_name}</div>
                                      <div>Size: {volume.details.size_in_gbs} GB</div>
                                      <div>State: {volume.details.lifecycle_state}</div>
                                    </div>
                                  ))}
                                  {instance.volumes.length > 2 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{instance.volumes.length - 2} more volumes
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ModernLayout>
  );
}