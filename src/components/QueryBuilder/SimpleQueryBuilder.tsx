'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { 
  Play, 
  Save, 
  History, 
  Clock, 
  Database, 
  Filter,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  Trash2,
  Calendar as CalendarIcon
} from 'lucide-react'
import { format } from 'date-fns'

import { FIELD_MAPPINGS, LOG_SOURCES, validateQuery, generateSampleQuery } from '@/lib/field-mappings'

// Group field mappings by category for the UI
const LOG_FIELDS = Object.entries(FIELD_MAPPINGS).reduce((acc, [fieldName, field]) => {
  if (!acc[field.category]) {
    acc[field.category] = []
  }
  acc[field.category].push({
    value: fieldName,
    label: field.displayName,
    description: field.description,
    type: field.type
  })
  return acc
}, {} as Record<string, Array<{ value: string; label: string; description: string; type: string }>>)

const LOG_SOURCE_NAMES = Object.keys(LOG_SOURCES)

const OPERATORS = [
  { value: '=', label: 'equals', description: 'Exact match' },
  { value: '!=', label: 'not equals', description: 'Not equal to' },
  { value: 'contains', label: 'contains', description: 'Contains text' },
  { value: 'in', label: 'in', description: 'In list of values' },
  { value: '>', label: 'greater than', description: 'Greater than' },
  { value: '<', label: 'less than', description: 'Less than' },
  { value: 'like', label: 'like', description: 'Pattern matching' }
]

const TIME_RANGES = [
  { label: '1 hour', value: 60 },
  { label: '6 hours', value: 360 },
  { label: '24 hours', value: 1440 },
  { label: '48 hours', value: 2880 },
  { label: '72 hours', value: 4320 },
  { label: 'Custom Period', value: -1 }
]

interface QueryCondition {
  id: string
  field: string
  operator: string
  value: string
  logicalOperator?: 'AND' | 'OR'
}

interface SimpleQueryBuilderProps {
  onExecute: (query: string, options: { timePeriodMinutes: number; maxResults: number }) => Promise<any>
  onSave?: (query: { name: string; query: string; description: string }) => void
  loading?: boolean
}

