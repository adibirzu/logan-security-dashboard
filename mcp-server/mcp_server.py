#!/usr/bin/env python3
"""
MCP Server for OCI Logging Analytics
Provides Model Context Protocol interface for Logan Security Dashboard
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

# Add the scripts directory to Python path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from logan_client import LoganClient
from security_analyzer import SecurityAnalyzer
from query_validator import QueryValidator

# MCP imports
try:
    from mcp import Server
    from mcp.server.models import InitializationOptions
    from mcp.server.stdio import stdio_server
    from mcp.types import (
        Resource,
        Tool,
        TextContent,
        ImageContent,
        EmbeddedResource,
        LoggingLevel
    )
except ImportError:
    print("Error: MCP package not found. Install with: pip install mcp")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('mcp_server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("logan-mcp-server")

class LoganMCPServer:
    """MCP Server for OCI Logging Analytics operations"""
    
    def __init__(self):
        self.server = Server("logan-security-dashboard")
        self.logan_client = None
        self.security_analyzer = None
        self.query_validator = None
        self.setup_handlers()
        
    def setup_handlers(self):
        """Set up MCP server handlers"""
        
        # Initialize handlers
        @self.server.list_resources()
        async def handle_list_resources() -> List[Resource]:
            """List available resources"""
            return [
                Resource(
                    uri="logan://security-overview",
                    name="Security Overview",
                    description="Real-time security metrics and dashboard statistics",
                    mimeType="application/json"
                ),
                Resource(
                    uri="logan://log-sources",
                    name="Log Sources",
                    description="Available OCI Logging Analytics log sources",
                    mimeType="application/json"
                ),
                Resource(
                    uri="logan://fields",
                    name="Field Discovery",
                    description="Available fields for query building",
                    mimeType="application/json"
                ),
                Resource(
                    uri="logan://storage-usage",
                    name="Storage Usage",
                    description="OCI Logging Analytics storage consumption",
                    mimeType="application/json"
                )
            ]
        
        @self.server.read_resource()
        async def handle_read_resource(uri: str) -> str:
            """Read a specific resource"""
            if not self._ensure_clients():
                return json.dumps({"error": "Failed to initialize OCI clients", "success": False})
                
            try:
                if uri == "logan://security-overview":
                    result = self.security_analyzer.get_dashboard_stats()
                    return json.dumps(result)
                elif uri == "logan://log-sources":
                    result = self.logan_client.list_sources()
                    return json.dumps(result)
                elif uri == "logan://fields":
                    result = self.logan_client.list_fields()
                    return json.dumps(result)
                elif uri == "logan://storage-usage":
                    result = self.logan_client.get_storage_usage()
                    return json.dumps(result)
                else:
                    return json.dumps({"error": "Resource not found", "success": False})
            except Exception as e:
                logger.error(f"Error reading resource {uri}: {e}")
                return json.dumps({"error": str(e), "success": False})
        
        @self.server.list_tools()
        async def handle_list_tools() -> List[Tool]:
            """List available tools"""
            return [
                Tool(
                    name="execute_query",
                    description="Execute a custom OCI Logging Analytics query",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The OCI Logging Analytics query to execute"
                            },
                            "time_period_minutes": {
                                "type": "integer",
                                "description": "Time period in minutes (default: 1440)",
                                "default": 1440
                            },
                            "max_count": {
                                "type": "integer",
                                "description": "Maximum number of results (default: 100)",
                                "default": 100
                            },
                            "bypass_validation": {
                                "type": "boolean",
                                "description": "Skip query validation (default: false)",
                                "default": False
                            }
                        },
                        "required": ["query"]
                    }
                ),
                Tool(
                    name="validate_query",
                    description="Validate an OCI Logging Analytics query syntax",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The query to validate"
                            }
                        },
                        "required": ["query"]
                    }
                ),
                Tool(
                    name="get_security_events",
                    description="Get security events with filtering options",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "event_type": {
                                "type": "string",
                                "description": "Type of security event (failed_logins, privilege_escalation, etc.)"
                            },
                            "severity": {
                                "type": "string",
                                "description": "Event severity filter (low, medium, high, critical)"
                            },
                            "time_period_minutes": {
                                "type": "integer",
                                "description": "Time period in minutes (default: 1440)",
                                "default": 1440
                            }
                        }
                    }
                ),
                Tool(
                    name="get_log_sources",
                    description="Get log sources with activity information",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "time_period_minutes": {
                                "type": "integer",
                                "description": "Time period in minutes (default: 1440)",
                                "default": 1440
                            },
                            "active_only": {
                                "type": "boolean",
                                "description": "Show only active sources (default: false)",
                                "default": False
                            }
                        }
                    }
                ),
                Tool(
                    name="discover_fields",
                    description="Discover available fields for query building",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "field_type": {
                                "type": "string",
                                "description": "Filter by field type"
                            },
                            "is_system": {
                                "type": "boolean",
                                "description": "Filter system vs custom fields"
                            },
                            "used_sources_only": {
                                "type": "boolean",
                                "description": "Show only fields from active sources",
                                "default": False
                            },
                            "time_period_minutes": {
                                "type": "integer",
                                "description": "Time period for source activity (default: 1440)",
                                "default": 1440
                            }
                        }
                    }
                ),
                Tool(
                    name="get_storage_usage",
                    description="Get OCI Logging Analytics storage usage metrics",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "time_period_days": {
                                "type": "integer",
                                "description": "Time period in days (default: 30)",
                                "default": 30
                            }
                        }
                    }
                ),
                Tool(
                    name="test_connection",
                    description="Test connection to OCI Logging Analytics",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                ),
                Tool(
                    name="get_dashboard_stats",
                    description="Get comprehensive dashboard statistics",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "time_period_minutes": {
                                "type": "integer",
                                "description": "Time period in minutes (default: 1440)",
                                "default": 1440
                            }
                        }
                    }
                )
            ]
        
        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
            """Handle tool calls"""
            if not self._ensure_clients():
                return [TextContent(
                    type="text",
                    text=json.dumps({"error": "Failed to initialize OCI clients", "success": False})
                )]
            
            try:
                if name == "execute_query":
                    result = await self._execute_query(arguments)
                elif name == "validate_query":
                    result = await self._validate_query(arguments)
                elif name == "get_security_events":
                    result = await self._get_security_events(arguments)
                elif name == "get_log_sources":
                    result = await self._get_log_sources(arguments)
                elif name == "discover_fields":
                    result = await self._discover_fields(arguments)
                elif name == "get_storage_usage":
                    result = await self._get_storage_usage(arguments)
                elif name == "test_connection":
                    result = await self._test_connection(arguments)
                elif name == "get_dashboard_stats":
                    result = await self._get_dashboard_stats(arguments)
                else:
                    result = {"error": f"Unknown tool: {name}", "success": False}
                
                return [TextContent(type="text", text=json.dumps(result, indent=2))]
                
            except Exception as e:
                logger.error(f"Error calling tool {name}: {e}")
                return [TextContent(
                    type="text",
                    text=json.dumps({"error": str(e), "success": False})
                )]
    
    def _ensure_clients(self) -> bool:
        """Ensure OCI clients are initialized"""
        try:
            if self.logan_client is None:
                self.logan_client = LoganClient()
            if self.security_analyzer is None:
                self.security_analyzer = SecurityAnalyzer()
            if self.query_validator is None:
                self.query_validator = QueryValidator()
            return True
        except Exception as e:
            logger.error(f"Failed to initialize clients: {e}")
            return False
    
    async def _execute_query(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a custom query"""
        query = arguments.get("query")
        time_period_minutes = arguments.get("time_period_minutes", 1440)
        max_count = arguments.get("max_count", 100)
        bypass_validation = arguments.get("bypass_validation", False)
        
        if not query:
            return {"error": "Query is required", "success": False}
        
        try:
            if bypass_validation:
                # Execute query directly
                result = self.logan_client.execute_query_like_console(
                    query, time_period_minutes, max_count, bypass_all_processing=True
                )
            else:
                # Use security analyzer for validation and execution
                result = self.security_analyzer.search_logs(
                    query, time_period_minutes, bypass_validation
                )
            
            return result
        except Exception as e:
            logger.error(f"Query execution error: {e}")
            return {"error": str(e), "success": False}
    
    async def _validate_query(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a query"""
        query = arguments.get("query")
        
        if not query:
            return {"error": "Query is required", "success": False}
        
        try:
            result = self.query_validator.validate_and_fix_query(query)
            return result
        except Exception as e:
            logger.error(f"Query validation error: {e}")
            return {"error": str(e), "success": False}
    
    async def _get_security_events(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Get security events"""
        event_type = arguments.get("event_type")
        severity = arguments.get("severity", "all")
        time_period_minutes = arguments.get("time_period_minutes", 1440)
        
        try:
            if event_type:
                result = self.security_analyzer.run_security_check(event_type, time_period_minutes)
            else:
                result = self.security_analyzer.get_security_events(severity, time_period_minutes)
            
            return result
        except Exception as e:
            logger.error(f"Security events error: {e}")
            return {"error": str(e), "success": False}
    
    async def _get_log_sources(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Get log sources"""
        time_period_minutes = arguments.get("time_period_minutes", 1440)
        active_only = arguments.get("active_only", False)
        
        try:
            if active_only:
                result = self.logan_client.get_used_sources(time_period_minutes)
            else:
                result = self.logan_client.list_sources(time_period_minutes)
            
            return result
        except Exception as e:
            logger.error(f"Log sources error: {e}")
            return {"error": str(e), "success": False}
    
    async def _discover_fields(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Discover fields"""
        field_type = arguments.get("field_type")
        is_system = arguments.get("is_system")
        used_sources_only = arguments.get("used_sources_only", False)
        time_period_minutes = arguments.get("time_period_minutes", 1440)
        
        try:
            result = self.logan_client.list_fields(
                field_type=field_type,
                is_system=is_system,
                used_sources_only=used_sources_only,
                time_period_minutes=time_period_minutes
            )
            return result
        except Exception as e:
            logger.error(f"Field discovery error: {e}")
            return {"error": str(e), "success": False}
    
    async def _get_storage_usage(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Get storage usage"""
        time_period_days = arguments.get("time_period_days", 30)
        
        try:
            result = self.logan_client.get_storage_usage(time_period_days)
            return result
        except Exception as e:
            logger.error(f"Storage usage error: {e}")
            return {"error": str(e), "success": False}
    
    async def _test_connection(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Test OCI connection"""
        try:
            result = self.logan_client.test_connection()
            return result
        except Exception as e:
            logger.error(f"Connection test error: {e}")
            return {"error": str(e), "success": False}
    
    async def _get_dashboard_stats(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Get dashboard statistics"""
        time_period_minutes = arguments.get("time_period_minutes", 1440)
        
        try:
            result = self.security_analyzer.get_dashboard_stats(time_period_minutes)
            return result
        except Exception as e:
            logger.error(f"Dashboard stats error: {e}")
            return {"error": str(e), "success": False}

async def main():
    """Main server function"""
    # Set up environment
    region = os.getenv('LOGAN_REGION', 'eu-frankfurt-1')
    compartment_id = os.getenv('LOGAN_COMPARTMENT_ID')
    debug = os.getenv('LOGAN_DEBUG', 'false').lower() == 'true'
    
    if debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    logger.info("Starting Logan MCP Server...")
    logger.info(f"Region: {region}")
    logger.info(f"Compartment ID: {compartment_id[:20]}..." if compartment_id else "Compartment ID: Not set")
    
    if not compartment_id:
        logger.error("LOGAN_COMPARTMENT_ID environment variable is required")
        sys.exit(1)
    
    # Create and run server
    server_instance = LoganMCPServer()
    
    # Run the server using stdio transport
    async with stdio_server() as (read_stream, write_stream):
        await server_instance.server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="logan-security-dashboard",
                server_version="1.0.0",
                capabilities=server_instance.server.get_capabilities(
                    notification_options=None,
                    experimental_capabilities=None
                )
            )
        )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)