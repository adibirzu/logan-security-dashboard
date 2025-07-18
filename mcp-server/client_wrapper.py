#!/usr/bin/env python3
"""
Command-line wrapper for MCP client to enable easy integration with Node.js
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Add the mcp-server directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from mcp_client import LoganMCPClient

async def execute_query(args):
    """Execute a query via MCP client"""
    client = LoganMCPClient()
    response = await client.execute_query(
        query=args.query,
        time_period_minutes=args.time_period,
        max_count=args.max_count,
        bypass_validation=args.bypass_validation
    )
    return response

async def validate_query(args):
    """Validate a query via MCP client"""
    client = LoganMCPClient()
    response = await client.validate_query(args.query)
    return response

async def get_security_events(args):
    """Get security events via MCP client"""
    client = LoganMCPClient()
    response = await client.get_security_events(
        event_type=args.event_type,
        severity=args.severity,
        time_period_minutes=args.time_period
    )
    return response

async def get_log_sources(args):
    """Get log sources via MCP client"""
    client = LoganMCPClient()
    response = await client.get_log_sources(
        time_period_minutes=args.time_period,
        active_only=args.active_only
    )
    return response

async def discover_fields(args):
    """Discover fields via MCP client"""
    client = LoganMCPClient()
    response = await client.discover_fields(
        field_type=args.field_type,
        is_system=args.is_system,
        used_sources_only=args.used_sources_only,
        time_period_minutes=args.time_period
    )
    return response

async def get_storage_usage(args):
    """Get storage usage via MCP client"""
    client = LoganMCPClient()
    response = await client.get_storage_usage(
        time_period_days=args.time_period_days
    )
    return response

async def test_connection(args):
    """Test connection via MCP client"""
    client = LoganMCPClient()
    response = await client.test_connection()
    return response

async def get_dashboard_stats(args):
    """Get dashboard stats via MCP client"""
    client = LoganMCPClient()
    response = await client.get_dashboard_stats(
        time_period_minutes=args.time_period
    )
    return response

def create_parser():
    """Create argument parser"""
    parser = argparse.ArgumentParser(description="Logan MCP Client Wrapper")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Execute query command
    query_parser = subparsers.add_parser('execute_query', help='Execute a query')
    query_parser.add_argument('--query', required=True, help='Query to execute')
    query_parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    query_parser.add_argument('--max-count', type=int, default=100, help='Maximum results')
    query_parser.add_argument('--bypass-validation', action='store_true', help='Bypass validation')
    
    # Validate query command
    validate_parser = subparsers.add_parser('validate_query', help='Validate a query')
    validate_parser.add_argument('--query', required=True, help='Query to validate')
    
    # Security events command
    security_parser = subparsers.add_parser('get_security_events', help='Get security events')
    security_parser.add_argument('--event-type', help='Event type filter')
    security_parser.add_argument('--severity', default='all', help='Severity filter')
    security_parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    
    # Log sources command
    sources_parser = subparsers.add_parser('get_log_sources', help='Get log sources')
    sources_parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    sources_parser.add_argument('--active-only', action='store_true', help='Show only active sources')
    
    # Field discovery command
    fields_parser = subparsers.add_parser('discover_fields', help='Discover fields')
    fields_parser.add_argument('--field-type', help='Field type filter')
    fields_parser.add_argument('--is-system', type=bool, help='Filter system fields')
    fields_parser.add_argument('--used-sources-only', action='store_true', help='Only from active sources')
    fields_parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    
    # Storage usage command
    storage_parser = subparsers.add_parser('get_storage_usage', help='Get storage usage')
    storage_parser.add_argument('--time-period-days', type=int, default=30, help='Time period in days')
    
    # Test connection command
    subparsers.add_parser('test_connection', help='Test connection')
    
    # Dashboard stats command
    stats_parser = subparsers.add_parser('get_dashboard_stats', help='Get dashboard stats')
    stats_parser.add_argument('--time-period', type=int, default=1440, help='Time period in minutes')
    
    return parser

async def main():
    """Main function"""
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Command mapping
    commands = {
        'execute_query': execute_query,
        'validate_query': validate_query,
        'get_security_events': get_security_events,
        'get_log_sources': get_log_sources,
        'discover_fields': discover_fields,
        'get_storage_usage': get_storage_usage,
        'test_connection': test_connection,
        'get_dashboard_stats': get_dashboard_stats
    }
    
    if args.command not in commands:
        print(json.dumps({"error": f"Unknown command: {args.command}", "success": False}))
        sys.exit(1)
    
    try:
        response = await commands[args.command](args)
        
        # Output the response as JSON
        output = {
            "success": response.success,
            "data": response.data,
            "error": response.error,
            "timestamp": response.timestamp.isoformat() if response.timestamp else None
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        error_output = {
            "success": False,
            "error": str(e),
            "data": None,
            "timestamp": None
        }
        print(json.dumps(error_output, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())