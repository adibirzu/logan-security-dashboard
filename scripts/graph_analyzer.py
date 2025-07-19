#!/usr/bin/env python3
"""
Graph-based Security Analysis with Neo4j and NetworkX
Dynamic visualization of security relationships and threat patterns
"""

import networkx as nx
from datetime import datetime, timedelta
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional, Set, Any
import ipaddress

# Try to import Neo4j (optional dependency)
try:
    from neo4j import GraphDatabase
except ImportError:
    pass

from logan_client import LoganClient
from field_mapping import LogFieldMapper

@dataclass
class SecurityNode:
    """Represents a node in the security graph"""
    id: str
    type: str  # 'ip', 'host', 'process', 'user', 'port', 'service'
    properties: Dict[str, Any]
    risk_score: float = 0.0
    last_seen: Optional[datetime] = None
    first_seen: Optional[datetime] = None

@dataclass
class SecurityRelationship:
    """Represents a relationship between security nodes"""
    source_id: str
    target_id: str
    relationship_type: str  # 'CONNECTS_TO', 'RUNS_ON', 'OWNS', 'COMMUNICATES_WITH'
    properties: Dict[str, Any]
    weight: float = 1.0
    timestamp: Optional[datetime] = None

class Neo4jGraphStore:
    """Neo4j integration for storing security relationships"""
    
    def __init__(self, uri: str = "bolt://localhost:7687", user: str = "neo4j", password: str = None):
        # Get password from environment variable if not provided
        if password is None:
            password = os.getenv("NEO4J_PASSWORD", "password")
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self._initialize_constraints()
    
    def close(self):
        if hasattr(self, 'driver'):
            self.driver.close()
    
    def _initialize_constraints(self):
        """Create indexes and constraints for better performance"""
        with self.driver.session() as session:
            # Create unique constraints
            constraints = [
                "CREATE CONSTRAINT IF NOT EXISTS FOR (ip:IP) REQUIRE ip.address IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (host:Host) REQUIRE host.name IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (process:Process) REQUIRE process.pid IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (user:User) REQUIRE user.name IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (port:Port) REQUIRE port.number IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (service:Service) REQUIRE service.name IS UNIQUE"
            ]
            
            for constraint in constraints:
                try:
                    session.run(constraint)
                except Exception as e:
                    print(f"Constraint creation warning: {e}", file=sys.stderr)
    
    def create_node(self, node: SecurityNode):
        """Create or update a security node"""
        with self.driver.session() as session:
            query = f"""
            MERGE (n:{node.type.title()} {{id: $id}})
            SET n += $properties
            SET n.risk_score = $risk_score
            SET n.last_seen = $last_seen
            SET n.first_seen = COALESCE(n.first_seen, $first_seen)
            RETURN n
            """
            
            session.run(query, 
                       id=node.id,
                       properties=node.properties,
                       risk_score=node.risk_score,
                       last_seen=node.last_seen.isoformat() if node.last_seen else None,
                       first_seen=node.first_seen.isoformat() if node.first_seen else None)
    
    def create_relationship(self, rel: SecurityRelationship):
        """Create or update a security relationship"""
        with self.driver.session() as session:
            query = f"""
            MATCH (a {{id: $source_id}})
            MATCH (b {{id: $target_id}})
            MERGE (a)-[r:{rel.relationship_type}]->(b)
            SET r += $properties
            SET r.weight = $weight
            SET r.timestamp = $timestamp
            RETURN r
            """
            
            session.run(query,
                       source_id=rel.source_id,
                       target_id=rel.target_id,
                       properties=rel.properties,
                       weight=rel.weight,
                       timestamp=rel.timestamp.isoformat() if rel.timestamp else None)
    
    def get_subgraph(self, center_node_id: str, depth: int = 2) -> Dict:
        """Get a subgraph around a specific node"""
        with self.driver.session() as session:
            query = f"""
            MATCH path = (center {{id: $center_id}})-[*1..{depth}]-(connected)
            RETURN path
            """
            
            result = session.run(query, center_id=center_node_id)
            
            nodes = {}
            relationships = []
            
            for record in result:
                path = record["path"]
                
                # Extract nodes
                for node in path.nodes:
                    node_id = node["id"]
                    if node_id not in nodes:
                        nodes[node_id] = {
                            "id": node_id,
                            "labels": list(node.labels),
                            "properties": dict(node)
                        }
                
                # Extract relationships
                for rel in path.relationships:
                    relationships.append({
                        "source": rel.start_node["id"],
                        "target": rel.end_node["id"],
                        "type": rel.type,
                        "properties": dict(rel)
                    })
            
            return {
                "nodes": list(nodes.values()),
                "relationships": relationships
            }
    
    def find_suspicious_patterns(self) -> List[Dict]:
        """Find suspicious patterns in the graph"""
        patterns = []
        
        with self.driver.session() as session:
            # Pattern 1: High-risk nodes with many connections
            query1 = """
            MATCH (n)-[r]-(connected)
            WHERE n.risk_score > 0.7
            WITH n, count(r) as connections
            WHERE connections > 10
            RETURN n.id as node_id, n.type as node_type, connections, n.risk_score as risk_score
            ORDER BY risk_score DESC, connections DESC
            LIMIT 10
            """
            
            result1 = session.run(query1)
            for record in result1:
                patterns.append({
                    "type": "high_risk_hub",
                    "node_id": record["node_id"],
                    "node_type": record["node_type"],
                    "connections": record["connections"],
                    "risk_score": record["risk_score"]
                })
            
            # Pattern 2: Unusual communication patterns
            query2 = """
            MATCH (ip1:IP)-[r:CONNECTS_TO]->(ip2:IP)
            WHERE r.weight > 100 AND ip1.is_internal = true AND ip2.is_internal = false
            RETURN ip1.address as source, ip2.address as target, r.weight as connection_weight
            ORDER BY connection_weight DESC
            LIMIT 10
            """
            
            result2 = session.run(query2)
            for record in result2:
                patterns.append({
                    "type": "unusual_external_communication",
                    "source": record["source"],
                    "target": record["target"],
                    "weight": record["connection_weight"]
                })
        
        return patterns

