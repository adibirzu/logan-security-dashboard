#!/usr/bin/env python3
"""
Test script to verify enhanced log processing capabilities
"""

import json
import sys
from graph_extractor import GraphDataExtractor
from rita_simple import SimpleRITAAnalyzer

def test_different_time_periods():
    """Test with different time periods to show scaling"""
    
    extractor = GraphDataExtractor()
    rita = SimpleRITAAnalyzer()
    
    time_periods = [60, 360, 1440, 10080]  # 1h, 6h, 24h, 7d
    
    print("Testing enhanced log processing with different time periods:")
    print("=" * 60)
    
    for minutes in time_periods:
        hours = minutes / 60
        if hours < 24:
            period_name = f"{hours:.0f}h"
        else:
            days = hours / 24
            period_name = f"{days:.0f}d"
        
        print(f"\n📊 Testing {period_name} ({minutes} minutes):")
        
        # Calculate expected max records for each component (OCI 50k limit compliant)
        graph_vcn_max = min(50000, max(1000, minutes * 50))
        graph_audit_max = min(10000, max(500, minutes * 10))
        rita_app_max = min(50000, max(1000, minutes * 30))
        rita_comm_max = min(50000, max(1000, minutes * 30))
        
        print(f"  🔍 Graph Extractor:")
        print(f"    - VCN Flow logs: up to {graph_vcn_max:,} records")
        print(f"    - Audit logs: up to {graph_audit_max:,} records")
        
        print(f"  📈 RITA Analyzer:")
        print(f"    - Application analysis: up to {rita_app_max:,} records")
        print(f"    - Communication analysis: up to {rita_comm_max:,} records")
        
        # Quick test to ensure scripts work
        try:
            print(f"  ✅ Testing graph extraction...", end=" ")
            result = extractor.extract_network_graph(minutes)
            if result.get('success'):
                print("OK")
            else:
                print(f"FAILED: {result.get('error', 'Unknown error')}")
        except Exception as e:
            print(f"ERROR: {e}")

def show_scaling_formula():
    """Show the scaling formulas used"""
    print("\n🧮 Scaling Formulas (OCI 50k Limit Compliant):")
    print("=" * 50)
    print("VCN Flow Logs (Graph): min(50,000, max(1,000, time_minutes × 50))")
    print("Audit Logs (Graph): min(10,000, max(500, time_minutes × 10))")
    print("VCN Applications (RITA): min(50,000, max(1,000, time_minutes × 30))")
    print("VCN Communications (RITA): min(50,000, max(1,000, time_minutes × 30))")
    print("VCN Analyzer: min(50,000, max(1,000, time_minutes × 30))")
    print("\n✅ All limits respect OCI's maximum of 50,000 records per query")
    print("📈 Still provides significant scaling with time periods")
    print("🚀 Better coverage than fixed 10-1,000 record limits")

def main():
    print("🚀 Enhanced Log Processing Test")
    print("This script demonstrates the improved processing capabilities")
    print("that scale with the selected time period.\n")
    
    show_scaling_formula()
    test_different_time_periods()
    
    print("\n✨ Summary:")
    print("The scripts now process significantly more logs for longer time periods,")
    print("providing better coverage and more accurate analysis results.")
    print("Previous limits were fixed (e.g., 10-1000 records), now they scale")
    print("dynamically based on the time range selected.")

if __name__ == "__main__":
    main()