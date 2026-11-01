import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/sync_detection_catalog.py'

class DetectionSyncTests(unittest.TestCase):
    def test_sync_imports_each_surface_once_and_preserves_query_and_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            queries = root / 'queries'
            queries.mkdir()
            (root / 'LICENSE').write_text('MIT fixture license\n')
            fixtures = [('rules', 'event.json', 'detection'), ('app_queries', 'apps/app.json', 'app'), ('hunting_queries', 'hunting/hunt.json', 'hunting')]
            catalog = {'generated_at': '2026-10-21T00:00:00Z', 'total_content_items': 3, 'rules': [], 'sentinel_queries': [], 'app_queries': [], 'hunting_queries': []}
            exact_query = "'Log Source' = 'Windows Sysmon Events' and 'Event ID' = '1' and User != 'SYSTEM' | stats count as Hits by Entity"
            for group, file, surface in fixtures:
                payload = {'title': file, 'description': 'Example', 'query': exact_query, 'level': 'high', 'logsource': {'product': 'windows', 'service': 'security'}, 'mitre_attack': {'techniques': ['T1110'], 'tactics': ['credential_access']}, 'live_validation_status': 'validated_live'}
                p = queries / file
                p.parent.mkdir(exist_ok=True)
                p.write_text(json.dumps(payload))
                catalog[group].append({'file': file, 'title': file, 'content_surface': surface, 'live_validation_status': 'validated_live'})
            # Sentinel entries are an index into rules, never a second import surface.
            catalog['sentinel_queries'] = [catalog['rules'][0]]
            (queries / 'catalog.json').write_text(json.dumps(catalog))
            self.assertTrue(SCRIPT.exists(), 'catalog sync importer must exist')
            spec = importlib.util.spec_from_file_location('detection_sync', SCRIPT)
            sync = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(sync)
            commit = 'a' * 40
            data = sync.build_catalog(root, commit)
            self.assertEqual(len(data['rules']), 3)
            self.assertEqual(len({r['id'] for r in data['rules']}), 3)
            self.assertEqual(data['metadata']['upstream_commit'], commit)
            self.assertEqual(data['metadata']['upstream_license'], 'MIT fixture license\n')
            for rule in data['rules']:
                self.assertEqual(rule['oci_query'], exact_query)
                self.assertEqual(rule['provider_validation'], 'not_run')
                self.assertEqual(rule['upstream_validation_status'], 'validated_live')
                self.assertIn('/blob/' + commit + '/queries/', rule['source_url'])
            self.assertEqual(data, sync.build_catalog(root, commit))

    def test_rejects_catalog_paths_outside_the_query_directory(self):
        spec = importlib.util.spec_from_file_location('detection_sync', SCRIPT)
        sync = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(sync)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'queries').mkdir()
            (root / 'outside.json').write_text(json.dumps({'title': 'outside', 'query': '*'}))
            (root / 'queries/catalog.json').write_text(json.dumps({
                'generated_at': '2026-10-21T00:00:00Z', 'total_content_items': 1,
                'rules': [{'file': '../outside.json'}], 'app_queries': [], 'hunting_queries': []}))
            with self.assertRaisesRegex(ValueError, 'Invalid upstream query path'):
                sync.build_catalog(root, 'a' * 40)

if __name__ == '__main__':
    unittest.main()
