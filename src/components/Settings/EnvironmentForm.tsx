'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { OCIEnvironment } from '@/types/multitenancy'
import { DialogFooter } from '@/components/ui/dialog'

interface EnvironmentFormProps {
  environment?: OCIEnvironment | null
  onSave: (environment: OCIEnvironment) => void
  onCancel: () => void
}

const OCI_REGIONS = [
  { value: 'us-ashburn-1', label: 'US East (Ashburn)' },
  { value: 'us-phoenix-1', label: 'US West (Phoenix)' },
  { value: 'eu-frankfurt-1', label: 'Germany Central (Frankfurt)' },
  { value: 'eu-amsterdam-1', label: 'Netherlands Northwest (Amsterdam)' },
  { value: 'uk-london-1', label: 'UK South (London)' },
  { value: 'ca-toronto-1', label: 'Canada Southeast (Toronto)' },
  { value: 'ap-mumbai-1', label: 'India West (Mumbai)' },
  { value: 'ap-sydney-1', label: 'Australia East (Sydney)' },
  { value: 'ap-tokyo-1', label: 'Japan East (Tokyo)' },
  { value: 'ap-seoul-1', label: 'South Korea Central (Seoul)' },
  { value: 'ap-singapore-1', label: 'Singapore' },
  { value: 'sa-saopaulo-1', label: 'Brazil East (Sao Paulo)' },
  { value: 'il-jerusalem-1', label: 'Israel (Jerusalem)' },
  { value: 'me-dubai-1', label: 'UAE East (Dubai)' },
  { value: 'me-jeddah-1', label: 'Saudi Arabia West (Jeddah)' },
  { value: 'ap-hyderabad-1', label: 'India South (Hyderabad)' },
  { value: 'ap-melbourne-1', label: 'Australia Southeast (Melbourne)' },
  { value: 'ap-osaka-1', label: 'Japan Central (Osaka)' },
  { value: 'ca-montreal-1', label: 'Canada Southeast (Montreal)' },
  { value: 'eu-zurich-1', label: 'Switzerland North (Zurich)' },
  { value: 'sa-santiago-1', label: 'Chile (Santiago)' },
  { value: 'sa-vinhedo-1', label: 'Brazil Southeast (Vinhedo)' },
  { value: 'eu-stockholm-1', label: 'Sweden Central (Stockholm)' },
  { value: 'eu-marseille-1', label: 'France South (Marseille)' },
  { value: 'eu-milan-1', label: 'Italy Northwest (Milan)' },
  { value: 'eu-paris-1', label: 'France Central (Paris)' },
  { value: 'eu-madrid-1', label: 'Spain Central (Madrid)' },
  { value: 'us-chicago-1', label: 'US Midwest (Chicago)' },
]

export default function EnvironmentForm({ environment, onSave, onCancel }: EnvironmentFormProps) {
  const [formData, setFormData] = useState<OCIEnvironment>({
    id: environment?.id || `env-${Date.now()}`,
    name: environment?.name || '',
    description: environment?.description || '',
    region: environment?.region || 'us-ashburn-1',
    compartmentId: environment?.compartmentId || '',
    namespace: environment?.namespace || '',
    authType: environment?.authType || 'config_file',
    configProfile: environment?.configProfile || 'DEFAULT',
    isDefault: environment?.isDefault || false,
    isActive: environment?.isActive !== undefined ? environment.isActive : true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Environment name is required'
    }

    if (!formData.compartmentId.trim()) {
      newErrors.compartmentId = 'Compartment ID is required'
    }

    if (!formData.namespace.trim()) {
      newErrors.namespace = 'Namespace is required'
    }

    if (formData.authType === 'config_file' && !formData.configProfile?.trim()) {
      newErrors.configProfile = 'Config profile is required for config file authentication'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validate()) {
      onSave(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Environment Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Production Environment"
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Region *</Label>
          <Select value={formData.region} onValueChange={(value) => setFormData({ ...formData, region: value })}>
            <SelectTrigger id="region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OCI_REGIONS.map((region) => (
                <SelectItem key={region.value} value={region.value}>
                  {region.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description for this environment"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="compartmentId">Compartment ID *</Label>
          <Input
            id="compartmentId"
            value={formData.compartmentId}
            onChange={(e) => setFormData({ ...formData, compartmentId: e.target.value })}
            placeholder="ocid1.compartment.oc1..aaaa..."
          />
          {errors.compartmentId && <p className="text-sm text-red-500">{errors.compartmentId}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="namespace">Namespace *</Label>
          <Input
            id="namespace"
            value={formData.namespace}
            onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
            placeholder="your-namespace"
          />
          {errors.namespace && <p className="text-sm text-red-500">{errors.namespace}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="authType">Authentication Type</Label>
          <Select 
            value={formData.authType} 
            onValueChange={(value: any) => setFormData({ ...formData, authType: value })}
          >
            <SelectTrigger id="authType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="config_file">Config File</SelectItem>
              <SelectItem value="instance_principal">Instance Principal</SelectItem>
              <SelectItem value="resource_principal">Resource Principal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.authType === 'config_file' && (
          <div className="space-y-2">
            <Label htmlFor="configProfile">Config Profile</Label>
            <Input
              id="configProfile"
              value={formData.configProfile}
              onChange={(e) => setFormData({ ...formData, configProfile: e.target.value })}
              placeholder="DEFAULT"
            />
            {errors.configProfile && <p className="text-sm text-red-500">{errors.configProfile}</p>}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="isActive">Active</Label>
            <p className="text-sm text-muted-foreground">
              Include this environment in queries
            </p>
          </div>
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="isDefault">Default Environment</Label>
            <p className="text-sm text-muted-foreground">
              Use as the primary environment for single queries
            </p>
          </div>
          <Switch
            id="isDefault"
            checked={formData.isDefault}
            onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {environment ? 'Update Environment' : 'Add Environment'}
        </Button>
      </DialogFooter>
    </form>
  )
}