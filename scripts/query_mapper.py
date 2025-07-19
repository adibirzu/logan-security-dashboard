#!/usr/bin/env python3
"""
Query Mapper for OCI Logging Analytics
Maps human-readable security queries to LOGAN syntax
"""

import json
import sys
import argparse
from datetime import datetime, timedelta

class QueryMapper:
    def __init__(self):
        self.security_queries = {
            # Authentication Events
            "failed_logins": {
                "description": "Failed login attempts",
                "queries": [
                    "* | where contains(\"Log Entry\", \"Failed password\") or contains(\"Log Entry\", \"authentication failure\") or contains(\"Log Entry\", \"Invalid user\")",
                    "* | where 'Event Name' = 'AuthenticationFailure'",
                    "* | where contains(\"Message\", \"login failed\") or contains(\"Message\", \"authentication failed\")",
                    "* | search \"failed\" \"login\" OR \"authentication\" \"failure\"",
                    "* | where \"Event Name\" = \"SigninFailure\" or \"Event Name\" = \"LoginFailure\""
                ]
            },
            "successful_logins": {
                "description": "Successful login events",
                "queries": [
                    "* | where contains(\"Log Entry\", \"Accepted password\") or contains(\"Log Entry\", \"authentication successful\")",
                    "* | where 'Event Name' = 'SigninSuccess' or 'Event Name' = 'LoginSuccess'",
                    "* | search \"login\" \"success\" OR \"authentication\" \"success\""
                ]
            },
            
            # Privilege Escalation
            "privilege_escalation": {
                "description": "Privilege escalation attempts",
                "queries": [
                    "* | where contains(\"Log Entry\", \"sudo\") or contains(\"Log Entry\", \"su:\")",
                    "* | where contains('Event Name', 'Assume') or contains('Event Name', 'Escalate')",
                    "* | search \"sudo\" OR \"privilege\" \"escalation\" OR \"assume\" \"role\"",
                    "* | where \"Event Name\" = \"AssumeRole\" or \"Event Name\" = \"ElevatePrivileges\""
                ]
            },
            
            # Network Security
            "suspicious_network": {
                "description": "Suspicious network activity",
                "queries": [
                    "* | where contains(\"Log Entry\", \"connection refused\") or contains(\"Log Entry\", \"blocked\")",
                    "* | search \"blocked\" \"connection\" OR \"suspicious\" \"traffic\" OR \"firewall\" \"deny\"",
                    "* | where \"Action\" = \"BLOCK\" or \"Action\" = \"DENY\" or \"Action\" = \"REJECT\""
                ]
            },
            "port_scanning": {
                "description": "Port scanning attempts",
                "queries": [
                    "* | search \"port\" \"scan\" OR \"nmap\" OR \"portscan\"",
                    "* | where contains(\"Log Entry\", \"port scan\") or contains(\"Message\", \"scanning\")"
                ]
            },
            
            # Audit Changes
            "audit_changes": {
                "description": "Configuration and audit changes",
                "queries": [
                    "* | where contains('Event Name', 'Create') or contains('Event Name', 'Update') or contains('Event Name', 'Delete')",
                    "* | where contains('Event Name', 'Terminate') or contains('Event Name', 'Launch')",
                    "* | search \"configuration\" \"change\" OR \"policy\" \"update\" OR \"user\" \"create\""
                ]
            },
            "user_management": {
                "description": "User management events",
                "queries": [
                    "* | where contains('Event Name', 'CreateUser') or contains('Event Name', 'DeleteUser') or contains('Event Name', 'UpdateUser')",
                    "* | search \"user\" \"created\" OR \"user\" \"deleted\" OR \"user\" \"modified\""
                ]
            },
            
            # High Volume Requests
            "high_volume_requests": {
                "description": "High volume API requests",
                "queries": [
                    "* | stats count as requests by \"Source IP\" | where requests > 100 | sort -requests",
                    "* | stats count as requests by \"User\" | where requests > 50 | sort -requests"
                ]
            },
            
            # Cloud Guard Events
            "cloud_guard": {
                "description": "Cloud Guard security findings",
                "queries": [
                    "* | where \"Log Source\" = \"OCI Cloud Guard\"",
                    "* | search \"cloud\" \"guard\" OR \"security\" \"finding\" OR \"threat\" \"detected\""
                ]
            },
            
            # General Security Events
            "security_events": {
                "description": "General security events",
                "queries": [
                    "* | search \"security\" OR \"threat\" OR \"malware\" OR \"intrusion\"",
                    "* | where contains(\"Log Entry\", \"security\") or contains(\"Message\", \"threat\")"
                ]
            }
        }

    def get_security_query(self, query_type, time_period_minutes=1440):
        """Get security query for a specific type"""
        if query_type not in self.security_queries:
            return {
                "error": f"Unknown query type: {query_type}",
                "available_types": list(self.security_queries.keys()),
                "success": False
            }
        
        query_info = self.security_queries[query_type]
        
        # Add time filtering if needed
        time_filter = self._get_time_filter(time_period_minutes)
        queries_with_time = []
        
        for base_query in query_info["queries"]:
            # Prepend timefilter to the query
            if time_filter:
                # Remove initial '* | ' if present, then prepend timefilter
                query_body = base_query.lstrip('* | ').strip()
                query_with_time = f"{time_filter} | {query_body}"
            else:
                query_with_time = base_query
            queries_with_time.append(query_with_time)
        
        return {
            "success": True,
            "type": query_type,
            "description": query_info["description"],
            "queries": queries_with_time,
            "time_period_minutes": time_period_minutes
        }

    def _escape_query_value(self, value):
        """Escape special characters in query values for OCI Logging Analytics"""
        if not isinstance(value, str):
            value = str(value)
        
        # Escape backslashes first, then single quotes and double quotes
        escaped = value.replace('\\', '\\\\').replace('"', '\\"').replace("'", "\\'")
        return escaped

    def _get_time_filter(self, time_period_minutes):
        """Generate time filter for queries using timefilter command"""
        if time_period_minutes <= 0:
            return None
            
        # The timefilter command automatically handles the current time and duration
        # It's more robust than manually constructing date strings.
        # Example: timefilter(1h) for last 1 hour, timefilter(24h) for last 24 hours
        
        # Convert minutes to a more readable format for timefilter (e.g., '1m', '1h', '7d', '1mon')
        if time_period_minutes < 60:
            time_unit = f"{time_period_minutes}m"
        elif time_period_minutes < 1440: # Less than 24 hours
            time_unit = f"{time_period_minutes // 60}h"
        elif time_period_minutes < 43200: # Less than 30 days (approx 1 month)
            time_unit = f"{time_period_minutes // 1440}d"
        else:
            time_unit = f"{time_period_minutes // 43200}mon" # For months, assuming 30 days per month

        return f"timefilter({time_unit})"

    def create_custom_query(self, search_terms, log_sources=None, severity=None, time_period_minutes=1440):
        """Create a custom query from search terms"""
        if not search_terms:
            return {"error": "Search terms required", "success": False}
        
        # Build search query
        if isinstance(search_terms, str):
            search_terms = [search_terms]
        
        # Start with time filter
        time_filter = self._get_time_filter(time_period_minutes)
        query_parts = [time_filter] if time_filter else []

        # Create search conditions with proper escaping
        search_conditions = []
        for term in search_terms:
            escaped_term = self._escape_query_value(term)
            search_conditions.append(f'contains("Log Entry", "{escaped_term}") or contains("Message", "{escaped_term}")')
        
        if search_conditions:
            query_parts.append(f'* | where {" or ".join(search_conditions)}')
        else:
            query_parts.append('*') # Default to all logs if no search terms

        # Add log source filter
        if log_sources:
            if isinstance(log_sources, str):
                log_sources = [log_sources]
            source_conditions = [f'"Log Source" = "{source}"' for source in log_sources]
            query_parts.append(f'where {" or ".join(source_conditions)}')
        
        # Add severity filter
        if severity and severity.lower() != "all":
            query_parts.append(f'where contains("Severity", "{severity}")')
        
        # Join all parts with '|'
        final_query = " | ".join(query_parts)

        return {
            "success": True,
            "query": final_query,
            "search_terms": search_terms,
            "log_sources": log_sources,
            "severity": severity,
            "time_period_minutes": time_period_minutes
        }

    def get_dashboard_queries(self, time_period_minutes=1440):
        """Get queries for dashboard statistics"""
        return {
            "success": True,
            "queries": {
                "total_events": "* | stats count as total_events",
                "log_sources": "* | stats count as events by 'Log Source' | sort -events",
                "top_source_ips": "* | stats count as requests by 'Source IP' | sort -requests | head 10",
                "event_types": "* | stats count as events by 'Event Name' | sort -events | head 10",
                "severity_breakdown": "* | stats count as events by 'Severity' | sort -events",
                "hourly_trends": "* | stats count as events by datefloor('Datetime', '1h') | sort datefloor"
            },
            "time_period_minutes": time_period_minutes
        }

    def list_available_queries(self):
        """List all available security query types"""
        return {
            "success": True,
            "security_queries": {
                query_type: {
                    "description": info["description"],
                    "query_count": len(info["queries"])
                }
                for query_type, info in self.security_queries.items()
            }
        }

def main():
    parser = argparse.ArgumentParser(description='OCI LOGAN Query Mapper')
    parser.add_argument('action', choices=['security', 'custom', 'dashboard', 'list'], help='Action to perform')
    parser.add_argument('--type', help='Security query type')
    parser.add_argument('--terms', nargs='+', help='Search terms for custom query')
    parser.add_argument('--sources', nargs='+', help='Log sources to filter')
    parser.add_argument('--severity', help='Severity level to filter')
    parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    
    args = parser.parse_args()
    
    try:
        mapper = QueryMapper()
        
        if args.action == 'list':
            result = mapper.list_available_queries()
        elif args.action == 'security':
            if not args.type:
                result = {"error": "Security query type required", "success": False}
            else:
                result = mapper.get_security_query(args.type, args.time_period)
        elif args.action == 'custom':
            if not args.terms:
                result = {"error": "Search terms required", "success": False}
            else:
                result = mapper.create_custom_query(args.terms, args.sources, args.severity, args.time_period)
        elif args.action == 'dashboard':
            result = mapper.get_dashboard_queries(args.time_period)
        else:
            result = {"error": "Invalid action", "success": False}
            
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
