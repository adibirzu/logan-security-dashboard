import { baselineCatalog } from "@/lib/baseline-catalog"
export const dynamic = "force-dynamic"
export default async function BaselinePage() {
  const data = await baselineCatalog()
  return <main className="p-6 space-y-6 min-w-0">
    <h1 className="text-2xl font-bold">Baseline Detection Catalog</h1>
    <p>Source: logan-security-dashboard. Code-backed; provider validation unverified.</p>
    {!data.available ? <p role="alert">{data.reason}</p> : <>
      <p>{data.rules.length} rules · {data.stats.unique_rule_queries} distinct rule query patterns · {data.query_assets.length} static query assets.</p>
      <p>Baseline converter exports repeat example patterns. Catalog entries do not prove a detection fired. Source templates may need field mapping and analyst parameters.</p>
      <h2 className="text-xl font-semibold">Network Beacon &amp; C2 Threat Hunting</h2>
      <p>OCI Network Threat &amp; Beacon Hunter — RITA and network hunting source queries are included in the downloadable inventory. Demo analyzer output is not provider evidence.</p>
      <a className="underline" href="/api/forge/baseline">Download full catalog, MITRE mappings and OCL source inventory (JSON)</a>
      <div className="space-y-2">{data.rules.map((r: {id: string; title: string; level: string; mitre_techniques: string[]; description: string; query: string}) => <details key={r.id} className="border rounded p-3">
        <summary className="cursor-pointer">{r.title} · {r.level} · {r.mitre_techniques.join(", ")}</summary>
        <p className="my-2">{r.description}</p><code className="block whitespace-pre-wrap break-words">{r.query}</code>
      </details>)}</div>
    </>}
  </main>
}
