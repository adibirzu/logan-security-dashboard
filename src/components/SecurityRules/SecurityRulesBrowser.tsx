'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter, 
  Shield, 
  AlertTriangle,
  Clock,
  Tag,
  ExternalLink,
  RefreshCw,
  Eye,
  Copy,
  CheckCircle
} from 'lucide-react'

interface SecurityRule {
  id: string
  name: string
  description: string
  category: string
  severity: string
  mitre_tactics: string[]
  mitre_techniques: string[]
  original_source: string
  original_rule_id: string
  oci_query: string
  tags: string[]
  false_positives: string[]
  references: string[]
  author: string
  date_created: string
  date_converted: string
}

interface SecurityRulesResponse {
  success: boolean
  rules: SecurityRule[]
  pagination: {
    total: number
    offset: number
    limit: number
    has_more: boolean
  }
  statistics: {
    total: number
    categories: Record<string, number>
    sources: Record<string, number>
    severities: Record<string, number>
  }
  error?: string
}

interface SecurityRulesBrowserProps {
  onRuleSelect?: (rule: SecurityRule) => void
  className?: string
}

export function SecurityRulesBrowser({ onRuleSelect, className }: SecurityRulesBrowserProps) {
  const [rules, setRules] = useState<SecurityRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRule, setSelectedRule] = useState<SecurityRule | null>(null)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [copiedRule, setCopiedRule] = useState<string | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRules, setTotalRules] = useState(0)
  const [statistics, setStatistics] = useState<any>(null)
  
  const itemsPerPage = 20

  const loadRules = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (sourceFilter !== 'all') params.append('source', sourceFilter)
      if (severityFilter !== 'all') params.append('severity', severityFilter)
      
      const response = await fetch(`/api/security-rules?${params}`)
      const data: SecurityRulesResponse = await response.json()
      
      if (data.success) {
        setRules(data.rules)
        setTotalRules(data.pagination.total)
        setStatistics(data.statistics)
      } else {
        setError(data.error || 'Failed to load security rules')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, categoryFilter, sourceFilter, severityFilter])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const handleRuleSelect = (rule: SecurityRule) => {
    setSelectedRule(rule)
    if (onRuleSelect) {
      onRuleSelect(rule)
    }
  }

  const handleCopyQuery = async (rule: SecurityRule) => {
    try {
      await navigator.clipboard.writeText(rule.oci_query)
      setCopiedRule(rule.id)
      setTimeout(() => setCopiedRule(null), 2000)
    } catch (err) {
      console.error('Failed to copy query:', err)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'elastic':
        return '🔍'
      case 'splunk':
        return '🔊'
      default:
        return '📊'
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setCategoryFilter('all')
    setSourceFilter('all')
    setSeverityFilter('all')
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalRules / itemsPerPage)

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Security Rules Library</h2>
            <p className="text-muted-foreground">
              Prebuilt security detection rules converted from Elastic and Splunk
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRules}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
                <div className="text-sm text-muted-foreground">Total Rules</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {Object.keys(statistics.categories).length}
                </div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(statistics.sources).length}
                </div>
                <div className="text-sm text-muted-foreground">Sources</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {statistics.severities?.high || 0}
                </div>
                <div className="text-sm text-muted-foreground">High Severity</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {statistics?.categories && Object.keys(statistics.categories).map(category => (
                    <SelectItem key={category} value={category}>
                      {category} ({statistics.categories[category]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Source Filter */}
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {statistics?.sources && Object.keys(statistics.sources).map(source => (
                    <SelectItem key={source} value={source}>
                      {getSourceIcon(source)} {source} ({statistics.sources[source]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Severity Filter */}
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {statistics?.severities && Object.keys(statistics.severities).map(severity => (
                    <SelectItem key={severity} value={severity}>
                      {severity} ({statistics.severities[severity]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Reset Filters */}
              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
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
            <RefreshCw className="h-8 w-8 animate-spin mr-2" />
            <span>Loading security rules...</span>
          </div>
        )}

        {/* Rules List */}
        {!loading && (
          <div className="space-y-4">
            {rules.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No rules found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or search terms.
                  </p>
                </CardContent>
              </Card>
            ) : (
              rules.map((rule) => (
                <Card 
                  key={rule.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedRule?.id === rule.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleRuleSelect(rule)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                          <Badge className={getSeverityColor(rule.severity)}>
                            {rule.severity}
                          </Badge>
                          <Badge variant="outline">
                            {getSourceIcon(rule.original_source)} {rule.original_source}
                          </Badge>
                          <Badge variant="secondary">
                            {rule.category}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm">
                          {rule.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyQuery(rule)
                          }}
                          title="Copy OCI Query"
                        >
                          {copiedRule === rule.id ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedRule(expandedRule === rule.id ? null : rule.id)
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {expandedRule === rule.id && (
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* MITRE ATT&CK */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2">MITRE ATT&CK</h4>
                          <div className="flex flex-wrap gap-2">
                            {rule.mitre_tactics.map((tactic, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tactic}
                              </Badge>
                            ))}
                            {rule.mitre_techniques.map((technique, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {technique}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Tags */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Tags</h4>
                          <div className="flex flex-wrap gap-2">
                            {rule.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* OCI Query */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2">OCI Logging Analytics Query</h4>
                          <div className="bg-gray-100 p-3 rounded-lg">
                            <code className="text-sm font-mono">{rule.oci_query}</code>
                          </div>
                        </div>

                        {/* False Positives */}
                        {rule.false_positives.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">False Positives</h4>
                            <ul className="text-sm text-muted-foreground">
                              {rule.false_positives.map((fp, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-orange-500">•</span>
                                  {fp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* References */}
                        {rule.references.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">References</h4>
                            <div className="space-y-1">
                              {rule.references.map((ref, index) => (
                                <a
                                  key={index}
                                  href={ref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {ref}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-semibold">Author:</span> {rule.author}
                          </div>
                          <div>
                            <span className="font-semibold">Original ID:</span> {rule.original_rule_id}
                          </div>
                          <div>
                            <span className="font-semibold">Created:</span> {rule.date_created}
                          </div>
                          <div>
                            <span className="font-semibold">Converted:</span> {new Date(rule.date_converted).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

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
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
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
                )
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

        {/* Pagination Info */}
        <div className="text-center text-sm text-muted-foreground">
          Showing {Math.min(totalRules, (currentPage - 1) * itemsPerPage + 1)} to{' '}
          {Math.min(totalRules, currentPage * itemsPerPage)} of {totalRules} rules
        </div>
      </div>
    </div>
  )
}