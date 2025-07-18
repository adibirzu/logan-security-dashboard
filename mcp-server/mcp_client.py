"""
MCP Client for communicating with Logan MCP Server
"""

import asyncio
import json
import logging
import subprocess
import sys
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class MCPResponse:
    """Response from MCP server"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: Optional[datetime] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

class LoganMCPClient:
    """Client for communicating with Logan MCP Server"""
    
    def __init__(self, server_path: str = None):
        self.server_path = server_path or "mcp_server.py"
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def _call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> MCPResponse:
        """Call a tool on the MCP server"""
        try:
            # Prepare the MCP tool call
            tool_call = {
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }
            
            # Execute the server process
            process = await asyncio.create_subprocess_exec(
                sys.executable, self.server_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Send the request
            input_data = json.dumps(tool_call) + "\n"
            stdout, stderr = await process.communicate(input_data.encode())
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Server process failed"
                self.logger.error(f"MCP server error: {error_msg}")
                return MCPResponse(success=False, error=error_msg)
            
            # Parse the response
            response_text = stdout.decode().strip()
            if not response_text:
                return MCPResponse(success=False, error="Empty response from server")
            
            try:
                response_data = json.loads(response_text)
                if isinstance(response_data, list) and len(response_data) > 0:
                    # MCP returns list of TextContent, extract the first one
                    content = response_data[0].get("text", "{}")
                    data = json.loads(content)
                else:
                    data = response_data
                
                success = data.get("success", True)
                error = data.get("error") if not success else None
                
                return MCPResponse(
                    success=success,
                    data=data if success else None,
                    error=error
                )
                
            except json.JSONDecodeError as e:
                self.logger.error(f"Failed to parse server response: {e}")
                return MCPResponse(success=False, error=f"Invalid JSON response: {e}")
                
        except Exception as e:
            self.logger.error(f"Error calling MCP tool {tool_name}: {e}")
            return MCPResponse(success=False, error=str(e))
    
    async def execute_query(
        self,
        query: str,
        time_period_minutes: int = 1440,
        max_count: int = 100,
        bypass_validation: bool = False
    ) -> MCPResponse:
        """Execute a custom OCI Logging Analytics query"""
        return await self._call_tool("execute_query", {
            "query": query,
            "time_period_minutes": time_period_minutes,
            "max_count": max_count,
            "bypass_validation": bypass_validation
        })
    
    async def validate_query(self, query: str) -> MCPResponse:
        """Validate an OCI Logging Analytics query"""
        return await self._call_tool("validate_query", {
            "query": query
        })
    
    async def get_security_events(
        self,
        event_type: Optional[str] = None,
        severity: str = "all",
        time_period_minutes: int = 1440
    ) -> MCPResponse:
        """Get security events with filtering"""
        arguments = {
            "severity": severity,
            "time_period_minutes": time_period_minutes
        }
        if event_type:
            arguments["event_type"] = event_type
        
        return await self._call_tool("get_security_events", arguments)
    
    async def get_log_sources(
        self,
        time_period_minutes: int = 1440,
        active_only: bool = False
    ) -> MCPResponse:
        """Get log sources with activity information"""
        return await self._call_tool("get_log_sources", {
            "time_period_minutes": time_period_minutes,
            "active_only": active_only
        })
    
    async def discover_fields(
        self,
        field_type: Optional[str] = None,
        is_system: Optional[bool] = None,
        used_sources_only: bool = False,
        time_period_minutes: int = 1440
    ) -> MCPResponse:
        """Discover available fields for query building"""
        arguments = {
            "used_sources_only": used_sources_only,
            "time_period_minutes": time_period_minutes
        }
        if field_type:
            arguments["field_type"] = field_type
        if is_system is not None:
            arguments["is_system"] = is_system
        
        return await self._call_tool("discover_fields", arguments)
    
    async def get_storage_usage(self, time_period_days: int = 30) -> MCPResponse:
        """Get OCI Logging Analytics storage usage"""
        return await self._call_tool("get_storage_usage", {
            "time_period_days": time_period_days
        })
    
    async def test_connection(self) -> MCPResponse:
        """Test connection to OCI Logging Analytics"""
        return await self._call_tool("test_connection", {})
    
    async def get_dashboard_stats(self, time_period_minutes: int = 1440) -> MCPResponse:
        """Get comprehensive dashboard statistics"""
        return await self._call_tool("get_dashboard_stats", {
            "time_period_minutes": time_period_minutes
        })

class SyncLogamMCPClient:
    """Synchronous wrapper for LoganMCPClient"""
    
    def __init__(self, server_path: str = None):
        self.async_client = LoganMCPClient(server_path)
    
    def _run_async(self, coro):
        """Run async function in sync context"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(coro)
    
    def execute_query(
        self,
        query: str,
        time_period_minutes: int = 1440,
        max_count: int = 100,
        bypass_validation: bool = False
    ) -> MCPResponse:
        """Execute a custom OCI Logging Analytics query (sync)"""
        return self._run_async(
            self.async_client.execute_query(query, time_period_minutes, max_count, bypass_validation)
        )
    
    def validate_query(self, query: str) -> MCPResponse:
        """Validate an OCI Logging Analytics query (sync)"""
        return self._run_async(self.async_client.validate_query(query))
    
    def get_security_events(
        self,
        event_type: Optional[str] = None,
        severity: str = "all",
        time_period_minutes: int = 1440
    ) -> MCPResponse:
        """Get security events with filtering (sync)"""
        return self._run_async(
            self.async_client.get_security_events(event_type, severity, time_period_minutes)
        )
    
    def get_log_sources(
        self,
        time_period_minutes: int = 1440,
        active_only: bool = False
    ) -> MCPResponse:
        """Get log sources with activity information (sync)"""
        return self._run_async(
            self.async_client.get_log_sources(time_period_minutes, active_only)
        )
    
    def discover_fields(
        self,
        field_type: Optional[str] = None,
        is_system: Optional[bool] = None,
        used_sources_only: bool = False,
        time_period_minutes: int = 1440
    ) -> MCPResponse:
        """Discover available fields for query building (sync)"""
        return self._run_async(
            self.async_client.discover_fields(field_type, is_system, used_sources_only, time_period_minutes)
        )
    
    def get_storage_usage(self, time_period_days: int = 30) -> MCPResponse:
        """Get OCI Logging Analytics storage usage (sync)"""
        return self._run_async(self.async_client.get_storage_usage(time_period_days))
    
    def test_connection(self) -> MCPResponse:
        """Test connection to OCI Logging Analytics (sync)"""
        return self._run_async(self.async_client.test_connection())
    
    def get_dashboard_stats(self, time_period_minutes: int = 1440) -> MCPResponse:
        """Get comprehensive dashboard statistics (sync)"""
        return self._run_async(self.async_client.get_dashboard_stats(time_period_minutes))