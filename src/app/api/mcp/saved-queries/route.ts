import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // TODO: Replace this with a database query
  const savedQueries = [
    {
      id: 'saved-1',
      name: 'Failed Login Analysis',
      description: 'Comprehensive analysis of failed login attempts across all systems',
      query: "'Log Source' in ('Windows Security Events', 'Linux Secure Logs') and 'Security Result' = 'denied'",
      category: 'Security',
      tags: ['authentication', 'security', 'monitoring'],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      usageCount: 15,
      isFavorite: true,
      isPublic: true,
      author: 'Security Team',
      parameters: { timePeriod: 1440, maxResults: 500 }
    },
    {
      id: 'saved-2',
      name: 'Network Traffic Analysis',
      description: 'Monitor unusual network connection patterns',
      query: "'Log Source' contains 'Network' | stats count by 'Source IP', 'Destination IP' | where count > 10",
      category: 'Network',
      tags: ['network', 'traffic', 'anomaly-detection'],
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      usageCount: 8,
      isFavorite: false,
      isPublic: false,
      author: 'Network Team',
      parameters: { timePeriod: 720, maxResults: 100 }
    }
  ]

  return NextResponse.json({
    success: true,
    data: savedQueries
  })
}