export default function SimpleQueryBuilder({ onExecute, onSave, loading = false }: SimpleQueryBuilderProps) {
  const [conditions, setConditions] = useState<QueryCondition[]>([
    { id: '1', field: "'Log Source'", operator: '=', value: '', logicalOperator: 'AND' }
  ])
  const [customQuery, setCustomQuery] = useState('')
  const [timeRange, setTimeRange] = useState(60) // 1 hour default
  const [maxResults, setMaxResults] = useState(100)
  const [queryMode, setQueryMode] = useState<'builder' | 'custom'>('builder')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; message: string } | null>(null)
  const [generatedQuery, setGeneratedQuery] = useState('')
  const [workingQueries, setWorkingQueries] = useState<any[]>([])
  
  // Custom period state
  const [isCustomPeriod, setIsCustomPeriod] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('23:59')

  // Load working queries on component mount
  useEffect(() => {
    loadWorkingQueries()
  }, [])

  const loadWorkingQueries = async () => {
    try {
      const response = await fetch('/api/working-queries')
      if (response.ok) {
        const data = await response.json()
        setWorkingQueries(data.data?.queries || [])
      }
    } catch (error) {
      console.error('Failed to load working queries:', error)
    }
  }

  const addCondition = () => {
    const newCondition: QueryCondition = {
      id: Date.now().toString(),
      field: "'Log Source'",
      operator: '=',
      value: '',
      logicalOperator: 'AND'
    }
    setConditions([...conditions, newCondition])
  }

  const removeCondition = (id: string) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter(c => c.id !== id))
    }
  }

  const updateCondition = (id: string, field: keyof QueryCondition, value: string) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  const generateQuery = useCallback(() => {
    if (conditions.length === 0) return ''

    let query = ''
    
    // Build WHERE clause from conditions
    const validConditions = conditions.filter(c => c.field && c.value)
    if (validConditions.length > 0) {
      const conditionStrings = validConditions.map((condition, index) => {
        let conditionStr = ''
        
        // Add logical operator for non-first conditions
        if (index > 0) {
          conditionStr += ` ${condition.logicalOperator || 'AND'} `
        }
        
        // Handle different operators
        if (condition.operator === 'contains') {
          conditionStr += `${condition.field} contains "${condition.value}"`
        } else if (condition.operator === 'in') {
          // Parse comma-separated values for IN operator
          const values = condition.value.split(',').map(v => `'${v.trim()}'`).join(', ')
          conditionStr += `${condition.field} in (${values})`
        } else if (condition.operator === 'like') {
          conditionStr += `${condition.field} like "${condition.value}"`
        } else {
          // For =, !=, >, < operators
          conditionStr += `${condition.field} ${condition.operator} "${condition.value}"`
        }
        
        return conditionStr
      })
      
      query = conditionStrings.join('')
    }

    // Add time filter
    if (isCustomPeriod && startDate && endDate) {
      // Format custom date range for OCI
      const startDateTime = `${format(startDate, 'yyyy-MM-dd')}T${startTime}:00.000Z`
      const endDateTime = `${format(endDate, 'yyyy-MM-dd')}T${endTime}:59.999Z`
      query += ` and Time >= '${startDateTime}' and Time <= '${endDateTime}'`
    } else {
      query += ` and Time > dateRelative(${timeRange}m)`
    }
    
    // Add basic sorting and limit
    query += ` | sort -Time | head ${maxResults}`
    
    return query
  }, [conditions, isCustomPeriod, startDate, endDate, startTime, endTime, timeRange, maxResults])

  const validateQuerySyntax = async (queryToValidate: string) => {
    if (!queryToValidate.trim()) {
      setValidationResult({ isValid: false, message: 'Query cannot be empty' })
      return
    }

    setIsValidating(true)
    
    // First do client-side validation
    const localValidation = validateQuery(queryToValidate)
    const errors = localValidation.filter(rule => rule.severity === 'error')
    const warnings = localValidation.filter(rule => rule.severity === 'warning')
    
    if (errors.length > 0) {
      setValidationResult({ 
        isValid: false, 
        message: `Validation errors: ${errors.map(e => e.message).join(', ')}` 
      })
      setIsValidating(false)
      return
    }

    try {
      const response = await fetch('/api/mcp/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryToValidate,
          validateOnly: true
        })
      })

      const result = await response.json()
      
      if (result.success) {
        let message = 'Query syntax is valid'
        if (warnings.length > 0) {
          message += `. Warnings: ${warnings.map(w => w.message).join(', ')}`
        }
        setValidationResult({ isValid: true, message })
      } else {
        setValidationResult({ isValid: false, message: result.error || 'Query validation failed' })
      }
    } catch (error) {
      setValidationResult({ isValid: false, message: 'Failed to validate query' })
    } finally {
      setIsValidating(false)
    }
  }

  const executeQuery = async () => {
    const query = queryMode === 'builder' ? generatedQuery : customQuery
    
    if (!query.trim()) {
      toast.error('Please enter a query or build one using the conditions')
      return
    }

    // Validate custom period if selected
    if (isCustomPeriod && (!startDate || !endDate)) {
      toast.error('Please select both start and end dates for custom period')
      return
    }

    if (isCustomPeriod && startDate && endDate && startDate > endDate) {
      toast.error('Start date must be before end date')
      return
    }

    try {
      await onExecute(query, {
        timePeriodMinutes: timeRange,
        maxResults: maxResults
      })
    } catch (error) {
      toast.error('Failed to execute query')
    }
  }

  const saveQuery = () => {
    const query = queryMode === 'builder' ? generatedQuery : customQuery
    
    if (!query.trim()) {
      toast.error('No query to save')
      return
    }

    // For now, just show a toast - implement save dialog later
    toast.info('Save query functionality will be implemented')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Query copied to clipboard')
  }

  const loadWorkingQuery = (query: any) => {
    setCustomQuery(query.query)
    setQueryMode('custom')
    toast.success(`Loaded query: ${query.name}`)
  }

  // Handle time range selection
  const handleTimeRangeChange = (value: string) => {
    const numValue = parseInt(value)
    if (numValue === -1) {
      setIsCustomPeriod(true)
      setTimeRange(60) // fallback
    } else {
      setIsCustomPeriod(false)
      setTimeRange(numValue)
    }
  }

  // Update generated query when conditions change
  useEffect(() => {
    if (queryMode === 'builder') {
      const query = generateQuery()
      setGeneratedQuery(query)
    }
  }, [generateQuery, queryMode])

  return (
    <div className="space-y-6">
      {/* Query Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Simple Query Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={queryMode} onValueChange={(value) => setQueryMode(value as 'builder' | 'custom')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="builder">Visual Builder</TabsTrigger>
              <TabsTrigger value="custom">Custom Query</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="space-y-6 mt-6">
              {/* Conditions Builder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Query Conditions</h3>
                  <Button onClick={addCondition} size="sm" variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </div>

                {conditions.map((condition, index) => (
                  <Card key={condition.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      {index > 0 && (
                        <div className="md:col-span-1">
                          <Label htmlFor={`logical-${condition.id}`}>Operator</Label>
                          <Select
                            value={condition.logicalOperator}
                            onValueChange={(value) => updateCondition(condition.id, 'logicalOperator', value as 'AND' | 'OR')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">AND</SelectItem>
                              <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <div className={index === 0 ? "md:col-span-1" : ""}>
                        <Label htmlFor={`field-${condition.id}`}>Field</Label>
                        <Select
                          value={condition.field}
                          onValueChange={(value) => updateCondition(condition.id, 'field', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(LOG_FIELDS).map(([category, fields]) => (
                              <div key={category}>
                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                                  {category}
                                </div>
                                {fields.map((field) => (
                                  <SelectItem key={field.value} value={field.value}>
                                    <div>
                                      <div>{field.label}</div>
                                      <div className="text-xs text-muted-foreground">{field.description}</div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`operator-${condition.id}`}>Operator</Label>
                        <Select
                          value={condition.operator}
                          onValueChange={(value) => updateCondition(condition.id, 'operator', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                <div>
                                  <div>{op.label}</div>
                                  <div className="text-xs text-muted-foreground">{op.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`value-${condition.id}`}>Value</Label>
                        <Input
                          id={`value-${condition.id}`}
                          placeholder="Enter value"
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                        />
                      </div>

                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCondition(condition.id)}
                          disabled={conditions.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Generated Query Preview */}
              {generatedQuery && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Generated Query</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
                        {generatedQuery}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(generatedQuery)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-query">Custom Query</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => validateQuerySyntax(customQuery)}
                      disabled={isValidating}
                    >
                      {isValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Validate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(customQuery)}
                      disabled={!customQuery}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Textarea
                  id="custom-query"
                  placeholder="Enter your OCI Logging Analytics query here..."
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  rows={6}
                  className="font-mono"
                />

                {validationResult && (
                  <Alert variant={validationResult.isValid ? "default" : "destructive"}>
                    {validationResult.isValid ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{validationResult.message}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Working Queries */}
              {workingQueries.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Pre-built Queries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {workingQueries.slice(0, 5).map((query) => (
                        <div key={query.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium text-sm">{query.name}</div>
                            <div className="text-xs text-muted-foreground">{query.description}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadWorkingQuery(query)}
                          >
                            Load
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Query Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Query Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="time-range">Time Range</Label>
              <Select value={isCustomPeriod ? '-1' : timeRange.toString()} onValueChange={handleTimeRangeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value.toString()}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Custom Period Selector */}
              {isCustomPeriod && (
                <div className="mt-4 p-4 border rounded-lg space-y-4">
                  <div className="text-sm font-medium">Custom Time Period</div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Start Date & Time */}
                    <div className="space-y-2">
                      <Label>Start Date & Time</Label>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, 'MMM dd, yyyy') : 'Select date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-24"
                        />
                      </div>
                    </div>
                    
                    {/* End Date & Time */}
                    <div className="space-y-2">
                      <Label>End Date & Time</Label>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, 'MMM dd, yyyy') : 'Select date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {startDate && endDate && (
                    <div className="text-xs text-muted-foreground">
                      Range: {format(startDate, 'MMM dd, yyyy')} {startTime} → {format(endDate, 'MMM dd, yyyy')} {endTime}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-results">Max Results</Label>
              <Select value={maxResults.toString()} onValueChange={(value) => setMaxResults(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Button onClick={executeQuery} disabled={loading} className="flex-1">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Execute Query
            </Button>
            
            <Button variant="outline" onClick={saveQuery}>
              <Save className="h-4 w-4 mr-2" />
              Save Query
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}