'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Minus, 
  Play, 
  Save, 
  History, 
  BookOpen, 
  Code, 
  Eye, 
  Settings,
  Search,
  Filter,
  Calendar,
  Database
} from 'lucide-react'
import { escapeQueryValue, createStringLiteral, createContainsCall } from '@/lib/utils/query-escaping'

interface QueryCondition {
  id: string
  field: string
  operator: string
  value: string
  logicalOperator?: 'AND' | 'OR'
}

interface QueryBuilderProps {
  onExecute: (query: string, options: QueryOptions) => void
  onSave?: (query: string, name: string, category: string) => void
  savedQueries?: SavedQuery[]
  loading?: boolean
}

interface QueryOptions {
  timePeriod: number
  maxResults: number
  bypassValidation: boolean
  format: 'table' | 'json' | 'csv'
}

interface SavedQuery {
  id: string
  name: string
  query: string
  category: string
  created: string
  lastUsed?: string
}

const FIELD_OPTIONS = [
  { value: "'Log Source'", label: "Log Source", type: "string" },
  { value: "'Event Name'", label: "Event Name", type: "string" },
  { value: "'Principal Name'", label: "Principal Name", type: "string" },
  { value: "'IP Address'", label: "IP Address", type: "string" },
  { value: "'Compartment Name'", label: "Compartment Name", type: "string" },
  { value: "'Security Result'", label: "Security Result", type: "string" },
  { value: "'Event Type'", label: "Event Type", type: "string" },
  { value: "'Source IP'", label: "Source IP", type: "string" },
  { value: "'Destination IP'", label: "Destination IP", type: "string" },
  { value: "'User Agent'", label: "User Agent", type: "string" },
  { value: "'Request Method'", label: "Request Method", type: "string" },
  { value: "'Response Code'", label: "Response Code", type: "number" },
  { value: "Time", label: "Time", type: "datetime" }
]

const OPERATORS = {
  string: [
    { value: "=", label: "equals" },
    { value: "!=", label: "not equals" },
    { value: "contains", label: "contains" },
    { value: "!contains", label: "does not contain" },
    { value: "startswith", label: "starts with" },
    { value: "endswith", label: "ends with" },
    { value: "in", label: "in list" },
    { value: "!in", label: "not in list" }
  ],
  number: [
    { value: "=", label: "equals" },
    { value: "!=", label: "not equals" },
    { value: ">", label: "greater than" },
    { value: ">=", label: "greater than or equal" },
    { value: "<", label: "less than" },
    { value: "<=", label: "less than or equal" },
    { value: "between", label: "between" }
  ],
  datetime: [
    { value: ">", label: "after" },
    { value: ">=", label: "on or after" },
    { value: "<", label: "before" },
    { value: "<=", label: "on or before" },
    { value: "between", label: "between" }
  ]
}

const TIME_PERIODS = [
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '1 day' },
  { value: 4320, label: '3 days' },
  { value: 10080, label: '1 week' },
  { value: 43200, label: '1 month' }
]

const QUERY_TEMPLATES = [
  {
    name: "Failed Logins",
    category: "Security", 
    description: "Find failed login attempts",
    query: "'Log Source' in ('Windows Security Events', 'Linux Secure Logs') and 'Security Result' = 'denied'"
  },
  {
    name: "High Risk IPs",
    category: "Security",
    description: "Identify suspicious IP addresses",
    query: "'IP Address' != null | stats count as events by 'IP Address' | where events > 100 | sort events desc"
  },
  {
    name: "Privilege Escalation",
    category: "Security",
    description: "Detect privilege escalation attempts",
    query: "'Event Name' contains 'privilege' or 'Event Name' contains 'escalation' or 'Event Name' contains 'sudo'"
  },
  {
    name: "Network Anomalies",
    category: "Network",
    description: "Find unusual network activity",
    query: "'Log Source' contains 'Network' | stats count as connections by 'Source IP', 'Destination IP' | where connections > 50"
  },
  {
    name: "Error Analysis",
    category: "System",
    description: "Analyze system errors",
    query: "'Log Source' contains 'System' and ('Event Name' contains 'error' or 'Event Name' contains 'fail')"
  }
]

