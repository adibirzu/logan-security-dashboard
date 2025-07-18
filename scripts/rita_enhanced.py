#!/usr/bin/env python3
"""
Enhanced RITA (Real-time Interactive Threat Analytics) Analyzer
Comprehensive log analysis across all OCI Logging Analytics sources
with application discovery and IP communication mapping
"""

import json
import sys
import os
import argparse
import re
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Dict, List, Tuple, Optional, Set, Any
import ipaddress

from logan_client import LoganClient

@dataclass
class ApplicationCommunication:
    """Represents communication between applications"""
    source_app: str
    dest_app: str
    source_ip: str
    dest_ip: str
    port: int
    protocol: str
    connection_count: int
    total_bytes: int
    first_seen: datetime
    last_seen: datetime
    log_sources: List[str]
    sample_logs: List[Dict]
    risk_score: float

@dataclass
class IPCommunication:
    """Represents IP-to-IP communication patterns"""
    source_ip: str
    dest_ip: str
    ports_used: Set[int]
    protocols: Set[str]
    actions: List[str]
    connection_count: int
    total_bytes: int
    first_seen: datetime
    last_seen: datetime
    log_sources: List[str]
    sample_logs: List[Dict]
    is_internal_to_internal: bool
    is_internal_to_external: bool
    is_external_to_internal: bool
    geo_info: Optional[Dict]
    risk_indicators: List[str]

@dataclass
class LogSource:
    """Represents a discovered log source"""
    name: str
    count: int
    sample_fields: List[str]
    has_ip_fields: bool
    has_application_fields: bool
    has_user_fields: bool
    last_updated: datetime

