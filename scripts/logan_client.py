#!/usr/bin/env python3
"""
Direct OCI Logging Analytics Client
Enhanced with improved time handling and UTC consistency
"""

import oci
import json
import sys
import os
from datetime import datetime, timedelta, timezone
import argparse
from dotenv import load_dotenv

class LoganClient:
    def __init__(self):
        # Do not load_dotenv here, as environment variables are passed from Node.js process
        # load_dotenv() 
        
        self.config = self._load_oci_config()
        
        # Prioritize environment variables passed from the calling process
        self.region = os.getenv('LOGAN_REGION') or self.config.get("region", "us-ashburn-1")
        self.compartment_id = os.getenv('LOGAN_COMPARTMENT_ID') or self.config.get("tenancy")

        if not self.compartment_id:
            raise Exception("LOGAN_COMPARTMENT_ID environment variable or OCI config 'tenancy' is not set.")

        # Set the region for the client
        self.config["region"] = self.region
        self.client = oci.log_analytics.LogAnalyticsClient(self.config)
        self.namespace = self._get_namespace()

        # Debug info only for explicit debugging (can be enabled via environment variable)
        if os.getenv('LOGAN_DEBUG') == 'true':
            sys.stderr.write(f"LoganClient initialized with:\n")
            sys.stderr.write(f"  Region: {self.region}\n")
            sys.stderr.write(f"  Compartment ID: {self.compartment_id}\n")
            sys.stderr.write(f"  Namespace: {self.namespace}\n")
            sys.stderr.write(f"  OCI Config: {json.dumps(self.config, indent=2)}\n")

    def _load_oci_config(self):
        """Load OCI configuration, allowing for environment variable overrides."""
        try:
            # Attempt to load from default file, but allow overrides later
            config = oci.config.from_file()
            # If region is explicitly set in env, override config
            if os.getenv('LOGAN_REGION'):
                config['region'] = os.getenv('LOGAN_REGION')
            return config
        except Exception as e:
            # If config file fails, try to create a minimal config from env vars
            if os.getenv('OCI_TENANCY') and os.getenv('OCI_USER') and os.getenv('OCI_FINGERPRINT') and \
               os.getenv('OCI_KEY_FILE') and os.getenv('LOGAN_REGION'):
                print("Warning: OCI config file not found, attempting to use environment variables for config.")
                return {
                    "tenancy": os.getenv('OCI_TENANCY'),
                    "user": os.getenv('OCI_USER'),
                    "fingerprint": os.getenv('OCI_FINGERPRINT'),
                    "key_file": os.getenv('OCI_KEY_FILE'),
                    "region": os.getenv('LOGAN_REGION')
                }
            raise Exception(f"Failed to load OCI config: {e}. Ensure ~/.oci/config is set up or all OCI_* env vars are present.")

    def _get_namespace(self):
        """Get tenancy namespace"""
        try:
            object_storage_client = oci.object_storage.ObjectStorageClient(self.config)
            namespace = object_storage_client.get_namespace().data
            return namespace
        except Exception as e:
            raise Exception(f"Failed to get namespace: {e}")

    def execute_query_like_console(self, query, time_period_minutes=60, max_count=2000, bypass_all_processing=False):
        """Execute query with same parameters as OCI Console"""
        try:
            from datetime import datetime, timedelta, timezone
            
            # Calculate time range like console
            end_time = datetime.now(timezone.utc)
            start_time = end_time - timedelta(minutes=time_period_minutes)
            
            # Debug: Print the exact query being sent (only if debug enabled)
            if os.getenv('LOGAN_DEBUG') == 'true':
                sys.stderr.write(f"LoganClient: Console mode query string: '{query}'\n")
                sys.stderr.write(f"LoganClient: Query length: {len(query)}\n")
            
            if bypass_all_processing:
                # Complete bypass - but still need minimal OCI API compatibility fixes
                console_query = query.replace("!= null", "!= \"\"").replace("is not null", "!= \"\"")
                # Also fix != value patterns that OCI API doesn't support
                import re
                pattern = r"(\w+)\s*!=\s*([^\s|]+)"
                matches = re.findall(pattern, console_query)
                for field, value in matches:
                    if value != "null":
                        old_expr = f"{field} != {value}"
                        new_expr = f"{field} != \"\""
                        console_query = console_query.replace(old_expr, new_expr)
                        if os.getenv('LOGAN_DEBUG') == 'true':
                            sys.stderr.write(f"LoganClient: API compatibility fix: '{old_expr}' -> '{new_expr}'\n")
                
                if os.getenv('LOGAN_DEBUG') == 'true':
                    sys.stderr.write(f"LoganClient: Complete bypass enabled - only API compatibility fixes applied\n")
            else:
                # Try minimal conversion - fix != operators for OCI compatibility
                console_query = query.replace("!= null", "!= \"\"").replace("is not null", "!= \"\"")
                
                # Also fix specific value comparisons like != T1574.002
                import re
                # Pattern to match field != value (but not != null which we already handled)
                pattern = r"(\w+)\s*!=\s*([^\s|]+)"
                matches = re.findall(pattern, console_query)
                
                for field, value in matches:
                    if value != "null":  # Skip null comparisons we already handled
                        # Convert field != value to field is not null (simpler approach)
                        old_expr = f"{field} != {value}"
                        new_expr = f"{field} != \"\""
                        console_query = console_query.replace(old_expr, new_expr)
                        if os.getenv('LOGAN_DEBUG') == 'true':
                            sys.stderr.write(f"LoganClient: Converted '{old_expr}' to '{new_expr}' for OCI compatibility\n")
                
                if console_query != query and os.getenv('LOGAN_DEBUG') == 'true':
                    sys.stderr.write(f"LoganClient: Final converted query: {console_query}\n")
            
            # Create query details matching console parameters exactly
            query_details = {
                "subSystem": "LOG",
                "queryString": console_query,
                "shouldRunAsync": False,  # Use sync for simpler testing
                "shouldIncludeTotalCount": True,
                "compartmentId": self.config["tenancy"],
                "compartmentIdInSubtree": True,
                "timeFilter": {
                    "timeStart": start_time.isoformat().replace('+00:00', 'Z'),
                    "timeEnd": end_time.isoformat().replace('+00:00', 'Z'),
                    "timeZone": "UTC"
                },
                "maxTotalCount": max_count
            }
            
            if os.getenv('LOGAN_DEBUG') == 'true':
                sys.stderr.write(f"LoganClient: Console payload: {query_details}\n")
                sys.stderr.write(f"LoganClient: Executing console-like query with compartment_id_in_subtree=True\n")
                sys.stderr.write(f"LoganClient: Time range: {start_time.isoformat()} to {end_time.isoformat()}\n")
            
            # Make direct HTTP request to match console exactly
            import requests
            from oci.signer import Signer
            
            # Create OCI request signer
            signer = Signer(
                tenancy=self.config["tenancy"],
                user=self.config["user"],
                fingerprint=self.config["fingerprint"],
                private_key_file_location=self.config["key_file"],
                pass_phrase=self.config.get("pass_phrase")
            )
            
            # Console URL format
            url = f"https://loganalytics.{self.region}.oci.oraclecloud.com/20200601/namespaces/{self.namespace}/search/actions/query"
            params = {"limit": max_count}
            
            if os.getenv('LOGAN_DEBUG') == 'true':
                sys.stderr.write(f"LoganClient: Making direct HTTP request to: {url}\n")
            
            response = requests.post(url, json=query_details, auth=signer, params=params)
            
            if response.status_code == 200:
                # Synchronous response
                data = response.json()
                result = {
                    "success": True,
                    "results": data.get("items", []),
                    "total_count": data.get("totalCount", 0),
                    "execution_time": data.get("queryExecutionTimeInMs", 0),
                    "are_partial_results": data.get("arePartialResults", False)
                }
            elif response.status_code == 201:
                # Async response - query was submitted
                data = response.json()
                if os.getenv('LOGAN_DEBUG') == 'true':
                    sys.stderr.write(f"LoganClient: Async query submitted successfully, percent complete: {data.get('percentComplete', 0)}\n")
                
                # For now, treat async as successful with empty results
                # In a full implementation, you'd poll for the actual results
                result = {
                    "success": True,
                    "results": [],
                    "total_count": 0,
                    "execution_time": 0,
                    "are_partial_results": False,
                    "async_query": True,
                    "percent_complete": data.get("percentComplete", 0)
                }
            else:
                if os.getenv('LOGAN_DEBUG') == 'true':
                    sys.stderr.write(f"LoganClient: HTTP Error {response.status_code}: {response.text}\n")
                return {"error": f"HTTP {response.status_code}: {response.text}", "success": False}
            
            result["query_used"] = console_query
            result["original_query"] = query
            result["time_period_minutes"] = time_period_minutes
            result["console_mode"] = True
            result["compartment_id_in_subtree"] = True
            
            return result
            
        except oci.exceptions.ServiceError as e:
            sys.stderr.write(f"OCI Service Error in console mode: Code={e.code}, Message={e.message}\n")
            return {"error": f"OCI Service Error: {e.message}", "success": False}
        except Exception as e:
            sys.stderr.write(f"General error in console mode: {e}\n")
            return {"error": str(e), "success": False}

    def execute_query(self, query, time_period_minutes=1440, max_count=50):
        """Execute a LOGAN query with enhanced time handling and retry logic"""
        original_query = query
        
        # Pre-process query to fix common syntax issues
        query = self._fix_query_syntax(query)
        
        # Use enhanced time filtering if query needs it
        if time_period_minutes and not self._has_time_filter(query):
            try:
                query = self._add_time_filter_with_field(query, time_period_minutes, 'dateRelative')
                
                query_details = oci.log_analytics.models.QueryDetails(
                    compartment_id=self.compartment_id,
                    query_string=query,
                    sub_system=oci.log_analytics.models.QueryDetails.SUB_SYSTEM_LOG,
                    max_total_count=max_count
                )
                
                response = self.client.query(self.namespace, query_details)
                result = self._format_response(response.data)
                
                # Add timing information
                result["query_used"] = query
                result["time_period_minutes"] = time_period_minutes
                result["time_method_used"] = "timestamp"
                
                return result
                
            except oci.exceptions.ServiceError as e:
                sys.stderr.write(f"OCI Service Error with timestamp method: Code={e.code}, Message={e.message}\n")
                # Try fallback without time filtering
                return self._execute_query_fallback(original_query, max_count)
        else:
            # Original query execution without time filtering
            try:
                query_details = oci.log_analytics.models.QueryDetails(
                    compartment_id=self.compartment_id,
                    query_string=query,
                    sub_system=oci.log_analytics.models.QueryDetails.SUB_SYSTEM_LOG,
                    max_total_count=max_count
                )
                
                response = self.client.query(self.namespace, query_details)
                result = self._format_response(response.data)
                
                # Add timing information
                result["query_used"] = query
                result["time_period_minutes"] = time_period_minutes
                
                return result
                
            except oci.exceptions.ServiceError as e:
                sys.stderr.write(f"OCI Service Error during query execution: Code={e.code}, Message={e.message}, Headers={e.headers}\n")
                return {"error": f"OCI Service Error: {e.message}", "success": False}
            except Exception as e:
                sys.stderr.write(f"General error during query execution: {e}\n")
                return {"error": str(e), "success": False}
    
    def _fix_query_syntax(self, query):
        """Fix common OCI Logging Analytics query syntax issues"""
        # Fix Action field syntax - remove quotes and use proper syntax
        query = query.replace("Action in (drop, reject)", "Action in ('drop', 'reject')")
        
        # Fix != null syntax to proper OCI syntax - use exists/not empty check
        query = query.replace("!= null", "!= \"\"").replace("is not null", "!= \"\"")
        
        # Fix stats function syntax - OCI Logging Analytics uses different syntax
        import re
        
        # Fix count(*) to count() - OCI doesn't support count(*)
        query = query.replace("stats count(*)", "stats count")
        
        # Fix count(field) syntax - fix WAF-specific syntax issues
        # Special handling for WAF queries with count('Host IP Address (Client)')
        if "WAF" in query and "count('Host IP Address (Client)')" in query:
            query = query.replace("count('Host IP Address (Client)')", "count")
        
        # General count(field) syntax fix
        count_field_pattern = r"stats count\(['\"]?([^')]+)['\"]?\)"
        if re.search(count_field_pattern, query):
            # For WAF and other specific log sources, try to use count() without field
            if "WAF" in query or "Suricata" in query:
                query = re.sub(count_field_pattern, "stats count", query)
            else:
                # For VCN Flow logs, just use count without parentheses
                query = re.sub(count_field_pattern, "stats count", query)
        
        # Fix log source references to match available sources (only for known bad sources)
        query = query.replace("'Windows Sysmon Events'", "'OCI Audit Logs'")
        query = query.replace("'Event ID'", "'Event Type'")
        
        # Fix top command syntax
        query = query.replace("| top 10 Count", "| sort -Count | head 10")
        
        # Remove lookup commands that might not be available (but preserve WAF lookups)
        if "| lookup" in query and "WAF" not in query and "Suricata" not in query:
            # Remove lookup part and everything after it
            lookup_pos = query.find("| lookup")
            if lookup_pos > 0:
                query = query[:lookup_pos].strip()
        
        return query
    
    def _execute_query_fallback(self, original_query, max_count):
        """Fallback query execution without time filtering"""
        try:
            # Fix syntax and try again
            query = self._fix_query_syntax(original_query)
            
            # Simplify the query further if it's still complex
            if "| stats" in query and "| sort" in query:
                # Remove sort to see if that helps
                sort_pos = query.find("| sort")
                if sort_pos > 0:
                    query = query[:sort_pos].strip()
            
            query_details = oci.log_analytics.models.QueryDetails(
                compartment_id=self.compartment_id,
                query_string=query,
                sub_system=oci.log_analytics.models.QueryDetails.SUB_SYSTEM_LOG,
                max_total_count=max_count
            )
            
            response = self.client.query(self.namespace, query_details)
            result = self._format_response(response.data)
            
            result["query_used"] = query
            result["fallback_used"] = True
            
            return result
            
        except oci.exceptions.ServiceError as e:
            sys.stderr.write(f"OCI Service Error in fallback: Code={e.code}, Message={e.message}\n")
            return {"error": f"OCI Service Error: {e.message}", "success": False}
        except Exception as e:
            sys.stderr.write(f"General error in fallback: {e}\n")
            return {"error": str(e), "success": False}
    
    def _has_time_filter(self, query):
        """Check if query already has time filtering"""
        query_lower = query.lower()
        return ("where" in query_lower and 
                ("datetime" in query_lower or "time " in query_lower or 
                 "timestamp" in query_lower or "daterelative" in query_lower or
                 "timefilter" in query_lower))
    
    def _add_time_filter(self, query, time_period_minutes):
        """Add time filter to query using UTC timezone (legacy method)"""
        return self._add_time_filter_with_field(query, time_period_minutes, 'Datetime')
    
    def _should_skip_time_filter(self, query):
        """Check if query should skip time filter addition"""
        skip_patterns = [
            "lookup table",           # Queries with lookup tables
            "com.oraclecloud.logging.custom",  # Custom log sources
            "eval vol = unit",        # Complex evaluation queries
            "geostats",              # Geographic statistics
            "highlightgroups",       # Visualization queries
            "classify",              # Classification queries
            "timestats",             # Time-based statistics
            "link span",             # Link operations
            "compare timeshift",     # Trend comparison queries
            "fields SuricataSignature", # Suricata specific queries
            "Request Protection Rule IDs", # WAF specific queries
        ]
        
        return any(pattern in query for pattern in skip_patterns)
    
    def _add_time_filter_with_field(self, query, time_period_minutes, time_field):
        """Add time filter to query using OCI-specific time functions"""
        
        # Check if this is a complex query that should not have time filters added
        if self._should_skip_time_filter(query):
            print(f"Skipping time filter for complex query: {query[:100]}...", file=sys.stderr)
            return query
        
        # Debug logging
        if os.getenv('LOGAN_DEBUG') == 'true':
            sys.stderr.write(f"LoganClient: Adding time filter to query. Time period: {time_period_minutes} minutes\n")
            sys.stderr.write(f"LoganClient: Original query: {query}\n")
        
        # Use proper OCI Logging Analytics time syntax with dateRelative
        if time_period_minutes < 60:
            time_unit = f"{time_period_minutes}m"
        elif time_period_minutes < 1440:  # Less than 24 hours
            time_unit = f"{time_period_minutes // 60}h"
        else:
            time_unit = f"{time_period_minutes // 1440}d"
        
        # Use dateRelative function which is the standard OCI way
        time_filter = f"Time > dateRelative({time_unit})"
        
        if query.strip() == "*":
            return f"* | where {time_filter} | stats count as logrecords by 'Log Source' | sort -logrecords"
        else:
            # Check if query has a pipe (|) which indicates pipeline operations
            if "|" in query:
                # Find the first pipe to separate the initial filter from the rest
                first_pipe_pos = query.find("|")
                before_pipe = query[:first_pipe_pos].strip()
                after_pipe = query[first_pipe_pos:].strip()
                
                # Add time filter to the initial conditions before the pipe
                if " and " in before_pipe.lower() or " or " in before_pipe.lower():
                    # Add time filter to existing conditions
                    modified_query = f"{before_pipe} and {time_filter} {after_pipe}"
                else:
                    # No conditions yet, just add the time filter
                    modified_query = f"{before_pipe} and {time_filter} {after_pipe}"
                
                # Debug logging
                if os.getenv('LOGAN_DEBUG') == 'true':
                    sys.stderr.write(f"LoganClient: Modified query with time filter: {modified_query}\n")
                
                return modified_query
            elif " and " in query.lower() or " or " in query.lower():
                # Simple query with conditions but no pipes
                return f"{query} and {time_filter}"
            else:
                # Handle other query patterns
                if query.startswith("* | stats"):
                    # Remove "* | " and add time filter
                    stats_part = query[4:]  # Remove "* | "
                    return f"* | where {time_filter} | {stats_part}"
                elif query.startswith("*"):
                    # Query starts with * but no stats
                    return f"* | where {time_filter} | {query[1:].strip()}"
                else:
                    # Default: add time filter as AND condition
                    return f"{query} and {time_filter}"

    def _convert_minutes_to_time_unit(self, time_period_minutes):
        """Convert minutes to OCI time unit format"""
        if time_period_minutes < 60:
            return f"{time_period_minutes}m"
        elif time_period_minutes < 1440:  # Less than 24 hours
            return f"{time_period_minutes // 60}h"
        else:
            return f"{time_period_minutes // 1440}d"

    def _format_response(self, response_data):
        """Format the response data"""
        try:
            results = []
            if hasattr(response_data, 'items') and response_data.items:
                for item in response_data.items:
                    if isinstance(item, dict):
                        results.append(item)
                    else:
                        # Convert OCI model to dict
                        item_dict = {}
                        for attr in dir(item):
                            if not attr.startswith('_'):
                                try:
                                    value = getattr(item, attr)
                                    if not callable(value):
                                        item_dict[attr] = value
                                except:
                                    pass
                        results.append(item_dict)

            return {
                "success": True,
                "results": results,
                "total_count": len(results),
                "execution_time": getattr(response_data, 'query_execution_time_in_ms', 0),
                "are_partial_results": getattr(response_data, 'are_partial_results', False)
            }
        except Exception as e:
            return {"error": f"Failed to format response: {e}", "success": False}

    def list_log_sources(self, time_period_minutes=1440):
        """List available log sources with enhanced information"""
        try:
            # For log sources, we can either use a shorter time period or no time filtering
            # Since we want to see all available sources, let's use a longer time period
            if time_period_minutes > 0:
                # Use a manual time filter that works better with stats
                query = f"* | where Time > dateRelative({self._convert_minutes_to_time_unit(time_period_minutes)}) | stats count as logrecords by 'Log Source' | sort -logrecords"
            else:
                query = "* | stats count as logrecords by 'Log Source' | sort -logrecords"
            
            # Execute without automatic time filtering since we handle it manually
            result = self.execute_query(query, 0)
            
            if result.get("success"):
                sources = []
                for item in result.get("results", []):
                    log_source = item.get("Log Source", "Unknown")
                    count = item.get("logrecords", 0)
                    sources.append({
                        "name": log_source,
                        "source": log_source,
                        "count": count,
                        "events": count,
                        "description": f"OCI Logging Analytics source: {log_source}",
                        "status": "active" if count > 0 else "inactive"
                    })
                
                # If no sources found, provide defaults
                if not sources:
                    sources = [
                        {
                            "name": "OCI Audit",
                            "source": "OCI Audit",
                            "count": 0,
                            "events": 0,
                            "description": "OCI Audit Service logs for API calls and configuration changes",
                            "status": "available"
                        },
                        {
                            "name": "VCN Flow Logs",
                            "source": "VCN Flow Logs", 
                            "count": 0,
                            "events": 0,
                            "description": "Virtual Cloud Network flow logs for network traffic analysis",
                            "status": "available"
                        },
                        {
                            "name": "Cloud Guard",
                            "source": "Cloud Guard",
                            "count": 0,
                            "events": 0,
                            "description": "OCI Cloud Guard security findings and threat detections",
                            "status": "available"
                        }
                    ]
                
                return {
                    "success": True,
                    "sources": sources,
                    "total_sources": len(sources),
                    "namespace": self.namespace,
                    "compartment_id": self.compartment_id,
                    "time_period_minutes": time_period_minutes
                }
            
            return result
            
        except Exception as e:
            return {"error": str(e), "success": False}

    def parse_query(self, query):
        """Parse and validate query structure using OCI SDK"""
        try:
            parse_details = oci.log_analytics.models.ParseQueryDetails(
                query_string=query,
                sub_system=oci.log_analytics.models.ParseQueryDetails.SUB_SYSTEM_LOG
            )
            
            response = self.client.parse_query(self.namespace, parse_details)
            
            # Convert OCI object to serializable dict
            parsed_data = {}
            if hasattr(response.data, '__dict__'):
                for attr in dir(response.data):
                    if not attr.startswith('_') and not callable(getattr(response.data, attr)):
                        try:
                            value = getattr(response.data, attr)
                            # Handle basic types and lists
                            if isinstance(value, (str, int, float, bool, type(None))):
                                parsed_data[attr] = value
                            elif isinstance(value, list):
                                parsed_data[attr] = [str(item) for item in value]
                            else:
                                parsed_data[attr] = str(value)
                        except:
                            pass
            
            return {
                "success": True,
                "parsed_query": parsed_data,
                "original_query": query
            }
        except Exception as e:
            sys.stderr.write(f"Query parsing error: {e}\n")
            return {"error": str(e), "success": False}
    
    def get_suggestions(self, partial_query, query_type="SEARCH"):
        """Get auto-completion suggestions for queries"""
        try:
            suggest_details = oci.log_analytics.models.SuggestDetails(
                compartment_id=self.compartment_id,
                query_string=partial_query,
                sub_system=oci.log_analytics.models.SuggestDetails.SUB_SYSTEM_LOG
            )
            
            response = self.client.suggest(self.namespace, suggest_details)
            return {
                "success": True,
                "suggestions": response.data
            }
        except Exception as e:
            sys.stderr.write(f"Suggestion error: {e}\n")
            return {"error": str(e), "success": False}
    
    def get_used_sources(self, time_period_minutes=1440):
        """Get list of log sources that actually have data"""
        try:
            # Query to get sources with data in the specified time period
            time_unit = self._convert_minutes_to_time_unit(time_period_minutes)
            sources_query = f"* | where Time > dateRelative({time_unit}) | stats count as records by 'Log Source' | where records > 0 | sort -records"
            
            query_details = oci.log_analytics.models.QueryDetails(
                compartment_id=self.compartment_id,
                query_string=sources_query,
                sub_system=oci.log_analytics.models.QueryDetails.SUB_SYSTEM_LOG,
                max_total_count=100
            )
            
            response = self.client.query(self.namespace, query_details)
            result = self._format_response(response.data)
            
            if result.get("success"):
                sources = []
                for item in result.get("results", []):
                    source_name = item.get("Log Source", "")
                    record_count = item.get("records", 0)
                    if source_name and record_count > 0:
                        sources.append({
                            "name": source_name,
                            "record_count": record_count
                        })
                return {
                    "success": True,
                    "sources": sources,
                    "total_count": len(sources)
                }
            else:
                return result
                
        except Exception as e:
            sys.stderr.write(f"Get used sources error: {e}\n")
            return {"error": str(e), "success": False}

    def get_source_parsers(self, source_name):
        """Get parsers associated with a log source"""
        try:
            response = self.client.list_parsers(
                self.namespace,
                source_name=source_name
            )
            
            parsers = []
            for parser in response.data.items:
                parser_info = {
                    "name": getattr(parser, 'name', ''),
                    "display_name": getattr(parser, 'display_name', ''),
                    "type": getattr(parser, 'type', ''),
                    "description": getattr(parser, 'description', ''),
                    "is_system": getattr(parser, 'is_system', False)
                }
                parsers.append(parser_info)
            
            return {
                "success": True,
                "parsers": parsers,
                "source_name": source_name,
                "total_count": len(parsers)
            }
        except Exception as e:
            sys.stderr.write(f"Get source parsers error: {e}\n")
            return {"error": str(e), "success": False}

    def list_fields(self, source_names=None, is_system=None, field_type=None, used_sources_only=False, time_period_minutes=1440):
        """List available fields for query building, optionally filtered to used sources only"""
        try:
            # If user wants only fields from used sources, get those first
            if used_sources_only:
                used_sources_result = self.get_used_sources(time_period_minutes)
                if not used_sources_result.get("success"):
                    return used_sources_result
                    
                # Extract source names that actually have data
                used_source_names = [source["name"] for source in used_sources_result.get("sources", [])]
                if not used_source_names:
                    return {
                        "success": True,
                        "fields": [],
                        "total_count": 0,
                        "message": "No sources with data found in the specified time period"
                    }
                
                # Override source_names with the used sources
                if source_names:
                    # Intersect provided source_names with used sources
                    source_names = [s for s in source_names if s in used_source_names]
                else:
                    source_names = used_source_names
            
            # Get all fields (since list_fields doesn't support source filtering, we'll filter after)
            response = self.client.list_fields(self.namespace)
            
            fields = []
            for field in response.data.items:
                field_info = {
                    "name": getattr(field, 'name', ''),
                    "display_name": getattr(field, 'display_name', ''),
                    "type": getattr(field, 'type', ''),
                    "is_system": getattr(field, 'is_system', False),
                    "description": getattr(field, 'description', ''),
                    "unit_type": getattr(field, 'unit_type', ''),
                    "is_searchable": getattr(field, 'is_searchable', True),
                    "is_facetable": getattr(field, 'is_facetable', False)
                }
                
                # Apply client-side filtering
                if field_type and field_info["type"] != field_type:
                    continue
                if is_system is not None and field_info["is_system"] != is_system:
                    continue
                
                # For used_sources_only, we need to check if this field is actually used
                # This is a best-effort approach since OCI doesn't provide direct field-to-source mapping
                if used_sources_only and source_names:
                    # Check if field name suggests it's related to the used sources
                    field_name_lower = field_info["name"].lower()
                    field_desc_lower = (field_info["description"] or "").lower()
                    
                    # Include common fields that are likely to be present
                    is_common_field = any(common in field_name_lower for common in [
                        'time', 'datetime', 'log', 'source', 'message', 'level', 'severity',
                        'host', 'ip', 'user', 'event', 'action', 'status', 'count'
                    ])
                    
                    # Include fields that mention any of our used sources
                    is_source_related = any(source.lower().replace(" ", "").replace("-", "") in field_desc_lower.replace(" ", "").replace("-", "") 
                                          for source in source_names)
                    
                    # Skip fields that are clearly not relevant to our sources
                    if not (is_common_field or is_source_related or field_info["is_system"]):
                        continue
                
                fields.append(field_info)
            
            result_info = {
                "success": True,
                "fields": fields,
                "total_count": len(fields)
            }
            
            if used_sources_only and source_names:
                result_info["filtered_for_sources"] = source_names
                result_info["total_available_sources"] = len(source_names)
            
            return result_info
            
        except Exception as e:
            sys.stderr.write(f"List fields error: {e}\n")
            return {"error": str(e), "success": False}
    
    def list_source_event_types(self, source_name):
        """List event types for a specific log source"""
        try:
            response = self.client.list_source_event_types(
                self.namespace, 
                source_name=source_name
            )
            
            event_types = []
            for event_type in response.data.items:
                event_info = {
                    "event_type": getattr(event_type, 'event_type', ''),
                    "event_type_display_name": getattr(event_type, 'event_type_display_name', ''),
                    "categories": getattr(event_type, 'categories', []),
                    "description": getattr(event_type, 'description', '')
                }
                event_types.append(event_info)
            
            return {
                "success": True,
                "event_types": event_types,
                "source_name": source_name,
                "total_count": len(event_types)
            }
        except Exception as e:
            sys.stderr.write(f"List source event types error: {e}\n")
            return {"error": str(e), "success": False}
    
    def get_storage_usage(self, time_period_days=30):
        """Get storage usage information for log analytics"""
        try:
            from datetime import datetime, timedelta, timezone
            
            # Calculate time range for display purposes
            end_time = datetime.now(timezone.utc)
            start_time = end_time - timedelta(days=time_period_days)
            
            # Call the OCI method with correct signature
            response = self.client.get_storage_usage(self.namespace)
            
            # Extract actual fields from the response
            # Let's inspect what's actually in the response
            if os.getenv('LOGAN_DEBUG') == 'true':
                sys.stderr.write(f"Storage usage response type: {type(response.data)}\n")
                sys.stderr.write(f"Storage usage response data: {response.data}\n")
                if hasattr(response.data, '__dict__'):
                    sys.stderr.write(f"Response attributes: {list(response.data.__dict__.keys())}\n")
            
            # Extract available fields from the actual response
            usage_data = {
                "time_period_days": time_period_days,
                "time_start": start_time.isoformat(),
                "time_end": end_time.isoformat()
            }
            
            # Map the correct field names from OCI API
            usage_data["active_data_bytes"] = getattr(response.data, 'active_data_size_in_bytes', 0)
            usage_data["archived_data_bytes"] = getattr(response.data, 'archived_data_size_in_bytes', 0)
            usage_data["recalled_data_bytes"] = getattr(response.data, 'recalled_archived_data_size_in_bytes', 0)
            
            # Calculate total storage (active + archived + recalled)
            usage_data["total_storage_bytes"] = (
                usage_data["active_data_bytes"] + 
                usage_data["archived_data_bytes"] + 
                usage_data["recalled_data_bytes"]
            )
            
            # Add metadata about the data source
            usage_data["data_source"] = "OCI Logging Analytics Storage Usage API"
            usage_data["namespace"] = self.namespace
            
            return {
                "success": True,
                "storage_usage": usage_data
            }
        except Exception as e:
            sys.stderr.write(f"Storage usage error: {e}\n")
            return {"error": str(e), "success": False}

    def test_connection(self):
        """Test the connection to OCI Logging Analytics"""
        try:
            # Simple test query
            result = self.execute_query("* | head 1", 60, 1)
            return {
                "success": result.get("success", False),
                "region": self.region,
                "namespace": self.namespace,
                "compartment_id": self.compartment_id[:20] + "..." if len(self.compartment_id) > 20 else self.compartment_id
            }
        except Exception as e:
            return {"error": str(e), "success": False}

