'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download,
  Filter,
  Search,
  Calendar as CalendarIcon,
  FileText,
  Database,
  Image,
  FileSpreadsheet,
  FileJson,
  File,
  Archive,
  Settings,
  Eye,
  Trash2,
  Plus,
  Minus,
  RefreshCw,
  SortAsc,
  SortDesc,
  CheckSquare,
  Square,
  X
} from 'lucide-react'

interface DataFilter {
  id: string
  field: string
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'regex'
  value: string | string[] | { min: string; max: string }
  enabled: boolean
  logicalOperator?: 'AND' | 'OR'
}

interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'pdf' | 'xml' | 'parquet'
  includeHeaders: boolean
  includeMetadata: boolean
  compression: 'none' | 'zip' | 'gzip'
  dateFormat: string
  delimiter: string
  encoding: 'utf-8' | 'ascii' | 'latin1'
  maxRows: number
  splitFiles: boolean
  splitSize: number
}

interface ColumnConfig {
  field: string
  label: string
  visible: boolean
  width?: number
  format?: string
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max'
}

interface AdvancedDataExporterProps {
  data: Record<string, any>[]
  onExport: (filteredData: Record<string, any>[], options: ExportOptions) => void
  onSaveFilter?: (filter: DataFilter[]) => void
  savedFilters?: Array<{ id: string; name: string; filters: DataFilter[] }>
  loading?: boolean
}

const OPERATORS = [
  { value: 'equals', label: 'Equals', types: ['string', 'number', 'date'] },
  { value: 'contains', label: 'Contains', types: ['string'] },
  { value: 'startsWith', label: 'Starts with', types: ['string'] },
  { value: 'endsWith', label: 'Ends with', types: ['string'] },
  { value: 'greaterThan', label: 'Greater than', types: ['number', 'date'] },
  { value: 'lessThan', label: 'Less than', types: ['number', 'date'] },
  { value: 'between', label: 'Between', types: ['number', 'date'] },
  { value: 'in', label: 'In list', types: ['string', 'number'] },
  { value: 'regex', label: 'Regex', types: ['string'] }
]

const EXPORT_FORMATS = [
  { value: 'json', label: 'JSON', icon: FileJson, description: 'JavaScript Object Notation' },
  { value: 'csv', label: 'CSV', icon: File, description: 'Comma Separated Values' },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, description: 'Microsoft Excel file' },
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Portable Document Format' },
  { value: 'xml', label: 'XML', icon: Database, description: 'Extensible Markup Language' },
  { value: 'parquet', label: 'Parquet', icon: Archive, description: 'Columnar storage format' }
]

const DATE_FORMATS = [
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'YYYY-MM-DD HH:mm:ss',
  'ISO 8601'
]

