'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Server, 
  Play, 
  Square, 
  RotateCcw, 
  RefreshCw, 
  HardDrive, 
  Network,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Monitor,
  Activity,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface VolumeInfo {
  type: 'boot' | 'block'
  attachment_id: string
  volume_id: string
  lifecycle_state: string
  device?: string
  details: {
    id: string
    display_name: string
    size_in_gbs: number
    lifecycle_state: string
    availability_domain: string
    vpus_per_gb?: number
  }
}

interface VnicInfo {
  attachment_id: string
  vnic_id: string
  lifecycle_state: string
  details: {
    id: string
    display_name: string
    private_ip: string
    public_ip?: string
    subnet_id: string
    lifecycle_state: string
    is_primary: boolean
    hostname_label?: string
  }
}

interface ComputeInstance {
  id: string
  display_name: string
  lifecycle_state: string
  availability_domain: string
  compartment_id: string
  shape: string
  region: string
  time_created: string
  fault_domain?: string
  image_id?: string
  shape_config?: {
    ocpus: number
    memory_in_gbs: number
    baseline_ocpu_utilization?: string
  }
  volumes: VolumeInfo[]
  vnics: VnicInfo[]
}

interface ComputeManagementProps {
  timeRangeMinutes?: number
}

export function ComputeManagement({ timeRangeMinutes = 1440 }: ComputeManagementProps) {
  const [instances, setInstances] = useState<ComputeInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedInstances, setExpandedInstances] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<{ [key: string]: string }>({})
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('testing')

  useEffect(() => {
    testConnection()
    loadInstances()
  }, [])

  const testConnection = async () => {
    try {
      setConnectionStatus('testing')
      const response = await fetch('/api/compute/test')
      const data = await response.json()
      
      if (data.success) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('disconnected')
        setError(data.error || 'Failed to connect to OCI Compute services')
      }
    } catch (err) {
      setConnectionStatus('disconnected')
      setError('Failed to test connection to OCI Compute services')
    }
  }

  const loadInstances = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/compute/instances')
      const data = await response.json()
      
      if (data.success) {
        setInstances(data.instances || [])
      } else {
        setError(data.error || 'Failed to load compute instances')
      }
    } catch (err) {
      setError('Failed to load compute instances')
    } finally {
      setLoading(false)
    }
  }

  const handleInstanceAction = async (instanceId: string, action: 'start' | 'stop' | 'reboot') => {
    try {
      setActionLoading(prev => ({ ...prev, [instanceId]: action }))
      
      const response = await fetch(`/api/compute/instances/${instanceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh instances to get updated status
        await loadInstances()
      } else {
        setError(`Failed to ${action} instance: ${data.error}`)
      }
    } catch (err) {
      setError(`Failed to ${action} instance`)
    } finally {
      setActionLoading(prev => {
        const newLoading = { ...prev }
        delete newLoading[instanceId]
        return newLoading
      })
    }
  }

  const toggleInstanceExpansion = (instanceId: string) => {
    setExpandedInstances(prev => {
      const newSet = new Set(prev)
      if (newSet.has(instanceId)) {
        newSet.delete(instanceId)
      } else {
        newSet.add(instanceId)
      }
      return newSet
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'success'
      case 'stopped':
        return 'error'
      case 'starting':
      case 'stopping':
        return 'warning'
      case 'terminated':
        return 'critical'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return <Play className="h-4 w-4 text-green-600" />
      case 'stopped':
        return <Square className="h-4 w-4 text-red-600" />
      case 'starting':
      case 'stopping':
        return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
      default:
        return <Monitor className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return 'Invalid date'
    }
  }

  const getTotalVolumeSize = (volumes: VolumeInfo[]) => {
    return volumes.reduce((total, volume) => {
      return total + (volume.details.size_in_gbs || 0)
    }, 0)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading compute instances...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            OCI Compute Management
            <Badge variant={connectionStatus === 'connected' ? 'success' : 'error'}>
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'testing' ? 'Testing...' : 'Disconnected'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage your Oracle Cloud Infrastructure compute instances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={loadInstances}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={connectionStatus === 'testing'}
            >
              <Activity className={`h-4 w-4 mr-2 ${connectionStatus === 'testing' ? 'animate-pulse' : ''}`} />
              Test Connection
            </Button>
            <Link href="/compute">
              <Button variant="default" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Full Compute Management
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="text-center py-6">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-500">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instances List */}
      <Card>
        <CardHeader>
          <CardTitle>Compute Instances ({instances.length})</CardTitle>
          <CardDescription>
            Manage your OCI compute instances, view storage details, and control instance lifecycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No compute instances found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {instances.map((instance) => (
                <Card key={instance.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(instance.lifecycle_state)}
                        <div>
                          <h3 className="font-semibold">{instance.display_name}</h3>
                          <p className="text-sm text-muted-foreground">{instance.shape}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(instance.lifecycle_state)}>
                          {instance.lifecycle_state}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleInstanceExpansion(instance.id)}
                        >
                          {expandedInstances.has(instance.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium">Availability Domain</p>
                        <p className="text-sm text-muted-foreground">{instance.availability_domain}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Region</p>
                        <p className="text-sm text-muted-foreground">{instance.region}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Created</p>
                        <p className="text-sm text-muted-foreground">{formatDate(instance.time_created)}</p>
                      </div>
                    </div>

                    {/* Shape Configuration */}
                    {instance.shape_config && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium">OCPUs</p>
                          <p className="text-sm text-muted-foreground">{instance.shape_config.ocpus}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Memory</p>
                          <p className="text-sm text-muted-foreground">{instance.shape_config.memory_in_gbs} GB</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Total Storage</p>
                          <p className="text-sm text-muted-foreground">{getTotalVolumeSize(instance.volumes)} GB</p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant="oracle"
                        size="sm"
                        onClick={() => handleInstanceAction(instance.id, 'start')}
                        disabled={
                          instance.lifecycle_state === 'RUNNING' ||
                          actionLoading[instance.id] === 'start'
                        }
                      >
                        {actionLoading[instance.id] === 'start' ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Start
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInstanceAction(instance.id, 'stop')}
                        disabled={
                          instance.lifecycle_state === 'STOPPED' ||
                          actionLoading[instance.id] === 'stop'
                        }
                      >
                        {actionLoading[instance.id] === 'stop' ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Square className="h-4 w-4 mr-2" />
                        )}
                        Stop
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInstanceAction(instance.id, 'reboot')}
                        disabled={
                          instance.lifecycle_state !== 'RUNNING' ||
                          actionLoading[instance.id] === 'reboot'
                        }
                      >
                        {actionLoading[instance.id] === 'reboot' ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-2" />
                        )}
                        Reboot
                      </Button>
                    </div>

                    {/* Expanded Details */}
                    {expandedInstances.has(instance.id) && (
                      <div className="space-y-4 pt-4 border-t">
                        {/* Volume Details */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            Storage Volumes ({instance.volumes.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {instance.volumes.map((volume, index) => (
                              <Card key={volume.attachment_id} className="border-l-4 border-l-accent">
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant={volume.type === 'boot' ? 'oracle' : 'secondary'}>
                                      {volume.type === 'boot' ? 'Boot Volume' : 'Block Volume'}
                                    </Badge>
                                    <Badge variant={volume.details.lifecycle_state === 'AVAILABLE' ? 'success' : 'warning'}>
                                      {volume.details.lifecycle_state}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-sm font-medium">{volume.details.display_name}</p>
                                      <p className="text-xs text-muted-foreground">Size: {volume.details.size_in_gbs} GB</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        AD: {volume.details.availability_domain}
                                      </p>
                                      {volume.device && (
                                        <p className="text-xs text-muted-foreground">
                                          Device: {volume.device}
                                        </p>
                                      )}
                                      {volume.details.vpus_per_gb && (
                                        <p className="text-xs text-muted-foreground">
                                          VPUs/GB: {volume.details.vpus_per_gb}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>

                        {/* Network Details */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Network className="h-4 w-4" />
                            Network Interfaces ({instance.vnics.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {instance.vnics.map((vnic, index) => (
                              <Card key={vnic.attachment_id} className="border-l-4 border-l-success">
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant={vnic.details.is_primary ? 'oracle' : 'secondary'}>
                                      {vnic.details.is_primary ? 'Primary VNIC' : 'Secondary VNIC'}
                                    </Badge>
                                    <Badge variant={vnic.details.lifecycle_state === 'AVAILABLE' ? 'success' : 'warning'}>
                                      {vnic.details.lifecycle_state}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-sm font-medium">{vnic.details.display_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Private IP: {vnic.details.private_ip}
                                      </p>
                                      {vnic.details.public_ip && (
                                        <p className="text-xs text-muted-foreground">
                                          Public IP: {vnic.details.public_ip}
                                        </p>
                                      )}
                                    </div>
                                    {vnic.details.hostname_label && (
                                      <p className="text-xs text-muted-foreground">
                                        Hostname: {vnic.details.hostname_label}
                                      </p>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>

                        {/* Additional Instance Details */}
                        <div>
                          <h4 className="font-medium mb-2">Additional Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Instance ID</p>
                              <p className="text-muted-foreground font-mono text-xs">{instance.id}</p>
                            </div>
                            <div>
                              <p className="font-medium">Compartment ID</p>
                              <p className="text-muted-foreground font-mono text-xs">{instance.compartment_id}</p>
                            </div>
                            {instance.fault_domain && (
                              <div>
                                <p className="font-medium">Fault Domain</p>
                                <p className="text-muted-foreground">{instance.fault_domain}</p>
                              </div>
                            )}
                            {instance.image_id && (
                              <div>
                                <p className="font-medium">Image ID</p>
                                <p className="text-muted-foreground font-mono text-xs">{instance.image_id}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}