'use client'

import { useState, useEffect, useCallback } from 'react'
import { copyToClipboard } from '@/lib/clipboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Search, Database, Eye, Filter, Copy, RefreshCw, Clock } from 'lucide-react'

interface Field {
  name: string
  display_name: string
  type: string
  is_system: boolean
  description: string
  unit_type: string
  is_searchable: boolean
  is_facetable: boolean
}

interface FieldExplorerProps {
  onFieldSelect?: (fieldName: string) => void
  className?: string
}

export function FieldExplorer({ onFieldSelect, className }: FieldExplorerProps) {
  const [fields, setFields] = useState<Field[]>([])
  const [filteredFields, setFilteredFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [fieldTypeFilter, setFieldTypeFilter] = useState<string>('all')
  const [systemFilter, setSystemFilter] = useState<string>('all')
  const [usedSourcesOnly, setUsedSourcesOnly] = useState<boolean>(false)
  const [timePeriodDays, setTimePeriodDays] = useState<string>('7')
  const [selectedField, setSelectedField] = useState<Field | null>(null)

  const loadFields = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      
      if (fieldTypeFilter !== 'all') {
        params.append('field_type', fieldTypeFilter)
      }
      
      if (systemFilter !== 'all') {
        params.append('is_system', systemFilter)
      }
      
      if (usedSourcesOnly) {
        params.append('used_sources_only', 'true')
        params.append('time_period_days', timePeriodDays)
      }
      
      const response = await fetch(`/api/mcp/fields?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setFields(data.fields || [])
        setFilteredFields(data.fields || [])
      } else {
        setError(data.error || 'Failed to load fields')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [fieldTypeFilter, systemFilter, usedSourcesOnly, timePeriodDays])

  useEffect(() => {
    loadFields()
  }, [fieldTypeFilter, systemFilter, usedSourcesOnly, timePeriodDays, loadFields])

  useEffect(() => {
    const filtered = fields.filter(field => {
      const matchesSearch = searchTerm === '' || 
        (field.name && field.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (field.display_name && field.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (field.description && field.description.toLowerCase().includes(searchTerm.toLowerCase()))
      
      return matchesSearch
    })
    
    setFilteredFields(filtered)
  }, [fields, searchTerm])

  const copyFieldName = async (fieldName: string) => {
    const success = await copyToClipboard(`'${fieldName}'`)
    if (!success) {
      console.warn('Failed to copy field name to clipboard')
    }
  }

  const handleFieldSelect = (field: Field) => {
    setSelectedField(field)
    if (onFieldSelect) {
      onFieldSelect(field.name)
    }
  }

  const fieldTypes = [...new Set(fields.map(f => f.type).filter(Boolean))]

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Field Explorer
              </CardTitle>
              <CardDescription>
                {usedSourcesOnly 
                  ? `Showing fields from log sources with data in the last ${timePeriodDays} day${timePeriodDays === '1' ? '' : 's'}`
                  : 'Discover available fields for building queries'
                }
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadFields}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-60">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search fields by name, display name, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10"
                  />
                </div>
              </div>
              <Select value={fieldTypeFilter} onValueChange={setFieldTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Field Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {fieldTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={systemFilter} onValueChange={setSystemFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  <SelectItem value="true">System</SelectItem>
                  <SelectItem value="false">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Used Sources Filter */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Switch
                  id="used-sources-only"
                  checked={usedSourcesOnly}
                  onCheckedChange={setUsedSourcesOnly}
                />
                <Label htmlFor="used-sources-only" className="text-sm font-medium">
                  Show only fields from used sources
                </Label>
              </div>
              {usedSourcesOnly && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="time-period" className="text-sm">
                    Time period:
                  </Label>
                  <Select value={timePeriodDays} onValueChange={setTimePeriodDays}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading fields...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Found {filteredFields.length} fields
                  {usedSourcesOnly && (
                    <Badge variant="secondary" className="ml-2">
                      <Filter className="h-3 w-3 mr-1" />
                      Used sources only
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {filteredFields.map((field) => (
                  <div
                    key={field.name}
                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleFieldSelect(field)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono text-blue-600 truncate">
                            {field.name}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              copyFieldName(field.name)
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {field.display_name && field.display_name !== field.name && (
                          <div className="text-sm font-medium mb-1 truncate">
                            {field.display_name}
                          </div>
                        )}
                        
                        <div className="flex gap-1 mb-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                          {field.is_system && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                          {field.is_searchable && (
                            <Badge variant="outline" className="text-xs">
                              Searchable
                            </Badge>
                          )}
                          {field.is_facetable && (
                            <Badge variant="outline" className="text-xs">
                              Facetable
                            </Badge>
                          )}
                        </div>
                        
                        {field.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {field.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Selected Field Details */}
          {selectedField && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Field Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <strong>Name:</strong> <code>{selectedField.name}</code>
                </div>
                {selectedField.display_name && (
                  <div>
                    <strong>Display Name:</strong> {selectedField.display_name}
                  </div>
                )}
                <div>
                  <strong>Type:</strong> {selectedField.type}
                </div>
                {selectedField.unit_type && (
                  <div>
                    <strong>Unit Type:</strong> {selectedField.unit_type}
                  </div>
                )}
                <div>
                  <strong>System Field:</strong> {selectedField.is_system ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Searchable:</strong> {selectedField.is_searchable ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Facetable:</strong> {selectedField.is_facetable ? 'Yes' : 'No'}
                </div>
                {selectedField.description && (
                  <div>
                    <strong>Description:</strong> {selectedField.description}
                  </div>
                )}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyFieldName(selectedField.name)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Field Name
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}