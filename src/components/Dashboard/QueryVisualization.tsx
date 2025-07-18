'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Table } from 'lucide-react'

interface QueryVisualizationProps {
  data: any[]
  query: string
  executionTime?: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export function QueryVisualization({ data, query, executionTime }: QueryVisualizationProps) {
  const [viewType, setViewType] = useState<'table' | 'bar' | 'pie' | 'line'>('table')

  // Process data for visualizations
  const processDataForVisualization = () => {
    if (!data || data.length === 0) return []

    // Try to extract numeric and categorical data
    const processedData: any[] = []

    data.forEach((item, index) => {
      const entry: any = {}
      let nameField: string | null = null
      let hasNumericField = false
      
      // First pass: identify the best field to use as name and detect numeric fields
      Object.entries(item).forEach(([key, value]) => {
        if (typeof value === 'number' || (!isNaN(parseFloat(String(value))) && isFinite(parseFloat(String(value))))) {
          hasNumericField = true
        } else if (typeof value === 'string' && value.trim() !== '') {
          // Prioritize certain field names for labels
          if (key.toLowerCase().includes('source') || 
              key.toLowerCase().includes('ip') || 
              key.toLowerCase().includes('name') ||
              key.toLowerCase().includes('user') ||
              key.toLowerCase().includes('host')) {
            nameField = value
          } else if (!nameField) {
            nameField = value
          }
        }
      })
      
      // Set the name for this entry
      entry.name = nameField || `Item ${index + 1}`
      
      // Second pass: add all fields to the entry
      Object.entries(item).forEach(([key, value]) => {
        if (typeof value === 'number') {
          entry[key] = value
        } else if (typeof value === 'string') {
          // Try to parse as number
          const numValue = parseFloat(value)
          if (!isNaN(numValue) && isFinite(numValue)) {
            entry[key] = numValue
          } else {
            // Keep string values for reference, but don't override name if already set
            if (key.toLowerCase() !== 'name' || !entry.name || entry.name.startsWith('Item ')) {
              entry[key] = value
            }
          }
        } else {
          entry[key] = value
        }
      })
      
      processedData.push(entry)
    })

    return processedData.slice(0, 20) // Limit to top 20 for better visualization
  }

  const processedData = processDataForVisualization()
  
  // Get numeric fields for charts
  const numericFields = processedData.length > 0 && processedData[0]
    ? Object.keys(processedData[0]).filter(key => 
        key !== 'name' && typeof processedData[0][key] === 'number'
      )
    : []

  const primaryField = numericFields[0] || 'value'

  // Prepare data for pie chart (top 10 items)
  const pieData = processedData
    .filter(item => typeof item[primaryField] === 'number')
    .sort((a, b) => (b[primaryField] || 0) - (a[primaryField] || 0))
    .slice(0, 10)
    .map(item => ({
      name: item.name || 'Unknown',
      value: item[primaryField] || 0
    }))

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Query Results Visualization
            </CardTitle>
            <CardDescription>
              Visual representation of your query results
              {executionTime && <span className="ml-2">• Executed in {executionTime}ms</span>}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewType === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('table')}
            >
              <Table className="h-4 w-4 mr-1" />
              Table
            </Button>
            <Button
              variant={viewType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('bar')}
              disabled={numericFields.length === 0}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Bar
            </Button>
            <Button
              variant={viewType === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('pie')}
              disabled={pieData.length === 0}
            >
              <PieChartIcon className="h-4 w-4 mr-1" />
              Pie
            </Button>
            <Button
              variant={viewType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('line')}
              disabled={numericFields.length === 0}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Trend
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {viewType === 'table' && (
          <div className="space-y-4">
            <div className="rounded-lg border">
              <div className="max-h-96 overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {data && data.length > 0 && data[0] && Object.keys(data[0]).map((key) => (
                        <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(data || []).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {Object.entries(item || {}).map(([key, value], cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 text-sm text-gray-900">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Showing {data.length} results
            </div>
          </div>
        )}

        {viewType === 'bar' && numericFields.length > 0 && (
          <div className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  {numericFields.slice(0, 3).map((field, index) => (
                    <Bar 
                      key={field} 
                      dataKey={field} 
                      fill={COLORS[index % COLORS.length]}
                      name={field}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-sm text-gray-500">
              Showing top {Math.min(processedData.length, 20)} items by {primaryField}
            </div>
          </div>
        )}

        {viewType === 'pie' && pieData.length > 0 && (
          <div className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-sm text-gray-500">
              Distribution of {primaryField} across top {pieData.length} items
            </div>
          </div>
        )}

        {viewType === 'line' && numericFields.length > 0 && (
          <div className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  {numericFields.slice(0, 2).map((field, index) => (
                    <Area
                      key={field}
                      type="monotone"
                      dataKey={field}
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.6}
                      name={field}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="text-sm text-gray-500">
              Trend analysis of {numericFields.slice(0, 2).join(', ')}
            </div>
          </div>
        )}

        {((viewType === 'bar' || viewType === 'line') && numericFields.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No numeric data available for chart visualization</p>
            <p className="text-sm">Try a query that returns numerical values</p>
          </div>
        )}

        {viewType === 'pie' && pieData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No suitable data available for pie chart</p>
            <p className="text-sm">Try a query that returns countable categories</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
