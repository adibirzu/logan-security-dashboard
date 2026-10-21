# Forge baseline integration handoff — 2026-10-21

Scope: approved `logan-forge/deploy/logan-forge` and Control Plane SOC overlay
on the named dedicated OKE context. No commit, push, PR, scan, attack operation,
IAM change or Guardian deployment mutation was performed.

## Files and evidence

- `scripts/export_detection_catalog.py`: deterministic baseline export. Includes
  200 rules, five distinct rule query patterns, 491 static query assets and 49
  MITRE mapping literals. Address examples become parameter placeholders.
- `deploy/forge/source/`: reviewed workbench source changes: API contracts,
  Sidebar, baseline catalog loader/API/page, exact middleware path, and hunting
  artifact metadata filtering. The actual runtime is the detection-engineering
  Next workbench, separate from this dashboard and from HexForge.
- `scripts/prepare_forge_build.py`, `scripts/deploy_forge_baseline.py`,
  `deploy/forge/README.md`: local build, immutable chunked ConfigMaps, checksum
  installation, canary, resourceVersion guarded scoped overlay and rollback notes.
- `tests/test_detection_catalog_export.py`: export provenance and address tests.
- Related Control Plane files: `config/logan_security_dashboard_rules.json`,
  routers `detections.py`, `attack_ops.py`, `threat_hunting.py`, `hexstrike.py`,
  `DetectionDashboardView.vue`, `scripts/deploy_cp_soc_overlay.py`,
  `tests/test_cp_baseline_integration.py`, and the ecosystem test's isolated
  baseline fixture. Generated runtime contracts/knowledge files were refreshed.
  Existing unrelated edits were preserved.

## Deployments

- Forge active ConfigMaps: `forge-baseline-5dde88fddf40-0` through `-11`,
  `forge-baseline-5dde88fddf40-install`, and `forge-baseline-5dde88fddf40-icons`.
  Owned projected volume `forge-baseline` mounts `/tmp/forge-baseline` and
  `/app/public/favicon.ico` (subPath `favicon.ico`). The image is unchanged;
  build and artifact payload is checksum verified at startup.
- Control Plane active ConfigMaps: `cp-soc-567bfb2e3415-0`, `-1`, `-install`.
  Existing `cp-soc-overlay` projection mounts `/tmp/cp-soc-overlay`.
- Service target reconciled from legacy port 3001 to image port 3000 with
  resourceVersion and prior-value guards and a server dry-run. Forge-only
  ingress `service-upstream: "true"` uses the verified Service instead of the
  observed stale dynamic pod endpoint. No shared controller restart.
- Failed private canary pods and 43 unused owned ConfigMaps were removed.
  Existing unrelated mounts and ConfigMaps were preserved.
- Private receipts/build logs: `/tmp/forge-baseline-repair/` and
  `/tmp/forge-baseline-build/`. Original pre-overlay ReplicaSet template is saved
  as `original-template.json`; never restore a whole template over peer changes.

## Validation

- Baseline exporter: 2 tests passed. Source scripts compile.
- Control Plane integration: 32 focused tests passed. Next production build
  (including lint/types) and combined Control Plane Vite build passed.
- Canary: health, artifact metadata, baseline API, hunts API, baseline HTML,
  Forge HTML and favicon all returned 200 before the final scoped patch.
- Portability audit and project-contract check pass after regeneration.
- Full `./init.sh`: 1296 passed, 1 skipped, 4 failed in 354.44s. The stale KB
  graph contract failure passed after regeneration and focused retest. The two
  PR-readiness failures and the external-sync fixture failure remain outside
  this change. Full harness acceptance is not claimed.

## Limits and next safe action

The 200 baseline entries repeat five example patterns; catalog presence and
MITRE overlap are code evidence, not independent validated detections. Query
assets include source templates needing analyst parameters. SDK correlation
must retain empty/unavailable results. T3MP3ST health proves connectivity but
supplies no tool counts. Image bake/release acceptance remains with the source
owner; no source changes were written into its separate checkout. The
Notion memory skill required by the parent instructions was unavailable; no
external memory publication was attempted.

### Final live acceptance

Both deployments have one ready replica; zero private canary pods remain.
Chrome and curl: Forge `/forge`, `/baseline`, log samples and deployment menus,
`/api/health`, `/api/forge/artifacts`, `/api/forge/hunts`,
`/api/forge/baseline` all return 200. All five artifact statuses are valid; no
artifact errors. Forge and CP pages have zero page or console errors. Five
suite links are present. Six metadata tabs and three layout modes were checked.
CP `/detections`, `/threat-hunting`, `/caldera`, `/attack-logs` return 200.
Ecosystem: core, log_analytics, observeai, coordinator and forge all available.
HexStrike is connected; Caldera has five agents and all five are alive.
Read-only 24-hour T1110 correlation executed successfully with zero provider
records and 40 unevaluated baseline candidates; no detection is claimed.

Screenshots: `local/videos/screenshots/forge-live-verified.png`,
`cp-detections-ecosystem.png`, `cp-threat-hunting-healthy.png`,
`cp-caldera-agent-deploy.png` (and additional `forge-baseline-catalog.png`).
The four requested copies are also refreshed and hash-verified in the user's
requested scratch/codex/out directory. Sanitized receipt:
`local/videos/screenshots/forge-baseline-verification.json` in OCI-DEMO;
private detailed browser/build logs remain under `/tmp/forge-baseline-repair/`.

Open: the three unrelated PR-readiness/external-sync harness failures and the
source-owner immutable-image bake/release gate. No commit or publication.

Additional browser acceptance: all three Log Samples tabs (Raw service logs,
Logan detections, Why pre-analyze) selected successfully with zero errors.
Tab/layout receipt: OCI-DEMO `local/videos/screenshots/forge-baseline-tabs.json`.


## 2026-10-21 OCI4CCA ecosystem contract synchronization

- Last Updated: 2026-10-21. Owner: cross-project ecosystem coordinator.
- Current Objective: portable 13-project relationship matrix and shared baseline synchronization; clean-main reconciliation.
- Files: managed `oci4cca-ecosystem-matrix` blocks in root AGENTS.md and existing CLAUDE.md/GEMINI.md; `docs/OCI4CCA_ECOSYSTEM.md`. ObserveAI/Guardian also receive their declared baseline catalog copies. Existing instruction text is preserved.
- Verification Evidence: eight offline sync contract tests pass; generator preserves owner text, rejects malformed markers and symlink targets. Catalog copies are byte-identical: 200 entries, five unique rule queries, provider validation unverified. OKE discovery found 16 pods Running/Ready in eight requested namespaces. Authenticated in-pod requests: Guacamole sync HTTP 200 (12 configured targets), detection ecosystem summary HTTP 200, Compliance interconnect refresh HTTP 200 (health only). These checks do not establish tenant evidence replication, framework evaluation or release acceptance.
- ConfigMaps/mounts: none created or patched by this packet; existing deployment mounts preserved.
- Blockers: prior dirty application work, existing branch history, redaction and authoritative tests require their owner gates before broad merge. Scanner checkout resolves Git to its parent dev directory and cannot be independently committed as a Scanner repository. No remote push authorized/performed.
- Recommended Next Step: use the canonical OCI-DEMO generator check for managed artifacts; reconcile only redaction-clean reviewed changes into local main while preserving every unrelated source/index change. Record final branch hashes and individual holds in OCI-DEMO session handoff.