class EnhancedRITAAnalyzer:
    """Enhanced RITA analyzer with comprehensive log source analysis"""
    
    def __init__(self):
        self.client = LoganClient()
        self.discovered_sources = {}
        self.application_patterns = {
            # Web applications
            'http': [80, 8080, 8000, 8888, 9000],
            'https': [443, 8443, 9443],
            'web_app': [3000, 3001, 4000, 4200, 5000, 8080],
            
            # Database applications
            'mysql': [3306],
            'postgresql': [5432],
            'oracle': [1521, 1522],
            'mongodb': [27017],
            'redis': [6379],
            'elasticsearch': [9200, 9300],
            
            # Application servers
            'tomcat': [8080, 8443],
            'jboss': [8080, 9990],
            'websphere': [9080, 9443],
            'weblogic': [7001, 7002],
            
            # Messaging
            'kafka': [9092],
            'rabbitmq': [5672, 15672],
            'activemq': [61616],
            
            # Cloud services
            'docker': [2375, 2376],
            'kubernetes': [6443, 8080, 10250],
            'consul': [8500],
            'etcd': [2379, 2380],
            
            # Monitoring
            'prometheus': [9090],
            'grafana': [3000],
            'kibana': [5601],
            
            # Security
            'ldap': [389, 636],
            'kerberos': [88],
            'radius': [1812, 1813],
        }
        
    def discover_log_sources(self, time_period_minutes: int = 60) -> Dict[str, LogSource]:
        """Discover all available log sources and their characteristics"""
        sys.stderr.write("Discovering available log sources...\n")
        
        # Query to get all log sources with counts
        sources_query = f"""
        * 
        | stats count by 'Log Source'
        | sort -count
        | head 50
        """
        
        try:
            result = self.client.execute_query(sources_query, time_period_minutes, 100)
            if not result.get("success"):
                sys.stderr.write(f"Failed to discover log sources: {result.get('error')}\n")
                return {}
            
            sources = result.get("results", [])
            sys.stderr.write(f"Discovered {len(sources)} log sources\n")
            
            discovered_sources = {}
            
            for source_info in sources:
                log_source = source_info.get('Log Source', '')
                count = source_info.get('count', 0)
                
                sys.stderr.write(f"Found log source: '{log_source}' with {count} records\n")
                
                if not log_source or count < 5:  # Skip sources with very few logs
                    sys.stderr.write(f"Skipping {log_source} (count: {count})\n")
                    continue
                
                sys.stderr.write(f"Analyzing log source: {log_source} ({count} records)\n")
                
                # Get sample records to analyze field structure
                sample_query = f"""
                'Log Source' = '{log_source}'
                | fields *
                | head 5
                """
                
                try:
                    sample_result = self.client.execute_query(sample_query, time_period_minutes, 10)
                    if sample_result.get("success"):
                        sample_records = sample_result.get("results", [])
                        if sample_records:
                            # Analyze field structure
                            all_fields = set()
                            for record in sample_records:
                                all_fields.update(record.keys())
                            
                            # Check for important field types
                            has_ip_fields = self._has_ip_fields(all_fields)
                            has_app_fields = self._has_application_fields(all_fields)
                            has_user_fields = self._has_user_fields(all_fields)
                            
                            discovered_sources[log_source] = LogSource(
                                name=log_source,
                                count=count,
                                sample_fields=list(all_fields),
                                has_ip_fields=has_ip_fields,
                                has_application_fields=has_app_fields,
                                has_user_fields=has_user_fields,
                                last_updated=datetime.now()
                            )
                            sys.stderr.write(f"Successfully analyzed {log_source}: {len(all_fields)} fields, IP={has_ip_fields}, App={has_app_fields}, User={has_user_fields}\n")
                        else:
                            sys.stderr.write(f"No sample records returned for {log_source}\n")
                    else:
                        sys.stderr.write(f"Sample query failed for {log_source}: {sample_result.get('error', 'Unknown error')}\n")
                            
                except Exception as e:
                    sys.stderr.write(f"Error analyzing {log_source}: {e}\n")
                    continue
            
            self.discovered_sources = discovered_sources
            return discovered_sources
            
        except Exception as e:
            sys.stderr.write(f"Error discovering log sources: {e}\n")
            return {}
    
    def analyze_application_communications(self, time_period_minutes: int = 1440) -> List[ApplicationCommunication]:
        """Analyze application-to-application communications across all log sources"""
        sys.stderr.write("Analyzing application communications...\n")
        
        app_comms = defaultdict(lambda: {
            'connections': 0,
            'bytes': 0,
            'first_seen': None,
            'last_seen': None,
            'log_sources': set(),
            'sample_logs': [],
            'source_ips': set(),
            'dest_ips': set(),
            'ports': set(),
            'protocols': set()
        })
        
        # Analyze each log source that has IP or application fields
        for source_name, source_info in self.discovered_sources.items():
            if not (source_info.has_ip_fields or source_info.has_application_fields):
                continue
                
            sys.stderr.write(f"Analyzing applications in: {source_name}\n")
            
            # Build dynamic query based on available fields
            query = self._build_application_query(source_name, source_info.sample_fields, time_period_minutes)
            
            try:
                result = self.client.execute_query(query, time_period_minutes, 2000)
                if result.get("success"):
                    records = result.get("results", [])
                    sys.stderr.write(f"Processing {len(records)} records from {source_name}\n")
                    
                    for record in records:
                        # Extract application information
                        app_info = self._extract_application_info(record, source_name)
                        if app_info:
                            key = f"{app_info['source_app']}:{app_info['dest_app']}:{app_info['port']}"
                            
                            comm = app_comms[key]
                            comm['connections'] += 1
                            comm['bytes'] += app_info.get('bytes', 0)
                            comm['log_sources'].add(source_name)
                            comm['source_ips'].add(app_info['source_ip'])
                            comm['dest_ips'].add(app_info['dest_ip'])
                            comm['ports'].add(app_info['port'])
                            comm['protocols'].add(app_info.get('protocol', 'Unknown'))
                            
                            timestamp = app_info.get('timestamp')
                            if timestamp:
                                if not comm['first_seen'] or timestamp < comm['first_seen']:
                                    comm['first_seen'] = timestamp
                                if not comm['last_seen'] or timestamp > comm['last_seen']:
                                    comm['last_seen'] = timestamp
                            
                            # Keep sample logs (max 5 per communication pattern)
                            if len(comm['sample_logs']) < 5:
                                comm['sample_logs'].append({
                                    'source': source_name,
                                    'timestamp': timestamp.isoformat() if timestamp else None,
                                    'raw_log': record
                                })
                            
            except Exception as e:
                sys.stderr.write(f"Error analyzing {source_name}: {e}\n")
                continue
        
        # Convert to ApplicationCommunication objects
        applications = []
        for key, data in app_comms.items():
            if data['connections'] < 2:  # Filter low-activity communications
                continue
                
            source_app, dest_app, port = key.split(':', 2)
            
            # Calculate risk score
            risk_score = self._calculate_app_risk_score(
                source_app, dest_app, int(port), data['connections'], 
                len(data['source_ips']), len(data['dest_ips'])
            )
            
            app_comm = ApplicationCommunication(
                source_app=source_app,
                dest_app=dest_app,
                source_ip=list(data['source_ips'])[0] if data['source_ips'] else 'Unknown',
                dest_ip=list(data['dest_ips'])[0] if data['dest_ips'] else 'Unknown',
                port=int(port),
                protocol=list(data['protocols'])[0] if data['protocols'] else 'Unknown',
                connection_count=data['connections'],
                total_bytes=data['bytes'],
                first_seen=data['first_seen'] or datetime.now(),
                last_seen=data['last_seen'] or datetime.now(),
                log_sources=list(data['log_sources']),
                sample_logs=data['sample_logs'],
                risk_score=risk_score
            )
            applications.append(app_comm)
        
        # Sort by risk score and connection count
        applications.sort(key=lambda x: (x.risk_score, x.connection_count), reverse=True)
        return applications
    
    def analyze_ip_communications(self, time_period_minutes: int = 1440) -> List[IPCommunication]:
        """Analyze IP-to-IP communications across all log sources"""
        sys.stderr.write("Analyzing IP communications across all sources...\n")
        
        ip_comms = defaultdict(lambda: {
            'connections': 0,
            'bytes': 0,
            'first_seen': None,
            'last_seen': None,
            'log_sources': set(),
            'sample_logs': [],
            'ports': set(),
            'protocols': set(),
            'actions': [],
            'risk_indicators': set()
        })
        
        # Analyze each log source that has IP fields
        for source_name, source_info in self.discovered_sources.items():
            if not source_info.has_ip_fields:
                continue
                
            sys.stderr.write(f"Analyzing IP communications in: {source_name}\n")
            
            # Build dynamic query for IP communications
            query = self._build_ip_communication_query(source_name, source_info.sample_fields, time_period_minutes)
            
            try:
                result = self.client.execute_query(query, time_period_minutes, 3000)
                if result.get("success"):
                    records = result.get("results", [])
                    sys.stderr.write(f"Processing {len(records)} IP communication records from {source_name}\n")
                    
                    for record in records:
                        # Extract IP communication information
                        ip_info = self._extract_ip_communication_info(record, source_name)
                        if ip_info and ip_info['source_ip'] != ip_info['dest_ip']:
                            key = f"{ip_info['source_ip']}:{ip_info['dest_ip']}"
                            
                            comm = ip_comms[key]
                            comm['connections'] += 1
                            comm['bytes'] += ip_info.get('bytes', 0)
                            comm['log_sources'].add(source_name)
                            comm['ports'].add(ip_info.get('port', 0))
                            comm['protocols'].add(ip_info.get('protocol', 'Unknown'))
                            comm['actions'].append(ip_info.get('action', 'Unknown'))
                            
                            # Add risk indicators
                            if ip_info.get('action') in ['REJECT', 'DROP', 'DENY']:
                                comm['risk_indicators'].add('blocked_connection')
                            if ip_info.get('port', 0) > 1024:
                                comm['risk_indicators'].add('high_port')
                            
                            timestamp = ip_info.get('timestamp')
                            if timestamp:
                                if not comm['first_seen'] or timestamp < comm['first_seen']:
                                    comm['first_seen'] = timestamp
                                if not comm['last_seen'] or timestamp > comm['last_seen']:
                                    comm['last_seen'] = timestamp
                            
                            # Keep sample logs
                            if len(comm['sample_logs']) < 10:
                                comm['sample_logs'].append({
                                    'source': source_name,
                                    'timestamp': timestamp.isoformat() if timestamp else None,
                                    'raw_log': record
                                })
                            
            except Exception as e:
                sys.stderr.write(f"Error analyzing IP communications in {source_name}: {e}\n")
                continue
        
        # Convert to IPCommunication objects
        ip_communications = []
        for key, data in ip_comms.items():
            source_ip, dest_ip = key.split(':', 1)
            
            # Determine communication types
            is_internal_src = self._is_internal_ip(source_ip)
            is_internal_dst = self._is_internal_ip(dest_ip)
            
            ip_comm = IPCommunication(
                source_ip=source_ip,
                dest_ip=dest_ip,
                ports_used=data['ports'],
                protocols=data['protocols'],
                actions=data['actions'],
                connection_count=data['connections'],
                total_bytes=data['bytes'],
                first_seen=data['first_seen'] or datetime.now(),
                last_seen=data['last_seen'] or datetime.now(),
                log_sources=list(data['log_sources']),
                sample_logs=data['sample_logs'],
                is_internal_to_internal=is_internal_src and is_internal_dst,
                is_internal_to_external=is_internal_src and not is_internal_dst,
                is_external_to_internal=not is_internal_src and is_internal_dst,
                geo_info=self._get_geo_info(dest_ip) if not is_internal_dst else None,
                risk_indicators=list(data['risk_indicators'])
            )
            ip_communications.append(ip_comm)
        
        # Sort by connection count and risk indicators
        ip_communications.sort(key=lambda x: (len(x.risk_indicators), x.connection_count), reverse=True)
        return ip_communications
    
    def get_logs_for_selection(self, selection_type: str, selection_value: str, time_period_minutes: int = 60) -> List[Dict]:
        """Get detailed logs for a graph selection (IP, application, etc.)"""
        sys.stderr.write(f"Getting logs for {selection_type}: {selection_value}\n")
        
        logs = []
        
        # Build queries based on selection type
        if selection_type == 'ip':
            # Find all logs mentioning this IP
            for source_name, source_info in self.discovered_sources.items():
                if not source_info.has_ip_fields:
                    continue
                
                # Build query to find logs with this IP
                ip_fields = self._get_ip_field_names(source_info.sample_fields)
                conditions = []
                for field in ip_fields:
                    conditions.append(f"'{field}' = '{selection_value}'")
                
                if conditions:
                    query = f"""
                    'Log Source' = '{source_name}' 
                    and ({' or '.join(conditions)})
                    | fields *
                    | sort -Time
                    | head 100
                    """
                    
                    try:
                        result = self.client.execute_query(query, time_period_minutes, 100)
                        if result.get("success"):
                            records = result.get("results", [])
                            for record in records:
                                record['_source'] = source_name
                                record['_selection_type'] = selection_type
                                record['_selection_value'] = selection_value
                            logs.extend(records)
                    except Exception as e:
                        sys.stderr.write(f"Error querying {source_name} for IP {selection_value}: {e}\n")
        
        elif selection_type == 'application':
            # Find logs for application communications
            app_parts = selection_value.split(':')
            if len(app_parts) >= 3:
                source_app, dest_app, port = app_parts[0], app_parts[1], app_parts[2]
                
                for source_name, source_info in self.discovered_sources.items():
                    query = f"""
                    'Log Source' = '{source_name}'
                    | fields *
                    | head 100
                    """
                    
                    try:
                        result = self.client.execute_query(query, time_period_minutes, 100)
                        if result.get("success"):
                            records = result.get("results", [])
                            # Filter records that match the application pattern
                            filtered_records = []
                            for record in records:
                                if self._record_matches_application(record, source_app, dest_app, port):
                                    record['_source'] = source_name
                                    record['_selection_type'] = selection_type
                                    record['_selection_value'] = selection_value
                                    filtered_records.append(record)
                            logs.extend(filtered_records)
                    except Exception as e:
                        sys.stderr.write(f"Error querying {source_name} for application {selection_value}: {e}\n")
        
        # Sort by timestamp and limit
        logs.sort(key=lambda x: x.get('Time', ''), reverse=True)
        return logs[:200]  # Limit to 200 most recent logs
    
    # Helper methods
    def _has_ip_fields(self, fields: Set[str]) -> bool:
        """Check if field set contains IP-related fields"""
        ip_field_patterns = [
            'ip', 'addr', 'source', 'destination', 'src', 'dst', 'client', 'server', 'host'
        ]
        return any(any(pattern.lower() in field.lower() for pattern in ip_field_patterns) for field in fields)
    
    def _has_application_fields(self, fields: Set[str]) -> bool:
        """Check if field set contains application-related fields"""
        app_field_patterns = [
            'app', 'service', 'process', 'program', 'command', 'executable', 'port'
        ]
        return any(any(pattern.lower() in field.lower() for pattern in app_field_patterns) for field in fields)
    
    def _has_user_fields(self, fields: Set[str]) -> bool:
        """Check if field set contains user-related fields"""
        user_field_patterns = [
            'user', 'principal', 'account', 'username', 'login'
        ]
        return any(any(pattern.lower() in field.lower() for pattern in user_field_patterns) for field in fields)
    
    def _build_application_query(self, source_name: str, fields: List[str], time_period: int) -> str:
        """Build dynamic query for application analysis"""
        # Find available fields
        available_fields = []
        for field in ['Time', 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', 'Action', 'Protocol']:
            if field in fields:
                available_fields.append(f"'{field}'")
        
        # Add application-specific fields
        for field in fields:
            if any(pattern in field.lower() for pattern in ['app', 'service', 'process', 'program']):
                if field not in [f.strip("'") for f in available_fields]:
                    available_fields.append(f"'{field}'")
        
        fields_str = ', '.join(available_fields) if available_fields else '*'
        
        # Scale records based on log source type and time period - respect OCI 50k limit
        max_records = min(50000, max(500, time_period * 20)) if 'VCN' in source_name else min(10000, max(200, time_period * 10))
        
        return f"""
        'Log Source' = '{source_name}'
        | fields {fields_str}
        | head {max_records}
        """
    
    def _build_ip_communication_query(self, source_name: str, fields: List[str], time_period: int) -> str:
        """Build dynamic query for IP communication analysis"""
        # Find IP-related fields
        ip_fields = self._get_ip_field_names(fields)
        port_fields = [f for f in fields if 'port' in f.lower()]
        
        available_fields = ['Time']
        available_fields.extend([f"'{f}'" for f in ip_fields])
        available_fields.extend([f"'{f}'" for f in port_fields])
        
        # Add other relevant fields
        for field in ['Action', 'Protocol', 'Bytes', 'Packets']:
            if field in fields:
                available_fields.append(f"'{field}'")
        
        fields_str = ', '.join(set(available_fields))
        
        # Scale records for IP communication analysis - respect OCI 50k limit  
        max_records = min(50000, max(500, time_period * 20)) if 'VCN' in source_name else min(10000, max(200, time_period * 10))
        
        return f"""
        'Log Source' = '{source_name}'
        | fields {fields_str}
        | head {max_records}
        """
    
    def _get_ip_field_names(self, fields: List[str]) -> List[str]:
        """Extract IP field names from available fields"""
        ip_fields = []
        for field in fields:
            if any(pattern in field.lower() for pattern in ['ip', 'addr', 'host']) and 'port' not in field.lower():
                ip_fields.append(field)
        return ip_fields
    
    def _extract_application_info(self, record: Dict, source_name: str) -> Optional[Dict]:
        """Extract application information from a log record"""
        # Get basic IP and port info
        source_ip = self._get_field_value(record, ['Source IP', 'src_ip', 'srcaddr', 'client_ip'])
        dest_ip = self._get_field_value(record, ['Destination IP', 'dst_ip', 'dstaddr', 'server_ip'])
        port = self._get_field_value(record, ['Destination Port', 'dst_port', 'dstport', 'port'])
        
        if not (source_ip and dest_ip and port):
            return None
        
        try:
            port = int(port)
        except:
            return None
        
        # Determine applications based on port and context
        source_app = self._identify_application(source_ip, port, record, is_source=True)
        dest_app = self._identify_application(dest_ip, port, record, is_source=False)
        
        # Get timestamp
        timestamp = self._parse_timestamp(record.get('Time'))
        
        return {
            'source_app': source_app,
            'dest_app': dest_app,
            'source_ip': source_ip,
            'dest_ip': dest_ip,
            'port': port,
            'protocol': record.get('Protocol', 'TCP'),
            'bytes': int(record.get('Bytes', 0) or 0),
            'timestamp': timestamp
        }
    
    def _extract_ip_communication_info(self, record: Dict, source_name: str) -> Optional[Dict]:
        """Extract IP communication information from a log record"""
        source_ip = self._get_field_value(record, ['Source IP', 'src_ip', 'srcaddr', 'client_ip'])
        dest_ip = self._get_field_value(record, ['Destination IP', 'dst_ip', 'dstaddr', 'server_ip'])
        
        if not (source_ip and dest_ip):
            return None
        
        port = self._get_field_value(record, ['Destination Port', 'dst_port', 'dstport', 'port'])
        try:
            port = int(port) if port else 0
        except:
            port = 0
        
        return {
            'source_ip': source_ip,
            'dest_ip': dest_ip,
            'port': port,
            'protocol': record.get('Protocol', 'Unknown'),
            'action': record.get('Action', 'UNKNOWN'),
            'bytes': int(record.get('Bytes', 0) or 0),
            'timestamp': self._parse_timestamp(record.get('Time'))
        }
    
    def _get_field_value(self, record: Dict, field_names: List[str]) -> Optional[str]:
        """Get value from record using multiple possible field names"""
        for field_name in field_names:
            if field_name in record and record[field_name]:
                return str(record[field_name])
        return None
    
    def _identify_application(self, ip: str, port: int, record: Dict, is_source: bool = False) -> str:
        """Identify application based on IP, port, and context"""
        # Check for explicit application fields
        app_fields = ['Application', 'Service', 'Process Name', 'Program']
        for field in app_fields:
            if field in record and record[field]:
                return str(record[field])
        
        # Identify by port
        for app_type, ports in self.application_patterns.items():
            if port in ports:
                return f"{app_type.upper()}_APP"
        
        # Check if it's a known service port
        if port == 22:
            return "SSH_SERVER" if not is_source else "SSH_CLIENT"
        elif port == 80:
            return "HTTP_SERVER" if not is_source else "HTTP_CLIENT"
        elif port == 443:
            return "HTTPS_SERVER" if not is_source else "HTTPS_CLIENT"
        elif port == 53:
            return "DNS_SERVER" if not is_source else "DNS_CLIENT"
        
        # Default based on internal/external and port range
        is_internal = self._is_internal_ip(ip)
        if is_internal:
            if port < 1024:
                return f"INTERNAL_SERVICE_{port}"
            else:
                return f"INTERNAL_APP_{port}"
        else:
            if port < 1024:
                return f"EXTERNAL_SERVICE_{port}"
            else:
                return f"EXTERNAL_APP_{port}"
    
    def _calculate_app_risk_score(self, source_app: str, dest_app: str, port: int, 
                                 connections: int, source_ips: int, dest_ips: int) -> float:
        """Calculate risk score for application communication"""
        risk_score = 0.0
        
        # High port numbers are more suspicious
        if port > 8000:
            risk_score += 0.3
        elif port > 1024:
            risk_score += 0.1
        
        # Many connections from few IPs is suspicious
        if connections > 100 and source_ips < 5:
            risk_score += 0.4
        
        # External applications are higher risk
        if 'EXTERNAL' in source_app or 'EXTERNAL' in dest_app:
            risk_score += 0.2
        
        # Unknown applications are higher risk
        if 'UNKNOWN' in source_app or 'UNKNOWN' in dest_app:
            risk_score += 0.3
        
        return min(1.0, risk_score)
    
    def _is_internal_ip(self, ip: str) -> bool:
        """Check if IP is internal/private"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private or ip_obj.is_loopback
        except:
            return False
    
    def _get_geo_info(self, ip: str) -> Optional[Dict]:
        """Get geographic information for IP (placeholder)"""
        return {"country": "Unknown", "city": "Unknown"}
    
    def _parse_timestamp(self, timestamp_val: Any) -> Optional[datetime]:
        """Parse timestamp from various formats"""
        if not timestamp_val:
            return None
        
        try:
            if isinstance(timestamp_val, int):
                # Handle epoch timestamp
                return datetime.fromtimestamp(timestamp_val / 1000 if timestamp_val > 10**12 else timestamp_val)
            elif isinstance(timestamp_val, str):
                # Handle ISO string timestamp
                return datetime.fromisoformat(timestamp_val.replace('Z', '+00:00'))
        except:
            pass
        
        return None
    
    def _record_matches_application(self, record: Dict, source_app: str, dest_app: str, port: str) -> bool:
        """Check if record matches application pattern"""
        try:
            record_port = self._get_field_value(record, ['Destination Port', 'dst_port', 'dstport', 'port'])
            if record_port and str(record_port) == str(port):
                return True
        except:
            pass
        return False

def main():
    """Main entry point for enhanced RITA analyzer"""
    parser = argparse.ArgumentParser(description='Enhanced RITA Analyzer with comprehensive log analysis')
    parser.add_argument('action', choices=['discover', 'applications', 'communications', 'logs'], 
                       help='Action to perform')
    parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    parser.add_argument('--selection-type', type=str, help='Selection type for log retrieval')
    parser.add_argument('--selection-value', type=str, help='Selection value for log retrieval')
    
    args = parser.parse_args()
    
    try:
        analyzer = EnhancedRITAAnalyzer()
        
        if args.action == 'discover':
            # Discover log sources
            sources = analyzer.discover_log_sources(args.time_period)
            result = {
                "success": True,
                "log_sources": {name: asdict(source) for name, source in sources.items()},
                "total_sources": len(sources),
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        elif args.action == 'applications':
            # Analyze application communications
            analyzer.discover_log_sources(args.time_period)
            applications = analyzer.analyze_application_communications(args.time_period)
            result = {
                "success": True,
                "applications": [asdict(app) for app in applications],
                "total_applications": len(applications),
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        elif args.action == 'communications':
            # Analyze IP communications
            analyzer.discover_log_sources(args.time_period)
            communications = analyzer.analyze_ip_communications(args.time_period)
            result = {
                "success": True,
                "ip_communications": [asdict(comm) for comm in communications],
                "total_communications": len(communications),
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        elif args.action == 'logs':
            # Get logs for selection
            if not args.selection_type or not args.selection_value:
                result = {"success": False, "error": "Selection type and value required for log retrieval"}
            else:
                analyzer.discover_log_sources(args.time_period)
                logs = analyzer.get_logs_for_selection(args.selection_type, args.selection_value, args.time_period)
                result = {
                    "success": True,
                    "logs": logs,
                    "total_logs": len(logs),
                    "selection_type": args.selection_type,
                    "selection_value": args.selection_value,
                    "analysis_timestamp": datetime.now().isoformat()
                }
        else:
            result = {"success": False, "error": "Invalid action"}
        
        print(json.dumps(result, indent=2, default=str))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()