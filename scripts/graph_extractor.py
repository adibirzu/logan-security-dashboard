#!/usr/bin/env python3
"""
Enhanced graph data extractor from OCI Logging Analytics logs
"""

import json
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Set, Tuple
from collections import defaultdict
import traceback

# Add the scripts directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from scripts.logan_client import LoganClient
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "Failed to import LoganClient"
    }))
    sys.exit(1)

class GraphDataExtractor:
    def __init__(self):
        self.client = LoganClient()
        
    def extract_network_graph(self, time_period_minutes: int = 60, max_nodes: int = 200, max_edges: int = 500) -> Dict:
        """Extract network connections from multiple log sources for graph visualization"""
        try:
            nodes = {}
            edges = []
            edge_logs = defaultdict(list)  # Store logs for each edge
            
            # Query VCN Flow logs - respect OCI 50k limit
            max_records = min(50000, max(1000, time_period_minutes * 50))  # Scale max records with time period
            vcn_query = f"""
            'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Time > dateRelative({time_period_minutes}m)
            | where 'Source IP' != "" and 'Destination IP' != ""
            | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action
            | sort -Time
            | head {max_records}
            """
            
            vcn_result = self.client.execute_query_like_console(vcn_query, time_period_minutes)
            if vcn_result.get('success') and vcn_result.get('results'):
                for log in vcn_result['results']:
                    src_ip = log.get('Source IP', '')
                    dst_ip = log.get('Destination IP', '')
                    
                    if src_ip and dst_ip:
                        # Add nodes
                        if src_ip not in nodes:
                            nodes[src_ip] = {
                                'id': src_ip,
                                'label': src_ip,
                                'type': 'ip',
                                'connections': 0,
                                'bytesTransferred': 0,
                                'firstSeen': log.get('Time', ''),
                                'lastSeen': log.get('Time', '')
                            }
                        
                        if dst_ip not in nodes:
                            nodes[dst_ip] = {
                                'id': dst_ip,
                                'label': dst_ip,
                                'type': 'ip',
                                'connections': 0,
                                'bytesTransferred': 0,
                                'firstSeen': log.get('Time', ''),
                                'lastSeen': log.get('Time', '')
                            }
                        
                        # Update node stats
                        nodes[src_ip]['connections'] += 1
                        nodes[dst_ip]['connections'] += 1
                        
                        # Since we don't have bytes data, use connection count as proxy
                        nodes[src_ip]['bytesTransferred'] += 1024  # Assume 1KB per connection
                        nodes[dst_ip]['bytesTransferred'] += 1024
                        
                        # Create edge key
                        edge_key = f"{src_ip}->{dst_ip}"
                        
                        # Store log for this edge
                        edge_logs[edge_key].append({
                            'time': log.get('Time', ''),
                            'sourcePort': log.get('Source Port', ''),
                            'destPort': log.get('Destination Port', ''),
                            'protocol': 'TCP',  # Default since field not available
                            'action': log.get('Action', ''),
                            'bytes': 1024,  # Default estimate
                            'packets': 1,  # Default estimate
                            'logSource': 'VCN Flow Logs'
                        })
            
            # Query Audit logs for additional context
            audit_max_records = min(10000, max(500, time_period_minutes * 10))  # Scale audit records
            audit_query = f"""
            'Log Source' = 'OCI Audit Logs' and Time > dateRelative({time_period_minutes}m)
            | where 'IP Address' != ""
            | fields Time, 'IP Address', 'Principal Name', 'Event Name', 'Compartment Name'
            | sort -Time
            | head {audit_max_records}
            """
            
            audit_result = self.client.execute_query_like_console(audit_query, time_period_minutes)
            if audit_result.get('success') and audit_result.get('results'):
                for log in audit_result['results']:
                    ip = log.get('IP Address', '')
                    principal = log.get('Principal Name', '')
                    
                    if ip:
                        if ip not in nodes:
                            nodes[ip] = {
                                'id': ip,
                                'label': ip,
                                'type': 'ip',
                                'connections': 0,
                                'bytesTransferred': 0,
                                'firstSeen': log.get('Time', ''),
                                'lastSeen': log.get('Time', ''),
                                'principal': principal
                            }
                        else:
                            # Add principal info if not already present
                            if principal and 'principal' not in nodes[ip]:
                                nodes[ip]['principal'] = principal
            
            # Build edges from accumulated data
            for edge_key, logs in edge_logs.items():
                src_ip, dst_ip = edge_key.split('->')
                
                # Calculate edge statistics
                total_bytes = sum(log['bytes'] for log in logs)
                total_packets = sum(log['packets'] for log in logs)
                protocols = list(set(log['protocol'] for log in logs if log['protocol']))
                actions = list(set(log['action'] for log in logs if log['action']))
                
                edge = {
                    'id': edge_key,
                    'source': src_ip,
                    'target': dst_ip,
                    'weight': len(logs),
                    'bytes': total_bytes,
                    'packets': total_packets,
                    'protocols': protocols,
                    'actions': actions,
                    'logs': logs  # Include actual log entries
                }
                
                edges.append(edge)
            
            # Convert nodes dict to list and apply limits
            nodes_list = list(nodes.values())
            
            # Sort nodes by connections and limit if necessary
            if len(nodes_list) > max_nodes:
                nodes_list.sort(key=lambda x: x['connections'], reverse=True)
                nodes_list = nodes_list[:max_nodes]
                # Filter edges to only include those between remaining nodes
                remaining_node_ids = set(node['id'] for node in nodes_list)
                edges = [edge for edge in edges if edge['source'] in remaining_node_ids and edge['target'] in remaining_node_ids]
            
            # Sort edges by weight and limit if necessary
            if len(edges) > max_edges:
                edges.sort(key=lambda x: x['weight'], reverse=True)
                edges = edges[:max_edges]
            
            # Calculate graph statistics
            total_connections = sum(node['connections'] for node in nodes_list)
            total_bytes = sum(node['bytesTransferred'] for node in nodes_list)
            
            return {
                'success': True,
                'nodes': nodes_list,
                'edges': edges,
                'statistics': {
                    'nodeCount': len(nodes_list),
                    'edgeCount': len(edges),
                    'totalConnections': total_connections,
                    'totalBytes': total_bytes,
                    'timeRange': f'{time_period_minutes} minutes'
                }
            }
            
        except Exception as e:
            error_details = f"{str(e)}\n{traceback.format_exc()}"
            return {
                'success': False,
                'error': str(e),
                'details': error_details
            }
    
    def get_ip_logs(self, ip_address: str, time_period_minutes: int = 60) -> Dict:
        """Get all logs related to a specific IP address"""
        try:
            all_logs = []
            
            # Query VCN Flow logs where IP is source or destination
            vcn_max_records = min(5000, max(100, time_period_minutes * 5))  # Scale records for IP-specific queries
            vcn_query = f"""
            'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Time > dateRelative({time_period_minutes}m)
            | where 'Source IP' = "{ip_address}" or 'Destination IP' = "{ip_address}"
            | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action, 'Flow Direction'
            | sort -Time
            | head {vcn_max_records}
            """
            
            vcn_result = self.client.execute_query_like_console(vcn_query, time_period_minutes)
            if vcn_result.get('success') and vcn_result.get('results'):
                for log in vcn_result['results']:
                    all_logs.append({
                        'time': log.get('Time', ''),
                        'logSource': 'VCN Flow Logs',
                        'type': 'Network Flow',
                        'sourceIP': log.get('Source IP', ''),
                        'destIP': log.get('Destination IP', ''),
                        'sourcePort': log.get('Source Port', ''),
                        'destPort': log.get('Destination Port', ''),
                        'protocol': 'TCP',  # Default
                        'action': log.get('Action', ''),
                        'bytes': 1024,  # Default estimate
                        'packets': 1,  # Default estimate
                        'direction': 'bidirectional',  # Default
                        'role': 'Source' if log.get('Source IP') == ip_address else 'Destination'
                    })
            
            # Query Audit logs for this IP
            audit_ip_max_records = min(1000, max(50, time_period_minutes * 2))  # Scale audit records for IP
            audit_query = f"""
            'Log Source' = 'OCI Audit Logs' and Time > dateRelative({time_period_minutes}m)
            | where 'IP Address' = "{ip_address}"
            | fields Time, 'Event Name', 'Principal Name', 'Compartment Name'
            | sort -Time
            | head {audit_ip_max_records}
            """
            
            audit_result = self.client.execute_query_like_console(audit_query, time_period_minutes)
            if audit_result.get('success') and audit_result.get('results'):
                for log in audit_result['results']:
                    all_logs.append({
                        'time': log.get('Time', ''),
                        'logSource': 'Audit Logs',
                        'type': 'Audit Event',
                        'eventName': log.get('Event Name', ''),
                        'principal': log.get('Principal Name', ''),
                        'compartment': log.get('Compartment Name', '')
                    })
            
            # Query Load Balancer logs
            lb_max_records = min(1000, max(50, time_period_minutes * 2))  # Scale LB records
            lb_query = f"""
            'Log Source' = 'OCI Load Balancer Access Logs' and Time > dateRelative({time_period_minutes}m)
            | where 'Client IP' = "{ip_address}"
            | fields Time, 'Client IP', 'Backend IP', 'Request URL', 'HTTP Status', 'Request Method', 'Response Time'
            | sort -Time
            | head {lb_max_records}
            """
            
            lb_result = self.client.execute_query_like_console(lb_query, time_period_minutes)
            if lb_result.get('success') and lb_result.get('results'):
                for log in lb_result['results']:
                    all_logs.append({
                        'time': log.get('Time', ''),
                        'logSource': 'Load Balancer Logs',
                        'type': 'HTTP Request',
                        'clientIP': log.get('Client IP', ''),
                        'backendIP': log.get('Backend IP', ''),
                        'url': log.get('Request URL', ''),
                        'method': log.get('Request Method', ''),
                        'status': log.get('HTTP Status', ''),
                        'responseTime': log.get('Response Time', '')
                    })
            
            # Query WAF logs for this IP
            waf_max_records = min(1000, max(50, time_period_minutes * 2))  # Scale WAF records for IP
            waf_query = f"""
            'Log Source' = 'OCI WAF Logs' and Time > dateRelative({time_period_minutes}m)
            | where 'Client IP' = "{ip_address}" or 'X-Forwarded-For' contains "{ip_address}"
            | fields Time, 'Client IP', 'X-Forwarded-For', 'Request URL', 'HTTP Method', 'HTTP Status', 'User Agent', 'Action', 'Rule ID', 'Country Code'
            | sort -Time
            | head {waf_max_records}
            """
            
            waf_result = self.client.execute_query_like_console(waf_query, time_period_minutes)
            if waf_result.get('success') and waf_result.get('results'):
                for log in waf_result['results']:
                    all_logs.append({
                        'time': log.get('Time', ''),
                        'logSource': 'WAF Logs',
                        'type': 'WAF Event',
                        'clientIP': log.get('Client IP', ''),
                        'xForwardedFor': log.get('X-Forwarded-For', ''),
                        'url': log.get('Request URL', ''),
                        'method': log.get('HTTP Method', ''),
                        'status': log.get('HTTP Status', ''),
                        'userAgent': log.get('User Agent', ''),
                        'action': log.get('Action', ''),
                        'ruleId': log.get('Rule ID', ''),
                        'countryCode': log.get('Country Code', '')
                    })
            
            # Sort all logs by time
            all_logs.sort(key=lambda x: x.get('time', ''), reverse=True)
            
            return {
                'success': True,
                'ip': ip_address,
                'totalLogs': len(all_logs),
                'logs': all_logs,
                'logSources': list(set(log['logSource'] for log in all_logs))
            }
            
        except Exception as e:
            error_details = f"{str(e)}\n{traceback.format_exc()}"
            return {
                'success': False,
                'error': str(e),
                'details': error_details
            }
    
    def _safe_int(self, value):
        """Safely convert value to integer"""
        try:
            if isinstance(value, (int, float)):
                return int(value)
            if isinstance(value, str) and value.isdigit():
                return int(value)
            return 0
        except:
            return 0

