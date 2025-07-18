#!/usr/bin/env python3

"""
OCI Threat Intelligence Client Script
Integrates with Oracle Cloud Infrastructure Threat Intelligence service
for indicator checking and threat data submission.
"""

import json
import sys
import argparse
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

try:
    import oci
    from oci.threat_intelligence import ThreatintelClient
    from oci.threat_intelligence.models import (
        IndicatorSummary,
        IndicatorAttribute,
        SummarizeIndicatorsDetails,
        IndicatorCountDimension,
        IndicatorCountSortBy
    )
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"OCI Python SDK not installed: {e}",
        "message": "Install with: pip install oci"
    }))
    sys.exit(1)

class OCIThreatIntelligence:
    """OCI Threat Intelligence client wrapper"""
    
    def __init__(self, config_file: Optional[str] = None, profile: str = "DEFAULT"):
        """
        Initialize OCI Threat Intelligence client
        
        Args:
            config_file: Path to OCI config file (defaults to ~/.oci/config)
            profile: Profile name in config file
        """
        try:
            if config_file:
                self.config = oci.config.from_file(config_file, profile)
            else:
                self.config = oci.config.from_file(profile_name=profile)
            
            # Validate config
            oci.config.validate_config(self.config)
            
            # Initialize Threat Intelligence client
            self.client = ThreatintelClient(self.config)
            
        except Exception as e:
            raise Exception(f"Failed to initialize OCI client: {e}")

    def check_indicator(self, indicator_value: str, indicator_type: str = None, 
                       compartment_id: str = None) -> Dict[str, Any]:
        """
        Check a single indicator against OCI Threat Intelligence
        
        Args:
            indicator_value: The indicator to check (IP, domain, hash, etc.)
            indicator_type: Type of indicator (optional)
            compartment_id: OCI compartment ID (optional)
            
        Returns:
            Dictionary with indicator analysis results
        """
        try:
            # Use tenancy OCID if compartment not specified
            if not compartment_id:
                compartment_id = self.config["tenancy"]
            
            # Search for the indicator
            details = SummarizeIndicatorsDetails(
                compartment_id=compartment_id,
                indicator_value=indicator_value
            )
            
            response = self.client.summarize_indicators(details)
            
            # Process response
            indicators = response.data.items if response.data else []
            
            result = {
                "success": True,
                "indicator_value": indicator_value,
                "indicator_type": indicator_type,
                "found": len(indicators) > 0,
                "count": len(indicators),
                "indicators": []
            }
            
            for indicator in indicators:
                indicator_data = {
                    "id": indicator.id,
                    "value": indicator.value,
                    "type": indicator.type,
                    "confidence": indicator.confidence,
                    "threat_types": indicator.threat_types,
                    "attributes": [],
                    "time_created": indicator.time_created.isoformat() if indicator.time_created else None,
                    "time_updated": indicator.time_updated.isoformat() if indicator.time_updated else None,
                    "time_last_seen": indicator.time_last_seen.isoformat() if indicator.time_last_seen else None
                }
                
                # Add attributes if available
                if hasattr(indicator, 'attributes') and indicator.attributes:
                    for attr in indicator.attributes:
                        attr_data = {
                            "name": attr.name,
                            "value": attr.value,
                            "attribution": attr.attribution
                        }
                        indicator_data["attributes"].append(attr_data)
                
                result["indicators"].append(indicator_data)
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "indicator_value": indicator_value
            }

    def check_multiple_indicators(self, indicators: List[Dict[str, str]], 
                                 compartment_id: str = None) -> Dict[str, Any]:
        """
        Check multiple indicators in batch
        
        Args:
            indicators: List of indicators with 'value' and optionally 'type'
            compartment_id: OCI compartment ID (optional)
            
        Returns:
            Dictionary with batch analysis results
        """
        results = {
            "success": True,
            "total_checked": len(indicators),
            "found_count": 0,
            "indicators": []
        }
        
        for indicator in indicators:
            value = indicator.get("value")
            ioc_type = indicator.get("type")
            
            if not value:
                continue
                
            result = self.check_indicator(value, ioc_type, compartment_id)
            results["indicators"].append(result)
            
            if result.get("found"):
                results["found_count"] += 1
        
        return results

    def get_indicator_counts(self, compartment_id: str = None, 
                           indicator_type: str = None) -> Dict[str, Any]:
        """
        Get indicator counts and statistics
        
        Args:
            compartment_id: OCI compartment ID (optional)
            indicator_type: Filter by indicator type (optional)
            
        Returns:
            Dictionary with indicator statistics
        """
        try:
            if not compartment_id:
                compartment_id = self.config["tenancy"]
            
            details = SummarizeIndicatorsDetails(
                compartment_id=compartment_id
            )
            
            if indicator_type:
                details.indicator_type = indicator_type
            
            response = self.client.summarize_indicators(details)
            
            return {
                "success": True,
                "compartment_id": compartment_id,
                "total_indicators": len(response.data.items) if response.data else 0,
                "indicator_type": indicator_type
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def submit_threat_data(self, threat_data: Dict[str, Any], 
                          compartment_id: str = None) -> Dict[str, Any]:
        """
        Submit threat intelligence data to OCI service
        Note: This would be used for contributing threat data back to OCI
        
        Args:
            threat_data: Threat intelligence data to submit
            compartment_id: OCI compartment ID (optional)
            
        Returns:
            Dictionary with submission results
        """
        # Note: The exact submission API depends on OCI service capabilities
        # This is a placeholder for future implementation
        return {
            "success": False,
            "message": "Threat data submission not yet implemented in OCI Threat Intelligence service"
        }

def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description="OCI Threat Intelligence Client")
    parser.add_argument("action", choices=["check", "batch", "stats", "test"], 
                       help="Action to perform")
    parser.add_argument("--indicator", "-i", help="Indicator value to check")
    parser.add_argument("--type", "-t", help="Indicator type")
    parser.add_argument("--file", "-f", help="File with indicators (JSON format)")
    parser.add_argument("--compartment", "-c", help="OCI compartment ID")
    parser.add_argument("--config", help="OCI config file path")
    parser.add_argument("--profile", default="DEFAULT", help="OCI config profile")
    
    args = parser.parse_args()
    
    try:
        # Initialize client
        client = OCIThreatIntelligence(args.config, args.profile)
        
        if args.action == "test":
            # Test connection
            result = client.get_indicator_counts(args.compartment)
            print(json.dumps(result, indent=2))
            
        elif args.action == "check":
            if not args.indicator:
                print(json.dumps({"success": False, "error": "Indicator value required"}))
                return
            
            result = client.check_indicator(args.indicator, args.type, args.compartment)
            print(json.dumps(result, indent=2))
            
        elif args.action == "batch":
            if not args.file:
                print(json.dumps({"success": False, "error": "File with indicators required"}))
                return
            
            try:
                with open(args.file, 'r') as f:
                    indicators = json.load(f)
                
                result = client.check_multiple_indicators(indicators, args.compartment)
                print(json.dumps(result, indent=2))
                
            except Exception as e:
                print(json.dumps({"success": False, "error": f"Failed to read file: {e}"}))
                
        elif args.action == "stats":
            result = client.get_indicator_counts(args.compartment, args.type)
            print(json.dumps(result, indent=2))
            
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()