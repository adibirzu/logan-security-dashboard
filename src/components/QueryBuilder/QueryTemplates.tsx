'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileText, 
  Search, 
  Copy, 
  Check, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Filter,
  Database,
  Shield,
  Activity,
  Globe,
  Target,
  Zap,
  Clock,
  Play
} from 'lucide-react'

interface QueryTemplate {
  id: string
  name: string
  description: string
  category: string
  query: string
  parameters: TemplateParameter[]
  validation: {
    requiredFields: string[]
    syntaxRules: string[]
    estimatedComplexity: 'low' | 'medium' | 'high'
  }
  examples: string[]
  tags: string[]
}

interface TemplateParameter {
  name: string
  type: 'string' | 'number' | 'datetime' | 'select' | 'multiselect'
  description: string
  required: boolean
  defaultValue?: string
  options?: string[]
  placeholder?: string
  validation?: {
    pattern?: string
    min?: number
    max?: number
  }
}

interface QueryTemplatesProps {
  onQuerySelect: (query: string) => void
  onValidationComplete?: (isValid: boolean, errors: string[]) => void
}

export function QueryTemplates({ onQuerySelect, onValidationComplete }: QueryTemplatesProps) {
  const [templates, setTemplates] = useState<QueryTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<QueryTemplate | null>(null)
  const [parameters, setParameters] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [generatedQuery, setGeneratedQuery] = useState('')
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }>({ isValid: false, errors: [], warnings: [] })
  const [copied, setCopied] = useState(false)

  // Predefined query templates with proper OCI syntax
  const queryTemplates: QueryTemplate[] = [
    {
      id: 'basic_search',
      name: 'Basic Log Search',
      description: 'Simple text search across all log sources',
      category: 'basic',
      query: '* | where contains("{{field}}", "{{search_term}}") | head {{limit}}',
      parameters: [
        {
          name: 'field',
          type: 'select',
          description: 'Field to search in',
          required: true,
          defaultValue: 'Message',
          options: ['Message', 'Log Entry', 'Event Name', 'User', 'Source IP', 'Destination IP']
        },
        {
          name: 'search_term',
          type: 'string',
          description: 'Text to search for',
          required: true,
          placeholder: 'Enter search term'
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Maximum number of results',
          required: false,
          defaultValue: '100',
          validation: { min: 1, max: 10000 }
        }
      ],
      validation: {
        requiredFields: ['search_term'],
        syntaxRules: ['Use single quotes for string values', 'contains() function is case-sensitive'],
        estimatedComplexity: 'low'
      },
      examples: [
        '* | where contains("Message", "error") | head 100',
        '* | where contains("User", "admin") | head 50'
      ],
      tags: ['basic', 'search', 'text']
    },
    {
      id: 'security_failed_logins',
      name: 'Failed Login Attempts',
      description: 'Detect failed authentication attempts',
      category: 'security',
      query: "'Log Source' = '{{log_source}}' | where contains(\"Event Name\", \"fail\") or contains(\"Event Name\", \"denied\") or contains(\"Message\", \"authentication failed\") | stats count as failed_attempts by \"Principal Name\", \"Source IP\" | where failed_attempts >= {{threshold}} | sort -failed_attempts",
      parameters: [
        {
          name: 'log_source',
          type: 'select',
          description: 'Log source to analyze',
          required: true,
          defaultValue: 'OCI Audit Logs',
          options: ['OCI Audit Logs', 'Windows Security Events', 'Linux Auth Logs', 'Application Logs']
        },
        {
          name: 'threshold',
          type: 'number',
          description: 'Minimum failed attempts to report',
          required: false,
          defaultValue: '5',
          validation: { min: 1, max: 1000 }
        }
      ],
      validation: {
        requiredFields: ['log_source'],
        syntaxRules: ['Use single quotes for field names with spaces', 'stats command requires aggregation function'],
        estimatedComplexity: 'medium'
      },
      examples: [
        "Failed logins from specific IP",
        "Brute force attack detection"
      ],
      tags: ['security', 'authentication', 'failed-login', 'brute-force']
    },
    {
      id: 'network_traffic_analysis',
      name: 'Network Traffic Analysis',
      description: 'Analyze network traffic patterns and connections',
      category: 'network',
      query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | where \"Source IP\" != \"{{exclude_ip}}\" and \"Destination Port\" in ({{ports}}) | stats sum(\"Content Size In\") as bytes_in, sum(\"Content Size Out\") as bytes_out, count as connections by \"Source IP\", \"Destination IP\", \"Destination Port\" | sort -bytes_out",
      parameters: [
        {
          name: 'exclude_ip',
          type: 'string',
          description: 'IP address to exclude from analysis',
          required: false,
          defaultValue: '127.0.0.1',
          placeholder: '192.168.1.1'
        },
        {
          name: 'ports',
          type: 'string',
          description: 'Comma-separated list of ports to analyze',
          required: true,
          defaultValue: '80,443,22,3389',
          placeholder: '80,443,22'
        }
      ],
      validation: {
        requiredFields: ['ports'],
        syntaxRules: ['Use "in" operator for multiple values', 'VCN Flow logs have specific field names'],
        estimatedComplexity: 'medium'
      },
      examples: [
        "Web traffic analysis (ports 80,443)",
        "SSH traffic monitoring (port 22)"
      ],
      tags: ['network', 'traffic', 'vcn', 'flow-logs']
    },
    {
      id: 'mitre_technique_detection',
      name: 'MITRE ATT&CK Technique Detection',
      description: 'Detect specific MITRE ATT&CK techniques in Windows Sysmon logs',
      category: 'mitre',
      query: "'Log Source' = 'Windows Sysmon Events' and not contains(User, 'SYSTEM') and ({{technique_filter}}) | timestats count as events by Technique_id, \"Event ID\", User | sort -events",
      parameters: [
        {
          name: 'technique_filter',
          type: 'select',
          description: 'MITRE technique category to detect',
          required: true,
          defaultValue: 'Technique_id like "T1059*"',
          options: [
            'Technique_id like "T1059*"', // Command and Scripting Interpreter
            'Technique_id like "T1003*"', // OS Credential Dumping
            'Technique_id like "T1055*"', // Process Injection
            'Technique_id like "T1078*"', // Valid Accounts
            'Technique_id like "T1110*"', // Brute Force
            'Technique_id like "T1021*"'  // Remote Services
          ]
        }
      ],
      validation: {
        requiredFields: ['technique_filter'],
        syntaxRules: ['MITRE technique IDs follow T#### format', 'Use like operator for pattern matching'],
        estimatedComplexity: 'medium'
      },
      examples: [
        "Command execution techniques (T1059)",
        "Credential access techniques (T1003)"
      ],
      tags: ['mitre', 'attack', 'techniques', 'sysmon', 'security']
    },
    {
      id: 'data_exfiltration_detection',
      name: 'Data Exfiltration Detection',
      description: 'Detect potential data exfiltration based on traffic volume',
      category: 'security',
      query: "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | where \"Content Size Out\" > {{size_threshold}} | stats sum(\"Content Size Out\") as total_out_bytes, count as sessions by \"Source IP\", \"Destination IP\" | where total_out_bytes > {{total_threshold}} | sort -total_out_bytes",
      parameters: [
        {
          name: 'size_threshold',
          type: 'number',
          description: 'Single session size threshold (bytes)',
          required: true,
          defaultValue: '10485760', // 10MB
          validation: { min: 1024, max: 1073741824 } // 1KB to 1GB
        },
        {
          name: 'total_threshold',
          type: 'number',
          description: 'Total traffic threshold (bytes)',
          required: true,
          defaultValue: '104857600', // 100MB
          validation: { min: 10240, max: 10737418240 } // 10KB to 10GB
        }
      ],
      validation: {
        requiredFields: ['size_threshold', 'total_threshold'],
        syntaxRules: ['Size values should be in bytes', 'VCN Flow logs required for traffic analysis'],
        estimatedComplexity: 'high'
      },
      examples: [
        "Large file transfers",
        "Suspicious outbound traffic"
      ],
      tags: ['security', 'exfiltration', 'network', 'data-loss']
    },
    {
      id: 'waf_attack_analysis',
      name: 'WAF Attack Analysis',
      description: 'Analyze web application firewall logs for attack patterns',
      category: 'waf',
      query: "'Log Source' = 'OCI WAF Logs' | where \"Action\" in ('block', 'challenge') | stats count as blocked_requests by \"Source IP\", \"Request Protection Rule IDs\", \"User Agent\" | where blocked_requests >= {{min_blocks}} | sort -blocked_requests",
      parameters: [
        {
          name: 'min_blocks',
          type: 'number',
          description: 'Minimum blocked requests to report',
          required: false,
          defaultValue: '10',
          validation: { min: 1, max: 10000 }
        }
      ],
      validation: {
        requiredFields: [],
        syntaxRules: ['WAF logs have specific action types', 'Rule IDs identify specific protections'],
        estimatedComplexity: 'medium'
      },
      examples: [
        "SQL injection attempts",
        "XSS attack patterns"
      ],
      tags: ['waf', 'security', 'web-attacks', 'protection']
    }
  ]

  useEffect(() => {
    setTemplates(queryTemplates)
  }, []) // queryTemplates is static, safe to omit

  useEffect(() => {
    if (selectedTemplate && Object.keys(parameters).length > 0) {
      generateQuery()
    }
  }, [selectedTemplate, parameters]) // generateQuery uses current state, safe to omit

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchTerm === '' || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...new Set(templates.map(t => t.category))]

  const handleTemplateSelect = (template: QueryTemplate) => {
    setSelectedTemplate(template)
    // Initialize parameters with default values
    const defaultParams: Record<string, string> = {}
    template.parameters.forEach(param => {
      defaultParams[param.name] = param.defaultValue || ''
    })
    setParameters(defaultParams)
  }

  const handleParameterChange = (paramName: string, value: string) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }))
  }

  const generateQuery = () => {
    if (!selectedTemplate) return

    let query = selectedTemplate.query
    
    // Replace template parameters
    Object.entries(parameters).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      query = query.replace(new RegExp(placeholder, 'g'), value)
    })

    setGeneratedQuery(query)
    validateQuery(query)
  }

  const validateQuery = (query: string) => {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic syntax validation
    if (query.includes('{{') && query.includes('}}')) {
      errors.push('Query contains unresolved template parameters')
    }

    // Check for required parameters
    if (selectedTemplate) {
      selectedTemplate.parameters.forEach(param => {
        if (param.required && !parameters[param.name]) {
          errors.push(`Required parameter '${param.name}' is missing`)
        }

        // Type validation
        if (parameters[param.name]) {
          const value = parameters[param.name]
          
          if (param.type === 'number' && isNaN(Number(value))) {
            errors.push(`Parameter '${param.name}' must be a number`)
          }

          if (param.validation) {
            if (param.validation.pattern && !new RegExp(param.validation.pattern).test(value)) {
              errors.push(`Parameter '${param.name}' doesn't match required pattern`)
            }

            if (param.validation.min !== undefined && Number(value) < param.validation.min) {
              errors.push(`Parameter '${param.name}' must be at least ${param.validation.min}`)
            }

            if (param.validation.max !== undefined && Number(value) > param.validation.max) {
              errors.push(`Parameter '${param.name}' must be at most ${param.validation.max}`)
            }
          }
        }
      })
    }

    // OCI Logging Analytics syntax checks
    if (query.includes("'Log Source'") && !query.match(/'Log Source'\s*=\s*'[^']+'/)) {
      warnings.push("Log Source should use proper quoting: 'Log Source' = 'Source Name'")
    }

    if (query.includes('User !=') && query.includes('NT AUTHORITY')) {
      errors.push("Use 'not contains(User, \"SYSTEM\")' instead of 'User != \"NT AUTHORITY\\SYSTEM\"'")
    }

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings
    }

    setValidationResult(result)
    
    if (onValidationComplete) {
      onValidationComplete(result.isValid, errors)
    }
  }

  const handleUseQuery = () => {
    if (validationResult.isValid && generatedQuery) {
      onQuerySelect(generatedQuery)
    }
  }

  const handleCopyQuery = async () => {
    if (generatedQuery) {
      await navigator.clipboard.writeText(generatedQuery)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'basic': return Database
      case 'security': return Shield
      case 'network': return Globe
      case 'mitre': return Target
      case 'waf': return Zap
      default: return Filter
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'text-green-600 bg-green-100 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'high': return 'text-red-600 bg-red-100 border-red-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Query Templates
          </CardTitle>
          <CardDescription>
            Pre-built, validated query templates for common security and operational use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">Browse Templates</TabsTrigger>
              <TabsTrigger value="builder" disabled={!selectedTemplate}>
                Configure Query
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="templates" className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  {categories.map(category => {
                    const Icon = getCategoryIcon(category)
                    return (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className="capitalize"
                      >
                        <Icon className="w-4 h-4 mr-1" />
                        {category}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Templates Grid */}
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => {
                    const Icon = getCategoryIcon(template.category)
                    return (
                      <Card 
                        key={template.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <CardTitle className="text-sm">{template.name}</CardTitle>
                            </div>
                            <Badge className={getComplexityColor(template.validation.estimatedComplexity)}>
                              {template.validation.estimatedComplexity}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {template.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="builder" className="space-y-4">
              {selectedTemplate ? (
                <div className="space-y-6">
                  {/* Template Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{selectedTemplate.name}</CardTitle>
                      <CardDescription>{selectedTemplate.description}</CardDescription>
                    </CardHeader>
                  </Card>

                  {/* Parameters */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Parameters</CardTitle>
                      <CardDescription>
                        Configure the template parameters to generate your query
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedTemplate.parameters.map((param) => (
                        <div key={param.name} className="space-y-2">
                          <Label htmlFor={param.name} className="flex items-center gap-2">
                            {param.name}
                            {param.required && <span className="text-red-500">*</span>}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {param.description}
                          </p>
                          
                          {param.type === 'select' ? (
                            <select
                              id={param.name}
                              value={parameters[param.name] || ''}
                              onChange={(e) => handleParameterChange(param.name, e.target.value)}
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="">Select {param.name}</option>
                              {param.options?.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : param.type === 'string' ? (
                            <Input
                              id={param.name}
                              value={parameters[param.name] || ''}
                              onChange={(e) => handleParameterChange(param.name, e.target.value)}
                              placeholder={param.placeholder}
                            />
                          ) : param.type === 'number' ? (
                            <Input
                              id={param.name}
                              type="number"
                              value={parameters[param.name] || ''}
                              onChange={(e) => handleParameterChange(param.name, e.target.value)}
                              min={param.validation?.min}
                              max={param.validation?.max}
                            />
                          ) : (
                            <Input
                              id={param.name}
                              value={parameters[param.name] || ''}
                              onChange={(e) => handleParameterChange(param.name, e.target.value)}
                              placeholder={param.placeholder}
                            />
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Generated Query */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Generated Query
                        {validationResult.isValid ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        value={generatedQuery}
                        readOnly
                        className="font-mono text-sm min-h-[100px]"
                        placeholder="Configure parameters to generate query..."
                      />

                      {/* Validation Results */}
                      {validationResult.errors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              {validationResult.errors.map((error, index) => (
                                <div key={index}>• {error}</div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {validationResult.warnings.length > 0 && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              {validationResult.warnings.map((warning, index) => (
                                <div key={index}>• {warning}</div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleUseQuery}
                          disabled={!validationResult.isValid || !generatedQuery}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Use Query
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCopyQuery}
                          disabled={!generatedQuery}
                        >
                          {copied ? (
                            <Check className="w-4 h-4 mr-2" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          {copied ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a template from the Browse Templates tab to configure it
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default QueryTemplates