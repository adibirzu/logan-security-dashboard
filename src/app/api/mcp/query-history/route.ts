import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // TODO: Replace this with a database query
  const queryHistory = [
    {
      id: 'query-1',
      query: "'Log Source' = 'Windows Security Events' and 'Security Result' = 'denied'",
      executedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      executionTime: 2.34,
      resultCount: 156,
      success: true,
      timePeriod: 1440,
      parameters: { maxResults: 100 },
      isFavorite: true,
      tags: ['security', 'windows', 'failed-auth'],
      description: 'Failed Windows authentication attempts'
    },
    {
      id: 'query-2',
      query: "'IP Address' != null | stats count by 'IP Address' | sort count desc",
      executedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      executionTime: 5.67,
      resultCount: 234,
      success: true,
      timePeriod: 720,
      parameters: { maxResults: 50 },
      isFavorite: false,
      tags: ['network', 'ip-analysis'],
      description: 'Top IP addresses by activity'
    }
  ]

  return NextResponse.json({
    success: true,
    data: queryHistory
  })
}
