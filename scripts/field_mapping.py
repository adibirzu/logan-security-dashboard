#!/usr/bin/env python3
"""
Field Mapping System for OCI Logs to Neo4j Schema
Maps various OCI log fields to standardized Neo4j node types and properties
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Any
import re
import ipaddress

@dataclass
class FieldMapping:
    """Maps source log fields to target Neo4j schema"""
    source_field: str
    target_node_type: str
    target_property: str
    transform_func: Optional[callable] = None
    is_primary_key: bool = False

@dataclass
class RelationshipMapping:
    """Maps log records to Neo4j relationships"""
    source_node_type: str
    source_field: str
    target_node_type: str
    target_field: str
    relationship_type: str
    properties: Dict[str, str] = None  # Maps log fields to relationship properties

class LogFieldMapper:
    """Central mapping system for converting OCI logs to Neo4j entities"""
    
    def __init__(self):
        self.field_mappings = self._initialize_field_mappings()
        self.relationship_mappings = self._initialize_relationship_mappings()
        self.node_id_patterns = self._initialize_node_id_patterns()
    
    def _initialize_field_mappings(self) -> Dict[str, List[FieldMapping]]:
        """Define mappings from OCI log fields to Neo4j node properties"""
        return {
            # VCN Flow Logs
            'vcn_flow': [
                # IP Address mappings
                FieldMapping('Source IP', 'IP', 'address', self._normalize_ip, True),
                FieldMapping('Destination IP', 'IP', 'address', self._normalize_ip, True),
                FieldMapping('Source IP', 'IP', 'is_internal', self._is_internal_ip),
                FieldMapping('Destination IP', 'IP', 'is_internal', self._is_internal_ip),
                FieldMapping('Source IP', 'IP', 'ip_type', self._get_ip_type),
                FieldMapping('Destination IP', 'IP', 'ip_type', self._get_ip_type),
                
                # Port mappings
                FieldMapping('Source Port', 'Port', 'number', int, True),
                FieldMapping('Destination Port', 'Port', 'number', int, True),
                FieldMapping('Source Port', 'Port', 'is_standard', self._is_standard_port),
                FieldMapping('Destination Port', 'Port', 'is_standard', self._is_standard_port),
                FieldMapping('Source Port', 'Port', 'service_name', self._get_service_name),
                FieldMapping('Destination Port', 'Port', 'service_name', self._get_service_name),
                
                # Protocol and Action
                FieldMapping('Protocol', 'Protocol', 'name', str, True),
                FieldMapping('Action', 'Action', 'name', str, True),
                
                # Flow metadata
                FieldMapping('Bytes', 'FlowSession', 'bytes_transferred', int),
                FieldMapping('Packets', 'FlowSession', 'packets_count', int),
                FieldMapping('Time', 'FlowSession', 'timestamp', self._parse_timestamp),
            ],
            
            # Audit Logs
            'audit': [
                # User mappings
                FieldMapping('Principal Name', 'User', 'name', str, True),
                FieldMapping('User Name', 'User', 'name', str, True),
                FieldMapping('Principal Name', 'User', 'is_service_account', self._is_service_account),
                FieldMapping('User Name', 'User', 'is_service_account', self._is_service_account),
                FieldMapping('Principal Type', 'User', 'account_type', str),
                
                # Event mappings
                FieldMapping('Event Name', 'Event', 'name', str, True),
                FieldMapping('Event Type', 'Event', 'type', str),
                FieldMapping('Event Source', 'Event', 'source', str),
                
                # IP Address mappings (same as VCN)
                FieldMapping('Source IP', 'IP', 'address', self._normalize_ip, True),
                FieldMapping('Client IP', 'IP', 'address', self._normalize_ip, True),
                FieldMapping('Source IP', 'IP', 'is_internal', self._is_internal_ip),
                FieldMapping('Client IP', 'IP', 'is_internal', self._is_internal_ip),
                
                # Resource mappings
                FieldMapping('Resource Name', 'Resource', 'name', str, True),
                FieldMapping('Resource Type', 'Resource', 'type', str),
                FieldMapping('Compartment Name', 'Compartment', 'name', str, True),
                FieldMapping('Compartment ID', 'Compartment', 'ocid', str),
            ],
            
            # Security Events
            'security': [
                # User mappings
                FieldMapping('User Name', 'User', 'name', str, True),
                FieldMapping('Target User', 'User', 'name', str, True),
                FieldMapping('User Name', 'User', 'is_privileged', self._is_privileged_user),
                
                # Process mappings
                FieldMapping('Process Name', 'Process', 'name', str, True),
                FieldMapping('Process ID', 'Process', 'pid', int),
                FieldMapping('Process Path', 'Process', 'path', str),
                FieldMapping('Command Line', 'Process', 'command_line', str),
                FieldMapping('Process Name', 'Process', 'is_suspicious', self._is_suspicious_process),
                
                # Host mappings
                FieldMapping('Computer Name', 'Host', 'name', str, True),
                FieldMapping('Hostname', 'Host', 'name', str, True),
                FieldMapping('Computer Name', 'Host', 'os_type', self._detect_os_type),
                FieldMapping('Computer Name', 'Host', 'is_domain_joined', self._is_domain_joined),
                
                # Event mappings
                FieldMapping('Event ID', 'SecurityEvent', 'event_id', int, True),
                FieldMapping('Event Name', 'SecurityEvent', 'name', str),
                FieldMapping('Event Category', 'SecurityEvent', 'category', str),
                FieldMapping('Severity', 'SecurityEvent', 'severity', str),
                
                # Network mappings
                FieldMapping('Source IP', 'IP', 'address', self._normalize_ip, True),
                FieldMapping('Target IP', 'IP', 'address', self._normalize_ip, True),
                FieldMapping('Source Port', 'Port', 'number', int, True),
                FieldMapping('Target Port', 'Port', 'number', int, True),
            ]
        }
    
    def _initialize_relationship_mappings(self) -> List[RelationshipMapping]:
        """Define how to create relationships between nodes from log data"""
        return [
            # VCN Flow relationships
            RelationshipMapping(
                'IP', 'Source IP',
                'IP', 'Destination IP',
                'CONNECTS_TO',
                {'Action': 'action', 'Bytes': 'bytes', 'Packets': 'packets', 'Time': 'timestamp'}
            ),
            RelationshipMapping(
                'IP', 'Source IP',
                'Port', 'Source Port',
                'USES_PORT',
                {'Time': 'timestamp'}
            ),
            RelationshipMapping(
                'IP', 'Destination IP',
                'Port', 'Destination Port',
                'LISTENS_ON',
                {'Time': 'timestamp'}
            ),
            
            # Audit relationships
            RelationshipMapping(
                'User', 'Principal Name',
                'IP', 'Source IP',
                'ACCESSES_FROM',
                {'Event Name': 'event_name', 'Time': 'timestamp'}
            ),
            RelationshipMapping(
                'User', 'Principal Name',
                'Resource', 'Resource Name',
                'ACCESSED',
                {'Event Name': 'action', 'Time': 'timestamp'}
            ),
            RelationshipMapping(
                'Resource', 'Resource Name',
                'Compartment', 'Compartment Name',
                'BELONGS_TO',
                {'Time': 'timestamp'}
            ),
            
            # Security Event relationships
            RelationshipMapping(
                'User', 'User Name',
                'Process', 'Process Name',
                'RUNS',
                {'Time': 'timestamp'}
            ),
            RelationshipMapping(
                'Process', 'Process Name',
                'Host', 'Computer Name',
                'RUNS_ON',
                {'Time': 'timestamp'}
            ),
            RelationshipMapping(
                'User', 'User Name',
                'Host', 'Computer Name',
                'LOGGED_INTO',
                {'Event Name': 'event_type', 'Time': 'timestamp'}
            ),
            RelationshipMapping(
                'User', 'User Name',
                'IP', 'Source IP',
                'CONNECTED_FROM',
                {'Time': 'timestamp'}
            ),
        ]
    
    def _initialize_node_id_patterns(self) -> Dict[str, str]:
        """Define how to generate unique IDs for each node type"""
        return {
            'IP': 'ip:{address}',
            'Port': 'port:{number}',
            'User': 'user:{name}',
            'Process': 'process:{name}',
            'Host': 'host:{name}',
            'Resource': 'resource:{name}',
            'Compartment': 'compartment:{name}',
            'Event': 'event:{name}',
            'SecurityEvent': 'security_event:{event_id}',
            'Protocol': 'protocol:{name}',
            'Action': 'action:{name}',
            'FlowSession': 'flow:{source_ip}:{destination_ip}:{timestamp}'
        }
    
    # Transform functions
    def _normalize_ip(self, ip_str: str) -> str:
        """Normalize IP address format"""
        try:
            return str(ipaddress.ip_address(ip_str))
        except:
            return ip_str
    
    def _is_internal_ip(self, ip_str: str) -> bool:
        """Check if IP is internal/private"""
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            return ip_obj.is_private or ip_obj.is_loopback
        except:
            return False
    
    def _get_ip_type(self, ip_str: str) -> str:
        """Determine IP address type"""
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            if ip_obj.is_loopback:
                return 'loopback'
            elif ip_obj.is_private:
                return 'private'
            elif ip_obj.is_multicast:
                return 'multicast'
            else:
                return 'public'
        except:
            return 'unknown'
    
    def _is_standard_port(self, port_num: int) -> bool:
        """Check if port is a standard well-known port"""
        standard_ports = {80, 443, 22, 21, 25, 53, 110, 143, 993, 995, 3389, 5900}
        return port_num in standard_ports
    
    def _get_service_name(self, port_num: int) -> str:
        """Get service name for port number"""
        port_services = {
            80: 'HTTP', 443: 'HTTPS', 22: 'SSH', 21: 'FTP',
            25: 'SMTP', 53: 'DNS', 110: 'POP3', 143: 'IMAP',
            993: 'IMAPS', 995: 'POP3S', 3389: 'RDP', 5900: 'VNC',
            23: 'Telnet', 135: 'RPC', 139: 'NetBIOS', 445: 'SMB'
        }
        return port_services.get(port_num, f'Port-{port_num}')
    
    def _is_service_account(self, username: str) -> bool:
        """Check if user is a service account"""
        service_patterns = [
            r'.*service.*', r'.*svc.*', r'.*app.*', r'.*system.*',
            r'^[A-Z0-9_\-]+$',  # All caps/numbers/underscores
            r'.*\$'  # Ends with $
        ]
        username_lower = username.lower()
        return any(re.match(pattern, username_lower) for pattern in service_patterns)
    
    def _is_privileged_user(self, username: str) -> bool:
        """Check if user has privileged access"""
        privileged_users = {'root', 'admin', 'administrator', 'sa', 'oracle', 'postgres', 'mysql'}
        return username.lower() in privileged_users
    
    def _is_suspicious_process(self, process_name: str) -> bool:
        """Check if process is potentially suspicious"""
        suspicious_processes = {
            'powershell.exe', 'cmd.exe', 'bash', 'sh', 'nc.exe', 'netcat',
            'psexec.exe', 'wmic.exe', 'regsvr32.exe', 'rundll32.exe',
            'certutil.exe', 'bitsadmin.exe', 'wscript.exe', 'cscript.exe'
        }
        return process_name.lower() in suspicious_processes
    
    def _detect_os_type(self, hostname: str) -> str:
        """Detect OS type from hostname patterns"""
        hostname_lower = hostname.lower()
        if any(pattern in hostname_lower for pattern in ['win', 'dc', 'srv', 'wks']):
            return 'windows'
        elif any(pattern in hostname_lower for pattern in ['linux', 'ubuntu', 'centos', 'rhel']):
            return 'linux'
        elif any(pattern in hostname_lower for pattern in ['mac', 'osx', 'darwin']):
            return 'macos'
        else:
            return 'unknown'
    
    def _is_domain_joined(self, hostname: str) -> bool:
        """Check if host appears to be domain joined"""
        # Simple heuristic - domain joined machines often have structured naming
        return bool(re.match(r'^[A-Z0-9\-]+\d+$', hostname.upper()))
    
    def _parse_timestamp(self, timestamp_val: Any) -> str:
        """Parse timestamp to ISO format"""
        from datetime import datetime
        
        if isinstance(timestamp_val, int):
            # Handle epoch timestamp
            dt = datetime.fromtimestamp(timestamp_val / 1000 if timestamp_val > 10**12 else timestamp_val)
            return dt.isoformat()
        elif isinstance(timestamp_val, str):
            # Handle ISO string timestamp
            return timestamp_val.replace('Z', '+00:00')
        else:
            return datetime.utcnow().isoformat()
    
    def map_log_record_to_nodes(self, log_record: Dict[str, Any], log_type: str) -> List[Dict]:
        """Convert a log record to Neo4j nodes"""
        nodes = {}
        
        if log_type not in self.field_mappings:
            return []
        
        mappings = self.field_mappings[log_type]
        
        for mapping in mappings:
            if mapping.source_field in log_record:
                value = log_record[mapping.source_field]
                if value is None or value == '':
                    continue
                
                # Apply transformation if specified
                if mapping.transform_func:
                    try:
                        transformed_value = mapping.transform_func(value)
                    except:
                        continue
                else:
                    transformed_value = value
                
                # Generate node ID
                node_type = mapping.target_node_type
                if mapping.is_primary_key:
                    if node_type not in nodes:
                        id_pattern = self.node_id_patterns.get(node_type, f"{node_type.lower()}:{{{mapping.target_property}}}")
                        node_id = id_pattern.format(**{mapping.target_property: transformed_value})
                        
                        nodes[node_type] = {
                            'id': node_id,
                            'type': node_type,
                            'properties': {}
                        }
                
                # Add property to node
                if node_type in nodes:
                    nodes[node_type]['properties'][mapping.target_property] = transformed_value
        
        return list(nodes.values())
    
    def map_log_record_to_relationships(self, log_record: Dict[str, Any], nodes: List[Dict]) -> List[Dict]:
        """Convert a log record to Neo4j relationships"""
        relationships = []
        
        # Create a mapping of node types to their IDs for this record
        node_map = {}
        for node in nodes:
            node_type = node['type']
            if node_type not in node_map:
                node_map[node_type] = []
            node_map[node_type].append(node['id'])
        
        for rel_mapping in self.relationship_mappings:
            source_type = rel_mapping.source_node_type
            target_type = rel_mapping.target_node_type
            
            # Check if both source and target nodes exist for this record
            if (source_type in node_map and target_type in node_map and
                rel_mapping.source_field in log_record and 
                rel_mapping.target_field in log_record):
                
                # Create relationship between nodes
                for source_id in node_map[source_type]:
                    for target_id in node_map[target_type]:
                        # Build relationship properties
                        rel_properties = {}
                        if rel_mapping.properties:
                            for log_field, rel_prop in rel_mapping.properties.items():
                                if log_field in log_record:
                                    rel_properties[rel_prop] = log_record[log_field]
                        
                        relationships.append({
                            'source_id': source_id,
                            'target_id': target_id,
                            'type': rel_mapping.relationship_type,
                            'properties': rel_properties
                        })
        
        return relationships
    
    def get_log_type_from_record(self, log_record: Dict[str, Any]) -> str:
        """Determine log type from record fields"""
        if 'Log Source' in log_record:
            log_source = log_record['Log Source']
            if 'VCN Flow' in log_source:
                return 'vcn_flow'
            elif 'Audit' in log_source:
                return 'audit'
            elif 'Security' in log_source or 'Windows' in log_source:
                return 'security'
        
        # Fallback based on field presence
        if 'Source IP' in log_record and 'Destination IP' in log_record:
            return 'vcn_flow'
        elif 'Principal Name' in log_record or 'Event Name' in log_record:
            return 'audit'
        elif 'Process Name' in log_record or 'Computer Name' in log_record:
            return 'security'
        
        return 'unknown'