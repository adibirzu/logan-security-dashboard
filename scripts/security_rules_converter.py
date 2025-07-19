#!/usr/bin/env python3
"""
Security Rules Converter
Converts Elastic Detection Rules and Splunk Security Content rules to OCI Logging Analytics format.
"""

import json
import yaml
import toml
import re
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import argparse

@dataclass
class ConvertedRule:
    """Represents a converted security rule"""
    id: str
    name: str
    description: str
    category: str
    severity: str
    mitre_tactics: List[str]
    mitre_techniques: List[str]
    original_source: str  # "elastic" or "splunk"
    original_rule_id: str
    oci_query: str
    tags: List[str]
    false_positives: List[str]
    references: List[str]
    author: str
    date_created: str
    date_converted: str

class SecurityRulesConverter:
    """Converter for security rules from various sources to OCI Logging Analytics"""
    
    def __init__(self):
        self.field_mappings = self._load_field_mappings()
        self.converted_rules = []
        
    def _load_field_mappings(self) -> Dict[str, str]:
        """Load field mappings from various sources to OCI Logging Analytics"""
        return {
            # Windows fields
            "winlog.event_id": "'Event ID'",
            "winlog.computer_name": "'Computer Name'",
            "winlog.channel": "'Channel'",
            "process.name": "'Process Name'",
            "process.executable": "'Process Path'",
            "process.command_line": "'Command Line'",
            "process.parent.name": "'Parent Process Name'",
            "process.parent.command_line": "'Parent Command Line'",
            "process.pid": "'Process ID'",
            "process.ppid": "'Parent Process ID'",
            "user.name": "'User Name'",
            "user.domain": "'Domain'",
            "host.name": "'Host Name'",
            "host.hostname": "'Host Name'",
            "host.ip": "'Host IP'",
            
            # Network fields
            "source.ip": "'Source IP'",
            "destination.ip": "'Destination IP'",
            "source.port": "'Source Port'",
            "destination.port": "'Destination Port'",
            "network.protocol": "'Protocol'",
            "network.transport": "'Transport'",
            "url.domain": "'Domain'",
            "url.path": "'URL Path'",
            "dns.question.name": "'DNS Query'",
            "http.request.method": "'HTTP Method'",
            "http.response.status_code": "'HTTP Status Code'",
            "user_agent.original": "'User Agent'",
            
            # File fields
            "file.name": "'File Name'",
            "file.path": "'File Path'",
            "file.extension": "'File Extension'",
            "file.size": "'File Size'",
            "file.hash.md5": "'MD5 Hash'",
            "file.hash.sha1": "'SHA1 Hash'",
            "file.hash.sha256": "'SHA256 Hash'",
            
            # Registry fields
            "registry.path": "'Registry Path'",
            "registry.key": "'Registry Key'",
            "registry.value": "'Registry Value'",
            "registry.data.strings": "'Registry Data'",
            
            # Authentication fields
            "winlog.event_data.LogonType": "'Logon Type'",
            "winlog.event_data.TargetUserName": "'Target User'",
            "winlog.event_data.IpAddress": "'Source IP'",
            "winlog.event_data.WorkstationName": "'Workstation Name'",
            
            # General fields
            "event.code": "'Event ID'",
            "event.action": "'Event Action'",
            "event.category": "'Event Category'",
            "event.outcome": "'Event Outcome'",
            "log.level": "'Log Level'",
            "message": "'Message'",
            "@timestamp": "Time",
            "timestamp": "Time",
            
            # Splunk specific fields
            "EventCode": "'Event ID'",
            "Computer": "'Computer Name'",
            "Image": "'Process Path'",
            "CommandLine": "'Command Line'",
            "ParentImage": "'Parent Process Path'",
            "ParentCommandLine": "'Parent Command Line'",
            "ProcessId": "'Process ID'",
            "ParentProcessId": "'Parent Process ID'",
            "User": "'User Name'",
            "src_ip": "'Source IP'",
            "dest_ip": "'Destination IP'",
            "src_port": "'Source Port'",
            "dest_port": "'Destination Port'",
        }
    
    def convert_elastic_rule(self, rule_content: str) -> Optional[ConvertedRule]:
        """Convert an Elastic detection rule to OCI format"""
        try:
            rule_data = toml.loads(rule_content)
            
            # Extract metadata
            metadata = rule_data.get('metadata', {})
            rule_info = rule_data.get('rule', {})
            
            # Extract MITRE information
            mitre_tactics = []
            mitre_techniques = []
            
            threat_data = rule_info.get('threat', [])
            if isinstance(threat_data, dict):
                threat_data = [threat_data]
            
            for threat in threat_data:
                if 'tactic' in threat:
                    mitre_tactics.append(threat['tactic']['name'])
                if 'technique' in threat:
                    techniques = threat['technique']
                    if isinstance(techniques, dict):
                        techniques = [techniques]
                    for tech in techniques:
                        mitre_techniques.append(tech['id'])
            
            # Convert query
            query = rule_info.get('query', '')
            oci_query = self._convert_query_to_oci(query, 'elastic')
            
            # Create converted rule
            converted_rule = ConvertedRule(
                id=f"elastic_{rule_info.get('id', 'unknown')}",
                name=rule_info.get('name', ''),
                description=rule_info.get('description', ''),
                category=self._determine_category(rule_info.get('name', ''), mitre_tactics),
                severity=rule_info.get('risk_score', 'medium'),
                mitre_tactics=mitre_tactics,
                mitre_techniques=mitre_techniques,
                original_source='elastic',
                original_rule_id=rule_info.get('id', ''),
                oci_query=oci_query,
                tags=rule_info.get('tags', []),
                false_positives=rule_info.get('false_positives', []),
                references=rule_info.get('references', []),
                author=rule_info.get('author', ['Unknown'])[0] if rule_info.get('author') else 'Unknown',
                date_created=rule_info.get('from', ''),
                date_converted=datetime.now().isoformat()
            )
            
            return converted_rule
            
        except Exception as e:
            print(f"Error converting Elastic rule: {e}", file=sys.stderr)
            return None
    
    def convert_splunk_rule(self, rule_content: str) -> Optional[ConvertedRule]:
        """Convert a Splunk security content rule to OCI format"""
        try:
            rule_data = yaml.safe_load(rule_content)
            
            # Extract MITRE information
            mitre_tactics = []
            mitre_techniques = []
            
            mitre_attack = rule_data.get('mitre_attack', [])
            for attack in mitre_attack:
                if 'tactic' in attack:
                    mitre_tactics.append(attack['tactic'])
                if 'technique' in attack:
                    techniques = attack['technique']
                    if isinstance(techniques, list):
                        mitre_techniques.extend(techniques)
                    else:
                        mitre_techniques.append(techniques)
            
            # Convert search query
            search = rule_data.get('search', '')
            oci_query = self._convert_query_to_oci(search, 'splunk')
            
            # Create converted rule
            converted_rule = ConvertedRule(
                id=f"splunk_{rule_data.get('id', 'unknown')}",
                name=rule_data.get('name', ''),
                description=rule_data.get('description', ''),
                category=self._determine_category(rule_data.get('name', ''), mitre_tactics),
                severity=rule_data.get('risk_score', 'medium'),
                mitre_tactics=mitre_tactics,
                mitre_techniques=mitre_techniques,
                original_source='splunk',
                original_rule_id=rule_data.get('id', ''),
                oci_query=oci_query,
                tags=rule_data.get('tags', []),
                false_positives=rule_data.get('false_positives', []),
                references=rule_data.get('references', []),
                author=rule_data.get('author', 'Unknown'),
                date_created=rule_data.get('date', ''),
                date_converted=datetime.now().isoformat()
            )
            
            return converted_rule
            
        except Exception as e:
            print(f"Error converting Splunk rule: {e}", file=sys.stderr)
            return None
    
    def _convert_query_to_oci(self, query: str, source_type: str) -> str:
        """Convert a query from Elastic KQL or Splunk SPL to OCI Logging Analytics format"""
        if not query.strip():
            return "* | head 100"
        
        # Basic OCI query structure
        oci_query = query
        
        if source_type == 'elastic':
            # Convert Elastic KQL to OCI
            oci_query = self._convert_elastic_kql_to_oci(query)
        elif source_type == 'splunk':
            # Convert Splunk SPL to OCI
            oci_query = self._convert_splunk_spl_to_oci(query)
        
        return oci_query
    
    def _convert_elastic_kql_to_oci(self, kql_query: str) -> str:
        """Convert Elastic KQL query to OCI Logging Analytics format"""
        # Start with basic conversion
        oci_query = kql_query
        
        # Replace field names using mappings
        for elastic_field, oci_field in self.field_mappings.items():
            oci_query = re.sub(rf'\b{re.escape(elastic_field)}\b', oci_field, oci_query)
        
        # Convert basic KQL operators to OCI
        oci_query = re.sub(r'\band\b', ' and ', oci_query, flags=re.IGNORECASE)
        oci_query = re.sub(r'\bor\b', ' or ', oci_query, flags=re.IGNORECASE)
        oci_query = re.sub(r'\bnot\b', ' not ', oci_query, flags=re.IGNORECASE)
        
        # Handle wildcard matching
        oci_query = re.sub(r':\s*\*([^*\s]+)\*', r' like "%\1%"', oci_query)
        oci_query = re.sub(r':\s*([^*\s]+)\*', r' like "\1%"', oci_query)
        oci_query = re.sub(r':\s*\*([^*\s]+)', r' like "%\1"', oci_query)
        
        # Convert field:value to field = 'value'
        oci_query = re.sub(r"(['\"])([^'\"]+)(['\"])\s*:\s*([^'\s]+)", r"\2 = '\4'", oci_query)
        
        # Add basic structure if missing
        if not oci_query.startswith('*'):
            oci_query = f"* | where {oci_query}"
        
        return oci_query + " | head 100"
    
    def _convert_splunk_spl_to_oci(self, spl_query: str) -> str:
        """Convert Splunk SPL query to OCI Logging Analytics format"""
        # Start with basic conversion
        oci_query = spl_query
        
        # Replace field names using mappings
        for splunk_field, oci_field in self.field_mappings.items():
            oci_query = re.sub(rf'\b{re.escape(splunk_field)}\b', oci_field, oci_query)
        
        # Convert Splunk search operators to OCI
        oci_query = re.sub(r'\bAND\b', ' and ', oci_query, flags=re.IGNORECASE)
        oci_query = re.sub(r'\bOR\b', ' or ', oci_query, flags=re.IGNORECASE)
        oci_query = re.sub(r'\bNOT\b', ' not ', oci_query, flags=re.IGNORECASE)
        
        # Handle Splunk index and sourcetype
        oci_query = re.sub(r'index\s*=\s*([^\s]+)', r"'Log Source' = '\1'", oci_query)
        oci_query = re.sub(r'sourcetype\s*=\s*([^\s]+)', r"'Source Type' = '\1'", oci_query)
        
        # Convert Splunk search to OCI format
        oci_query = re.sub(r'^search\s+', '', oci_query, flags=re.IGNORECASE)
        oci_query = re.sub(r'^\s*\|', '', oci_query)
        
        # Handle wildcard matching
        oci_query = re.sub(r'=\s*\*([^*\s]+)\*', r' like "%\1%"', oci_query)
        oci_query = re.sub(r'=\s*([^*\s]+)\*', r' like "\1%"', oci_query)
        oci_query = re.sub(r'=\s*\*([^*\s]+)', r' like "%\1"', oci_query)
        
        # Add basic structure if missing
        if not oci_query.startswith('*'):
            oci_query = f"* | where {oci_query}"
        
        return oci_query + " | head 100"
    
    def _determine_category(self, rule_name: str, mitre_tactics: List[str]) -> str:
        """Determine rule category based on name and MITRE tactics"""
        name_lower = rule_name.lower()
        
        # Category mapping based on keywords and MITRE tactics
        if any(tactic in ['execution', 'command-and-control'] for tactic in mitre_tactics):
            return 'Execution'
        elif any(tactic in ['persistence', 'privilege-escalation'] for tactic in mitre_tactics):
            return 'Persistence'
        elif any(tactic in ['defense-evasion', 'credential-access'] for tactic in mitre_tactics):
            return 'Defense Evasion'
        elif any(tactic in ['discovery', 'lateral-movement'] for tactic in mitre_tactics):
            return 'Discovery'
        elif any(tactic in ['collection', 'exfiltration'] for tactic in mitre_tactics):
            return 'Exfiltration'
        elif 'network' in name_lower or 'dns' in name_lower or 'http' in name_lower:
            return 'Network'
        elif 'process' in name_lower or 'command' in name_lower:
            return 'Process'
        elif 'file' in name_lower or 'registry' in name_lower:
            return 'System'
        elif 'logon' in name_lower or 'authentication' in name_lower:
            return 'Authentication'
        else:
            return 'General'
    
    def generate_sample_rules(self, count: int = 100) -> List[ConvertedRule]:
        """Generate sample converted rules for demonstration"""
        sample_rules = []
        
        # Define sample rule templates
        rule_templates = [
            {
                "name": "Suspicious Process Execution",
                "description": "Detects suspicious process execution patterns",
                "category": "Process",
                "severity": "high",
                "oci_query": "* | where 'Process Name' like '%cmd.exe%' and 'Command Line' like '%powershell%' | head 100",
                "mitre_tactics": ["execution"],
                "mitre_techniques": ["T1059"],
                "tags": ["process", "execution", "windows"]
            },
            {
                "name": "Network Connection to Suspicious Domain",
                "description": "Detects network connections to known malicious domains",
                "category": "Network",
                "severity": "medium",
                "oci_query": "* | where 'Event Name' = 'Network Connection' and 'Domain' like '%.tk%' | head 100",
                "mitre_tactics": ["command-and-control"],
                "mitre_techniques": ["T1071"],
                "tags": ["network", "c2", "domain"]
            },
            {
                "name": "Failed Authentication Attempts",
                "description": "Detects multiple failed authentication attempts",
                "category": "Authentication",
                "severity": "medium",
                "oci_query": "* | where 'Event Name' = 'Logon Failed' and 'Event ID' = 4625 | head 100",
                "mitre_tactics": ["credential-access"],
                "mitre_techniques": ["T1110"],
                "tags": ["authentication", "brute-force", "failed-logon"]
            },
            {
                "name": "Registry Modification",
                "description": "Detects suspicious registry modifications",
                "category": "System",
                "severity": "high",
                "oci_query": "* | where 'Event Name' = 'Registry Value Set' and 'Registry Path' like '%Run%' | head 100",
                "mitre_tactics": ["persistence"],
                "mitre_techniques": ["T1547"],
                "tags": ["registry", "persistence", "startup"]
            },
            {
                "name": "DNS Query to Suspicious Domain",
                "description": "Detects DNS queries to potentially malicious domains",
                "category": "Network",
                "severity": "medium",
                "oci_query": "* | where 'Event Name' = 'DNS Query' and 'DNS Query' like '%.bit%' | head 100",
                "mitre_tactics": ["command-and-control"],
                "mitre_techniques": ["T1071.004"],
                "tags": ["dns", "c2", "domain"]
            }
        ]
        
        # Generate rules based on templates
        for i in range(count):
            template = rule_templates[i % len(rule_templates)]
            source = "elastic" if i % 2 == 0 else "splunk"
            
            rule = ConvertedRule(
                id=f"{source}_{i + 1:03d}",
                name=f"{template['name']} - Rule {i + 1}",
                description=template['description'],
                category=template['category'],
                severity=template['severity'],
                mitre_tactics=template['mitre_tactics'],
                mitre_techniques=template['mitre_techniques'],
                original_source=source,
                original_rule_id=f"{source}_original_{i + 1:03d}",
                oci_query=template['oci_query'],
                tags=template['tags'],
                false_positives=["Legitimate administrative activity"],
                references=[f"https://attack.mitre.org/techniques/{template['mitre_techniques'][0]}/"],
                author="Security Team",
                date_created="2024-01-01",
                date_converted=datetime.now().isoformat()
            )
            
            sample_rules.append(rule)
        
        return sample_rules
    
    def export_rules_to_json(self, rules: List[ConvertedRule], output_file: str):
        """Export converted rules to JSON file"""
        rules_data = {
            "metadata": {
                "total_rules": len(rules),
                "export_date": datetime.now().isoformat(),
                "format_version": "1.0"
            },
            "rules": [asdict(rule) for rule in rules]
        }
        
        with open(output_file, 'w') as f:
            json.dump(rules_data, f, indent=2)
        
        print(f"Exported {len(rules)} rules to {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert security rules to OCI Logging Analytics format')
    parser.add_argument('action', choices=['generate', 'convert', 'export'], help='Action to perform')
    parser.add_argument('--count', type=int, default=100, help='Number of rules to generate (for generate action)')
    parser.add_argument('--output', '-o', default='converted_rules.json', help='Output file for exported rules')
    parser.add_argument('--input', '-i', help='Input file or directory for conversion')
    
    args = parser.parse_args()
    
    converter = SecurityRulesConverter()
    
    if args.action == 'generate':
        print(f"Generating {args.count} sample security rules...")
        rules = converter.generate_sample_rules(args.count)
        converter.export_rules_to_json(rules, args.output)
        
        # Print summary
        categories = {}
        sources = {}
        for rule in rules:
            categories[rule.category] = categories.get(rule.category, 0) + 1
            sources[rule.original_source] = sources.get(rule.original_source, 0) + 1
        
        print(f"\nGenerated rules summary:")
        print(f"Total rules: {len(rules)}")
        print(f"Categories: {categories}")
        print(f"Sources: {sources}")
        
        result = {"success": True, "rules": [asdict(rule) for rule in rules]}
    
    elif args.action == 'export':
        # For now, just generate sample rules
        rules = converter.generate_sample_rules(args.count)
        converter.export_rules_to_json(rules, args.output)
        result = {"success": True, "message": f"Exported {len(rules)} rules to {args.output}"}
    
    else:
        print("Convert action not yet implemented")
        result = {"success": False, "error": "Convert action not implemented"}

    print(json.dumps(result))