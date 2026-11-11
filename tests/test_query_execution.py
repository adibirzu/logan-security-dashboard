import importlib.util
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from logan_client import LoganClient

class QueryExecutionTests(unittest.TestCase):
    def test_exact_query_scope_window_and_limit_reach_the_sdk(self):
        calls = []
        class Provider:
            def query(self, namespace, details):
                calls.append(details)
                return SimpleNamespace(status=200, data=SimpleNamespace(items=[{'Hits': 3}], are_partial_results=True, query_execution_time_in_ms=9))
        client = LoganClient.__new__(LoganClient)
        client.compartment_id = 'selected-compartment'
        client.namespace = 'test-namespace'
        client.client = Provider()
        query = "'Log Source' = 'Windows Sysmon Events' and 'Event ID' = '1' and User != 'SYSTEM' | stats count as Hits by Entity | lookup table = MITRE select Entity using Entity"
        result = client.execute_query(query, 60, 17)
        self.assertEqual(calls[0].query_string, query)
        self.assertEqual(calls[0].compartment_id, 'selected-compartment')
        self.assertTrue(calls[0].compartment_id_in_subtree)
        self.assertEqual(calls[0].max_total_count, 17)
        self.assertEqual((calls[0].time_filter.time_end - calls[0].time_filter.time_start).total_seconds(), 3600)
        self.assertEqual(result['results'], [{'Hits': 3}])
        self.assertTrue(result['are_partial_results'])

    def test_analyzer_preserves_imported_windows_detection_and_completion_metadata(self):
        from security_analyzer import SecurityAnalyzer
        from query_validator import QueryValidator
        calls = []
        class Provider:
            def test_connection(self):
                return {'success': True}
            def execute_query(self, query, minutes, limit):
                calls.append((query, minutes, limit))
                return {'success': True, 'results': [{'Hits': 2}], 'total_count': 2,
                        'query_used': query, 'are_partial_results': True, 'status': 'partial'}
        analyzer = SecurityAnalyzer.__new__(SecurityAnalyzer)
        analyzer.client = Provider()
        analyzer.validator = QueryValidator()
        query = "'Log Source' = 'Windows Security Events' and 'Event ID' = '4625' | stats count as Hits by 'Source Address'"
        result = analyzer.search_logs(query, 15, max_count=23)
        self.assertEqual(calls, [(query, 15, 23)])
        self.assertEqual(result['query_used'], query)
        self.assertTrue(result['are_partial_results'])
        self.assertEqual(result['status'], 'partial')

    def test_async_or_provider_failure_is_never_reported_as_successful_zero_rows(self):
        import oci
        for pending in [True, False]:
            calls = []
            class Provider:
                def query(self, namespace, details):
                    calls.append(details)
                    if pending:
                        return SimpleNamespace(status=201, data=SimpleNamespace(items=[]))
                    raise oci.exceptions.ServiceError(400, 'InvalidParameter', {}, 'invalid field')
            client = LoganClient.__new__(LoganClient)
            client.compartment_id = 'selected-compartment'
            client.namespace = 'test-namespace'
            client.client = Provider()
            result = client.execute_query_like_console("User != 'SYSTEM'", 15, 10, True)
            self.assertFalse(result['success'])
            self.assertEqual(result['status'], 'pending' if pending else 'failed')
            self.assertEqual(len(calls), 1, 'no silent fallback to a broader query')
            self.assertEqual(calls[0].query_string, "User != 'SYSTEM'")

if __name__ == '__main__':
    unittest.main()
