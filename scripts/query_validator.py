#!/usr/bin/env python3
"""
Query Validator for OCI Logging Analytics
Validates and transforms queries to work with available log sources and proper syntax
"""

import json
import sys

class QueryValidator:
    def __init__(self):
        # Available log sources based on your tenancy
        self.available_log_sources = [
            'OCI Audit Logs',
            'OCI VCN Flow Unified Schema Logs'
        ]
        
        # Field mappings for different log sources
        self.field_mappings = {
            'OCI VCN Flow Unified Schema Logs': {
                'Action': 'Action',
                'Source IP': 'SourceIP',
                'Destination IP': 'DestinationIP', 
                'Protocol': 'Protocol',
                'Source Port': 'SourcePort',
                'Destination Port': 'DestinationPort'
            },
            'OCI Audit Logs': {
                'Event Type': 'EventType',
                'Event Name': 'EventName',
                'Principal Name': 'PrincipalName',
                'Compartment Name': 'CompartmentName',
                'Source IP': 'SourceIP'
            }
        }
        
        # Known working query patterns
        self.working_patterns = {
            'basic_search': "* | head 10",
            'vcn_flow_logs': "'Log Source' in ('OCI VCN Flow Unified Schema Logs') | head 10",
            'audit_logs': "'Log Source' in ('OCI Audit Logs') | head 10",
            'action_filter': "'Log Source' in ('OCI VCN Flow Unified Schema Logs') and Action in ('drop', 'reject') | head 10",
            'simple_stats': "'Log Source' in ('OCI VCN Flow Unified Schema Logs') | stats count by Action | head 10",
            'source_ip_stats': "'Log Source' in ('OCI VCN Flow Unified Schema Logs') | stats count by SourceIP | sort -count | head 10",
            'action_stats': "'Log Source' in ('OCI VCN Flow Unified Schema Logs') and Action in ('drop', 'reject') | stats count by Action | head 10",
            'timestats': "* | timestats count by 'Log Source' span=1h"
        }
    
    def validate_and_fix_query(self, query):
        """Main validation and fixing method"""
        try:
            # Check if this is a query that should be preserved as-is
            if self._should_preserve_query(query):
                return {
                    'success': True,
                    'original_query': query,
                    'fixed_query': query,  # Don't modify at all
                    'validation_result': {'is_valid': True, 'warnings': ['Query preserved as-is due to complexity']},
                    'warnings': ['Query preserved as-is due to complexity']
                }
            
            # Step 1: Fix basic syntax issues
            fixed_query = self._fix_basic_syntax(query)
            
            # Step 2: Check and fix log source references
            fixed_query = self._fix_log_sources(fixed_query)
            
            # Step 3: Fix field references
            fixed_query = self._fix_field_references(fixed_query)
            
            # Step 4: Simplify complex operations that might fail
            fixed_query = self._simplify_complex_operations(fixed_query)
            
            # Step 5: Validate final query
            validation_result = self._validate_final_query(fixed_query)
            
            return {
                'success': True,
                'original_query': query,
                'fixed_query': fixed_query,
                'validation_result': validation_result,
                'warnings': validation_result.get('warnings', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'original_query': query,
                'suggested_alternative': self._suggest_alternative(query)
            }
    
    def _should_preserve_query(self, query):
        """Check if a query should be preserved without modification"""
        preserve_patterns = [
            "lookup table",           # Queries with lookup tables
            "com.oraclecloud.logging.custom",  # Custom log sources
            "rename",                 # Queries with rename operations
            "eval vol = unit",        # Complex evaluation queries
            "geostats",              # Geographic statistics
            "highlightgroups",       # Visualization queries
            "classify",              # Classification queries
            "timestats",             # Time-based statistics
            "link span",             # Link operations
            "'Web Application Firewall",  # WAF lookup tables
            "compare timeshift",     # Trend comparison queries
            "OCI WAF Logs",          # All WAF queries should be preserved
            "Request Protection Rule IDs",  # WAF-specific fields
            "Host IP Address (Client)",  # WAF-specific fields
            "Suricata",              # Suricata IDS queries
            "Windows Sysmon",        # Windows event logs
            "User Agent",            # Web application fields
            "Response Code"          # HTTP response fields
        ]
        
        return any(pattern in query for pattern in preserve_patterns)
    
    def _fix_basic_syntax(self, query):
        """Fix basic OCI Logging Analytics syntax issues"""
        # Fix null comparisons
        query = query.replace("!= null", "is not null")
        query = query.replace("== null", "is null")
        
        # Fix quotes in value lists
        query = query.replace("(drop, reject)", "('drop', 'reject')")
        query = query.replace("(accept, allow)", "('accept', 'allow')")
        
        # Fix top command syntax
        query = query.replace("| top 10 Count", "| sort -Count | head 10")
        query = query.replace("| top 5 Count", "| sort -Count | head 5")
        query = query.replace("| top Count", "| sort -Count | head 10")
        
        # Fix any remaining top N Count patterns
        import re
        top_pattern = r"\|\s*top\s+(\d+)\s+Count"
        query = re.sub(top_pattern, r"| sort -Count | head \1", query)
        
        # Fix rename command - remove it as it can cause issues
        if "| rename " in query:
            rename_pos = query.find("| rename ")
            pipe_after_rename = query.find(" | ", rename_pos + 1)
            if pipe_after_rename > 0:
                # Remove the rename command and keep the rest
                query = query[:rename_pos] + " " + query[pipe_after_rename:]
            else:
                # Remove rename if it's at the end
                query = query[:rename_pos].strip()
        
        # Fix SEARCH commands that might be invalid
        if "| search " in query.lower():
            search_pos = query.lower().find("| search ")
            if search_pos >= 0:
                # Replace problematic search with basic filter
                before_search = query[:search_pos].strip()
                # Just remove the search command for now
                query = before_search
        
        return query
    
    def _fix_log_sources(self, query):
        """Fix log source references to match available sources - only for known problematic sources"""
        # Only map sources that we know definitely don't exist
        # Keep WAF, Suricata, and Windows sources as-is since they might be configured
        source_mappings = {
            "'Linux Audit Logs'": "'OCI Audit Logs'",
            "'Network Security Events'": "'OCI VCN Flow Unified Schema Logs'"
        }
        
        # Only apply mappings if the source doesn't seem to be a valid custom log source
        for old_source, new_source in source_mappings.items():
            if old_source in query:
                # Check if this looks like a working query by seeing if it has proper OCI syntax
                query = query.replace(old_source, new_source)
        
        return query
    
    def _fix_field_references(self, query):
        """Fix field references based on available log sources"""
        # Field mappings for different contexts
        field_mappings = {
            "'Event ID'": "'Event Type'",
            "'Event Name'": "'Event Name'",
            "'Host IP Address (Client)'": "'Source IP'",
            "'Request Protection Rule IDs'": "'Event Type'",
            "'User Name'": "'Principal Name'",
            "'Computer Name'": "'Compartment Name'",
            "'Source IP'": "SourceIP",  # Remove quotes from field names that work better without them
            "'Source Port'": "SourcePort",
            "'Destination IP'": "DestinationIP",
            "'Destination Port'": "DestinationPort",
            "'Log Source'": "'Log Source'",  # Keep Log Source as-is when possible
            "'Content Size Out'": "'Content Size Out'"  # Keep content size fields
        }
        
        for old_field, new_field in field_mappings.items():
            query = query.replace(old_field, new_field)
        
        return query
    
    def _simplify_complex_operations(self, query):
        """Simplify complex operations that might cause parsing errors - but preserve working queries"""
        import re
        
        # Only simplify queries that are clearly broken, not ones that might work
        
        # Check if this is a complex WAF or Suricata query that should be preserved
        if ("WAF" in query or "Suricata" in query or "lookup table" in query or 
            "com.oraclecloud.logging.custom" in query):
            # For complex custom queries, only do minimal fixes
            return self._minimal_query_fixes(query)
        
        # For VCN Flow queries, apply more aggressive simplification only if needed
        if "OCI VCN Flow" in query and ("stats count by" in query):
            # Check if the stats operation looks problematic
            if re.search(r"stats count by '[^']*'", query):
                # Only simplify if using quoted field names that commonly fail
                problematic_fields = ["'Source IP'", "'Destination IP'", "'Log Source'"]
                for field in problematic_fields:
                    if f"stats count by {field}" in query:
                        query = query.replace(f"stats count by {field}", "stats count by Action")
                        break
        
        # Remove lookup operations only if they're causing errors (keep minimal)
        if "| lookup" in query and "WAF" not in query and "MITRE" not in query:
            lookup_pos = query.find("| lookup")
            if lookup_pos > 0:
                query = query[:lookup_pos].strip()
        
        return query
    
    def _minimal_query_fixes(self, query):
        """Apply only minimal fixes to preserve complex queries"""
        # Only fix the most basic syntax issues
        query = query.replace("!= null", "is not null")
        query = query.replace("== null", "is null")
        
        # Fix basic quote issues in value lists
        query = query.replace("(drop, reject)", "('drop', 'reject')")
        query = query.replace("(accept, allow)", "('accept', 'allow')")
        
        return query
    
    def _validate_final_query(self, query):
        """Validate the final query and provide warnings"""
        warnings = []
        
        # Check if query uses available log sources
        has_valid_source = any(source in query for source in self.available_log_sources)
        if not has_valid_source:
            warnings.append("Query may not reference available log sources")
        
        # Check for potentially problematic patterns
        if "stats count by" in query.lower() and "'" in query:
            warnings.append("Stats operations with quoted field names may cause parsing issues")
        
        if "dateRelative" in query:
            warnings.append("dateRelative function may cause 'Missing input' errors")
        
        return {
            'is_valid': len(warnings) == 0,
            'warnings': warnings
        }
    
    def _suggest_alternative(self, query):
        """Suggest alternative working queries"""
        if "timestats" in query.lower():
            return self.working_patterns['timestats']
        elif "VCN" in query or "Flow" in query or "network" in query.lower():
            return self.working_patterns['vcn_flow_logs']
        elif "audit" in query.lower() or "event" in query.lower():
            return self.working_patterns['audit_logs']
        elif "stats" in query.lower():
            return self.working_patterns['simple_stats']
        else:
            return self.working_patterns['basic_search']
    
    def get_working_examples(self):
        """Get examples of working queries"""
        return {
            'basic_queries': [
                "* | head 10",
                "'Log Source' in ('OCI VCN Flow Unified Schema Logs') | head 5",
                "'Log Source' in ('OCI Audit Logs') | head 5"
            ],
            'filtered_queries': [
                "'Log Source' in ('OCI VCN Flow Unified Schema Logs') and Action in ('drop', 'reject') | head 10",
                "'Log Source' in ('OCI Audit Logs') and 'Event Type' is not null | head 10"
            ],
            'stats_queries': [
                "'Log Source' in ('OCI VCN Flow Unified Schema Logs') | stats count by Action | head 10",
                "'Log Source' in ('OCI Audit Logs') | stats count by 'Event Type' | head 10"
            ]
        }

def main():
    """Command line interface for query validation"""
    if len(sys.argv) < 2:
        print("Usage: python query_validator.py <query>")
        sys.exit(1)
    
    query = sys.argv[1]
    validator = QueryValidator()
    result = validator.validate_and_fix_query(query)
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()