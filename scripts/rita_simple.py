#!/usr/bin/env python3
"""
Simplified RITA Analyzer that works with known OCI log sources
"""

import json
import sys
import argparse
from datetime import datetime, timezone
from collections import defaultdict
from typing import Dict, List, Any
from logan_client import LoganClient

class SimpleRITAAnalyzer:
    """Simplified RITA analyzer for testing"""
    
    def __init__(self):
        self.client = LoganClient()
    
    def analyze_applications(self, time_period_minutes: int = 1440) -> List[Dict]:
        """Analyze applications using VCN Flow logs"""
        sys.stderr.write("Analyzing VCN Flow applications...\n")
        
        # Scale max records based on time period - respect OCI 50k limit
        max_records = min(50000, max(1000, time_period_minutes * 30))
        query = f"""
        'Log Source' = 'OCI VCN Flow Unified Schema Logs'
        | where 'Source IP' != \"\" and 'Destination IP' != \"\"
        | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action
        | sort -Time
        | head {max_records}
        """
        
        try:
            # Use execute_query_like_console for proper record handling
            result = self.client.execute_query_like_console(query, time_period_minutes)
            if not result.get("success"):
                sys.stderr.write(f"VCN query failed: {result.get('error')}\n")
                return []
            
            records = result.get("results", [])
            sys.stderr.write(f"Processing {len(records)} VCN Flow records\n")
            
            # Group by application patterns
            app_comms = defaultdict(lambda: {
                'connections': 0,
                'source_ips': set(),
                'dest_ips': set(),
                'actions': [],
                'sample_logs': []
            })
            
            for record in records:
                source_ip = record.get('Source IP', '')
                dest_ip = record.get('Destination IP', '')
                dest_port = record.get('Destination Port', 0)
                action = record.get('Action', 'UNKNOWN')
                
                if source_ip and dest_ip:
                    # Identify application based on port
                    app_type = self._identify_app_type(int(dest_port) if dest_port else 0)
                    key = f"{source_ip}:{dest_ip}:{dest_port}:{app_type}"
                    
                    comm = app_comms[key]
                    comm['connections'] += 1
                    comm['source_ips'].add(source_ip)
                    comm['dest_ips'].add(dest_ip)
                    comm['actions'].append(action)
                    
                    if len(comm['sample_logs']) < 3:
                        comm['sample_logs'].append(record)
            
            # Convert to list with size limits
            applications = []
            for key, data in app_comms.items():
                if data['connections'] >= 1:  # Include all for testing
                    parts = key.split(':')
                    if len(parts) >= 4:
                        source_ip, dest_ip, port, app_type = parts[:4]
                        
                        # Limit sample logs to prevent large responses
                        limited_sample_logs = data['sample_logs'][:2] if data['sample_logs'] else []
                        
                        applications.append({
                            'source_app': f"CLIENT_{source_ip.split('.')[-1]}",
                            'dest_app': app_type,
                            'source_ip': source_ip,
                            'dest_ip': dest_ip,
                            'port': int(port) if port.isdigit() else 0,
                            'protocol': 'TCP',
                            'connection_count': data['connections'],
                            'total_bytes': 1024 * data['connections'],  # Estimated
                            'first_seen': datetime.now(timezone.utc).isoformat(),
                            'last_seen': datetime.now(timezone.utc).isoformat(),
                            'log_sources': ['OCI VCN Flow Unified Schema Logs'],
                            'sample_logs': limited_sample_logs,
                            'risk_score': self._calculate_risk_score(data['connections'], port, data['actions'])
                        })
            
            # Sort and limit results to prevent buffer overflow
            sorted_apps = sorted(applications, key=lambda x: x['risk_score'], reverse=True)
            
            # Limit to top 500 applications for large datasets
            max_apps = min(500, max(100, len(sorted_apps)))
            return sorted_apps[:max_apps]
            
        except Exception as e:
            sys.stderr.write(f"Error analyzing applications: {e}\n")
            return []
    
    def analyze_communications(self, time_period_minutes: int = 1440) -> List[Dict]:
        """Analyze IP communications"""
        sys.stderr.write("Analyzing IP communications...\n")
        
        # Scale max records for IP communications analysis - respect OCI 50k limit
        max_records = min(50000, max(1000, time_period_minutes * 30))
        query = f"""
        'Log Source' = 'OCI VCN Flow Unified Schema Logs'
        | where 'Source IP' != \"\" and 'Destination IP' != \"\"
        | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action
        | sort -Time
        | head {max_records}
        """
        
        try:
            # Use execute_query_like_console for proper record handling
            result = self.client.execute_query_like_console(query, time_period_minutes)
            if not result.get("success"):
                return []
            
            records = result.get("results", [])
            sys.stderr.write(f"Processing {len(records)} IP communication records\n")
            
            # Group by IP pairs
            ip_comms = defaultdict(lambda: {
                'connections': 0,
                'ports': set(),
                'actions': [],
                'sample_logs': []
            })
            
            for record in records:
                source_ip = record.get('Source IP', '')
                dest_ip = record.get('Destination IP', '')
                dest_port = record.get('Destination Port', 0)
                action = record.get('Action', 'UNKNOWN')
                
                if source_ip and dest_ip and source_ip != dest_ip:
                    key = f"{source_ip}:{dest_ip}"
                    
                    comm = ip_comms[key]
                    comm['connections'] += 1
                    comm['ports'].add(int(dest_port) if dest_port else 0)
                    comm['actions'].append(action)
                    
                    if len(comm['sample_logs']) < 3:  # Reduced from 5 to 3
                        comm['sample_logs'].append(record)
            
            # Convert to list with size limits
            communications = []
            for key, data in ip_comms.items():
                source_ip, dest_ip = key.split(':', 1)
                
                # Check IP types
                is_internal_src = self._is_internal_ip(source_ip)
                is_internal_dst = self._is_internal_ip(dest_ip)
                
                # Risk indicators
                risk_indicators = []
                if 'REJECT' in data['actions'] or 'DROP' in data['actions']:
                    risk_indicators.append('blocked_connection')
                if any(port > 1024 for port in data['ports']):
                    risk_indicators.append('high_port')
                if not is_internal_src and is_internal_dst:
                    risk_indicators.append('external_to_internal')
                
                # Limit ports list to prevent large responses
                limited_ports = list(data['ports'])[:20] if data['ports'] else []
                
                communications.append({
                    'source_ip': source_ip,
                    'dest_ip': dest_ip,
                    'ports_used': limited_ports,
                    'protocols': ['TCP'],
                    'actions': list(set(data['actions']))[:5],  # Limit actions
                    'connection_count': data['connections'],
                    'total_bytes': 1024 * data['connections'],
                    'first_seen': datetime.now(timezone.utc).isoformat(),
                    'last_seen': datetime.now(timezone.utc).isoformat(),
                    'log_sources': ['OCI VCN Flow Unified Schema Logs'],
                    'sample_logs': data['sample_logs'][:2],  # Limit sample logs
                    'is_internal_to_internal': is_internal_src and is_internal_dst,
                    'is_internal_to_external': is_internal_src and not is_internal_dst,
                    'is_external_to_internal': not is_internal_src and is_internal_dst,
                    'geo_info': None,
                    'risk_indicators': risk_indicators
                })
            
            # Sort and limit results
            sorted_comms = sorted(communications, key=lambda x: len(x['risk_indicators']), reverse=True)
            
            # Limit to top 300 communications for large datasets
            max_comms = min(300, max(50, len(sorted_comms)))
            return sorted_comms[:max_comms]
            
        except Exception as e:
            sys.stderr.write(f"Error analyzing communications: {e}\n")
            return []
    
    def get_logs_for_selection(self, selection_type: str, selection_value: str, time_period_minutes: int = 60) -> List[Dict]:
        """Get logs for a specific selection"""
        sys.stderr.write(f"Getting logs for {selection_type}: {selection_value}\n")
        
        if selection_type == 'ip':
            query = f"""
            'Log Source' = 'OCI VCN Flow Unified Schema Logs'
            and ('Source IP' = '{selection_value}' or 'Destination IP' = '{selection_value}')
            | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action
            | sort -Time
            | head 50
            """
        else:
            # Generic query
            query = f"""
            'Log Source' = 'OCI VCN Flow Unified Schema Logs'
            | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action
            | head 25
            """
        
        try:
            # Use execute_query_like_console for proper record handling
            result = self.client.execute_query_like_console(query, time_period_minutes)
            if result.get("success"):
                logs = result.get("results", [])
                for log in logs:
                    log['_source'] = 'OCI VCN Flow Unified Schema Logs'
                    log['_selection_type'] = selection_type
                    log['_selection_value'] = selection_value
                return logs
            else:
                sys.stderr.write(f"Log query failed: {result.get('error')}\n")
                return []
        except Exception as e:
            sys.stderr.write(f"Error getting logs: {e}\n")
            return []
    
    def _identify_app_type(self, port: int) -> str:
        """Identify application type by port"""
        if port == 80:
            return "HTTP_SERVER"
        elif port == 443:
            return "HTTPS_SERVER"
        elif port == 22:
            return "SSH_SERVER"
        elif port == 53:
            return "DNS_SERVER"
        elif port == 3306:
            return "MYSQL_SERVER"
        elif port == 5432:
            return "POSTGRES_SERVER"
        elif port < 1024:
            return f"SYSTEM_SERVICE_{port}"
        else:
            return f"APP_SERVICE_{port}"
    
    def _calculate_risk_score(self, connections: int, port: str, actions: List[str]) -> float:
        """Calculate risk score"""
        risk = 0.0
        
        # High connection count
        if connections > 100:
            risk += 0.3
        elif connections > 10:
            risk += 0.1
        
        # High port numbers
        try:
            port_num = int(port)
            if port_num > 8000:
                risk += 0.3
            elif port_num > 1024:
                risk += 0.1
        except:
            pass
        
        # Rejected connections
        if any(action in ['REJECT', 'DROP', 'DENY'] for action in actions):
            risk += 0.4
        
        return min(1.0, risk)
    
    def _is_internal_ip(self, ip: str) -> bool:
        """Check if IP is internal"""
        try:
            import ipaddress
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private or ip_obj.is_loopback
        except:
            return False

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Simple RITA Analyzer')
    parser.add_argument('action', choices=['applications', 'communications', 'logs'], help='Action to perform')
    parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    parser.add_argument('--selection-type', type=str, help='Selection type for log retrieval')
    parser.add_argument('--selection-value', type=str, help='Selection value for log retrieval')
    
    args = parser.parse_args()
    
    try:
        analyzer = SimpleRITAAnalyzer()
        
        if args.action == 'applications':
            applications = analyzer.analyze_applications(args.time_period)
            result = {
                "success": True,
                "applications": applications,
                "total_applications": len(applications),
                "analysis_timestamp": datetime.now(timezone.utc).isoformat()
            }
        elif args.action == 'communications':
            communications = analyzer.analyze_communications(args.time_period)
            result = {
                "success": True,
                "ip_communications": communications,
                "total_communications": len(communications),
                "analysis_timestamp": datetime.now(timezone.utc).isoformat()
            }
        elif args.action == 'logs':
            if not args.selection_type or not args.selection_value:
                result = {"success": False, "error": "Selection type and value required"}
            else:
                logs = analyzer.get_logs_for_selection(args.selection_type, args.selection_value, args.time_period)
                result = {
                    "success": True,
                    "logs": logs,
                    "total_logs": len(logs),
                    "selection_type": args.selection_type,
                    "selection_value": args.selection_value,
                    "analysis_timestamp": datetime.now(timezone.utc).isoformat()
                }
        else:
            result = {"success": False, "error": "Invalid action"}
        
        print(json.dumps(result, indent=2, default=str))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()