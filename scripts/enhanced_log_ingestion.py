#!/usr/bin/env python3
"""
Enhanced Log Ingestion for Multiple OCI Sources
Supports VCN Flow Logs, WAF Logs, and other security sources
"""

import json
import sys
import argparse
from datetime import datetime, timezone
from collections import defaultdict
from typing import Dict, List, Any, Optional
from logan_client import LoganClient

class EnhancedLogIngestion:
    """Enhanced log ingestion supporting multiple OCI sources"""
    
    def __init__(self):
        self.client = LoganClient()
        self.supported_sources = {
            'vcn_flow': 'OCI VCN Flow Unified Schema Logs',
            'audit': 'OCI Audit Logs', 
            'events': 'OCI Events Logs',
            'waf': 'OCI WAF Logs',
            'security': 'OCI Security Logs',
            'load_balancer': 'OCI Load Balancer Logs',
            'api_gateway': 'OCI API Gateway Logs'
        }
    
    def get_available_sources(self) -> Dict[str, Any]:
        """Get all available log sources"""
        try:
            result = self.client.list_log_sources()
            if result.get('success'):
                return {
                    'success': True,
                    'sources': result.get('sources', []),
                    'supported_types': self.supported_sources,
                    'total_events': sum(source.get('count', 0) for source in result.get('sources', []))
                }
            else:
                return {'success': False, 'error': result.get('error', 'Failed to list sources')}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def ingest_vcn_flow_logs(self, time_period_minutes: int = 1440, max_records: int = 10000) -> Dict[str, Any]:
        """Enhanced VCN Flow Logs ingestion"""
        try:
            sys.stderr.write(f"Ingesting VCN Flow logs for {time_period_minutes} minutes...\n")
            
            # VCN Flow query with verified field names
            query = f"""
            'Log Source' = 'OCI VCN Flow Unified Schema Logs'
            | where 'Source IP' != "" and 'Destination IP' != ""
            | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action
            | sort -Time
            | head {max_records}
            """
            
            result = self.client.execute_query_like_console(query, time_period_minutes)
            if not result.get('success'):
                return {'success': False, 'error': f"VCN Flow query failed: {result.get('error')}"}
            
            records = result.get('results', [])
            processed_data = self._process_vcn_flow_records(records)
            
            return {
                'success': True,
                'source': 'VCN Flow Logs',
                'records_processed': len(records),
                'flows': processed_data['flows'],
                'security_events': processed_data['security_events'],
                'network_topology': processed_data['topology'],
                'stats': processed_data['stats'],
                'time_period_minutes': time_period_minutes
            }
            
        except Exception as e:
            sys.stderr.write(f"VCN Flow ingestion error: {str(e)}\n")
            return {'success': False, 'error': str(e)}
    
    def ingest_waf_logs(self, time_period_minutes: int = 1440, max_records: int = 5000) -> Dict[str, Any]:
        """Ingest WAF logs for security analysis"""
        try:
            sys.stderr.write(f"Ingesting WAF logs for {time_period_minutes} minutes...\n")
            
            # WAF logs query - check if source exists first
            waf_sources = ['OCI WAF Logs', 'OCI Web Application Firewall Logs', 'WAF Logs']
            
            for waf_source in waf_sources:
                query = f"""
                'Log Source' = '{waf_source}'
                | where 'Client IP' != "" or 'Source IP' != ""
                | fields Time, 'Client IP', 'Source IP', 'Request Method', 'Request URI', 
                         'Response Code', 'User Agent', Action, 'Rule ID', 'Attack Type',
                         'Country Code', 'Request Size', 'Response Size'
                | sort -Time
                | head {max_records}
                """
                
                result = self.client.execute_query_like_console(query, time_period_minutes)
                if result.get('success') and result.get('results'):
                    records = result.get('results', [])
                    processed_data = self._process_waf_records(records)
                    
                    return {
                        'success': True,
                        'source': waf_source,
                        'records_processed': len(records),
                        'attacks': processed_data['attacks'],
                        'blocked_requests': processed_data['blocked'],
                        'threat_intelligence': processed_data['threats'],
                        'geographic_data': processed_data['geography'],
                        'stats': processed_data['stats'],
                        'time_period_minutes': time_period_minutes
                    }
            
            # If no WAF logs found, return empty but successful result
            return {
                'success': True,
                'source': 'WAF Logs',
                'message': 'No WAF logs found - WAF may not be configured or enabled',
                'records_processed': 0,
                'attacks': [],
                'blocked_requests': [],
                'threat_intelligence': [],
                'geographic_data': {},
                'stats': {'total_requests': 0, 'blocked_requests': 0, 'attack_attempts': 0}
            }
            
        except Exception as e:
            sys.stderr.write(f"WAF ingestion error: {str(e)}\n")
            return {'success': False, 'error': str(e)}
    
    def ingest_load_balancer_logs(self, time_period_minutes: int = 1440, max_records: int = 5000) -> Dict[str, Any]:
        """Ingest Load Balancer logs"""
        try:
            sys.stderr.write(f"Ingesting Load Balancer logs for {time_period_minutes} minutes...\n")
            
            lb_sources = ['OCI Load Balancer Logs', 'Load Balancer Access Logs', 'LB Access Logs']
            
            for lb_source in lb_sources:
                query = f"""
                'Log Source' = '{lb_source}'
                | where 'Client IP' != "" or 'Source IP' != ""
                | fields Time, 'Client IP', 'Source IP', 'Target IP', 'Request Method', 
                         'Request URI', 'Response Code', 'Request Processing Time',
                         'Target Processing Time', 'Response Processing Time', 'User Agent'
                | sort -Time
                | head {max_records}
                """
                
                result = self.client.execute_query_like_console(query, time_period_minutes)
                if result.get('success') and result.get('results'):
                    records = result.get('results', [])
                    processed_data = self._process_lb_records(records)
                    
                    return {
                        'success': True,
                        'source': lb_source,
                        'records_processed': len(records),
                        'requests': processed_data['requests'],
                        'performance_metrics': processed_data['performance'],
                        'error_analysis': processed_data['errors'],
                        'stats': processed_data['stats'],
                        'time_period_minutes': time_period_minutes
                    }
            
            return {
                'success': True,
                'source': 'Load Balancer Logs',
                'message': 'No Load Balancer logs found',
                'records_processed': 0,
                'requests': [],
                'performance_metrics': {},
                'error_analysis': {},
                'stats': {'total_requests': 0, 'error_rate': 0}
            }
            
        except Exception as e:
            sys.stderr.write(f"Load Balancer ingestion error: {str(e)}\n")
            return {'success': False, 'error': str(e)}
    
    def _process_vcn_flow_records(self, records: List[Dict]) -> Dict[str, Any]:
        """Process VCN Flow records for network analysis"""
        flows = []
        security_events = []
        topology = defaultdict(lambda: {'connections': 0, 'bytes': 0, 'packets': 0})
        stats = {'total_flows': 0, 'blocked_flows': 0, 'allowed_flows': 0, 'protocols': {}}
        
        for record in records:
            try:
                flow = {
                    'timestamp': record.get('Time'),
                    'source_ip': record.get('Source IP', ''),
                    'dest_ip': record.get('Destination IP', ''),
                    'source_port': record.get('Source Port', 0),
                    'dest_port': record.get('Destination Port', 0),
                    'protocol': 'TCP',  # Default since Protocol field not available
                    'action': record.get('Action', 'UNKNOWN'),
                    'bytes': 1024,  # Default since Bytes field not available
                    'packets': 1,   # Default since Packets field not available
                    'direction': 'UNKNOWN',  # Default since Direction field not available
                    'vcn_ocid': '',  # Default since VCN OCID field not available
                    'subnet_ocid': ''  # Default since Subnet OCID field not available
                }
                
                flows.append(flow)
                stats['total_flows'] += 1
                
                # Count by action
                if flow['action'] == 'REJECT':
                    stats['blocked_flows'] += 1
                    # Security event for blocked traffic
                    security_events.append({
                        'type': 'blocked_connection',
                        'severity': 'medium',
                        'source_ip': flow['source_ip'],
                        'dest_ip': flow['dest_ip'],
                        'dest_port': flow['dest_port'],
                        'protocol': flow['protocol'],
                        'timestamp': flow['timestamp'],
                        'description': f"Blocked connection attempt from {flow['source_ip']} to {flow['dest_ip']}:{flow['dest_port']}"
                    })
                else:
                    stats['allowed_flows'] += 1
                
                # Protocol statistics
                protocol = flow['protocol']
                if protocol not in stats['protocols']:
                    stats['protocols'][protocol] = 0
                stats['protocols'][protocol] += 1
                
                # Network topology
                connection_key = f"{flow['source_ip']}->{flow['dest_ip']}"
                topology[connection_key]['connections'] += 1
                topology[connection_key]['bytes'] += flow['bytes']
                topology[connection_key]['packets'] += flow['packets']
                
            except Exception as e:
                sys.stderr.write(f"Error processing VCN record: {e}\n")
                continue
        
        return {
            'flows': flows,
            'security_events': security_events,
            'topology': dict(topology),
            'stats': stats
        }
    
    def _process_waf_records(self, records: List[Dict]) -> Dict[str, Any]:
        """Process WAF records for security analysis"""
        attacks = []
        blocked = []
        threats = []
        geography = defaultdict(int)
        stats = {'total_requests': 0, 'blocked_requests': 0, 'attack_attempts': 0}
        
        for record in records:
            try:
                client_ip = record.get('Client IP') or record.get('Source IP', '')
                action = record.get('Action', '').upper()
                rule_id = record.get('Rule ID', '')
                attack_type = record.get('Attack Type', '')
                country = record.get('Country Code', 'Unknown')
                
                waf_event = {
                    'timestamp': record.get('Time'),
                    'client_ip': client_ip,
                    'method': record.get('Request Method', ''),
                    'uri': record.get('Request URI', ''),
                    'response_code': record.get('Response Code', 0),
                    'user_agent': record.get('User Agent', ''),
                    'action': action,
                    'rule_id': rule_id,
                    'attack_type': attack_type,
                    'country': country,
                    'request_size': record.get('Request Size', 0),
                    'response_size': record.get('Response Size', 0)
                }
                
                stats['total_requests'] += 1
                geography[country] += 1
                
                if action in ['BLOCK', 'BLOCKED', 'DENY']:
                    blocked.append(waf_event)
                    stats['blocked_requests'] += 1
                
                if attack_type and attack_type.lower() != 'none':
                    attacks.append(waf_event)
                    stats['attack_attempts'] += 1
                    
                    # Create threat intelligence entry
                    threats.append({
                        'ip': client_ip,
                        'attack_type': attack_type,
                        'timestamp': waf_event['timestamp'],
                        'severity': self._get_attack_severity(attack_type),
                        'country': country,
                        'user_agent': waf_event['user_agent']
                    })
                
            except Exception as e:
                sys.stderr.write(f"Error processing WAF record: {e}\n")
                continue
        
        return {
            'attacks': attacks,
            'blocked': blocked,
            'threats': threats,
            'geography': dict(geography),
            'stats': stats
        }
    
    def _process_lb_records(self, records: List[Dict]) -> Dict[str, Any]:
        """Process Load Balancer records"""
        requests = []
        performance = {'avg_response_time': 0, 'max_response_time': 0, 'min_response_time': float('inf')}
        errors = defaultdict(int)
        stats = {'total_requests': 0, 'error_rate': 0}
        
        response_times = []
        
        for record in records:
            try:
                response_code = int(record.get('Response Code', 0))
                processing_time = float(record.get('Request Processing Time', 0))
                
                lb_request = {
                    'timestamp': record.get('Time'),
                    'client_ip': record.get('Client IP', ''),
                    'target_ip': record.get('Target IP', ''),
                    'method': record.get('Request Method', ''),
                    'uri': record.get('Request URI', ''),
                    'response_code': response_code,
                    'processing_time': processing_time,
                    'user_agent': record.get('User Agent', '')
                }
                
                requests.append(lb_request)
                stats['total_requests'] += 1
                response_times.append(processing_time)
                
                # Error analysis
                if response_code >= 400:
                    errors[f"{response_code}xx"] += 1
                
            except Exception as e:
                sys.stderr.write(f"Error processing LB record: {e}\n")
                continue
        
        # Calculate performance metrics
        if response_times:
            performance['avg_response_time'] = sum(response_times) / len(response_times)
            performance['max_response_time'] = max(response_times)
            performance['min_response_time'] = min(response_times)
        
        # Calculate error rate
        error_count = sum(errors.values())
        stats['error_rate'] = (error_count / stats['total_requests']) * 100 if stats['total_requests'] > 0 else 0
        
        return {
            'requests': requests,
            'performance': performance,
            'errors': dict(errors),
            'stats': stats
        }
    
    def _get_attack_severity(self, attack_type: str) -> str:
        """Determine attack severity based on type"""
        high_severity = ['sql injection', 'xss', 'rce', 'command injection', 'path traversal']
        medium_severity = ['csrf', 'xxe', 'directory traversal', 'file inclusion']
        
        attack_lower = attack_type.lower()
        for high_attack in high_severity:
            if high_attack in attack_lower:
                return 'high'
        
        for medium_attack in medium_severity:
            if medium_attack in attack_lower:
                return 'medium'
        
        return 'low'
    
    def ingest_all_sources(self, time_period_minutes: int = 1440) -> Dict[str, Any]:
        """Ingest from all available sources"""
        results = {
            'success': True,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'time_period_minutes': time_period_minutes,
            'sources': {}
        }
        
        # VCN Flow Logs
        vcn_result = self.ingest_vcn_flow_logs(time_period_minutes)
        results['sources']['vcn_flow'] = vcn_result
        
        # WAF Logs
        waf_result = self.ingest_waf_logs(time_period_minutes)
        results['sources']['waf'] = waf_result
        
        # Load Balancer Logs
        lb_result = self.ingest_load_balancer_logs(time_period_minutes)
        results['sources']['load_balancer'] = lb_result
        
        # Overall success based on individual results
        results['success'] = any(source.get('success', False) for source in results['sources'].values())
        
        return results

def main():
    parser = argparse.ArgumentParser(description='Enhanced Log Ingestion for OCI')
    parser.add_argument('action', choices=['sources', 'vcn', 'waf', 'lb', 'all'], 
                       help='Action to perform')
    parser.add_argument('--time-period', type=int, default=1440,
                       help='Time period in minutes (default: 1440 = 24h)')
    parser.add_argument('--max-records', type=int, default=10000,
                       help='Maximum records to process')
    
    args = parser.parse_args()
    
    ingestion = EnhancedLogIngestion()
    
    if args.action == 'sources':
        result = ingestion.get_available_sources()
    elif args.action == 'vcn':
        result = ingestion.ingest_vcn_flow_logs(args.time_period, args.max_records)
    elif args.action == 'waf':
        result = ingestion.ingest_waf_logs(args.time_period, args.max_records)
    elif args.action == 'lb':
        result = ingestion.ingest_load_balancer_logs(args.time_period, args.max_records)
    elif args.action == 'all':
        result = ingestion.ingest_all_sources(args.time_period)
    else:
        result = {'success': False, 'error': 'Unknown action'}
    
    print(json.dumps(result, indent=2, default=str))

if __name__ == '__main__':
    main()