export default function AdvancedDataExporter({
  data,
  onExport,
  onSaveFilter,
  savedFilters = [],
  loading = false
}: AdvancedDataExporterProps) {
  const [activeTab, setActiveTab] = useState('filters')
  const [filters, setFilters] = useState<DataFilter[]>([])
  const [globalSearch, setGlobalSearch] = useState('')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null)
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([])
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeHeaders: true,
    includeMetadata: false,
    compression: 'none',
    dateFormat: 'YYYY-MM-DD',
    delimiter: ',',
    encoding: 'utf-8',
    maxRows: 10000,
    splitFiles: false,
    splitSize: 5000
  })
  const [showPreview, setShowPreview] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [filterName, setFilterName] = useState('')

  // Get available fields from data
  const availableFields = useMemo(() => {
    if (!data.length) return []
    const fields = Object.keys(data[0])
    return fields.map(field => ({
      name: field,
      type: getFieldType(data[0][field]),
      uniqueValues: [...new Set(data.map(row => row[field]))].slice(0, 100)
    }))
  }, [data])

  // Initialize column configs
  React.useEffect(() => {
    if (availableFields.length > 0 && columnConfigs.length === 0) {
      setColumnConfigs(
        availableFields.map(field => ({
          field: field.name,
          label: field.name,
          visible: true,
          aggregation: 'none'
        }))
      )
      setSelectedFields(availableFields.map(f => f.name))
    }
  }, [availableFields, columnConfigs.length])

  const getFieldType = (value: any): 'string' | 'number' | 'date' | 'boolean' => {
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (value instanceof Date || !isNaN(Date.parse(value))) return 'date'
    return 'string'
  }

  // Apply filters and search
  const filteredData = useMemo(() => {
    let filtered = data

    // Apply global search
    if (globalSearch) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(globalSearch.toLowerCase())
        )
      )
    }

    // Apply individual filters
    filtered = filtered.filter(row => {
      return filters.every((filter, index) => {
        if (!filter.enabled) return true

        const fieldValue = row[filter.field]
        const result = applyFilter(fieldValue, filter)

        // Handle logical operators (except for first filter)
        if (index > 0 && filter.logicalOperator === 'OR') {
          // OR logic: if any previous filter passed, this row is included
          const previousFilters = filters.slice(0, index)
          const previousResult = previousFilters.some(prevFilter => 
            prevFilter.enabled && applyFilter(row[prevFilter.field], prevFilter)
          )
          return previousResult || result
        }

        return result
      })
    })

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.field]
        const bVal = b[sortConfig.field]
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [data, filters, globalSearch, sortConfig])

  const applyFilter = (value: any, filter: DataFilter): boolean => {
    const strValue = String(value).toLowerCase()
    const filterValue = typeof filter.value === 'string' ? filter.value.toLowerCase() : filter.value

    switch (filter.operator) {
      case 'equals':
        return strValue === String(filterValue).toLowerCase()
      case 'contains':
        return strValue.includes(String(filterValue))
      case 'startsWith':
        return strValue.startsWith(String(filterValue))
      case 'endsWith':
        return strValue.endsWith(String(filterValue))
      case 'greaterThan':
        return Number(value) > Number(filterValue)
      case 'lessThan':
        return Number(value) < Number(filterValue)
      case 'between':
        if (typeof filterValue === 'object' && 'min' in filterValue && 'max' in filterValue) {
          return Number(value) >= Number(filterValue.min) && Number(value) <= Number(filterValue.max)
        }
        return false
      case 'in':
        if (Array.isArray(filterValue)) {
          return filterValue.some(v => String(v).toLowerCase() === strValue)
        }
        return String(filterValue).split(',').some(v => v.trim().toLowerCase() === strValue)
      case 'regex':
        try {
          const regex = new RegExp(String(filterValue), 'i')
          return regex.test(strValue)
        } catch {
          return false
        }
      default:
        return true
    }
  }

  const addFilter = useCallback(() => {
    const newFilter: DataFilter = {
      id: `filter-${Date.now()}`,
      field: availableFields[0]?.name || '',
      operator: 'equals',
      value: '',
      enabled: true,
      logicalOperator: filters.length > 0 ? 'AND' : undefined
    }
    setFilters(prev => [...prev, newFilter])
  }, [availableFields, filters.length])

  const updateFilter = useCallback((id: string, updates: Partial<DataFilter>) => {
    setFilters(prev => prev.map(filter => 
      filter.id === id ? { ...filter, ...updates } : filter
    ))
  }, [])

  const removeFilter = useCallback((id: string) => {
    setFilters(prev => prev.filter(filter => filter.id !== id))
  }, [])

  const toggleFieldSelection = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
    
    setColumnConfigs(prev => prev.map(config => 
      config.field === field ? { ...config, visible: !config.visible } : config
    ))
  }

  const handleExport = () => {
    const exportData = filteredData.map(row => {
      const filtered: Record<string, any> = {}
      selectedFields.forEach(field => {
        if (columnConfigs.find(c => c.field === field)?.visible) {
          filtered[field] = row[field]
        }
      })
      return filtered
    })

    onExport(exportData, exportOptions)
    setShowExportDialog(false)
  }

  const saveCurrentFilter = () => {
    if (onSaveFilter && filterName.trim()) {
      onSaveFilter(filters)
      setFilterName('')
    }
  }

  const loadSavedFilter = (savedFilter: typeof savedFilters[0]) => {
    setFilters(savedFilter.filters)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Data Filter & Export
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {filteredData.length} / {data.length} rows
              </Badge>
              <Button
                onClick={() => setShowPreview(true)}
                variant="outline"
                size="sm"
                disabled={filteredData.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={() => setShowExportDialog(true)}
                disabled={filteredData.length === 0 || loading}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="columns">Columns</TabsTrigger>
          <TabsTrigger value="options">Export Options</TabsTrigger>
          <TabsTrigger value="saved">Saved Filters</TabsTrigger>
        </TabsList>

        {/* Filters Tab */}
        <TabsContent value="filters" className="space-y-4">
          {/* Global Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Global search across all fields..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Field Filters
                <Button onClick={addFilter} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Filter
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filters.map((filter, index) => (
                <div key={filter.id} className="space-y-3">
                  {index > 0 && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={filter.logicalOperator || 'AND'}
                        onValueChange={(value) => updateFilter(filter.id, { logicalOperator: value as 'AND' | 'OR' })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-12 gap-2 items-center p-4 border rounded-lg">
                    <div className="col-span-1 flex items-center">
                      <Checkbox
                        checked={filter.enabled}
                        onCheckedChange={(checked) => updateFilter(filter.id, { enabled: !!checked })}
                      />
                    </div>
                    
                    <div className="col-span-3">
                      <Select
                        value={filter.field}
                        onValueChange={(value) => updateFilter(filter.id, { field: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {field.type}
                                </Badge>
                                {field.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Select
                        value={filter.operator}
                        onValueChange={(value) => updateFilter(filter.id, { operator: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.filter(op => {
                            const fieldType = availableFields.find(f => f.name === filter.field)?.type
                            return op.types.includes(fieldType || 'string')
                          }).map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-5">
                      {filter.operator === 'between' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Min"
                            value={typeof filter.value === 'object' && 'min' in filter.value ? filter.value.min : ''}
                            onChange={(e) => updateFilter(filter.id, { 
                              value: { 
                                min: e.target.value, 
                                max: typeof filter.value === 'object' && 'max' in filter.value ? filter.value.max : '' 
                              }
                            })}
                          />
                          <Input
                            placeholder="Max"
                            value={typeof filter.value === 'object' && 'max' in filter.value ? filter.value.max : ''}
                            onChange={(e) => updateFilter(filter.id, { 
                              value: { 
                                min: typeof filter.value === 'object' && 'min' in filter.value ? filter.value.min : '', 
                                max: e.target.value 
                              }
                            })}
                          />
                        </div>
                      ) : filter.operator === 'in' ? (
                        <Textarea
                          placeholder="Enter values separated by commas"
                          value={Array.isArray(filter.value) ? filter.value.join(', ') : String(filter.value)}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value.split(',').map(v => v.trim()) })}
                          rows={2}
                        />
                      ) : (
                        <Input
                          placeholder="Enter value"
                          value={Array.isArray(filter.value) ? filter.value.join(', ') : String(filter.value)}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        />
                      )}
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFilter(filter.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filters.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No filters applied</p>
                  <p className="text-sm">Add filters to refine your data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Columns Tab */}
        <TabsContent value="columns">
          <Card>
            <CardHeader>
              <CardTitle>Column Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Select columns to include in export:</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFields(availableFields.map(f => f.name))
                        setColumnConfigs(prev => prev.map(c => ({ ...c, visible: true })))
                      }}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFields([])
                        setColumnConfigs(prev => prev.map(c => ({ ...c, visible: false })))
                      }}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Deselect All
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {availableFields.map((field) => {
                      const config = columnConfigs.find(c => c.field === field.name)
                      const isSelected = selectedFields.includes(field.name)
                      
                      return (
                        <div key={field.name} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleFieldSelection(field.name)}
                            />
                            <div>
                              <p className="font-medium">{field.name}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {field.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {field.uniqueValues.length} unique values
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <Select
                                value={config?.aggregation || 'none'}
                                onValueChange={(value) => {
                                  setColumnConfigs(prev => prev.map(c => 
                                    c.field === field.name ? { ...c, aggregation: value as any } : c
                                  ))
                                }}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="count">Count</SelectItem>
                                  {field.type === 'number' && (
                                    <>
                                      <SelectItem value="sum">Sum</SelectItem>
                                      <SelectItem value="avg">Average</SelectItem>
                                      <SelectItem value="min">Min</SelectItem>
                                      <SelectItem value="max">Max</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Options Tab */}
        <TabsContent value="options">
          <Card>
            <CardHeader>
              <CardTitle>Export Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Format Selection */}
              <div className="space-y-3">
                <Label>Export Format</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {EXPORT_FORMATS.map((format) => {
                    const IconComponent = format.icon
                    return (
                      <Card 
                        key={format.value}
                        className={`cursor-pointer transition-colors ${
                          exportOptions.format === format.value ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setExportOptions(prev => ({ ...prev, format: format.value as any }))}
                      >
                        <CardContent className="p-4 text-center">
                          <IconComponent className="h-8 w-8 mx-auto mb-2" />
                          <h3 className="font-medium">{format.label}</h3>
                          <p className="text-xs text-muted-foreground">{format.description}</p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* General Options */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">General Options</h3>
                  
                  <div className="flex items-center justify-between">
                    <Label>Include Headers</Label>
                    <Switch
                      checked={exportOptions.includeHeaders}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeHeaders: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Include Metadata</Label>
                    <Switch
                      checked={exportOptions.includeMetadata}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeMetadata: checked }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Maximum Rows</Label>
                    <Input
                      type="number"
                      value={exportOptions.maxRows}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, maxRows: parseInt(e.target.value) || 10000 }))}
                      min="1"
                      max="1000000"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Format Specific</h3>
                  
                  {exportOptions.format === 'csv' && (
                    <>
                      <div className="space-y-2">
                        <Label>Delimiter</Label>
                        <Select
                          value={exportOptions.delimiter}
                          onValueChange={(value) => setExportOptions(prev => ({ ...prev, delimiter: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=",">,  (Comma)</SelectItem>
                            <SelectItem value=";">; (Semicolon)</SelectItem>
                            <SelectItem value="\t">⇥ (Tab)</SelectItem>
                            <SelectItem value="|">| (Pipe)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select
                      value={exportOptions.dateFormat}
                      onValueChange={(value) => setExportOptions(prev => ({ ...prev, dateFormat: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FORMATS.map(format => (
                          <SelectItem key={format} value={format}>{format}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Text Encoding</Label>
                    <Select
                      value={exportOptions.encoding}
                      onValueChange={(value) => setExportOptions(prev => ({ ...prev, encoding: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utf-8">UTF-8</SelectItem>
                        <SelectItem value="ascii">ASCII</SelectItem>
                        <SelectItem value="latin1">Latin-1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* File Options */}
              <div className="space-y-4">
                <h3 className="font-medium">File Options</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Compression</Label>
                    <Select
                      value={exportOptions.compression}
                      onValueChange={(value) => setExportOptions(prev => ({ ...prev, compression: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="zip">ZIP</SelectItem>
                        <SelectItem value="gzip">GZIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Split Large Files</Label>
                      <Switch
                        checked={exportOptions.splitFiles}
                        onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, splitFiles: checked }))}
                      />
                    </div>
                    {exportOptions.splitFiles && (
                      <Input
                        type="number"
                        placeholder="Rows per file"
                        value={exportOptions.splitSize}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, splitSize: parseInt(e.target.value) || 5000 }))}
                        min="100"
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Filters Tab */}
        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Saved Filters
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Filter name..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="w-48"
                  />
                  <Button
                    onClick={saveCurrentFilter}
                    disabled={!filterName.trim() || filters.length === 0}
                    size="sm"
                  >
                    Save Current
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedFilters.length > 0 ? (
                <div className="space-y-2">
                  {savedFilters.map((savedFilter) => (
                    <Card key={savedFilter.id} className="cursor-pointer hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{savedFilter.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {savedFilter.filters.length} filters
                            </p>
                          </div>
                          <Button
                            onClick={() => loadSavedFilter(savedFilter)}
                            size="sm"
                          >
                            Load
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No saved filters</p>
                  <p className="text-sm">Create and save filter combinations for reuse</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rows to Export</Label>
                <p className="text-lg font-bold">{filteredData.length.toLocaleString()}</p>
              </div>
              <div>
                <Label>Columns Selected</Label>
                <p className="text-lg font-bold">{selectedFields.length}</p>
              </div>
            </div>
            
            <div>
              <Label>Export Format</Label>
              <p className="text-sm text-muted-foreground capitalize">
                {exportOptions.format} with {exportOptions.compression !== 'none' ? exportOptions.compression : 'no'} compression
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Data Preview ({filteredData.length} rows)</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectedFields.map(field => (
                    <TableHead key={field}>{field}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.slice(0, 100).map((row, index) => (
                  <TableRow key={index}>
                    {selectedFields.map(field => (
                      <TableCell key={field} className="max-w-32 truncate">
                        {String(row[field])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          {filteredData.length > 100 && (
            <p className="text-sm text-muted-foreground text-center">
              Showing first 100 rows of {filteredData.length} total rows
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}