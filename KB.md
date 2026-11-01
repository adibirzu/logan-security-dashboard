# logan-security-dashboard knowledge base

Troubleshooting reference. Read it only when an error occurs, not at session start.
Cross-cutting OCI, OKE, IAM and networking issues live in the shared OCI-DEMO KB: `~/dev/OCI-DEMO/KB.md`
(search it with `python3.11 ~/dev/OCI-DEMO/scripts/knowledge_lookup.py --query '<error>'`).

Add an entry after every error that needed investigation and a fix. Use the next number.

## Entry format

```
## KB-NNN: <component> - <short symptom>
- Error: <exact message>
- Root cause: <what was actually wrong>
- Fix: <what changed, with file/command>
- Prevention: <how to avoid it next time>
```

## KB-001: Query execution changes Windows detection semantics
- Error: A Windows Sysmon query executes as OCI Audit Logs with Event Type substituted for Event ID; exclusion predicates and MITRE lookups can change or disappear.
- Root cause: The validator and client used string replacements and broad fallbacks as syntax repair. The bypass path also rewrote exclusions and searched the tenancy root.
- Fix: The search API and analyzer now send exact OCL through one SDK execution path using the selected compartment, explicit UTC window, bounded result cap and completion metadata. The catalog importer preserves pinned source provenance and separates upstream validation from tenant validation.
- Prevention: Run `python3 -m unittest discover -s tests -v`, `npm run test:api`, and the pinned importer `--check` before refreshing content. Never treat a rewritten, partial, pending or failed search as a validated detection.
