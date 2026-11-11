import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

interface CatalogRule {
  id: string
  name: string
  description: string
  category: string
  severity: string
  original_source: string
  tags: string[]
  oci_query: string
}

function statistics(rules: CatalogRule[], field: 'category' | 'original_source' | 'severity') {
  return rules.reduce<Record<string, number>>((counts, rule) => {
    counts[rule[field]] = (counts[rule[field]] || 0) + 1
    return counts
  }, {})
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const limit = Number(params.get('limit') ?? '50')
  const offset = Number(params.get('offset') ?? '0')
  if (!Number.isInteger(limit) || limit < 1 || limit > 500 || !Number.isSafeInteger(offset) || offset < 0) {
    return NextResponse.json({ success: false, error: 'Invalid pagination: limit 1..500, offset >= 0' }, { status: 400 })
  }
  try {
    const catalog = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config/detection_catalog.json'), 'utf8'))
    if (catalog.metadata?.schema_version !== '1.0' || !Array.isArray(catalog.rules)) {
      throw new Error('Unsupported detection catalog')
    }
    let rules: CatalogRule[] = catalog.rules
    for (const [parameter, field] of [['category', 'category'], ['source', 'original_source'], ['severity', 'severity']] as const) {
      const value = params.get(parameter)?.toLowerCase()
      if (value) rules = rules.filter(rule => rule[field].toLowerCase() === value)
    }
    const search = params.get('search')?.toLowerCase()
    if (search) rules = rules.filter(rule => [rule.name, rule.description, ...rule.tags].some(value => value.toLowerCase().includes(search)))
    return NextResponse.json({
      success: true,
      rules: rules.slice(offset, offset + limit),
      // Do not send the entire per-file digest manifest with each page.
      metadata: {
        upstream_repository: catalog.metadata.upstream_repository,
        upstream_commit: catalog.metadata.upstream_commit,
        upstream_generated_at: catalog.metadata.upstream_generated_at,
        provider_validation: catalog.metadata.provider_validation,
        total_content_items: catalog.metadata.total_rules,
        unique_query_patterns: catalog.metadata.unique_query_patterns,
      },
      pagination: { total: rules.length, offset, limit, has_more: offset + limit < rules.length },
      statistics: { total: rules.length, categories: statistics(rules, 'category'), sources: statistics(rules, 'original_source'), severities: statistics(rules, 'severity') },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Detection catalog unavailable. Run the pinned catalog sync before starting the dashboard.' }, { status: 503 })
  }
}

export async function POST() {
  return NextResponse.json({ success: false, error: 'The imported catalog is read-only. Refresh it with scripts/sync_detection_catalog.py.' }, { status: 405, headers: { Allow: 'GET' } })
}
