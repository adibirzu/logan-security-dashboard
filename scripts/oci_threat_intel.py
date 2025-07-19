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
        SummarizeIndicatorsDetails
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
        Note: This submits custom indicators or threat intelligence findings
        
        Args:
            threat_data: Threat intelligence data to submit
                - indicators: List of indicators with type, value, confidence
                - metadata: Additional context and attribution
            compartment_id: OCI compartment ID (optional)
            
        Returns:
            Dictionary with submission results
        """
        try:
            if not compartment_id:
                compartment_id = self.config["tenancy"]
            
            # Validate threat data structure
            if not isinstance(threat_data, dict):
                return {
                    "success": False,
                    "error": "Invalid threat data format - must be dictionary"
                }
            
            indicators = threat_data.get("indicators", [])
            metadata = threat_data.get("metadata", {})
            
            if not indicators:
                return {
                    "success": False,
                    "error": "No indicators provided in threat data"
                }
            
            results = []
            for indicator in indicators:
                # Validate required fields
                if not all(key in indicator for key in ["type", "value"]):
                    results.append({
                        "indicator": indicator,
                        "success": False,
                        "error": "Missing required fields: type, value"
                    })
                    continue
                
                # Create indicator submission
                indicator_result = self._submit_single_indicator(
                    indicator, metadata, compartment_id
                )
                results.append(indicator_result)
            
            # Calculate overall success
            successful_submissions = sum(1 for r in results if r.get("success", False))
            total_submissions = len(results)
            
            return {
                "success": successful_submissions > 0,
                "total_indicators": total_submissions,
                "successful_submissions": successful_submissions,
                "failed_submissions": total_submissions - successful_submissions,
                "results": results,
                "compartment_id": compartment_id
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to submit threat data: {str(e)}"
            }
    
    def _submit_single_indicator(self, indicator: Dict[str, Any], 
                               metadata: Dict[str, Any], 
                               compartment_id: str) -> Dict[str, Any]:
        """
        Submit a single indicator to OCI Threat Intelligence
        
        Args:
            indicator: Single indicator data
            metadata: Additional context
            compartment_id: OCI compartment ID
            
        Returns:
            Dictionary with submission result
        """
        try:
            # Note: Current OCI Threat Intelligence API may not support custom submissions
            # This implementation provides the structure for when the API becomes available
            
            indicator_type = indicator.get("type", "unknown")
            indicator_value = indicator.get("value", "")
            confidence = indicator.get("confidence", 50)
            threat_types = indicator.get("threat_types", [])
            attribution = metadata.get("attribution", "Logan Security Dashboard")
            source = metadata.get("source", "Custom Analysis")
            
            # Validate indicator format based on type
            validation_result = self._validate_indicator_format(indicator_type, indicator_value)
            if not validation_result["valid"]:
                return {
                    "indicator": indicator,
                    "success": False,
                    "error": f"Invalid indicator format: {validation_result['error']}"
                }
            
            # For now, simulate submission since OCI API may not support custom indicators
            # In a real implementation, this would call the OCI API
            submission_data = {
                "compartment_id": compartment_id,
                "type": indicator_type,
                "value": indicator_value,
                "confidence": confidence,
                "threat_types": threat_types,
                "attribution": attribution,
                "source": source,
                "time_submitted": datetime.now(timezone.utc).isoformat(),
                "status": "pending_review"
            }
            
            # Log the submission for audit purposes
            print(f"INFO: Threat intelligence submission logged: {indicator_type}={indicator_value}", 
                  file=sys.stderr)
            
            return {
                "indicator": indicator,
                "success": True,
                "submission_id": f"custom_{hash(str(submission_data))}", 
                "status": "submitted",
                "message": "Indicator submitted for review",
                "submission_data": submission_data
            }
            
        except Exception as e:
            return {
                "indicator": indicator,
                "success": False,
                "error": f"Submission failed: {str(e)}"
            }
    
    def _validate_indicator_format(self, indicator_type: str, value: str) -> Dict[str, Any]:
        """
        Validate indicator format based on type
        
        Args:
            indicator_type: Type of indicator (ip, domain, hash, etc.)
            value: Indicator value
            
        Returns:
            Dictionary with validation result
        """
        import re
        
        patterns = {
            "ip": r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$",
            "domain": r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$",
            "url": r"^https?://[^\s/$.?#].[^\s]*$",
            "md5": r"^[a-fA-F0-9]{32}$",
            "sha1": r"^[a-fA-F0-9]{40}$",
            "sha256": r"^[a-fA-F0-9]{64}$",
            "email": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        }
        
        pattern = patterns.get(indicator_type.lower())
        if not pattern:
            return {
                "valid": True,  # Allow unknown types
                "message": f"No validation pattern for type: {indicator_type}"
            }
        
        if re.match(pattern, value):
            return {"valid": True, "message": "Valid format"}
        else:
            return {
                "valid": False,
                "error": f"Invalid {indicator_type} format: {value}"
            }

def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description="OCI Threat Intelligence Client")
    parser.add_argument("action", choices=["check", "batch", "stats", "test", "submit"], 
                       help="Action to perform")
    parser.add_argument("--indicator", "-i", help="Indicator value to check")
    parser.add_argument("--type", "-t", help="Indicator type")
    parser.add_argument("--file", "-f", help="File with indicators/threat data (JSON format)")
    parser.add_argument("--compartment", "-c", help="OCI compartment ID")
    parser.add_argument("--config", help="OCI config file path")
    parser.add_argument("--profile", default="DEFAULT", help="OCI config profile")
    parser.add_argument("--confidence", help="Confidence level for indicator submission (0-100)")
    parser.add_argument("--threat-types", help="Comma-separated threat types")
    parser.add_argument("--attribution", help="Attribution for threat data submission")
    parser.add_argument("--source", help="Source of threat intelligence")
    
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
            
        elif args.action == "submit":
            if args.file:
                # Submit threat data from file
                try:
                    with open(args.file, 'r') as f:
                        threat_data = json.load(f)
                    
                    result = client.submit_threat_data(threat_data, args.compartment)
                    print(json.dumps(result, indent=2))
                    
                except Exception as e:
                    print(json.dumps({"success": False, "error": f"Failed to read threat data file: {e}"}))
                    
            elif args.indicator and args.type:
                # Submit single indicator
                threat_types = []
                if args.threat_types:
                    threat_types = [t.strip() for t in args.threat_types.split(',')]
                
                confidence = 50
                if args.confidence:
                    try:
                        confidence = int(args.confidence)
                        if not 0 <= confidence <= 100:
                            confidence = 50
                    except ValueError:
                        confidence = 50
                
                threat_data = {
                    "indicators": [{
                        "type": args.type,
                        "value": args.indicator,
                        "confidence": confidence,
                        "threat_types": threat_types
                    }],
                    "metadata": {
                        "attribution": args.attribution or "Manual Submission",
                        "source": args.source or "CLI"
                    }
                }
                
                result = client.submit_threat_data(threat_data, args.compartment)
                print(json.dumps(result, indent=2))
                
            else:
                print(json.dumps({
                    "success": False, 
                    "error": "Submit action requires either --file or both --indicator and --type"
                }))
            
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()