def main():
    parser = argparse.ArgumentParser(description='OCI Logging Analytics Client')
    parser.add_argument('action', choices=['query', 'list_sources', 'test', 'parse', 'suggest', 'list_fields', 'list_event_types', 'storage_usage', 'get_used_sources'], help='Action to perform')
    parser.add_argument('--query', help='Query string for search')
    parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    parser.add_argument('--max-count', type=int, default=100, help='Maximum results count')
    parser.add_argument('--source-name', help='Source name for event types listing')
    parser.add_argument('--field-type', help='Field type filter for list_fields')
    parser.add_argument('--is-system', type=bool, help='Filter system fields for list_fields')
    parser.add_argument('--time-period-days', type=int, default=30, help='Time period in days for storage usage')
    parser.add_argument('--used-sources-only', action='store_true', help='Show only fields from sources with data')
    
    args = parser.parse_args()
    
    try:
        client = LoganClient()
        
        if args.action == 'test':
            result = client.test_connection()
        elif args.action == 'list_sources':
            result = client.list_log_sources(args.time_period)
        elif args.action == 'query':
            if not args.query:
                result = {"error": "Query string required", "success": False}
            else:
                result = client.execute_query(args.query, args.time_period, args.max_count)
        elif args.action == 'parse':
            if not args.query:
                result = {"error": "Query string required for parsing", "success": False}
            else:
                result = client.parse_query(args.query)
        elif args.action == 'suggest':
            if not args.query:
                result = {"error": "Partial query string required for suggestions", "success": False}
            else:
                result = client.get_suggestions(args.query)
        elif args.action == 'list_fields':
            time_period_minutes = args.time_period_days * 24 * 60 if args.used_sources_only else 1440
            result = client.list_fields(
                field_type=args.field_type,
                is_system=args.is_system,
                used_sources_only=args.used_sources_only,
                time_period_minutes=time_period_minutes
            )
        elif args.action == 'list_event_types':
            if not args.source_name:
                result = {"error": "Source name required for listing event types", "success": False}
            else:
                result = client.list_source_event_types(args.source_name)
        elif args.action == 'storage_usage':
            result = client.get_storage_usage(args.time_period_days)
        elif args.action == 'get_used_sources':
            time_period_minutes = args.time_period_days * 24 * 60
            result = client.get_used_sources(time_period_minutes)
        else:
            result = {"error": "Invalid action", "success": False}
            
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
