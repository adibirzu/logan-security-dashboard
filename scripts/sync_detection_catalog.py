#!/usr/bin/env python3
"""Import a pinned public detections checkout; never execute its code or queries."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

REPOSITORY = 'adibirzu/oci-log-analytics-detections'
ROOT = Path(__file__).resolve().parents[1]


def build_catalog(source_dir, commit):
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('Expected a full upstream commit hash')
    source = Path(source_dir).resolve()
    queries = source / 'queries'
    inventory_path = queries / 'catalog.json'
    inventory = json.loads(inventory_path.read_text())
    rules, digests, seen = [], {}, set()
    for group in ('rules', 'app_queries', 'hunting_queries'):
        for item in inventory[group]:
            relative = item['file']
            path = (queries / relative).resolve()
            if not path.is_relative_to(queries.resolve()) or path.suffix != '.json':
                raise ValueError('Invalid upstream query path: ' + relative)
            if relative in seen:
                raise ValueError('Duplicate upstream query path: ' + relative)
            seen.add(relative)
            raw = path.read_bytes()
            payload = json.loads(raw)
            query = payload.get('query')
            if not isinstance(query, str) or not query.strip():
                raise ValueError('Missing executable query: ' + relative)
            digests[relative] = hashlib.sha256(raw).hexdigest()
            mitre = payload.get('mitre_attack', {})
            source_url = f'https://github.com/{REPOSITORY}/blob/{commit}/queries/{relative}'
            refs = payload.get('references', [])
            refs = [r if isinstance(r, str) else r.get('url', '') for r in refs]
            refs = [r for r in refs if r.startswith(('https://', 'http://'))]
            logsource = payload.get('logsource', {})
            surface = item.get('content_surface', {'rules': 'detection', 'app_queries': 'app', 'hunting_queries': 'hunting'}[group])
            rules.append({
                'id': 'logan-detections:' + relative.removesuffix('.json'),
                'name': payload['title'], 'description': payload.get('description', ''),
                'category': surface, 'severity': payload.get('level', 'informational'),
                'mitre_tactics': mitre.get('tactics', item.get('mitre_tactics', [])),
                'mitre_techniques': mitre.get('techniques', item.get('mitre_techniques', [])),
                'original_source': 'microsoft_sentinel' if relative.startswith('sentinel/') else 'oci-log-analytics-detections',
                'original_rule_id': payload.get('sigma_id', payload.get('id', relative)),
                'oci_query': query, 'tags': payload.get('tags', []),
                'false_positives': payload.get('falsepositives', []),
                'references': list(dict.fromkeys([source_url] + refs)),
                'author': payload.get('author', 'Upstream contributors'),
                'date_created': payload.get('date', ''), 'date_converted': inventory['generated_at'],
                'source_file': 'queries/' + relative, 'source_url': source_url,
                'query_sha256': hashlib.sha256(query.encode()).hexdigest(),
                'content_surface': surface, 'logsource': logsource,
                'detection_maturity': payload.get('detection_maturity', item.get('detection_maturity', 'not_evaluated')),
                'upstream_validation_status': payload.get('live_validation_status', item.get('live_validation_status', 'not_run')),
                'provider_validation': 'not_run',
                'schedule_metadata': payload.get('detection_rule'),
            })
    rules.sort(key=lambda rule: rule['id'])
    if len(rules) != inventory['total_content_items']:
        raise ValueError('Upstream inventory count does not match imported content')
    return {'metadata': {
        'schema_version': '1.0', 'upstream_repository': REPOSITORY,
        'upstream_commit': commit, 'upstream_generated_at': inventory['generated_at'],
        'upstream_license': (source / 'LICENSE').read_text(),
        'upstream_license_url': f'https://github.com/{REPOSITORY}/blob/{commit}/LICENSE',
        'upstream_catalog_sha256': hashlib.sha256(inventory_path.read_bytes()).hexdigest(),
        'query_file_sha256': dict(sorted(digests.items())),
        'total_rules': len(rules), 'unique_query_patterns': len({r['oci_query'] for r in rules}),
        'provider_validation': 'not_run',
        'note': 'Query content only. Upstream validation does not establish validation in the dashboard tenant. No schedules or alarms are deployed.',
    }, 'rules': rules}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', required=True, type=Path)
    parser.add_argument('--expected-commit', required=True)
    parser.add_argument('--output', type=Path, default=ROOT / 'config/detection_catalog.json')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    try:
        commit = subprocess.check_output(['git', '-C', str(args.source_dir), 'rev-parse', 'HEAD'], text=True).strip()
        if commit != args.expected_commit:
            raise ValueError('Upstream HEAD does not match the reviewed commit')
        # Reject local modifications, staged content and untracked query inputs.
        status = subprocess.check_output(['git', '-C', str(args.source_dir), 'status', '--porcelain', '--untracked-files=all', '--', 'queries', 'LICENSE'], text=True)
        if status.strip():
            raise ValueError('Upstream queries must be a clean pinned snapshot')
        data = build_catalog(args.source_dir, commit)
        content = json.dumps(data, indent=2, ensure_ascii=False) + '\n'
        if args.check:
            if not args.output.exists() or args.output.read_text() != content:
                raise ValueError('Detection catalog drift; rerun the importer')
        else:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(content)
        print(json.dumps({k: data['metadata'][k] for k in ('upstream_commit', 'total_rules', 'unique_query_patterns')}))
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, str(error) + '\n')


if __name__ == '__main__':
    main()
