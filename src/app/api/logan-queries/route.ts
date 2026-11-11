import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface StoredRule {
  id: string
  name: string
  description: string
  oci_query: string
  category: string
  tags: string[]
  provider_validation: string
  upstream_validation_status: string
  source_url: string
}

function loadQueries() {
  const catalog = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config/detection_catalog.json'), 'utf8'))
  if (catalog.metadata?.schema_version !== '1.0' || !Array.isArray(catalog.rules)) throw new Error('Unsupported catalog')
  const queries = (catalog.rules as StoredRule[]).map(rule => ({
    id: rule.id, name: rule.name, description: rule.description, query: rule.oci_query,
    category: rule.category, tags: rule.tags, timeRange: '24h', maxResults: 100,
    provider_validation: rule.provider_validation,
    upstream_validation_status: rule.upstream_validation_status, source_url: rule.source_url,
  }))
  return { queries, metadata: catalog.metadata }
}

export async function GET(request: NextRequest) {
  try {
    const catalog = loadQueries()
    const category = request.nextUrl.searchParams.get('category')
    const tag = request.nextUrl.searchParams.get('tag')
    const queries = catalog.queries.filter(query => (!category || query.category === category) && (!tag || query.tags.includes(tag)))
    const categories: Record<string, { name: string; description: string; queries: typeof queries }> = {}
    for (const query of queries) {
      categories[query.category] ??= { name: query.category, description: 'Pinned OCI Log Analytics content', queries: [] }
      categories[query.category].queries.push(query)
    }
    return NextResponse.json({ success: true, data: {
      version: '1.0', description: 'Pinned OCI Log Analytics detections catalog',
      last_updated: catalog.metadata.upstream_generated_at,
      upstream_commit: catalog.metadata.upstream_commit,
      total_queries: queries.length, total_categories: Object.keys(categories).length, categories, queries,
    } })
  } catch {
    return NextResponse.json({ success: false, error: 'Detection catalog unavailable; run the pinned catalog sync' }, { status: 503 })
  }
}

function minutes(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return NaN
  const match = /^(\d+)(m|h|d)$/.exec(value)
  return match ? Number(match[1]) * ({ m: 1, h: 60, d: 1440 }[match[2]] ?? NaN) : NaN
}

export async function POST(request: NextRequest) {
  try {
    const { queryId, customQuery, timeRange, maxResults } = await request.json()
    const catalog = queryId ? loadQueries() : null
    const queryInfo = catalog?.queries.find(query => query.id === queryId)
    if (queryId && !queryInfo) return NextResponse.json({ success: false, error: 'Query ID not found' }, { status: 404 })
    const query = queryInfo?.query ?? customQuery
    const timePeriodMinutes = minutes(timeRange ?? '24h')
    const limit = maxResults ?? queryInfo?.maxResults ?? 100
    if (typeof query !== 'string' || !query.trim() || !Number.isInteger(timePeriodMinutes) || timePeriodMinutes < 1 || timePeriodMinutes > 44640 || !Number.isInteger(limit) || limit < 1 || limit > 2000) {
      return NextResponse.json({ success: false, error: 'Invalid query, time range or result limit' }, { status: 400 })
    }
    const response = await fetch(new URL('/api/mcp/search', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, timePeriodMinutes, maxResults: limit }),
    })
    const result = await response.json()
    const success = response.ok && result.success === true
    return NextResponse.json({ success, query_info: queryInfo ?? null, query_executed: query, execution_result: result }, { status: success ? 200 : (response.ok ? 502 : response.status) })
  } catch {
    return NextResponse.json({ success: false, error: 'Query execution unavailable' }, { status: 500 })
  }
}
