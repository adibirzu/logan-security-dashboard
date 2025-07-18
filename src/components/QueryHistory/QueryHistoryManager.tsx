'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { copyToClipboard } from '@/lib/clipboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  History,
  Search,
  Star,
  StarOff,
  Play,
  Edit,
  Trash2,
  Copy,
  Share,
  Download,
  Filter,
  Clock,
  Tag,
  BookOpen,
  Bookmark,
  Calendar,
  TrendingUp,
  Database,
  Eye,
  MoreHorizontal
} from 'lucide-react'

interface QueryHistoryEntry {
  id: string
  query: string
  executedAt: string
  executionTime: number
  resultCount: number
  success: boolean
  error?: string
  timePeriod: number
  parameters: Record<string, any>
  isFavorite: boolean
  tags: string[]
  description?: string
}

interface SavedQuery {
  id: string
  name: string
  description: string
  query: string
  category: string
  tags: string[]
  createdAt: string
  lastUsed?: string
  usageCount: number
  isFavorite: boolean
  isPublic: boolean
  author: string
  parameters: Record<string, any>
}

interface QueryAnalytics {
  totalQueries: number
  successRate: number
  averageExecutionTime: number
  mostUsedFields: Array<{ field: string; count: number }>
  topCategories: Array<{ category: string; count: number }>
  recentTrends: Array<{ date: string; count: number }>
}

interface QueryHistoryManagerProps {
  onExecuteQuery: (query: string, parameters: Record<string, any>) => void
  onSaveQuery: (query: SavedQuery) => void
  queryHistory: QueryHistoryEntry[]
  savedQueries: SavedQuery[]
}