class NetworkXGraphAnalyzer:
    """NetworkX-based graph analysis for security data"""
    
    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.node_positions = {}
        
    def add_security_data(self, nodes: List[SecurityNode], relationships: List[SecurityRelationship]):
        """Add security data to the NetworkX graph"""
        # Add nodes
        for node in nodes:
            self.graph.add_node(
                node.id,
                node_type=node.type,
                risk_score=node.risk_score,
                **node.properties
            )
        
        # Add relationships
        for rel in relationships:
            self.graph.add_edge(
                rel.source_id,
                rel.target_id,
                relationship_type=rel.relationship_type,
                weight=rel.weight,
                **rel.properties
            )
    
    def calculate_centrality_metrics(self) -> Dict[str, Dict[str, float]]:
        """Calculate various centrality metrics"""
        metrics = {}
        
        # Convert to simple graph for some algorithms
        simple_graph = nx.Graph(self.graph)
        
        try:
            metrics['betweenness'] = nx.betweenness_centrality(simple_graph)
            metrics['closeness'] = nx.closeness_centrality(simple_graph)
            metrics['degree'] = nx.degree_centrality(simple_graph)
            metrics['eigenvector'] = nx.eigenvector_centrality(simple_graph, max_iter=1000)
            metrics['pagerank'] = nx.pagerank(self.graph)
        except Exception as e:
            print(f"Centrality calculation warning: {e}", file=sys.stderr)
            # Return empty metrics if calculation fails
            return {metric: {} for metric in ['betweenness', 'closeness', 'degree', 'eigenvector', 'pagerank']}
        
        return metrics
    
    def detect_communities(self) -> Dict[str, int]:
        """Detect communities in the network"""
        try:
            import networkx.algorithms.community as nx_comm
            simple_graph = nx.Graph(self.graph)
            communities = nx_comm.greedy_modularity_communities(simple_graph)
            
            node_communities = {}
            for i, community in enumerate(communities):
                for node in community:
                    node_communities[node] = i
            
            return node_communities
        except Exception as e:
            print(f"Community detection warning: {e}", file=sys.stderr)
            return {}
    
    def find_shortest_paths(self, source: str, target: str) -> List[List[str]]:
        """Find shortest paths between two nodes"""
        try:
            paths = list(nx.all_shortest_paths(self.graph, source, target))
            return paths
        except nx.NetworkXNoPath:
            return []
        except Exception as e:
            print(f"Path finding warning: {e}", file=sys.stderr)
            return []
    
    def calculate_network_metrics(self) -> Dict[str, Any]:
        """Calculate overall network metrics"""
        metrics = {}
        
        try:
            simple_graph = nx.Graph(self.graph)
            
            metrics['nodes'] = self.graph.number_of_nodes()
            metrics['edges'] = self.graph.number_of_edges()
            metrics['density'] = nx.density(simple_graph)
            
            if nx.is_connected(simple_graph):
                metrics['diameter'] = nx.diameter(simple_graph)
                metrics['avg_clustering'] = nx.average_clustering(simple_graph)
            else:
                metrics['diameter'] = 'N/A (disconnected)'
                metrics['avg_clustering'] = nx.average_clustering(simple_graph)
            
            # Component analysis
            components = list(nx.connected_components(simple_graph))
            metrics['connected_components'] = len(components)
            metrics['largest_component_size'] = len(max(components, key=len)) if components else 0
            
        except Exception as e:
            print(f"Network metrics calculation warning: {e}", file=sys.stderr)
            metrics = {'error': str(e)}
        
        return metrics
    
    def generate_plotly_visualization(self, layout_algorithm: str = "spring") -> Dict:
        """Generate Plotly visualization data"""
        if self.graph.number_of_nodes() == 0:
            return {"nodes": [], "edges": [], "layout": {}}
        
        # Calculate layout
        try:
            if layout_algorithm == "spring":
                pos = nx.spring_layout(self.graph, k=1, iterations=50)
            elif layout_algorithm == "circular":
                pos = nx.circular_layout(self.graph)
            elif layout_algorithm == "kamada_kawai":
                pos = nx.kamada_kawai_layout(self.graph)
            else:
                pos = nx.spring_layout(self.graph)
        except Exception as e:
            print(f"Layout calculation warning: {e}", file=sys.stderr)
            # Fallback to random positions
            pos = {node: (i % 10, i // 10) for i, node in enumerate(self.graph.nodes())}
        
        # Prepare node data
        node_trace = []
        for node, (x, y) in pos.items():
            node_data = self.graph.nodes[node]
            node_trace.append({
                'x': x,
                'y': y,
                'id': node,
                'type': node_data.get('node_type', 'unknown'),
                'risk_score': node_data.get('risk_score', 0),
                'text': f"{node}<br>Type: {node_data.get('node_type', 'unknown')}<br>Risk: {node_data.get('risk_score', 0):.2f}",
                'properties': {k: v for k, v in node_data.items() if k not in ['node_type', 'risk_score']}
            })
        
        # Prepare edge data
        edge_trace = []
        for source, target, data in self.graph.edges(data=True):
            x0, y0 = pos[source]
            x1, y1 = pos[target]
            edge_trace.append({
                'x0': x0, 'y0': y0,
                'x1': x1, 'y1': y1,
                'source': source,
                'target': target,
                'weight': data.get('weight', 1),
                'type': data.get('relationship_type', 'unknown'),
                'properties': {k: v for k, v in data.items() if k not in ['weight', 'relationship_type']}
            })
        
        return {
            "nodes": node_trace,
            "edges": edge_trace,
            "layout": dict(pos)
        }

class SecurityGraphAnalyzer:
    """Main security graph analyzer combining Neo4j and NetworkX"""
    
    def __init__(self, use_neo4j: bool = False, neo4j_config: Optional[Dict] = None):
        self.client = LoganClient()
        self.networkx_analyzer = NetworkXGraphAnalyzer()
        self.field_mapper = LogFieldMapper()
        
        self.use_neo4j = use_neo4j and NEO4J_AVAILABLE
        self.neo4j_store = None
        
        if self.use_neo4j and neo4j_config:
            try:
                self.neo4j_store = Neo4jGraphStore(**neo4j_config)
                print("Neo4j connection established", file=sys.stderr)
            except Exception as e:
                print(f"Neo4j connection failed: {e}", file=sys.stderr)
                self.use_neo4j = False
    
    def analyze_security_relationships(self, time_period_minutes: int = 1440) -> Dict:
        """Main analysis function for security relationships"""
        try:
            # Get security data from OCI
            security_data = self._get_security_data(time_period_minutes)
            
            if not security_data:
                return {"success": False, "error": "No security data found"}
            
            # Parse and create graph nodes and relationships
            nodes, relationships = self._create_graph_elements(security_data)
            
            # Add to NetworkX graph
            self.networkx_analyzer.add_security_data(nodes, relationships)
            
            # Store in Neo4j if available
            if self.use_neo4j and self.neo4j_store:
                self._store_in_neo4j(nodes, relationships)
            
            # Perform analysis
            centrality_metrics = self.networkx_analyzer.calculate_centrality_metrics()
            communities = self.networkx_analyzer.detect_communities()
            network_metrics = self.networkx_analyzer.calculate_network_metrics()
            
            # Generate visualization data
            viz_data = self.networkx_analyzer.generate_plotly_visualization()
            
            # Find suspicious patterns
            suspicious_patterns = []
            if self.use_neo4j and self.neo4j_store:
                suspicious_patterns = self.neo4j_store.find_suspicious_patterns()
            
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
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _get_security_data(self, time_period_minutes: int) -> List[Dict]:
        """Get comprehensive security data from multiple OCI log sources"""
        
        log_sources = [
            {
                'name': 'VCN Flow Logs',
                'query': """
                'Log Source' = 'OCI VCN Flow Unified Schema Logs'
                | where 'Source IP' != \"\" and 'Destination IP' != \"\"
                | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action
                | sort -Time
                | head 2000
                """,
                'type': 'vcn_flow'
            }
        ]
        
        all_data = []
        for source in log_sources:
            try:
                print(f"Querying {source['name']}...", file=sys.stderr)
                result = self.client.execute_query(source['query'], time_period_minutes, 2000)
                
                if result.get("success"):
                    records = result.get("results", [])
                    print(f"Retrieved {len(records)} records from {source['name']}", file=sys.stderr)
                    
                    # Add log type metadata to each record
                    for record in records:
                        record['_log_type'] = source['type']
                        record['_log_source'] = source['name']
                    
                    all_data.extend(records)
                else:
                    print(f"Failed to query {source['name']}: {result.get('error', 'Unknown error')}", file=sys.stderr)
                    
            except Exception as e:
                print(f"Error querying {source['name']}: {e}", file=sys.stderr)
                continue
        
        print(f"Total security records retrieved: {len(all_data)}", file=sys.stderr)
        return all_data
    
    def _create_graph_elements(self, security_data: List[Dict]) -> Tuple[List[SecurityNode], List[SecurityRelationship]]:
        """Create graph nodes and relationships from security data using field mapping"""
        all_nodes = {}
        all_relationships = []
        
        print(f"Processing {len(security_data)} security records...", file=sys.stderr)
        
        for i, record in enumerate(security_data):
            try:
                # Determine log type
                log_type = record.get('_log_type')
                if not log_type:
                    log_type = self.field_mapper.get_log_type_from_record(record)
                
                # Map record to nodes using field mapping system
                mapped_nodes = self.field_mapper.map_log_record_to_nodes(record, log_type)
                
                # Convert mapped nodes to SecurityNode objects
                record_nodes = []
                for node_data in mapped_nodes:
                    node_id = node_data['id']
                    
                    if node_id not in all_nodes:
                        # Calculate risk score based on node type and properties
                        risk_score = self._calculate_node_risk_score(node_data)
                        
                        # Parse timestamp
                        timestamp = self._parse_record_timestamp(record)
                        
                        all_nodes[node_id] = SecurityNode(
                            id=node_id,
                            type=node_data['type'].lower(),
                            properties=node_data['properties'],
                            risk_score=risk_score,
                            first_seen=timestamp,
                            last_seen=timestamp
                        )
                        record_nodes.append(all_nodes[node_id])
                    else:
                        # Update last seen timestamp
                        timestamp = self._parse_record_timestamp(record)
                        if timestamp and (not all_nodes[node_id].last_seen or timestamp > all_nodes[node_id].last_seen):
                            all_nodes[node_id].last_seen = timestamp
                        record_nodes.append(all_nodes[node_id])
                
                # Map record to relationships using field mapping system
                mapped_relationships = self.field_mapper.map_log_record_to_relationships(record, mapped_nodes)
                
                # Convert mapped relationships to SecurityRelationship objects
                for rel_data in mapped_relationships:
                    timestamp = self._parse_record_timestamp(record)
                    
                    relationship = SecurityRelationship(
                        source_id=rel_data['source_id'],
                        target_id=rel_data['target_id'],
                        relationship_type=rel_data['type'],
                        properties=rel_data['properties'],
                        weight=self._calculate_relationship_weight(rel_data, record),
                        timestamp=timestamp
                    )
                    all_relationships.append(relationship)
                
                if (i + 1) % 100 == 0:
                    print(f"Processed {i + 1}/{len(security_data)} records...", file=sys.stderr)
                    
            except Exception as e:
                print(f"Error processing record {i}: {e}", file=sys.stderr)
                continue
        
        print(f"Graph generation completed: {len(all_nodes)} nodes, {len(all_relationships)} relationships", file=sys.stderr)
        return list(all_nodes.values()), all_relationships
    
    def _calculate_node_risk_score(self, node_data: Dict) -> float:
        """Calculate risk score for a node based on its type and properties"""
        node_type = node_data['type'].lower()
        properties = node_data.get('properties', {})
        
        if node_type == 'ip':
            # External IPs are riskier than internal
            if not properties.get('is_internal', True):
                return 0.6
            return 0.2
            
        elif node_type == 'user':
            # Service accounts and privileged users are riskier
            if properties.get('is_service_account', False):
                return 0.7
            if properties.get('is_privileged', False):
                return 0.8
            return 0.3
            
        elif node_type == 'process':
            # Suspicious processes have higher risk
            if properties.get('is_suspicious', False):
                return 0.9
            return 0.4
            
        elif node_type == 'port':
            # Non-standard ports are riskier
            if not properties.get('is_standard', True):
                return 0.6
            return 0.2
            
        elif node_type == 'host':
            # Domain-joined hosts might be less risky
            if properties.get('is_domain_joined', False):
                return 0.3
            return 0.5
            
        # Default risk scores for other node types
        return 0.3
    
    def _calculate_relationship_weight(self, rel_data: Dict, record: Dict) -> float:
        """Calculate weight for a relationship based on the data volume or frequency"""
        rel_type = rel_data['type']
        properties = rel_data.get('properties', {})
        
        if rel_type == 'CONNECTS_TO':
            # Weight based on bytes transferred
            bytes_val = properties.get('bytes', record.get('Bytes', record.get('bytes', 1)))
            try:
                return float(bytes_val) / 1024  # Convert to KB
            except:
                return 1.0
                
        elif rel_type in ['ACCESSES_FROM', 'CONNECTED_FROM']:
            # Weight based on frequency (for now, default to 1)
            return 1.0
            
        elif rel_type in ['RUNS', 'RUNS_ON', 'LOGGED_INTO']:
            # Process and login relationships have standard weight
            return 1.0
            
        return 1.0
    
    def _parse_record_timestamp(self, record: Dict) -> Optional[datetime]:
        """Parse timestamp from record"""
        timestamp_val = record.get('Time', record.get('Datetime', ''))
        
        if timestamp_val:
            if isinstance(timestamp_val, int):
                # Handle epoch timestamp
                return datetime.fromtimestamp(timestamp_val / 1000 if timestamp_val > 10**12 else timestamp_val)
            elif isinstance(timestamp_val, str):
                try:
                    # Handle ISO string timestamp
                    return datetime.fromisoformat(timestamp_val.replace('Z', '+00:00'))
                except:
                    pass
        
        return datetime.utcnow()
    
    def _store_in_neo4j(self, nodes: List[SecurityNode], relationships: List[SecurityRelationship]):
        """Store nodes and relationships in Neo4j"""
        if not self.neo4j_store:
            return
        
        try:
            for node in nodes:
                self.neo4j_store.create_node(node)
            
            for rel in relationships:
                self.neo4j_store.create_relationship(rel)
        except Exception as e:
            print(f"Neo4j storage warning: {e}", file=sys.stderr)
    
    def _is_internal_ip(self, ip: str) -> bool:
        """Check if IP is internal/private"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private or ip_obj.is_loopback
        except:
            return False
    
    def _get_geo_info(self, ip: str) -> Optional[Dict]:
        """Get geographic information for IP (placeholder)"""
        # In a real implementation, you would use a GeoIP service
        return {"country": "Unknown", "city": "Unknown"}
    
    def _get_service_name(self, port: int) -> str:
        """Get service name for port number"""
        port_services = {
            80: "HTTP", 443: "HTTPS", 22: "SSH", 21: "FTP",
            25: "SMTP", 53: "DNS", 110: "POP3", 143: "IMAP",
            993: "IMAPS", 995: "POP3S", 3389: "RDP", 5900: "VNC"
        }
        return port_services.get(port, f"Port-{port}")
    
    def get_subgraph(self, center_node_id: str, depth: int = 2) -> Dict:
        """Get subgraph around a specific node"""
        if self.use_neo4j and self.neo4j_store:
            return self.neo4j_store.get_subgraph(center_node_id, depth)
        else:
            # Fallback to NetworkX
            try:
                if center_node_id not in self.networkx_analyzer.graph:
                    return {"nodes": [], "relationships": []}
                
                # Get nodes within specified depth
                nodes_in_range = set()
                nodes_in_range.add(center_node_id)
                
                current_level = {center_node_id}
                for _ in range(depth):
                    next_level = set()
                    for node in current_level:
                        neighbors = set(self.networkx_analyzer.graph.neighbors(node))
                        next_level.update(neighbors)
                    nodes_in_range.update(next_level)
                    current_level = next_level
                
                # Create subgraph
                subgraph = self.networkx_analyzer.graph.subgraph(nodes_in_range)
                
                nodes = []
                relationships = []
                
                for node in subgraph.nodes(data=True):
                    nodes.append({
                        "id": node[0],
                        "properties": node[1]
                    })
                
                for edge in subgraph.edges(data=True):
                    relationships.append({
                        "source": edge[0],
                        "target": edge[1],
                        "properties": edge[2]
                    })
                
                return {"nodes": nodes, "relationships": relationships}
                
            except Exception as e:
                print(f"Subgraph extraction error: {e}", file=sys.stderr)
                return {"nodes": [], "relationships": []}

def main():
    """Main entry point for graph analyzer"""
    parser = argparse.ArgumentParser(description='Security Graph Analyzer with Neo4j and NetworkX')
    parser.add_argument('action', choices=['analyze', 'subgraph'], help='Action to perform')
    parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    parser.add_argument('--node-id', type=str, help='Node ID for subgraph analysis')
    parser.add_argument('--depth', type=int, default=2, help='Depth for subgraph analysis')
    parser.add_argument('--use-neo4j', action='store_true', help='Use Neo4j for storage')
    parser.add_argument('--neo4j-uri', type=str, default='bolt://localhost:7687', help='Neo4j URI')
    parser.add_argument('--neo4j-user', type=str, default='neo4j', help='Neo4j username')
    parser.add_argument('--neo4j-password', type=str, default=os.getenv('NEO4J_PASSWORD', 'password'), help='Neo4j password')
    
    args = parser.parse_args()
    
    try:
        neo4j_config = None
        if args.use_neo4j:
            neo4j_config = {
                'uri': args.neo4j_uri,
                'user': args.neo4j_user,
                'password': args.neo4j_password
            }
        
        analyzer = SecurityGraphAnalyzer(use_neo4j=args.use_neo4j, neo4j_config=neo4j_config)
        
        if args.action == 'analyze':
            result = analyzer.analyze_security_relationships(args.time_period)
        elif args.action == 'subgraph':
            if not args.node_id:
                result = {"error": "Node ID required for subgraph analysis", "success": False}
            else:
                subgraph_data = analyzer.get_subgraph(args.node_id, args.depth)
                result = {
                    "success": True,
                    "subgraph": subgraph_data,
                    "center_node": args.node_id,
                    "depth": args.depth
                }
        else:
            result = {"error": "Invalid action", "success": False}
        
        print(json.dumps(result, indent=2, default=str))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()