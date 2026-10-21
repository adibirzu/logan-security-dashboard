#!/usr/bin/env python3
"""Export baseline rules and static OCL assets without executing source queries.

Catalog presence is code evidence, never detection or provider validation.
"""
import argparse
import ast
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def export(root=ROOT):
    rules, assets, sources = [], [], []
    for path in sorted((root / 'config').glob('*.json')):
        data = json.loads(path.read_text())
        relative = str(path.relative_to(root))
        sources.append({'file': relative, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        if path.name == 'security_rules.json':
            for rule in data['rules']:
                rules.append({**rule, 'id': 'logan-dashboard:' + rule['id'],
                              'title': rule['name'], 'level': rule['severity'],
                              'query': rule['oci_query'], 'platform': 'oci_logan',
                              'source_repository': 'logan-security-dashboard', 'file': relative,
                              'evidence': 'code-backed', 'provider_validation': 'unverified',
                              'provenance_note': 'Baseline converter exports include repeated example rule patterns; not independent validated detections.'})
        def walk(value, pointer=''):
            if isinstance(value, dict):
                for key, child in value.items():
                    walk(child, pointer + '/' + key)
            elif isinstance(value, list):
                for index, child in enumerate(value):
                    walk(child, pointer + '/' + str(index))
            elif isinstance(value, str) and ('|' in value or "'Log Source'" in value):
                assets.append({'file': relative, 'location': pointer, 'query': value, 'evidence': 'code-backed'})
        walk(data)
    # Preserve source literals and exact source locations, including templates.
    literal = re.compile(r'(?P<quote>[\x22\x27`])(?P<body>(?:\\.|(?!(?P=quote))[\s\S])*?)(?P=quote)')
    paths = sorted((root / 'src').rglob('*')) + sorted((root / 'scripts').glob('*.py')) + [root / 'DetectionRulesPlan.md']
    for path in paths:
        if not path.is_file() or path.suffix not in ('.ts', '.tsx', '.py', '.md'):
            continue
        text = path.read_text()
        relative = str(path.relative_to(root))
        found = []
        if path.suffix == '.py':
            try:
                tree = ast.parse(text)
                for node in ast.walk(tree):
                    if isinstance(node, (ast.Constant, ast.JoinedStr)):
                        value = node.value if isinstance(node, ast.Constant) else ast.get_source_segment(text, node)
                        if isinstance(value, str) and ("'Log Source'" in value or re.search(r'\|\s*(stats|where|eval|timestats|link|fields)', value)):
                            found.append((node.lineno, value))
            except SyntaxError:
                pass
        else:
            for match in literal.finditer(text):
                value = match['body']
                if "'Log Source'" in value or re.search(r'\|\s*(stats|where|eval|timestats|link|fields)', value):
                    found.append((text.count('\n', 0, match.start()) + 1, value))
            if path.suffix == '.md':
                for match in re.finditer(r'```[^\n]*\n([\s\S]*?)```', text):
                    if re.search(r'\|\s*(stats|where|eval|timestats|link|fields)', match[1]):
                        found.append((text.count('\n',0,match.start())+1, match[1]))
        if found:
            sources.append({'file': relative, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        for line, query in found:
            assets.append({'file': relative, 'line': line, 'query': query,
                           'evidence': 'code-backed', 'execution': 'not_executed',
                           'kind': 'template' if '${' in query or '{' in query else 'literal'})
    mappings = []
    for path in sorted((root / 'src/lib/mitre-attack').glob('*.ts')):
        text = path.read_text()
        for match in re.finditer(r"\{[^{}]*\bid:\s*['\"]T(?:A)?[0-9.]+['\"][^{}]*\}", text):
            mappings.append({'file': str(path.relative_to(root)),
                             'line': text.count('\n', 0, match.start()) + 1,
                             'source_literal': match[0], 'evidence': 'code-backed'})
    # Query source examples may contain environment-specific address literals.
    for asset in assets:
        asset['query'] = re.sub(r'(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])', '<IP_ADDRESS>', asset['query'])
    return {'mitre_mapping_assets': mappings, 'version': '1.0' , 'source_repository': 'logan-security-dashboard',
            'evidence': 'code-backed', 'provider_validation': 'unverified',
            'network_hunting_label': 'Network Beacon & C2 Threat Hunting',
            'network_hunting_product': 'OCI Network Threat & Beacon Hunter',
            'rules': rules, 'query_assets': assets, 'sources': sources,
            'mitre_mapping_files': ['src/lib/mitre-attack/technique-mappings.ts', 'src/lib/mitre-attack/mitre-framework.ts'],
            'stats': {'total_rules': len(rules), 'query_assets': len(assets),
                      'unique_rule_queries': len({r['query'] for r in rules}),
                      'mitre_techniques': sorted({t for r in rules for t in r.get('mitre_techniques', [])})}}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    data = export()
    args.output.write_text(json.dumps(data, indent=2) + '\n')
    print(json.dumps(data['stats']))
