# Detection catalog synchronization

The dashboard consumes query content from
[`adibirzu/oci-log-analytics-detections`](https://github.com/adibirzu/oci-log-analytics-detections).
The imported snapshot is pinned to commit
`2ae1c63d07bbafe9113437a952749d9a09327757` (2026-10-27).
It contains 1,368 content items and 1,266 distinct query strings:
1,135 detections (including 590 Sentinel conversions), 62 application analytics,
and 171 hunting queries. Counts describe content, not validated tenant coverage.

## Refresh

Use a separate clean checkout of the public upstream repository. Review the
revision before importing it. The importer reads JSON and LICENSE; it never
executes upstream scripts, acquires OCI credentials, or runs detection queries.

```sh
python3 scripts/sync_detection_catalog.py \
  --source-dir /path/to/oci-log-analytics-detections \
  --expected-commit 2ae1c63d07bbafe9113437a952749d9a09327757

python3 scripts/sync_detection_catalog.py \
  --source-dir /path/to/oci-log-analytics-detections \
  --expected-commit 2ae1c63d07bbafe9113437a952749d9a09327757 \
  --check

python3 -m unittest discover -s tests -v
npm run test:api
npm run lint
npm run build
```

`config/detection_catalog.json` is generated exclusively by this importer.
Do not edit it by hand. A refresh verifies HEAD, rejects modified/untracked
query inputs, validates contained paths, imports each canonical file once,
checks the inventory count, and records file/query hashes and the upstream MIT
license. Sentinel's secondary index is not imported a second time.

The rules API, query-library API, and `scripts/export_detection_catalog.py`
consume this snapshot. The legacy `config/security_rules.json` and historical
working-query files remain as examples/user history; they no longer populate
the operational rules browser or exported rule list. The API refuses sample
rule regeneration and fails explicitly if the pinned catalog is unavailable.
No new runtime environment variables or dependencies are required.

## Query execution and evidence

Imported queries retain their exact OCL text, stable path-derived IDs,
MITRE metadata, false-positive guidance and source links. The UI shows upstream
validation separately from the dashboard tenant's `provider_validation=not_run`.
A historical upstream parser pass does not prove current ingestion, matching
rows, scheduling, metrics, alarms or notifications in another tenant.

Execution uses the selected compartment and its subtree, explicit UTC time
bounds, a 25-second server query timeout and a bounded result cap (1–2,000).
Source names, Event ID, exclusions and lookups are not rewritten. Provider
errors are returned without a broader fallback. Unexpected async submission
is reported as pending rather than successful zero rows; partial results stay
marked partial. Rows without an event timestamp retain an unknown timestamp.

`bypassValidation` remains accepted for client compatibility; neither execution
mode modifies the query. OCI still validates syntax and available fields.
The separate parse endpoint remains available for validation-only requests.

Schedule metadata is descriptive only. No alarm templates, upstream reserved
metric namespaces, schedules, dashboards, ingestion pipelines or deployment
scripts are imported or executed. Operational use requires an approved OCI
profile/region/compartment, source/field discovery, bounded parsing/execution,
and fresh end-to-end metric/alarm evidence before release acceptance.

## Verification limitations

Offline tests cover import identity/provenance, path containment, stable output,
read-only APIs, canonical query selection, bounds, exact OCL execution and
partial/pending/error results. No live OCI query or deployment was performed.
The initial public baseline has a build failure resolving `ws` in
`src/app/api/ws/route.ts`; repository-wide typechecking also includes separate
Forge overlay snippets whose target-project aliases are unavailable here.
These independent baseline issues require their own repair before release.
