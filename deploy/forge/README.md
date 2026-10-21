# Baseline integration for Forge

The dashboard baseline and the live Forge workbench are separate applications.
The live workbench uses Next 15, React 19 and the detection-engineering artifact
contracts. `source/` holds the reviewed changes to that workbench; it is not a
replacement dashboard or a copy of the unrelated HexForge product.

Export the baseline with `python3.11 scripts/export_detection_catalog.py --output <CATALOG_JSON>`.
The export preserves 200 entries, five distinct rule query patterns, static OCL
assets, source hashes and MITRE mapping literals. These are code-backed examples;
provider validation and deployed detection effectiveness remain unverified.
Address literals in source query examples become `<IP_ADDRESS>` parameters.

Prepare a new private build directory with:

```
python3.11 scripts/prepare_forge_build.py --source <WORKBENCH_SOURCE> --artifacts <RUNTIME_ARTIFACT_SNAPSHOT> --catalog <CATALOG_JSON> --work-dir <NEW_PRIVATE_DIRECTORY>
python3.11 scripts/deploy_forge_baseline.py --context <APPROVED_CONTEXT> --build <NEW_PRIVATE_DIRECTORY>/webapp --receipt-dir <PRIVATE_RECEIPTS>
```

The second command previews packaging. Add `--apply` only within the approved
namespace/deployment scope. It uses owned versioned ConfigMaps below the 1 MiB
limit, a checksum installer and a private canary. It re-reads the Deployment and
uses a resourceVersion test before patching, preserving other volumes and mounts.
Canary health must include artifacts, hunts, baseline catalog and HTML routes.
A failed canary never changes the live Deployment; remove only its owned pod and
unused ConfigMaps after recording the cause. No scanner or attack operation runs.

The overlay reuses the existing image and runtime dependencies. Preserve the
private before-template receipt for rollback: remove only the owned
`forge-baseline` mount/volume and restore the prior command, with a fresh
resourceVersion test. Do not roll back another agent's mounts or environment.
Bake these source changes into the source owner's immutable image for release;
this ConfigMap rollout is operational verification, not release acceptance.

The fixes add the fifth artifact key, exclude macOS AppleDouble metadata from
hunt input enumeration, allow the exact `/baseline` UI path through middleware,
and add public suite links derived from the Forge hostname. Digest validation
still covers every real hunt input. `/api/forge/baseline` serves the complete
baseline inventory; it does not execute the exported queries.

The Service must target image port 3000 (or the matching named `http` port).
A legacy runtime-only listener left targetPort 3001; it was reconciled with an
exact resourceVersion/prior-value guarded Service patch after server dry-run.
Kubernetes readiness alone did not prove this Service-to-listener contract.
