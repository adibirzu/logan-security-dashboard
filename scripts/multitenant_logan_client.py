#!/usr/bin/env python3
"""
Multitenant Logan Client
Supports querying multiple OCI Logging Analytics instances
"""

import json
import sys
import os
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional
import oci
from datetime import datetime, timedelta

class MultitenantLoganClient:
    def __init__(self):
        self.environments = []
        
    def add_environment(self, env_config: Dict[str, Any]):
        """Add an OCI environment configuration"""
        env = {
            'id': env_config['id'],
            'name': env_config['name'],
            'config': self._create_oci_config(env_config),
            'compartment_id': env_config['compartmentId'],
            'namespace': env_config['namespace'],
            'region': env_config['region']
        }
        self.environments.append(env)
    
    def _create_oci_config(self, env_config: Dict[str, Any]) -> Dict[str, Any]:
        """Create OCI configuration based on auth type"""
        auth_type = env_config.get('authType', 'config_file')
        
        if auth_type == 'instance_principal':
            # Use instance principal authentication
            signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
            return {'signer': signer}
        
        elif auth_type == 'resource_principal':
            # Use resource principal authentication
            signer = oci.auth.signers.get_resource_principals_signer()
            return {'signer': signer}
        
        else:
            # Use config file authentication
            profile = env_config.get('configProfile', 'DEFAULT')
            config = oci.config.from_file(profile_name=profile)
            config['region'] = env_config['region']
            return config
    
    def query_environment(self, env: Dict[str, Any], query: str, time_range: str = '60m') -> Dict[str, Any]:
        """Execute query on a single environment"""
        try:
            # Create Logan Analytics client
            if 'signer' in env['config']:
                logan_client = oci.log_analytics.LogAnalyticsClient(
                    config={},
                    signer=env['config']['signer']
                )
                logan_client.base_client.set_region(env['region'])
            else:
                logan_client = oci.log_analytics.LogAnalyticsClient(env['config'])
            
            # Parse time range
            time_filter = self._parse_time_range(time_range)
            
            # Build query request
            query_details = oci.log_analytics.models.QueryDetails(
                compartment_id=env['compartment_id'],
                compartment_id_in_subtree=True,
                query_string=f"{time_filter} and ({query})" if time_filter else query,
                sub_system="LOG",
                max_total_count=1000
            )
            
            # Execute query
            response = logan_client.query(
                namespace_name=env['namespace'],
                query_details=query_details
            )
            
            # Process results
            if response.data and hasattr(response.data, 'results'):
                results = []
                for item in response.data.results:
                    if hasattr(item, 'data'):
                        results.append(item.data)
                
                return {
                    'environmentId': env['id'],
                    'environmentName': env['name'],
                    'success': True,
                    'data': {
                        'results': results,
                        'count': len(results),
                        'fields': self._extract_fields(response.data)
                    }
                }
            
            return {
                'environmentId': env['id'],
                'environmentName': env['name'],
                'success': True,
                'data': {
                    'results': [],
                    'count': 0,
                    'fields': []
                }
            }
            
        except Exception as e:
            return {
                'environmentId': env['id'],
                'environmentName': env['name'],
                'success': False,
                'error': str(e)
            }
    
    def _parse_time_range(self, time_range: str) -> str:
        """Convert time range to OCI query format"""
        if not time_range:
            return ""
        
        # Parse number and unit
        import re
        match = re.match(r'(\d+)([mhd])', time_range)
        if not match:
            return ""
        
        value = int(match.group(1))
        unit = match.group(2)
        
        # Convert to OCI format
        if unit == 'm':
            return f"'Start Time' > dateRelative({value}m)"
        elif unit == 'h':
            return f"'Start Time' > dateRelative({value}h)"
        elif unit == 'd':
            return f"'Start Time' > dateRelative({value}d)"
        
        return ""
    
    def _extract_fields(self, query_result) -> List[str]:
        """Extract field names from query result"""
        fields = []
        if hasattr(query_result, 'fields') and query_result.fields:
            for field in query_result.fields:
                if hasattr(field, 'name'):
                    fields.append(field.name)
        return fields
    
    def query_all_environments(self, query: str, time_range: str = '60m', 
                             parallel: bool = True, max_workers: int = 5) -> List[Dict[str, Any]]:
        """Execute query across all environments"""
        if not self.environments:
            return []
        
        if parallel and len(self.environments) > 1:
            # Execute queries in parallel
            results = []
            with ThreadPoolExecutor(max_workers=min(max_workers, len(self.environments))) as executor:
                future_to_env = {
                    executor.submit(self.query_environment, env, query, time_range): env 
                    for env in self.environments
                }
                
                for future in as_completed(future_to_env):
                    result = future.result()
                    results.append(result)
            
            return results
        else:
            # Execute queries sequentially
            return [self.query_environment(env, query, time_range) for env in self.environments]
    
    def aggregate_results(self, results: List[Dict[str, Any]], 
                         aggregation_type: str = 'merge') -> Dict[str, Any]:
        """Aggregate results from multiple environments"""
        successful_results = [r for r in results if r.get('success')]
        
        if not successful_results:
            return {
                'success': False,
                'error': 'No successful results to aggregate',
                'results': results
            }
        
        if aggregation_type == 'merge':
            # Merge all results into a single list
            merged_results = []
            all_fields = set()
            
            for result in successful_results:
                data = result.get('data', {})
                merged_results.extend(data.get('results', []))
                all_fields.update(data.get('fields', []))
            
            return {
                'success': True,
                'aggregationType': 'merge',
                'data': {
                    'results': merged_results,
                    'count': len(merged_results),
                    'fields': list(all_fields)
                },
                'environmentResults': results
            }
        
        elif aggregation_type == 'group':
            # Group results by environment
            grouped = {}
            for result in results:
                env_id = result.get('environmentId')
                grouped[env_id] = result
            
            return {
                'success': True,
                'aggregationType': 'group',
                'data': grouped,
                'environmentResults': results
            }
        
        return {
            'success': False,
            'error': f'Unknown aggregation type: {aggregation_type}'
        }


