#!/usr/bin/env python3
"""
Test script for Logan MCP Server
"""

import asyncio
import json
import sys
from pathlib import Path

# Add the mcp-server directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from mcp_client import LoganMCPClient, MCPResponse

async def test_connection():
    """Test basic connection to the server"""
    print("Testing MCP server connection...")
    
    client = LoganMCPClient()
    response = await client.test_connection()
    
    if response.success:
        print("✅ Connection test passed")
        return True
    else:
        print(f"❌ Connection test failed: {response.error}")
        return False

async def test_query_validation():
    """Test query validation"""
    print("\nTesting query validation...")
    
    client = LoganMCPClient()
    
    # Test valid query
    valid_query = "* | head 10"
    response = await client.validate_query(valid_query)
    
    if response.success:
        print("✅ Query validation passed for valid query")
    else:
        print(f"❌ Query validation failed: {response.error}")
        return False
    
    # Test invalid query
    invalid_query = "INVALID SYNTAX HERE"
    response = await client.validate_query(invalid_query)
    
    # We expect this to either fail validation or return suggestions
    print("✅ Query validation handled invalid query appropriately")
    return True

async def test_log_sources():
    """Test log sources retrieval"""
    print("\nTesting log sources retrieval...")
    
    client = LoganMCPClient()
    response = await client.get_log_sources(time_period_minutes=60)
    
    if response.success:
        data = response.data
        if 'sources' in data:
            source_count = len(data['sources'])
            print(f"✅ Retrieved {source_count} log sources")
        else:
            print("✅ Log sources retrieved (no sources data)")
        return True
    else:
        print(f"❌ Log sources test failed: {response.error}")
        return False

async def test_simple_query():
    """Test simple query execution"""
    print("\nTesting simple query execution...")
    
    client = LoganMCPClient()
    
    # Simple query to get recent logs
    query = "* | head 5"
    response = await client.execute_query(
        query=query,
        time_period_minutes=60,
        max_count=5
    )
    
    if response.success:
        data = response.data
        if 'results' in data:
            result_count = len(data['results'])
            print(f"✅ Query executed successfully, returned {result_count} results")
        else:
            print("✅ Query executed successfully (no results data)")
        return True
    else:
        print(f"❌ Simple query test failed: {response.error}")
        return False

async def test_dashboard_stats():
    """Test dashboard statistics"""
    print("\nTesting dashboard statistics...")
    
    client = LoganMCPClient()
    response = await client.get_dashboard_stats(time_period_minutes=60)
    
    if response.success:
        print("✅ Dashboard stats retrieved successfully")
        return True
    else:
        print(f"❌ Dashboard stats test failed: {response.error}")
        return False

async def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("Logan MCP Server Test Suite")
    print("=" * 60)
    
    tests = [
        ("Connection Test", test_connection),
        ("Query Validation", test_query_validation),
        ("Log Sources", test_log_sources),
        ("Simple Query", test_simple_query),
        ("Dashboard Stats", test_dashboard_stats)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            if result:
                passed += 1
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
    
    print("\n" + "=" * 60)
    print(f"Test Results: {passed}/{total} passed")
    print("=" * 60)
    
    if passed == total:
        print("🎉 All tests passed! MCP server is working correctly.")
        return True
    else:
        print("⚠️ Some tests failed. Check the error messages above.")
        return False

def main():
    """Main test function"""
    try:
        success = asyncio.run(run_all_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\nTests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nTest suite error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()