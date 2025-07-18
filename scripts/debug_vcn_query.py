#!/usr/bin/env python3
"""
Debug script to check VCN query execution
"""

import json
import sys
from logan_client import LoganClient

def debug_vcn_query():
    """Debug VCN flow query to see what's happening"""
    client = LoganClient()
    
    # Test with different time periods
    time_periods = [60, 1440, 10080]  # 1h, 24h, 7d
    
    for minutes in time_periods:
        print(f"\n📊 Testing VCN query with {minutes} minutes:")
        
        # Calculate expected max records
        max_records = min(50000, max(1000, minutes * 30))
        print(f"   Expected max records: {max_records}")
        
        # Build the query
        query = f"""
        'Log Source' = 'OCI VCN Flow Unified Schema Logs' 
        | where 'Source IP' != "" and 'Destination IP' != ""
        | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action
        | sort -Time
        | head {max_records}
        """
        
        print(f"   Query: {query.strip()}")
        
        try:
            # Execute query
            result = client.execute_query(query, minutes, max_records)
            
            if result.get("success"):
                records = result.get("results", [])
                print(f"   ✅ Success: Got {len(records)} records")
                
                # Check if we're getting exactly 10 records
                if len(records) == 10:
                    print(f"   ⚠️  WARNING: Getting exactly 10 records - might be a default limit")
                    
                # Show first few records
                if records:
                    print(f"   Sample record: {json.dumps(records[0], indent=2)}")
            else:
                print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"   ❌ Exception: {e}")
            
    # Also test the execute_query_like_console method
    print("\n\n🔍 Testing execute_query_like_console method:")
    try:
        query = """
        'Log Source' = 'OCI VCN Flow Unified Schema Logs' 
        | where 'Source IP' != "" and 'Destination IP' != ""
        | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action
        | sort -Time
        | head 100
        """
        
        result = client.execute_query_like_console(query, 60)
        if result.get("success"):
            records = result.get("results", [])
            print(f"   ✅ Got {len(records)} records with execute_query_like_console")
        else:
            print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")

if __name__ == "__main__":
    debug_vcn_query()