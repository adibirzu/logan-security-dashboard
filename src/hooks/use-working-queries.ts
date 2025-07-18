'use client'

import { useState, useEffect, useCallback } from 'react'

export interface WorkingQuery {
  id: string
  name: string
  query: string
  category: string
  description?: string
  saved_date: string
  saved_by: string
  status?: string
  test_date?: string
  execution_stats?: {
    avg_execution_time_ms?: number
    last_result_count?: number
    success_rate?: number
  }
  usage_stats?: {
    usage_count?: number
    last_used?: string
    avg_results?: number
  }
  tags?: string[]
  user_notes?: string
  notes?: string
}

export interface WorkingQueriesData {
  meta: {
    last_updated: string
    total_queries: number
    categories: string[]
  }
  queries: WorkingQuery[]
}

export function useWorkingQueries() {
  const [workingQueries, setWorkingQueries] = useState<WorkingQuery[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load working queries from the server
  const loadWorkingQueries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/working-queries')
      const result = await response.json()
      
      if (result.success) {
        setWorkingQueries(result.data.queries || [])
        setCategories(result.data.meta?.categories || [])
      } else {
        setError(result.error || 'Failed to load working queries')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error loading working queries')
    } finally {
      setLoading(false)
    }
  }, [])

  // Save a query to working queries
  const saveToWorkingQueries = useCallback(async (queryData: {
    name: string
    query: string
    description?: string
    category?: string
    execution_time_ms?: number
    result_count?: number
    user_notes?: string
    tags?: string[]
  }) => {
    try {
      const response = await fetch('/api/working-queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save',
          query: queryData
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Reload queries to get the updated list
        await loadWorkingQueries()
        return { success: true, query: result.query }
      } else {
        return { success: false, error: result.error, existing: result.existing }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error saving query' 
      }
    }
  }, [loadWorkingQueries])

  // Delete a query from working queries
  const deleteFromWorkingQueries = useCallback(async (queryId: string) => {
    try {
      const response = await fetch('/api/working-queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          query: { id: queryId }
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Reload queries to get the updated list
        await loadWorkingQueries()
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error deleting query' 
      }
    }
  }, [loadWorkingQueries])

  // Update query usage statistics
  const updateQueryUsage = useCallback(async (queryId: string, executionData?: {
    execution_time_ms?: number
    result_count?: number
  }) => {
    try {
      const response = await fetch('/api/working-queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          query: {
            id: queryId,
            execution_stats: executionData ? {
              avg_execution_time_ms: executionData.execution_time_ms,
              last_result_count: executionData.result_count
            } : undefined
          }
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Reload queries to get the updated statistics
        await loadWorkingQueries()
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error updating query' 
      }
    }
  }, [loadWorkingQueries])

  // Check if a query exists in working queries
  const isInWorkingQueries = useCallback((query: string) => {
    return workingQueries.some(wq => wq.query === query)
  }, [workingQueries])

  // Get query by ID
  const getWorkingQuery = useCallback((queryId: string) => {
    return workingQueries.find(wq => wq.id === queryId)
  }, [workingQueries])

  // Get queries by category
  const getQueriesByCategory = useCallback((category: string) => {
    return workingQueries.filter(wq => wq.category === category)
  }, [workingQueries])

  // Get most used queries
  const getMostUsedQueries = useCallback((limit: number = 5) => {
    return [...workingQueries]
      .sort((a, b) => (b.usage_stats?.usage_count || 0) - (a.usage_stats?.usage_count || 0))
      .slice(0, limit)
  }, [workingQueries])

  // Load queries on component mount
  useEffect(() => {
    loadWorkingQueries()
  }, [loadWorkingQueries])

  return {
    // Data
    workingQueries,
    categories,
    loading,
    error,

    // Actions
    loadWorkingQueries,
    saveToWorkingQueries,
    deleteFromWorkingQueries,
    updateQueryUsage,

    // Queries
    isInWorkingQueries,
    getWorkingQuery,
    getQueriesByCategory,
    getMostUsedQueries,

    // Statistics
    totalQueries: workingQueries.length,
    categoriesCount: categories.length
  }
}
