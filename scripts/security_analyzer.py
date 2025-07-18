#!/usr/bin/env python3
"""
Security Analyzer for OCI Logging Analytics
Combines query mapping with execution for security analysis
"""

import json
import sys
import os
import argparse
from logan_client import LoganClient
from query_mapper import QueryMapper
from query_validator import QueryValidator

class SecurityAnalyzer:
    def __init__(self):
        self.client = LoganClient()
        self.mapper = QueryMapper()
        self.validator = QueryValidator()

    def run_security_check(self, check_type, time_period_minutes=60):
        """Run a specific security check"""
        try:
            # Get the mapped queries for this security check
            query_result = self.mapper.get_security_query(check_type, time_period_minutes)
            
            if not query_result.get("success"):
                return query_result
            
            # Try each query until one succeeds
            events = []
            successful_query = None
            
            for i, query in enumerate(query_result["queries"]):
                result = self.client.execute_query(query, time_period_minutes, 100)
                
                if result.get("success") and result.get("results"):
                    events = result["results"]
                    successful_query = query
                    break
                elif result.get("success"):
                    # Query succeeded but no results
                    successful_query = query
                    break
            
            # Format events for security analysis
            formatted_events = []
            for event in events:
                formatted_event = {
                    "id": f"{check_type}_{len(formatted_events)}",
                    "timestamp": event.get("Datetime") or event.get("Time") or event.get("timestamp", ""),
                    "type": check_type,
                    "severity": self._determine_severity(check_type, event),
                    "source": event.get("Log Source", "Unknown"),
                    "message": event.get("Log Entry") or event.get("Message") or "Security event detected",
                    "details": event,
                    "count": event.get("logrecords") or event.get("count") or 1
                }
                formatted_events.append(formatted_event)
            
            return {
                "success": True,
                "check_type": check_type,
                "description": query_result["description"],
                "events": formatted_events,
                "total_events": len(formatted_events),
                "time_period_minutes": time_period_minutes,
                "query_used": successful_query
            }
            
        except Exception as e:
            return {"error": str(e), "success": False}

    def _determine_severity(self, check_type, event):
        """Determine event severity based on type and content"""
        # Check if event has explicit severity
        if "Severity" in event:
            return event["Severity"].lower()
        
        # Determine severity by check type
        high_severity_checks = ["privilege_escalation", "suspicious_network", "failed_logins"]
        medium_severity_checks = ["audit_changes", "user_management", "port_scanning"]
        
        if check_type in high_severity_checks:
            return "high"
        elif check_type in medium_severity_checks:
            return "medium"
        else:
            return "low"

    def get_security_events(self, severity="all", time_period_minutes=60):
        """Get security events filtered by severity"""
        try:
            # Run multiple security checks
            check_types = ["failed_logins", "privilege_escalation", "suspicious_network", "audit_changes"]
            all_events = []
            
            for check_type in check_types:
                result = self.run_security_check(check_type, time_period_minutes)
                if result.get("success"):
                    events = result.get("events", [])
                    # Filter by severity if specified
                    if severity != "all":
                        events = [e for e in events if e.get("severity") == severity.lower()]
                    all_events.extend(events)
            
            # Sort by timestamp (newest first)
            all_events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            
            return {
                "success": True,
                "events": all_events,
                "total": len(all_events),
                "severity_filter": severity,
                "time_period_minutes": time_period_minutes
            }
            
        except Exception as e:
            return {"error": str(e), "success": False}

    def get_dashboard_stats(self, time_period_minutes=1440):
        """Get comprehensive dashboard statistics"""
        try:
            stats = {
                "total_events": 0,
                "critical_alerts": 0,
                "resolved_threats": 0,
                "failed_logins": 0,
                "privilege_escalations": 0,
                "blocked_connections": 0,
                "unique_sources": 0,
                "active_monitoring": True,
                "system_health": 95,
                "threat_level": "low",
                "last_update": "",
                "success": True
            }
            
            # Test connection
            connection_test = self.client.test_connection()
            stats["active_monitoring"] = connection_test.get("success", False)
            stats["connection_status"] = "connected" if stats["active_monitoring"] else "disconnected"
            
            if not stats["active_monitoring"]:
                stats["system_health"] = 0
                return stats
            
            # Get log sources
            sources_result = self.client.list_log_sources(time_period_minutes)
            if sources_result.get("success"):
                sources = sources_result.get("sources", [])
                stats["unique_sources"] = len(sources)
                stats["total_events"] = sum(source.get("count", 0) for source in sources)
            
            # Get security events
            security_checks = {
                "failed_logins": "failed_logins",
                "privilege_escalations": "privilege_escalation", 
                "blocked_connections": "suspicious_network"
            }
            
            critical_count = 0
            for stat_key, check_type in security_checks.items():
                result = self.run_security_check(check_type, time_period_minutes)
                if result.get("success"):
                    count = len(result.get("events", []))
                    stats[stat_key] = count
                    
                    # Count high severity as critical
                    high_severity_events = [e for e in result.get("events", []) if e.get("severity") == "high"]
                    critical_count += len(high_severity_events)
            
            stats["critical_alerts"] = critical_count
            stats["resolved_threats"] = max(0, int(critical_count * 0.8))  # Assume 80% resolved
            
            # Determine threat level
            if critical_count > 10:
                stats["threat_level"] = "high"
                stats["system_health"] = 70
            elif critical_count > 5:
                stats["threat_level"] = "medium"
                stats["system_health"] = 85
            else:
                stats["threat_level"] = "low"
                stats["system_health"] = 95
            
            stats["last_update"] = "2025-01-10T12:30:00Z"
            
            return stats
            
        except Exception as e:
            return {"error": str(e), "success": False}

    def search_logs(self, query, time_period_minutes=1440, bypass_validation=False):
        """Execute a custom log search with optional validation bypass"""
        try:
            # First, test connection to OCI Logging Analytics
            connection_test_result = self.client.test_connection()
            if not connection_test_result.get("success"):
                sys.stderr.write(f"SecurityAnalyzer: OCI connection test failed: {connection_test_result.get('error', 'Unknown error')}\n")
                return connection_test_result # Return the connection error

            if os.getenv('LOGAN_DEBUG') == 'true':
                sys.stderr.write("SecurityAnalyzer: OCI connection test successful. Proceeding with query.\n")

            original_query = query
            query_was_modified = False
            validation_warnings = []

            if bypass_validation:
                # Send query as-is without any validation or modification
                if os.getenv('LOGAN_DEBUG') == 'true':
                    sys.stderr.write("SecurityAnalyzer: Bypassing validation - sending query as-is to OCI\n")
                # Use console-like execution with proper parameters and bypass all preprocessing
                result = self.client.execute_query_like_console(query, time_period_minutes, 2000, bypass_all_processing=True)
            else:
                # Validate and fix the query before execution
                validation_result = self.validator.validate_and_fix_query(query)
                
                if not validation_result.get("success"):
                    if os.getenv('LOGAN_DEBUG') == 'true':
                        sys.stderr.write(f"SecurityAnalyzer: Query validation failed: {validation_result.get('error')}\n")
                        # Try suggested alternative
                        suggested_query = validation_result.get("suggested_alternative", "* | head 10")
                        sys.stderr.write(f"SecurityAnalyzer: Trying suggested alternative: {suggested_query}\n")
                    else:
                        suggested_query = validation_result.get("suggested_alternative", "* | head 10")
                    query = suggested_query
                    query_was_modified = True
                else:
                    # Use the fixed query
                    query = validation_result.get("fixed_query", query)
                    validation_warnings = validation_result.get("warnings", [])
                    
                    if query != original_query:
                        if os.getenv('LOGAN_DEBUG') == 'true':
                            sys.stderr.write(f"SecurityAnalyzer: Query was modified from '{original_query}' to '{query}'\n")
                        query_was_modified = True
                    
                    # Log any warnings
                    if os.getenv('LOGAN_DEBUG') == 'true':
                        for warning in validation_warnings:
                            sys.stderr.write(f"SecurityAnalyzer: Warning: {warning}\n")

                result = self.client.execute_query(query, time_period_minutes, 100)
            
            if result.get("success"):
                return {
                    "success": True,
                    "results": result.get("results", []),
                    "total": result.get("total_count", 0),
                    "execution_time": result.get("execution_time", 0),
                    "query": query,
                    "original_query": original_query,
                    "query_was_modified": query_was_modified,
                    "validation_bypassed": bypass_validation,
                    "validation_warnings": validation_warnings,
                    "time_period_minutes": time_period_minutes,
                    "fallback_used": result.get("fallback_used", False)
                }
            
            return result
            
        except Exception as e:
            sys.stderr.write(f"SecurityAnalyzer: General error in search_logs: {e}\n")
            return {"error": str(e), "success": False}

def main():
    parser = argparse.ArgumentParser(description='Security Analyzer for OCI LOGAN')
    parser.add_argument('action', choices=['check', 'events', 'stats', 'search'], help='Action to perform')
    parser.add_argument('--type', help='Security check type')
    parser.add_argument('--severity', default='all', help='Event severity filter')
    parser.add_argument('--query', type=str, help='Custom query string')
    parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    parser.add_argument('--bypass-validation', action='store_true', help='Send query as-is without validation')
    
    args = parser.parse_args()
    
    try:
        analyzer = SecurityAnalyzer()
        
        if args.action == 'check':
            if not args.type:
                result = {"error": "Security check type required", "success": False}
            else:
                result = analyzer.run_security_check(args.type, args.time_period)
        elif args.action == 'events':
            result = analyzer.get_security_events(args.severity, args.time_period)
        elif args.action == 'stats':
            result = analyzer.get_dashboard_stats(args.time_period)
        elif args.action == 'search':
            if not args.query:
                result = {"error": "Query string required", "success": False}
            else:
                result = analyzer.search_logs(args.query, args.time_period, args.bypass_validation)
        else:
            result = {"error": "Invalid action", "success": False}
            
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
