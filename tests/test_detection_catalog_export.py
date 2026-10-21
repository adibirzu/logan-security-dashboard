import importlib.util
from pathlib import Path
import re
import unittest

spec = importlib.util.spec_from_file_location('export_catalog', Path(__file__).resolve().parents[1] / 'scripts/export_detection_catalog.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class CatalogExportTests(unittest.TestCase):
    def test_export_is_deterministic_and_keeps_baseline_provenance(self):
        catalog = exporter.export()
        self.assertEqual(catalog, exporter.export())
        self.assertEqual(len(catalog['rules']), 200)
        self.assertEqual(catalog['stats']['unique_rule_queries'], 5)
        self.assertTrue(all(rule['provider_validation'] == 'unverified' for rule in catalog['rules']))
        self.assertEqual(len({r['id'] for r in catalog['rules']}), 200)

    def test_hunting_inventory_has_mitre_mappings_and_no_address_literals(self):
        catalog = exporter.export()
        self.assertTrue(catalog['mitre_mapping_assets'])
        self.assertTrue(any('rita' in item['file'] for item in catalog['query_assets']))
        self.assertTrue(any('HuntingPlaybooks' in item['file'] for item in catalog['query_assets']))
        for item in catalog['query_assets']:
            self.assertIsNone(re.search(r'(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])', item['query']))


if __name__ == '__main__':
    unittest.main()
