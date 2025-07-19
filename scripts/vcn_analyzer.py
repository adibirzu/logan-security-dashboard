#!/usr/bin/env python3
"""
VCN Flow Log Analyzer with RITA-style threat detection
Enhanced threat analytics for OCI VCN Flow Logs
"""

import json
import sys
import os
import argparse
import math
from collections import defaultdict, Counter
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional, Set
import ipaddress
import statistics

from logan_client import LoganClient

@dataclass
class FlowRecord:
    """Represents a VCN flow log record"""
    timestamp: datetime
    source_ip: str
    dest_ip: str
    source_port: int
    dest_port: int
    protocol: str
    action: str
    bytes_sent: int
    packets_sent: int
    duration: float = 0
    
    def __post_init__(self):
        """Additional processing after initialization"""
        self.is_internal_src = self._is_internal_ip(self.source_ip)
        self.is_internal_dst = self._is_internal_ip(self.dest_ip)
        self.flow_key = f"{self.source_ip}:{self.source_port}->{self.dest_ip}:{self.dest_port}"
        
    def _is_internal_ip(self, ip: str) -> bool:
        """Check if IP is in private/internal ranges"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private or ip_obj.is_loopback
        except:
            return False

@dataclass
class BeaconCandidate:
    """Represents a potential beacon communication"""
    source_ip: str
    dest_ip: str
    dest_port: int
    connection_count: int
    total_bytes: int
    avg_bytes_per_connection: float
    time_intervals: List[float]
    avg_interval: float
    interval_variance: float
    consistency_score: float
    first_seen: datetime
    last_seen: datetime
    duration_hours: float
    confidence: float
    severity: str

@dataclass
class LongConnection:
    """Represents an abnormally long connection"""
    source_ip: str
    dest_ip: str
    dest_port: int
    total_duration: float
    total_bytes: int
    total_packets: int
    start_time: datetime
    end_time: datetime
    avg_bytes_per_second: float
    confidence: float
    severity: str

@dataclass
class DataExfiltrationEvent:
    """Represents potential data exfiltration"""
    source_ip: str
    dest_ip: str
    dest_port: int
    total_bytes_out: int
    total_bytes_in: int
    exfiltration_ratio: float
    connection_count: int
    unique_dest_count: int
    time_window: float
    bytes_per_hour: float
    confidence: float
    severity: str

class VCNFlowAnalyzer:
    """Advanced VCN Flow Log analyzer with RITA-style threat detection"""
    
    def __init__(self):
        self.client = LoganClient()
        
        # Thresholds for threat detection
        self.BEACON_MIN_CONNECTIONS = 10
        self.BEACON_MAX_INTERVAL_VARIANCE = 0.3
        self.BEACON_MIN_CONSISTENCY = 0.6
        
        self.LONG_CONN_MIN_DURATION = 3600  # 1 hour in seconds
        self.LONG_CONN_MIN_BYTES = 1024 * 1024  # 1MB
        
        self.EXFIL_MIN_BYTES = 100 * 1024 * 1024  # 100MB
        self.EXFIL_MIN_RATIO = 10.0  # 10:1 outbound:inbound ratio
        
        # Port classifications
        self.COMMON_PORTS = {80, 443, 53, 22, 21, 25, 110, 143, 993, 995}
        self.SUSPICIOUS_PORTS = set(range(1024, 65536)) - self.COMMON_PORTS
        
    def analyze_vcn_flows(self, time_period_minutes: int = 1440) -> Dict:
        """Main analysis function for VCN flow logs"""
        try:
            # Get VCN flow data
            flows = self._get_vcn_flow_data(time_period_minutes)
            if not flows:
                return {"success": False, "error": "No VCN flow data found"}
            
            # Log processing count to result instead of stderr
            processing_info = f"Processing {len(flows)} flow records"
            
            # Parse flows into structured records
            flow_records = self._parse_flow_records(flows)
            
            # Perform various threat analyses
            beacons = self._detect_beacons(flow_records)
            long_connections = self._detect_long_connections(flow_records)
            exfiltration = self._detect_data_exfiltration(flow_records)
            port_scans = self._detect_port_scanning(flow_records)
            suspicious_dns = self._detect_suspicious_dns(flow_records)
            
            # Calculate statistics
            stats = self._calculate_threat_stats(beacons, long_connections, exfiltration, port_scans, suspicious_dns)
            
            # Compile threat summary
            all_threats = self._compile_threat_summary(beacons, long_connections, exfiltration, port_scans, suspicious_dns)
            
            return {
                "success": True,
                "stats": stats,
                "threats": all_threats,
                "processing_info": processing_info,
                "analysis_details": {
                    "beacons": len(beacons),
                    "long_connections": len(long_connections),
                    "data_exfiltration": len(exfiltration),
                    "port_scans": len(port_scans),
                    "suspicious_dns": len(suspicious_dns),
                    "total_flows_analyzed": len(flow_records),
                    "time_period_minutes": time_period_minutes
                }
            }
            
        except Exception as e:
            sys.stderr.write(f"VCN Analyzer error: {e}\n")
            return {"success": False, "error": str(e)}
    
    def _get_vcn_flow_data(self, time_period_minutes: int) -> List[Dict]:
        """Retrieve VCN flow log data from OCI Logging Analytics"""
        # Scale max records based on time period - respect OCI 50k limit
        max_records = min(50000, max(1000, time_period_minutes * 30))  # Up to 50k records, scaled with time
        
        # Complex query to get comprehensive VCN flow data
        query = f"""
        'Log Source' = 'OCI VCN Flow Unified Schema Logs' 
        | where 'Source IP' != \"\" and 'Destination IP' != \"\"
        | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action
        | sort -Time
        | head {max_records}
        """
        
        try:
            # Use execute_query_like_console which properly handles max_records
            result = self.client.execute_query_like_console(query, time_period_minutes)
            if result.get("success"):
                return result.get("results", [])
            else:
                sys.stderr.write(f"VCN query failed: {result.get('error', 'Unknown error')}\n")
                return []
        except Exception as e:
            sys.stderr.write(f"Error querying VCN data: {e}\n")
            return []
    
    def _parse_flow_records(self, flows: List[Dict]) -> List[FlowRecord]:
        """Parse raw flow data into structured FlowRecord objects"""
        records = []
        
        for flow in flows:
            try:
                # Parse timestamp - handle both string and integer formats
                timestamp_val = flow.get('Time', flow.get('Datetime', ''))
                if timestamp_val:
                    if isinstance(timestamp_val, int):
                        # Handle epoch timestamp
                        timestamp = datetime.fromtimestamp(timestamp_val / 1000 if timestamp_val > 10**12 else timestamp_val)
                    elif isinstance(timestamp_val, str):
                        # Handle ISO string timestamp
                        timestamp = datetime.fromisoformat(timestamp_val.replace('Z', '+00:00'))
                    else:
                        timestamp = datetime.utcnow()
                else:
                    timestamp = datetime.utcnow()
                
                # Extract flow details using the correct field names from simplified query
                source_ip = flow.get('Source IP', '')
                dest_ip = flow.get('Destination IP', '')
                source_port = int(flow.get('Source Port', 0) or 0)
                dest_port = int(flow.get('Destination Port', 0) or 0)
                protocol = 'TCP'  # Default since Protocol field not available
                action = flow.get('Action', 'ACCEPT')
                bytes_sent = 1024  # Default since Bytes field not available
                packets_sent = 1  # Default since Packets field not available
                
                # Calculate duration if available
                duration = 0
                start_time = flow.get('start_time', flow.get('Start Time'))
                end_time = flow.get('end_time', flow.get('End Time'))
                if start_time and end_time:
                    try:
                        start_dt = datetime.fromisoformat(str(start_time).replace('Z', '+00:00'))
                        end_dt = datetime.fromisoformat(str(end_time).replace('Z', '+00:00'))
                        duration = (end_dt - start_dt).total_seconds()
                    except:
                        duration = 0
                
                if source_ip and dest_ip:
                    record = FlowRecord(
                        timestamp=timestamp,
                        source_ip=source_ip,
                        dest_ip=dest_ip,
                        source_port=source_port,
                        dest_port=dest_port,
                        protocol=protocol,
                        action=action,
                        bytes_sent=bytes_sent,
                        packets_sent=packets_sent,
                        duration=duration
                    )
                    records.append(record)
                    
            except Exception as e:
                sys.stderr.write(f"Error parsing flow record: {e}\n")
                continue
        
        return records
    
    def _detect_beacons(self, flows: List[FlowRecord]) -> List[BeaconCandidate]:
        """Detect potential beacon communications using RITA-style analysis"""
        # Group flows by source IP, destination IP, and destination port
        flow_groups = defaultdict(list)
        for flow in flows:
            if flow.action.upper() == 'ACCEPT':  # Only analyze successful connections
                key = (flow.source_ip, flow.dest_ip, flow.dest_port)
                flow_groups[key].append(flow)
        
        beacons = []
        
        for (src_ip, dst_ip, dst_port), group_flows in flow_groups.items():
            if len(group_flows) < self.BEACON_MIN_CONNECTIONS:
                continue
            
            # Sort by timestamp
            group_flows.sort(key=lambda x: x.timestamp)
            
            # Calculate time intervals between connections
            intervals = []
            for i in range(1, len(group_flows)):
                interval = (group_flows[i].timestamp - group_flows[i-1].timestamp).total_seconds()
                intervals.append(interval)
            
            if not intervals:
                continue
            
            # Calculate beacon metrics
            avg_interval = statistics.mean(intervals)
            interval_variance = statistics.variance(intervals) if len(intervals) > 1 else 0
            
            # Normalize variance by average to get coefficient of variation
            cv = interval_variance / (avg_interval ** 2) if avg_interval > 0 else float('inf')
            
            # Calculate consistency score (inverse of coefficient of variation)
            consistency_score = 1 / (1 + cv) if cv != float('inf') else 0
            
            # Calculate other metrics
            total_bytes = sum(flow.bytes_sent for flow in group_flows)
            avg_bytes = total_bytes / len(group_flows) if group_flows else 0
            
            first_seen = group_flows[0].timestamp
            last_seen = group_flows[-1].timestamp
            duration_hours = (last_seen - first_seen).total_seconds() / 3600
            
            # Calculate confidence based on multiple factors
            confidence = self._calculate_beacon_confidence(
                len(group_flows), consistency_score, avg_interval, dst_port
            )
            
            # Determine severity
            severity = self._determine_beacon_severity(confidence, len(group_flows), dst_port)
            
            if confidence > 0.3:  # Minimum confidence threshold
                beacon = BeaconCandidate(
                    source_ip=src_ip,
                    dest_ip=dst_ip,
                    dest_port=dst_port,
                    connection_count=len(group_flows),
                    total_bytes=total_bytes,
                    avg_bytes_per_connection=avg_bytes,
                    time_intervals=intervals,
                    avg_interval=avg_interval,
                    interval_variance=interval_variance,
                    consistency_score=consistency_score,
                    first_seen=first_seen,
                    last_seen=last_seen,
                    duration_hours=duration_hours,
                    confidence=confidence,
                    severity=severity
                )
                beacons.append(beacon)
        
        # Sort by confidence score
        beacons.sort(key=lambda x: x.confidence, reverse=True)
        return beacons
    
    def _detect_long_connections(self, flows: List[FlowRecord]) -> List[LongConnection]:
        """Detect abnormally long network connections"""
        # Group by connection tuple
        connection_groups = defaultdict(list)
        for flow in flows:
            if flow.duration > 0:  # Only consider flows with duration data
                key = (flow.source_ip, flow.dest_ip, flow.dest_port)
                connection_groups[key].append(flow)
        
        long_connections = []
        
        for (src_ip, dst_ip, dst_port), group_flows in connection_groups.items():
            # Calculate total duration and bytes for this connection
            total_duration = sum(flow.duration for flow in group_flows)
            total_bytes = sum(flow.bytes_sent for flow in group_flows)
            total_packets = sum(flow.packets_sent for flow in group_flows)
            
            if total_duration < self.LONG_CONN_MIN_DURATION:
                continue
            
            # Find start and end times
            start_time = min(flow.timestamp for flow in group_flows)
            end_time = max(flow.timestamp for flow in group_flows)
            
            # Calculate transfer rate
            avg_bytes_per_second = total_bytes / total_duration if total_duration > 0 else 0
            
            # Calculate confidence
            confidence = self._calculate_long_connection_confidence(total_duration, total_bytes, dst_port)
            
            # Determine severity
            severity = self._determine_long_connection_severity(confidence, total_duration)
            
            if confidence > 0.4:
                long_conn = LongConnection(
                    source_ip=src_ip,
                    dest_ip=dst_ip,
                    dest_port=dst_port,
                    total_duration=total_duration,
                    total_bytes=total_bytes,
                    total_packets=total_packets,
                    start_time=start_time,
                    end_time=end_time,
                    avg_bytes_per_second=avg_bytes_per_second,
                    confidence=confidence,
                    severity=severity
                )
                long_connections.append(long_conn)
        
        return sorted(long_connections, key=lambda x: x.confidence, reverse=True)
    
    def _detect_data_exfiltration(self, flows: List[FlowRecord]) -> List[DataExfiltrationEvent]:
        """Detect potential data exfiltration patterns"""
        # Group outbound flows by source IP
        outbound_flows = defaultdict(lambda: defaultdict(list))
        inbound_flows = defaultdict(lambda: defaultdict(list))
        
        for flow in flows:
            if flow.is_internal_src and not flow.is_internal_dst:
                # Outbound traffic
                outbound_flows[flow.source_ip][flow.dest_ip].append(flow)
            elif not flow.is_internal_src and flow.is_internal_dst:
                # Inbound traffic  
                inbound_flows[flow.dest_ip][flow.source_ip].append(flow)
        
        exfiltration_events = []
        
        for src_ip, destinations in outbound_flows.items():
            total_outbound_bytes = 0
            total_inbound_bytes = 0
            connection_count = 0
            unique_destinations = len(destinations)
            
            earliest_time = None
            latest_time = None
            
            for dst_ip, flows_to_dst in destinations.items():
                # Calculate outbound bytes to this destination
                dst_outbound = sum(flow.bytes_sent for flow in flows_to_dst)
                total_outbound_bytes += dst_outbound
                connection_count += len(flows_to_dst)
                
                # Get corresponding inbound bytes
                dst_inbound = sum(flow.bytes_sent for flow in inbound_flows.get(src_ip, {}).get(dst_ip, []))
                total_inbound_bytes += dst_inbound
                
                # Track time window
                for flow in flows_to_dst:
                    if earliest_time is None or flow.timestamp < earliest_time:
                        earliest_time = flow.timestamp
                    if latest_time is None or flow.timestamp > latest_time:
                        latest_time = flow.timestamp
            
            if total_outbound_bytes < self.EXFIL_MIN_BYTES:
                continue
            
            # Calculate exfiltration ratio
            exfiltration_ratio = total_outbound_bytes / max(total_inbound_bytes, 1)
            
            if exfiltration_ratio < self.EXFIL_MIN_RATIO:
                continue
            
            # Calculate time window and transfer rate
            time_window = (latest_time - earliest_time).total_seconds() if earliest_time and latest_time else 0
            bytes_per_hour = total_outbound_bytes / max(time_window / 3600, 0.1)
            
            # Calculate confidence
            confidence = self._calculate_exfiltration_confidence(
                total_outbound_bytes, exfiltration_ratio, unique_destinations, bytes_per_hour
            )
            
            # Determine severity
            severity = self._determine_exfiltration_severity(confidence, total_outbound_bytes)
            
            if confidence > 0.5:
                # Find the primary destination (highest bytes transferred)
                primary_dest = max(destinations.keys(), 
                                 key=lambda dst: sum(flow.bytes_sent for flow in destinations[dst]))
                primary_port = max(destinations[primary_dest], key=lambda flow: flow.bytes_sent).dest_port
                
                exfil_event = DataExfiltrationEvent(
                    source_ip=src_ip,
                    dest_ip=primary_dest,
                    dest_port=primary_port,
                    total_bytes_out=total_outbound_bytes,
                    total_bytes_in=total_inbound_bytes,
                    exfiltration_ratio=exfiltration_ratio,
                    connection_count=connection_count,
                    unique_dest_count=unique_destinations,
                    time_window=time_window,
                    bytes_per_hour=bytes_per_hour,
                    confidence=confidence,
                    severity=severity
                )
                exfiltration_events.append(exfil_event)
        
        return sorted(exfiltration_events, key=lambda x: x.confidence, reverse=True)
    
    def _detect_port_scanning(self, flows: List[FlowRecord]) -> List[Dict]:
        """Detect port scanning activities"""
        # Group by source IP and destination IP
        scan_candidates = defaultdict(lambda: defaultdict(set))
        
        for flow in flows:
            if flow.action.upper() in ['REJECT', 'DROP']:  # Focus on rejected connections
                scan_candidates[flow.source_ip][flow.dest_ip].add(flow.dest_port)
        
        port_scans = []
        
        for src_ip, targets in scan_candidates.items():
            for dst_ip, ports in targets.items():
                if len(ports) >= 10:  # Threshold for port scan detection
                    # Calculate suspicious port ratio
                    suspicious_ports = ports.intersection(self.SUSPICIOUS_PORTS)
                    suspicious_ratio = len(suspicious_ports) / len(ports)
                    
                    confidence = min(0.9, len(ports) / 100 + suspicious_ratio * 0.5)
                    severity = 'high' if confidence > 0.7 else 'medium' if confidence > 0.5 else 'low'
                    
                    scan_event = {
                        'type': 'port_scan',
                        'source_ip': src_ip,
                        'dest_ip': dst_ip,
                        'ports_scanned': len(ports),
                        'suspicious_ports': len(suspicious_ports),
                        'confidence': confidence,
                        'severity': severity,
                        'details': {
                            'ports': sorted(list(ports)),
                            'suspicious_ratio': suspicious_ratio
                        }
                    }
                    port_scans.append(scan_event)
        
        return sorted(port_scans, key=lambda x: x['confidence'], reverse=True)
    
    def _detect_suspicious_dns(self, flows: List[FlowRecord]) -> List[Dict]:
        """Detect suspicious DNS activities"""
        dns_flows = [flow for flow in flows if flow.dest_port == 53]
        
        # Group by source IP
        dns_by_source = defaultdict(list)
        for flow in dns_flows:
            dns_by_source[flow.source_ip].append(flow)
        
        suspicious_dns = []
        
        for src_ip, flows_list in dns_by_source.items():
            if len(flows_list) < 50:  # Minimum threshold for analysis
                continue
            
            # Calculate DNS query rate
            time_span = (max(flow.timestamp for flow in flows_list) - 
                        min(flow.timestamp for flow in flows_list)).total_seconds()
            query_rate = len(flows_list) / max(time_span / 3600, 0.1)  # queries per hour
            
            # Check for high query volumes (potential DNS tunneling)
            if query_rate > 1000:  # More than 1000 queries per hour
                confidence = min(0.9, query_rate / 5000)
                severity = 'high' if confidence > 0.7 else 'medium'
                
                dns_event = {
                    'type': 'dns_tunneling',
                    'source_ip': src_ip,
                    'query_count': len(flows_list),
                    'query_rate_per_hour': query_rate,
                    'time_span_hours': time_span / 3600,
                    'confidence': confidence,
                    'severity': severity,
                    'details': {
                        'avg_bytes_per_query': sum(flow.bytes_sent for flow in flows_list) / len(flows_list)
                    }
                }
                suspicious_dns.append(dns_event)
        
        return sorted(suspicious_dns, key=lambda x: x['confidence'], reverse=True)
    
    def _calculate_beacon_confidence(self, connection_count: int, consistency_score: float, 
                                   avg_interval: float, dest_port: int) -> float:
        """Calculate confidence score for beacon detection"""
        # Base confidence from connection count
        count_score = min(1.0, connection_count / 100)
        
        # Consistency score (higher is better)
        consistency_weight = 0.4
        
        # Interval score (prefer intervals between 1 minute and 1 hour)
        interval_score = 0.0
        if 60 <= avg_interval <= 3600:
            interval_score = 1.0
        elif 30 <= avg_interval < 60 or 3600 < avg_interval <= 7200:
            interval_score = 0.7
        elif avg_interval < 30:
            interval_score = 0.3
        else:
            interval_score = 0.1
        
        # Port score (suspicious ports get higher scores)
        port_score = 0.8 if dest_port in self.SUSPICIOUS_PORTS else 0.3
        
        # Weighted combination
        confidence = (count_score * 0.3 + 
                     consistency_score * consistency_weight + 
                     interval_score * 0.2 + 
                     port_score * 0.1)
        
        return min(1.0, confidence)
    
    def _determine_beacon_severity(self, confidence: float, connection_count: int, dest_port: int) -> str:
        """Determine severity level for beacon"""
        if confidence > 0.8 and connection_count > 50:
            return 'critical'
        elif confidence > 0.6 and (connection_count > 25 or dest_port in self.SUSPICIOUS_PORTS):
            return 'high'
        elif confidence > 0.4:
            return 'medium'
        else:
            return 'low'
    
    def _calculate_long_connection_confidence(self, duration: float, bytes_transferred: int, dest_port: int) -> float:
        """Calculate confidence for long connection detection"""
        # Duration score (longer is more suspicious)
        duration_hours = duration / 3600
        duration_score = min(1.0, duration_hours / 24)  # Max score at 24 hours
        
        # Bytes score (more data is more suspicious)
        bytes_score = min(1.0, bytes_transferred / (1024 * 1024 * 1024))  # Max score at 1GB
        
        # Port score
        port_score = 0.8 if dest_port in self.SUSPICIOUS_PORTS else 0.4
        
        confidence = duration_score * 0.5 + bytes_score * 0.3 + port_score * 0.2
        return min(1.0, confidence)
    
    def _determine_long_connection_severity(self, confidence: float, duration: float) -> str:
        """Determine severity for long connections"""
        duration_hours = duration / 3600
        if confidence > 0.8 and duration_hours > 12:
            return 'critical'
        elif confidence > 0.6 and duration_hours > 6:
            return 'high'
        elif confidence > 0.4:
            return 'medium'
        else:
            return 'low'
    
    def _calculate_exfiltration_confidence(self, bytes_out: int, ratio: float, 
                                         dest_count: int, bytes_per_hour: float) -> float:
        """Calculate confidence for data exfiltration"""
        # Bytes score
        bytes_score = min(1.0, bytes_out / (1024 * 1024 * 1024))  # Max at 1GB
        
        # Ratio score
        ratio_score = min(1.0, ratio / 50)  # Max at 50:1 ratio
        
        # Destination diversity score (more destinations = more suspicious)
        dest_score = min(1.0, dest_count / 10)  # Max at 10 destinations
        
        # Transfer rate score
        rate_score = min(1.0, bytes_per_hour / (100 * 1024 * 1024))  # Max at 100MB/hour
        
        confidence = bytes_score * 0.3 + ratio_score * 0.3 + dest_score * 0.2 + rate_score * 0.2
        return min(1.0, confidence)
    
    def _determine_exfiltration_severity(self, confidence: float, bytes_out: int) -> str:
        """Determine severity for data exfiltration"""
        bytes_gb = bytes_out / (1024 * 1024 * 1024)
        if confidence > 0.8 and bytes_gb > 5:
            return 'critical'
        elif confidence > 0.6 and bytes_gb > 1:
            return 'high'
        elif confidence > 0.4:
            return 'medium'
        else:
            return 'low'
    
    def _calculate_threat_stats(self, beacons: List, long_connections: List, 
                              exfiltration: List, port_scans: List, dns_events: List) -> Dict:
        """Calculate comprehensive threat statistics"""
        all_threats = []
        
        # Add all threat types
        for beacon in beacons:
            all_threats.append(('beacon', beacon.severity))
        for conn in long_connections:
            all_threats.append(('long_connection', conn.severity))
        for exfil in exfiltration:
            all_threats.append(('data_exfiltration', exfil.severity))
        for scan in port_scans:
            all_threats.append(('port_scan', scan['severity']))
        for dns in dns_events:
            all_threats.append(('dns_tunneling', dns['severity']))
        
        # Count by severity
        severity_counts = Counter([threat[1] for threat in all_threats])
        
        return {
            "total_threats": len(all_threats),
            "critical_threats": severity_counts.get('critical', 0),
            "high_threats": severity_counts.get('high', 0),
            "medium_threats": severity_counts.get('medium', 0),
            "low_threats": severity_counts.get('low', 0),
            "beacons_detected": len(beacons),
            "long_connections": len(long_connections),
            "dns_tunneling": len(dns_events),
            "data_exfiltration": len(exfiltration),
            "port_scans": len(port_scans),
            "analysis_time_range": f"Last {1440} minutes"
        }
    
    def _compile_threat_summary(self, beacons: List, long_connections: List, 
                               exfiltration: List, port_scans: List, dns_events: List) -> List[Dict]:
        """Compile all threats into a unified summary format"""
        threats = []
        
        # Add beacons
        for beacon in beacons:
            threats.append({
                "id": f"beacon_{beacon.source_ip}_{beacon.dest_ip}_{beacon.dest_port}",
                "type": "beacon",
                "severity": beacon.severity,
                "score": int(beacon.confidence * 100),
                "source_ip": beacon.source_ip,
                "destination_ip": beacon.dest_ip,
                "destination_port": beacon.dest_port,
                "first_seen": beacon.first_seen.isoformat(),
                "last_seen": beacon.last_seen.isoformat(),
                "connection_count": beacon.connection_count,
                "bytes_transferred": beacon.total_bytes,
                "duration_hours": beacon.duration_hours,
                "confidence": int(beacon.confidence * 100),
                "details": {
                    "avg_interval_seconds": beacon.avg_interval,
                    "consistency_score": beacon.consistency_score,
                    "avg_bytes_per_connection": beacon.avg_bytes_per_connection
                }
            })
        
        # Add long connections
        for conn in long_connections:
            threats.append({
                "id": f"longconn_{conn.source_ip}_{conn.dest_ip}_{conn.dest_port}",
                "type": "long_connection",
                "severity": conn.severity,
                "score": int(conn.confidence * 100),
                "source_ip": conn.source_ip,
                "destination_ip": conn.dest_ip,
                "destination_port": conn.dest_port,
                "first_seen": conn.start_time.isoformat(),
                "last_seen": conn.end_time.isoformat(),
                "connection_count": 1,
                "bytes_transferred": conn.total_bytes,
                "duration_hours": conn.total_duration / 3600,
                "confidence": int(conn.confidence * 100),
                "details": {
                    "total_duration_seconds": conn.total_duration,
                    "total_packets": conn.total_packets,
                    "avg_bytes_per_second": conn.avg_bytes_per_second
                }
            })
        
        # Add data exfiltration
        for exfil in exfiltration:
            threats.append({
                "id": f"exfil_{exfil.source_ip}_{exfil.dest_ip}",
                "type": "data_exfiltration", 
                "severity": exfil.severity,
                "score": int(exfil.confidence * 100),
                "source_ip": exfil.source_ip,
                "destination_ip": exfil.dest_ip,
                "destination_port": exfil.dest_port,
                "first_seen": datetime.now(timezone.utc).isoformat(),  # Would need to track actual times
                "last_seen": datetime.now(timezone.utc).isoformat(),
                "connection_count": exfil.connection_count,
                "bytes_transferred": exfil.total_bytes_out,
                "duration_hours": exfil.time_window / 3600,
                "confidence": int(exfil.confidence * 100),
                "details": {
                    "bytes_in": exfil.total_bytes_in,
                    "exfiltration_ratio": exfil.exfiltration_ratio,
                    "unique_destinations": exfil.unique_dest_count,
                    "bytes_per_hour": exfil.bytes_per_hour
                }
            })
        
        # Add port scans and DNS events similarly...
        for scan in port_scans:
            threats.append({
                "id": f"portscan_{scan['source_ip']}_{scan['dest_ip']}",
                "type": "port_scan",
                "severity": scan['severity'],
                "score": int(scan['confidence'] * 100),
                "source_ip": scan['source_ip'],
                "destination_ip": scan['dest_ip'],
                "destination_port": 0,
                "first_seen": datetime.now(timezone.utc).isoformat(),
                "last_seen": datetime.now(timezone.utc).isoformat(),
                "connection_count": scan['ports_scanned'],
                "bytes_transferred": 0,
                "duration_hours": 0,
                "confidence": int(scan['confidence'] * 100),
                "details": scan['details']
            })
        
        for dns in dns_events:
            threats.append({
                "id": f"dns_{dns['source_ip']}",
                "type": "dns_tunneling",
                "severity": dns['severity'],
                "score": int(dns['confidence'] * 100),
                "source_ip": dns['source_ip'],
                "destination_ip": "DNS_SERVER",
                "destination_port": 53,
                "first_seen": datetime.now(timezone.utc).isoformat(),
                "last_seen": datetime.now(timezone.utc).isoformat(),
                "connection_count": dns['query_count'],
                "bytes_transferred": 0,
                "duration_hours": dns['time_span_hours'],
                "confidence": int(dns['confidence'] * 100),
                "details": dns['details']
            })
        
        # Sort by score (highest confidence first)
        threats.sort(key=lambda x: x['score'], reverse=True)
        return threats

def main():
    """Main entry point for VCN analyzer"""
    parser = argparse.ArgumentParser(description='VCN Flow Log Analyzer with RITA-style threat detection')
    parser.add_argument('action', choices=['analyze'], help='Action to perform')
    parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    
    args = parser.parse_args()
    
    try:
        analyzer = VCNFlowAnalyzer()
        
        if args.action == 'analyze':
            result = analyzer.analyze_vcn_flows(args.time_period)
        else:
            result = {"error": "Invalid action", "success": False}
            
        print(json.dumps(result, indent=2, default=str))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()