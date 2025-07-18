#!/usr/bin/env python3
"""
Mock graph data generator for testing the graph visualization
"""

import json
import sys
from datetime import datetime
from graph_analyzer import SecurityNode, SecurityRelationship, NetworkXGraphAnalyzer

def generate_mock_graph_data():
    """Generate mock security graph data for testing"""
    
    # Create mock nodes
    nodes = [
        # IP addresses
        SecurityNode(
            id="ip:10.0.1.100",
            type="ip",
            properties={"address": "10.0.1.100", "is_internal": True},
            risk_score=0.3,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        SecurityNode(
            id="ip:10.0.1.101",
            type="ip", 
            properties={"address": "10.0.1.101", "is_internal": True},
            risk_score=0.8,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        SecurityNode(
            id="ip:192.168.1.50",
            type="ip",
            properties={"address": "192.168.1.50", "is_internal": True},
            risk_score=0.2,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        SecurityNode(
            id="ip:8.8.8.8",
            type="ip",
            properties={"address": "8.8.8.8", "is_internal": False},
            risk_score=0.1,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        SecurityNode(
            id="ip:185.199.108.153",
            type="ip",
            properties={"address": "185.199.108.153", "is_internal": False},
            risk_score=0.7,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        
        # Users
        SecurityNode(
            id="user:admin",
            type="user",
            properties={"name": "admin", "is_system_account": True},
            risk_score=0.9,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        SecurityNode(
            id="user:john.doe",
            type="user",
            properties={"name": "john.doe", "is_system_account": False},
            risk_score=0.2,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        SecurityNode(
            id="user:system",
            type="user",
            properties={"name": "system", "is_system_account": True},
            risk_score=0.8,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        
        # Processes
        SecurityNode(
            id="process:powershell.exe",
            type="process",
            properties={"name": "powershell.exe", "is_suspicious": True},
            risk_score=0.8,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        SecurityNode(
            id="process:chrome.exe",
            type="process",
            properties={"name": "chrome.exe", "is_suspicious": False},
            risk_score=0.1,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        SecurityNode(
            id="process:cmd.exe",
            type="process",
            properties={"name": "cmd.exe", "is_suspicious": True},
            risk_score=0.7,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        
        # Ports
        SecurityNode(
            id="port:80",
            type="port",
            properties={"number": 80, "is_standard": True, "service": "HTTP"},
            risk_score=0.1,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        SecurityNode(
            id="port:443",
            type="port",
            properties={"number": 443, "is_standard": True, "service": "HTTPS"},
            risk_score=0.1,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        SecurityNode(
            id="port:8080",
            type="port",
            properties={"number": 8080, "is_standard": False, "service": "HTTP-Alt"},
            risk_score=0.5,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        ),
        SecurityNode(
            id="port:4444",
            type="port",
            properties={"number": 4444, "is_standard": False, "service": "Unknown"},
            risk_score=0.9,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        )
    ]
    
    # Create mock relationships
    relationships = [
        # IP connections
        SecurityRelationship(
            source_id="ip:10.0.1.100",
            target_id="ip:8.8.8.8",
            relationship_type="CONNECTS_TO",
            properties={"action": "allow", "bytes": 2048},
            weight=2.0,
            timestamp=datetime.utcnow()
        ),
        SecurityRelationship(
            source_id="ip:10.0.1.101",
            target_id="ip:185.199.108.153",
            relationship_type="CONNECTS_TO",
            properties={"action": "allow", "bytes": 10240},
            weight=10.0,
            timestamp=datetime.utcnow()
        ),
        SecurityRelationship(
            source_id="ip:192.168.1.50",
            target_id="ip:10.0.1.100",
            relationship_type="CONNECTS_TO",
            properties={"action": "allow", "bytes": 1024},
            weight=1.0,
            timestamp=datetime.utcnow()
        ),
        
        # User to IP relationships
        SecurityRelationship(
            source_id="user:admin",
            target_id="ip:10.0.1.101",
            relationship_type="ACCESSES_FROM",
            properties={"event_name": "user_login"},
            weight=1.0,
            timestamp=datetime.utcnow()
        ),
        SecurityRelationship(
            source_id="user:john.doe",
            target_id="ip:192.168.1.50",
            relationship_type="ACCESSES_FROM",
            properties={"event_name": "user_login"},
            weight=1.0,
            timestamp=datetime.utcnow()
        ),
        SecurityRelationship(
            source_id="user:system",
            target_id="ip:10.0.1.100",
            relationship_type="ACCESSES_FROM",
            properties={"event_name": "system_process"},
            weight=1.0,
            timestamp=datetime.utcnow()
        ),
        
        # Process to User relationships
        SecurityRelationship(
            source_id="process:powershell.exe",
            target_id="user:admin",
            relationship_type="RUNS_AS",
            properties={},
            weight=1.0,
            timestamp=datetime.utcnow()
        ),
        SecurityRelationship(
            source_id="process:chrome.exe",
            target_id="user:john.doe",
            relationship_type="RUNS_AS",
            properties={},
            weight=1.0,
            timestamp=datetime.utcnow()
        ),
        SecurityRelationship(
            source_id="process:cmd.exe",
            target_id="user:system",
            relationship_type="RUNS_AS",
            properties={},
            weight=1.0,
            timestamp=datetime.utcnow()
        ),
        
        # High-risk connections for suspicious patterns
        SecurityRelationship(
            source_id="ip:10.0.1.101",
            target_id="port:4444",
            relationship_type="CONNECTS_TO",
            properties={"action": "allow", "bytes": 50000},
            weight=50.0,
            timestamp=datetime.utcnow()
        )
    ]
    
    # Create NetworkX analyzer and add the data
    analyzer = NetworkXGraphAnalyzer()
    analyzer.add_security_data(nodes, relationships)
    
    # Calculate metrics
    centrality_metrics = analyzer.calculate_centrality_metrics()
    communities = analyzer.detect_communities()
    network_metrics = analyzer.calculate_network_metrics()
    viz_data = analyzer.generate_plotly_visualization()
    
    # Create mock suspicious patterns
    suspicious_patterns = [
        {
            "type": "high_risk_hub",
            "node_id": "ip:10.0.1.101",
            "node_type": "ip",
            "connections": 3,
            "risk_score": 0.8
        },
        {
            "type": "unusual_external_communication",
            "source": "ip:10.0.1.101",
            "target": "ip:185.199.108.153",
            "weight": 10.0
        }
    ]
    
    return {
        "success": True,
        "graph_data": viz_data,
        "centrality_metrics": centrality_metrics,
        "communities": communities,
        "network_metrics": network_metrics,
        "suspicious_patterns": suspicious_patterns,
        "node_count": len(nodes),
        "relationship_count": len(relationships),
        "analysis_timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    result = generate_mock_graph_data()
    print(json.dumps(result, indent=2, default=str))