def main():
    """Command line interface"""
    parser = argparse.ArgumentParser(description='Multitenant OCI Logan Client')
    parser.add_argument('command', choices=['query', 'test'], help='Command to execute')
    parser.add_argument('--query', '-q', help='Query string')
    parser.add_argument('--time-range', '-t', default='60m', help='Time range (e.g., 60m, 24h, 7d)')
    parser.add_argument('--environments', '-e', help='JSON string or file path with environment configs')
    parser.add_argument('--parallel', action='store_true', help='Execute queries in parallel')
    parser.add_argument('--aggregate', choices=['merge', 'group'], default='merge', 
                       help='Aggregation type for results')
    
    args = parser.parse_args()
    
    try:
        # Initialize client
        client = MultitenantLoganClient()
        
        # Load environments
        if args.environments:
            if os.path.isfile(args.environments):
                with open(args.environments, 'r') as f:
                    env_configs = json.load(f)
            else:
                env_configs = json.loads(args.environments)
            
            # Add each environment
            for env_config in env_configs:
                client.add_environment(env_config)
        else:
            # Use default environment from environment variables
            default_env = {
                'id': 'default',
                'name': 'Default Environment',
                'authType': 'config_file',
                'configProfile': 'DEFAULT',
                'compartmentId': os.environ.get('LOGAN_COMPARTMENT_ID', ''),
                'namespace': os.environ.get('LOGAN_NAMESPACE', 'default'),
                'region': os.environ.get('LOGAN_REGION', 'us-ashburn-1')
            }
            client.add_environment(default_env)
        
        if args.command == 'test':
            # Test connectivity to all environments
            results = []
            for env in client.environments:
                result = client.query_environment(env, "* | head 1", "1h")
                results.append({
                    'environment': env['name'],
                    'success': result['success'],
                    'error': result.get('error', '')
                })
            
            print(json.dumps({
                'success': True,
                'results': results
            }, indent=2))
        
        elif args.command == 'query':
            if not args.query:
                print(json.dumps({
                    'success': False,
                    'error': 'Query string is required'
                }))
                sys.exit(1)
            
            # Execute query across environments
            results = client.query_all_environments(
                args.query, 
                args.time_range,
                parallel=args.parallel
            )
            
            # Aggregate results
            aggregated = client.aggregate_results(results, args.aggregate)
            
            print(json.dumps(aggregated, indent=2))
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }, file=sys.stderr))
        sys.exit(1)


if __name__ == '__main__':
    main()