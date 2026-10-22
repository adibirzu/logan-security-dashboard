# logan-security-dashboard agent guide
Educational Next.js dashboard for OCI Logging Analytics security monitoring, analysis, and threat hunting.

## Commands
- Install: `npm install`; Python helpers: `pip3 install -r scripts/requirements.txt`.
- Test: `python3 -m unittest discover -s tests` (the test suite is Python unittest; no npm test script exists).
- Lint: `npm run lint`.
- Run: `npm run dev` (development); `npm run build` then `npm run start` (production).

## Layout
- Next.js routes and API: `src/app/`
- UI components: `src/components/`
- Shared libraries and OCI clients: `src/lib/`
- Python helpers and detection catalog exporter: `scripts/`
- Automated Python tests: `tests/`
- OCI and query configuration: `config/`
- Deployment assets: `deploy/`, `Dockerfile*`, `docker-compose*.yml`

## Boundaries
- This is an educational personal project, not an official Oracle product (README).
- Keep credentials in environment variables; never commit `.env*`, credentials, or wallet material (README, `.gitignore`). Use `.env.example` as the tracked example.
- `.gitignore` excludes `.next/`, `out/`, `build/`, `dist/`, Python caches, and runtime databases; do not add generated outputs.
- Use placeholder values such as `<PLACEHOLDER>` for tenancy-specific configuration in examples.

## On error
Search KB.md (and ~/dev/OCI-DEMO/KB.md for OCI issues) before debugging; add an entry after a new fix. Do not read KB.md at session start.

## Done
`python3 -m unittest discover -s tests`

<!-- BEGIN oci4cca-ecosystem-matrix -->
Shared OCI4CCA ownership/interconnect contract: [docs/OCI4CCA_ECOSYSTEM.md](docs/OCI4CCA_ECOSYSTEM.md), generated from OCI-DEMO `config/oci4cca_ecosystem.json`. Read it only for cross-project work.
<!-- END oci4cca-ecosystem-matrix -->