def main():
    """Main function to handle command line arguments"""
    try:
        if len(sys.argv) < 2:
            print(json.dumps({
                "success": False,
                "error": "No command specified"
            }))
            return
        
        command = sys.argv[1]
        extractor = GraphDataExtractor()
        
        if command == "extract":
            # Extract network graph data
            time_period = int(sys.argv[2]) if len(sys.argv) > 2 else 60
            max_nodes = int(sys.argv[3]) if len(sys.argv) > 3 else 200
            max_edges = int(sys.argv[4]) if len(sys.argv) > 4 else 500
            result = extractor.extract_network_graph(time_period, max_nodes, max_edges)
            print(json.dumps(result, indent=2))
            
        elif command == "ip-logs":
            # Get logs for specific IP
            if len(sys.argv) < 3:
                print(json.dumps({
                    "success": False,
                    "error": "IP address required"
                }))
                return
            
            ip_address = sys.argv[2]
            time_period = int(sys.argv[3]) if len(sys.argv) > 3 else 60
            result = extractor.get_ip_logs(ip_address, time_period)
            print(json.dumps(result, indent=2))
            
        else:
            print(json.dumps({
                "success": False,
                "error": f"Unknown command: {command}"
            }))
            
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "details": traceback.format_exc()
        }))

if __name__ == "__main__":
    main()