export default function QueryHistoryManager({
  onExecuteQuery,
  onSaveQuery,
  queryHistory = [],
  savedQueries = []
}: QueryHistoryManagerProps) {
  const [activeTab, setActiveTab] = useState('history')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedEntry, setSelectedEntry] = useState<QueryHistoryEntry | null>(null)
  const [selectedSavedQuery, setSelectedSavedQuery] = useState<SavedQuery | null>(null)
  const [showQueryDetails, setShowQueryDetails] = useState(false)
  const [showEditQuery, setShowEditQuery] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null)
  const [filterSuccess, setFilterSuccess] = useState<'all' | 'success' | 'failed'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'execution' | 'results'>('date')

  // Analytics calculations
  const analytics = useMemo((): QueryAnalytics => {
    const totalQueries = queryHistory.length
    const successfulQueries = queryHistory.filter(q => q.success).length
    const successRate = totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 0
    
    const averageExecutionTime = queryHistory.length > 0
      ? queryHistory.reduce((sum, q) => sum + q.executionTime, 0) / queryHistory.length
      : 0

    // Extract fields from queries
    const fieldCounts = new Map<string, number>()
    queryHistory.forEach(entry => {
      const matches = entry.query.match(/'[^']+'/g) || []
      matches.forEach(match => {
        const field = match.slice(1, -1)
        fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1)
      })
    })

    const mostUsedFields = Array.from(fieldCounts.entries())
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Category analysis
    const categoryCounts = new Map<string, number>()
    savedQueries.forEach(query => {
      categoryCounts.set(query.category, (categoryCounts.get(query.category) || 0) + 1)
    })

    const topCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    // Recent trends (last 7 days)
    const now = new Date()
    const recentTrends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const count = queryHistory.filter(entry => 
        entry.executedAt.startsWith(dateStr)
      ).length
      
      return { date: dateStr, count }
    }).reverse()

    return {
      totalQueries,
      successRate,
      averageExecutionTime,
      mostUsedFields,
      topCategories,
      recentTrends
    }
  }, [queryHistory, savedQueries])

  // Filtered and sorted data
  const filteredHistory = useMemo(() => {
    let filtered = queryHistory

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (filterSuccess !== 'all') {
      filtered = filtered.filter(entry => 
        filterSuccess === 'success' ? entry.success : !entry.success
      )
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
        case 'execution':
          return b.executionTime - a.executionTime
        case 'results':
          return b.resultCount - a.resultCount
        default:
          return 0
      }
    })
  }, [queryHistory, searchTerm, filterSuccess, sortBy])

  const filteredSavedQueries = useMemo(() => {
    let filtered = savedQueries

    if (searchTerm) {
      filtered = filtered.filter(query =>
        query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(query => query.category === selectedCategory)
    }

    return filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      return b.usageCount - a.usageCount
    })
  }, [savedQueries, searchTerm, selectedCategory])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(savedQueries.map(q => q.category)))
    return ['all', ...cats]
  }, [savedQueries])

  const executeQuery = (query: string, parameters: Record<string, any> = {}) => {
    onExecuteQuery(query, parameters)
  }

  const toggleFavorite = (id: string, type: 'history' | 'saved') => {
    // Implementation would update the favorite status
    console.log(`Toggle favorite for ${type} ${id}`)
  }

  const copyQuery = async (query: string) => {
    const success = await copyToClipboard(query)
    if (!success) {
      console.warn('Failed to copy query to clipboard')
    }
    // Show toast notification
  }

  const shareQuery = (query: SavedQuery) => {
    const shareData = {
      title: query.name,
      text: query.description,
      url: `${window.location.origin}/queries/${query.id}`
    }
    
    if (navigator.share) {
      navigator.share(shareData)
    } else {
      copyQuery(`${query.name}: ${query.query}`)
    }
  }

  const exportQueries = (format: 'json' | 'csv') => {
    const data = activeTab === 'history' ? filteredHistory : filteredSavedQueries
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `query-${activeTab}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Query Management
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => exportQueries('json')}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Analytics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analytics Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{analytics.totalQueries}</p>
              <p className="text-sm text-muted-foreground">Total Queries</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{analytics.averageExecutionTime.toFixed(2)}s</p>
              <p className="text-sm text-muted-foreground">Avg Execution Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{savedQueries.length}</p>
              <p className="text-sm text-muted-foreground">Saved Queries</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search queries, descriptions, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSuccess} onValueChange={(value: any) => setFilterSuccess(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="execution">Execution Time</SelectItem>
                <SelectItem value="results">Result Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Query History ({queryHistory.length})
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            Saved Queries ({savedQueries.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Query History Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Executed</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-mono text-sm truncate max-w-xs">
                            {entry.query}
                          </p>
                          <div className="flex items-center gap-1">
                            {entry.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{new Date(entry.executedAt).toLocaleDateString()}</p>
                          <p className="text-muted-foreground">
                            {new Date(entry.executedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{entry.executionTime.toFixed(2)}s</TableCell>
                      <TableCell>{entry.resultCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={entry.success ? "default" : "destructive"}>
                          {entry.success ? "Success" : "Failed"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => executeQuery(entry.query, entry.parameters)}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyQuery(entry.query)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(entry.id, 'history')}
                          >
                            {entry.isFavorite ? (
                              <Star className="h-3 w-3 fill-current" />
                            ) : (
                              <StarOff className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEntry(entry)
                              setShowQueryDetails(true)
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Queries Tab */}
        <TabsContent value="saved">
          <div className="grid gap-4">
            {filteredSavedQueries.map((query) => (
              <Card key={query.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{query.name}</h3>
                        {query.isFavorite && <Star className="h-4 w-4 fill-current text-yellow-500" />}
                        <Badge variant="outline">{query.category}</Badge>
                        {query.isPublic && <Badge>Public</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{query.description}</p>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {query.query}
                      </pre>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Used {query.usageCount} times</span>
                        <span>Created {new Date(query.createdAt).toLocaleDateString()}</span>
                        {query.lastUsed && (
                          <span>Last used {new Date(query.lastUsed).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {query.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-2 w-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => executeQuery(query.query, query.parameters)}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyQuery(query.query)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => shareQuery(query)}
                      >
                        <Share className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingQuery(query)
                          setShowEditQuery(true)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(query.id, 'saved')}
                      >
                        {query.isFavorite ? (
                          <Star className="h-3 w-3 fill-current" />
                        ) : (
                          <StarOff className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid gap-6">
            {/* Most Used Fields */}
            <Card>
              <CardHeader>
                <CardTitle>Most Used Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.mostUsedFields.slice(0, 10).map((field, index) => (
                    <div key={field.field} className="flex items-center justify-between">
                      <span className="font-mono text-sm">{field.field}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${(field.count / analytics.mostUsedFields[0]?.count || 1) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{field.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Query Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topCategories.map((category) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <span>{category.category}</span>
                      <Badge>{category.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Query Details Dialog */}
      {selectedEntry && (
        <Dialog open={showQueryDetails} onOpenChange={setShowQueryDetails}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Query Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Executed At</Label>
                  <p className="text-sm">{new Date(selectedEntry.executedAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Execution Time</Label>
                  <p className="text-sm">{selectedEntry.executionTime.toFixed(2)} seconds</p>
                </div>
                <div>
                  <Label>Result Count</Label>
                  <p className="text-sm">{selectedEntry.resultCount.toLocaleString()}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={selectedEntry.success ? "default" : "destructive"}>
                    {selectedEntry.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Query</Label>
                <pre className="mt-1 p-3 bg-muted rounded text-sm overflow-x-auto">
                  {selectedEntry.query}
                </pre>
              </div>
              {selectedEntry.error && (
                <div>
                  <Label>Error Message</Label>
                  <p className="mt-1 p-3 bg-destructive/10 text-destructive rounded text-sm">
                    {selectedEntry.error}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Query Dialog */}
      {editingQuery && (
        <Dialog open={showEditQuery} onOpenChange={setShowEditQuery}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Saved Query</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Query Name</Label>
                  <Input
                    value={editingQuery.name}
                    onChange={(e) => setEditingQuery(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={editingQuery.category}
                    onChange={(e) => setEditingQuery(prev => prev ? { ...prev, category: e.target.value } : null)}
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingQuery.description}
                  onChange={(e) => setEditingQuery(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <div>
                <Label>Query</Label>
                <Textarea
                  value={editingQuery.query}
                  onChange={(e) => setEditingQuery(prev => prev ? { ...prev, query: e.target.value } : null)}
                  rows={6}
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={editingQuery.tags.join(', ')}
                  onChange={(e) => setEditingQuery(prev => prev ? { 
                    ...prev, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  } : null)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditQuery(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  if (editingQuery) {
                    onSaveQuery(editingQuery)
                    setShowEditQuery(false)
                  }
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}