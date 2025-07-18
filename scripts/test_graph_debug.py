#!/usr/bin/env python3
"""
Debug graph extractor to see why it's not returning data
"""

import json
import sys
from logan_client import LoganClient

def test_graph_query():
    """Test the exact query used by graph extractor"""
    client = LoganClient()
    
    time_period_minutes = 60
    max_records = min(50000, max(1000, time_period_minutes * 50))
    
    print(f"🔍 Testing graph extractor query with {time_period_minutes} minutes")
    print(f"   Max records: {max_records}")
    
    # Test VCN Flow query from graph_extractor
    vcn_query = f"""
    'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Time > dateRelative({time_period_minutes}m)
    | where 'Source IP' != "" and 'Destination IP' != ""
    | fields Time, 'Source IP', 'Destination IP', 'Source Port', 'Destination Port', Action
    | sort -Time
    | head {max_records}
    """
    
    print(f"\n📊 VCN Query:")
    print(vcn_query.strip())
    
    try:
        result = client.execute_query_like_console(vcn_query, time_period_minutes)
        
        if result.get('success'):
            records = result.get('results', [])
            print(f"\n✅ Success: Got {len(records)} VCN flow records")
            
            if records:
                print(f"\n   Sample record:")
                print(json.dumps(records[0], indent=2))
                
                # Check if the fields we need are present
                required_fields = ['Source IP', 'Destination IP', 'Time']
                missing_fields = [f for f in required_fields if f not in records[0]]
                
                if missing_fields:
                    print(f"\n⚠️  WARNING: Missing required fields: {missing_fields}")
                
        else:
            print(f"\n❌ Failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"\n❌ Exception: {e}")
        import traceback
        traceback.print_exc()
    
    # Also test Audit logs query
    print("\n\n📊 Testing Audit logs query:")
    
    audit_query = f"""
    'Log Source' = 'OCI Audit Logs' and Time > dateRelative({time_period_minutes}m)
    | where 'IP Address' != ""
    | fields Time, 'IP Address', 'Principal Name', 'Event Name', 'Compartment Name', 'Target Resource'
    | sort -Time
    | head 500
    """
    
    try:
        result = client.execute_query_like_console(audit_query, time_period_minutes)
        
        if result.get('success'):
            records = result.get('results', [])
            print(f"✅ Success: Got {len(records)} Audit log records")
            
            if records:
                print(f"\n   Sample record:")
                print(json.dumps(records[0], indent=2))
        else:
            print(f"❌ Failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_graph_query()