export default function AdvancedQueryBuilder({ onExecute, onSave, savedQueries = [], loading = false }: QueryBuilderProps) {
  const [conditions, setConditions] = useState<QueryCondition[]>([
    { id: '1', field: '', operator: '', value: '' }
  ])
  const [rawQuery, setRawQuery] = useState('')
  const [activeTab, setActiveTab] = useState('visual')
  const [queryOptions, setQueryOptions] = useState<QueryOptions>({
    timePeriod: 1440,
    maxResults: 100,
    bypassValidation: false,
    format: 'table'
  })
  const [queryName, setQueryName] = useState('')
  const [queryCategory, setQueryCategory] = useState('Custom')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')

  const addCondition = useCallback(() => {
    const newCondition: QueryCondition = {
      id: Date.now().toString(),
      field: '',
      operator: '',
      value: '',
      logicalOperator: 'AND'
    }
    setConditions(prev => [...prev, newCondition])
  }, [])

  const removeCondition = useCallback((id: string) => {
    setConditions(prev => prev.filter(condition => condition.id !== id))
  }, [])

  const updateCondition = useCallback((id: string, field: keyof QueryCondition, value: string) => {
    setConditions(prev => prev.map(condition => 
      condition.id === id ? { ...condition, [field]: value } : condition
    ))
  }, [])

  const getFieldType = (fieldValue: string): string => {
    const field = FIELD_OPTIONS.find(f => f.value === fieldValue)
    return field?.type || 'string'
  }


  const buildQueryFromConditions = useCallback(() => {
    if (conditions.length === 0 || !conditions[0].field) return ''

    const validConditions = conditions.filter(c => c.field && c.operator && c.value)
    if (validConditions.length === 0) return ''

    const queryParts = validConditions.map((condition, index) => {
      let conditionStr = ''
      
      if (index > 0 && condition.logicalOperator) {
        conditionStr += ` ${condition.logicalOperator} `
      }

      const fieldType = getFieldType(condition.field)
      let valueStr = condition.value

      // Handle different value types and operators
      if (fieldType === 'string' && !condition.operator.includes('contains')) {
        valueStr = createStringLiteral(condition.value)
      } else if (condition.operator === 'in' || condition.operator === '!in') {
        const values = condition.value.split(',').map(v => createStringLiteral(v.trim())).join(', ')
        valueStr = `(${values})`
      }

      if (condition.operator.includes('contains')) {
        conditionStr += createContainsCall(condition.field, condition.value)
      } else {
        conditionStr += `${condition.field} ${condition.operator} ${valueStr}`
      }

      return conditionStr
    }).join('')

    // Add time filter
    const timeFilter = `Time > dateRelative(${queryOptions.timePeriod}m)`
    return `${timeFilter} and (${queryParts})`
  }, [conditions, queryOptions.timePeriod])

  const applyTemplate = (template: typeof QUERY_TEMPLATES[0]) => {
    setRawQuery(template.query)
    setActiveTab('raw')
  }

  const handleExecute = () => {
    const query = activeTab === 'visual' ? buildQueryFromConditions() : rawQuery
    if (query.trim()) {
      onExecute(query, queryOptions)
    }
  }

  const handleSave = () => {
    if (onSave && queryName.trim()) {
      const query = activeTab === 'visual' ? buildQueryFromConditions() : rawQuery
      onSave(query, queryName, queryCategory)
      setShowSaveDialog(false)
      setQueryName('')
    }
  }

  const loadSavedQuery = (query: SavedQuery) => {
    setRawQuery(query.query)
    setActiveTab('raw')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Advanced Query Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="visual" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Raw Query
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-4">
            <div className="space-y-4">
              {conditions.map((condition, index) => (
                <div key={condition.id} className="space-y-3">
                  {index > 0 && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={condition.logicalOperator || 'AND'}
                        onValueChange={(value) => updateCondition(condition.id, 'logicalOperator', value)}
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
                    <div className="col-span-4">
                      <Label>Field</Label>
                      <Select
                        value={condition.field}
                        onValueChange={(value) => updateCondition(condition.id, 'field', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                {field.label}
                                <Badge variant="outline" className="text-xs">
                                  {field.type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-3">
                      <Label>Operator</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(value) => updateCondition(condition.id, 'operator', value)}
                        disabled={!condition.field}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {condition.field && OPERATORS[getFieldType(condition.field) as keyof typeof OPERATORS]?.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-4">
                      <Label>Value</Label>
                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                        placeholder="Enter value"
                        disabled={!condition.operator}
                      />
                    </div>

                    <div className="col-span-1 flex justify-center">
                      {conditions.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCondition(condition.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button onClick={addCondition} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>

              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Generated Query Preview:</Label>
                <pre className="mt-2 text-sm bg-background p-3 rounded border overflow-x-auto">
                  {buildQueryFromConditions() || 'Configure conditions above to see query preview'}
                </pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="raw" className="space-y-4">
            <div className="space-y-2">
              <Label>Raw OCI Logging Analytics Query</Label>
              <Textarea
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                placeholder="Enter your OCI Logging Analytics query..."
                className="min-h-[200px] font-mono"
              />
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4">
              {Object.entries(
                QUERY_TEMPLATES.reduce((acc, template) => {
                  if (!acc[template.category]) acc[template.category] = []
                  acc[template.category].push(template)
                  return acc
                }, {} as Record<string, typeof QUERY_TEMPLATES>)
              ).map(([category, templates]) => (
                <div key={category} className="space-y-2">
                  <h3 className="font-semibold text-lg">{category}</h3>
                  <div className="grid gap-2">
                    {templates.map((template) => (
                      <Card key={template.name} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <h4 className="font-medium">{template.name}</h4>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                              <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                                {template.query}
                              </pre>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => applyTemplate(template)}
                              className="ml-4"
                            >
                              Use Template
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            {savedQueries.length > 0 ? (
              <div className="space-y-2">
                {savedQueries.map((query) => (
                  <Card key={query.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{query.name}</h4>
                            <Badge variant="outline">{query.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(query.created).toLocaleDateString()}
                            {query.lastUsed && ` • Last used: ${new Date(query.lastUsed).toLocaleDateString()}`}
                          </p>
                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                            {query.query}
                          </pre>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => loadSavedQuery(query)}
                          className="ml-4"
                        >
                          Load Query
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No saved queries yet</p>
                <p className="text-sm">Save queries to reuse them later</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Query Options */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Query Options
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Time Period</Label>
              <Select
                value={queryOptions.timePeriod.toString()}
                onValueChange={(value) => setQueryOptions(prev => ({ ...prev, timePeriod: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PERIODS.map((period) => (
                    <SelectItem key={period.value} value={period.value.toString()}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {period.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Max Results</Label>
              <Input
                type="number"
                value={queryOptions.maxResults}
                onChange={(e) => setQueryOptions(prev => ({ ...prev, maxResults: parseInt(e.target.value) || 100 }))}
                min="1"
                max="10000"
              />
            </div>

            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select
                value={queryOptions.format}
                onValueChange={(value: 'table' | 'json' | 'csv') => setQueryOptions(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Bypass Validation
                <Switch
                  checked={queryOptions.bypassValidation}
                  onCheckedChange={(checked) => setQueryOptions(prev => ({ ...prev, bypassValidation: checked }))}
                />
              </Label>
              <p className="text-xs text-muted-foreground">
                Skip query validation for console-compatible queries
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={handleExecute} disabled={loading} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              {loading ? 'Executing...' : 'Execute Query'}
            </Button>
            
            {onSave && (
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Query
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>Query will be executed against OCI Logging Analytics</span>
          </div>
        </div>

        {/* Save Query Dialog */}
        {showSaveDialog && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle>Save Query</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Query Name</Label>
                  <Input
                    value={queryName}
                    onChange={(e) => setQueryName(e.target.value)}
                    placeholder="Enter query name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={queryCategory}
                    onChange={(e) => setQueryCategory(e.target.value)}
                    placeholder="Enter category"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!queryName.trim()}>
                  Save Query
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}