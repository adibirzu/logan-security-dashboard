#!/usr/bin/env python3
"""
OCI Compute Client for Logan Security Dashboard
Based on the showoci.py example but focused on compute instances
"""

import oci
import json
import sys
import os
from datetime import datetime
import argparse
from typing import Dict, List, Optional

class OCIComputeClient:
    def __init__(self):
        """Initialize OCI Compute client with configuration"""
        self.config = self._load_oci_config()
        self.region = os.getenv('LOGAN_REGION') or self.config.get("region", "us-ashburn-1")
        self.compartment_id = os.getenv('LOGAN_COMPARTMENT_ID') or self.config.get("tenancy")
        
        if not self.compartment_id:
            raise Exception("LOGAN_COMPARTMENT_ID environment variable or OCI config 'tenancy' is not set.")
        
        # Set the region for the client
        self.config["region"] = self.region
        
        # Initialize OCI clients
        self.compute_client = oci.core.ComputeClient(self.config)
        self.blockstorage_client = oci.core.BlockstorageClient(self.config)
        self.identity_client = oci.identity.IdentityClient(self.config)
        self.network_client = oci.core.VirtualNetworkClient(self.config)
        
        sys.stderr.write(f"OCIComputeClient initialized with region: {self.region}\n")
        sys.stderr.write(f"Compartment ID: {self.compartment_id}\n")
    
    def _load_oci_config(self):
        """Load OCI configuration"""
        try:
            config = oci.config.from_file()
            if os.getenv('LOGAN_REGION'):
                config['region'] = os.getenv('LOGAN_REGION')
            return config
        except Exception as e:
            if os.getenv('OCI_TENANCY') and os.getenv('OCI_USER') and os.getenv('OCI_FINGERPRINT') and \
               os.getenv('OCI_KEY_FILE') and os.getenv('LOGAN_REGION'):
                return {
                    "tenancy": os.getenv('OCI_TENANCY'),
                    "user": os.getenv('OCI_USER'),
                    "fingerprint": os.getenv('OCI_FINGERPRINT'),
                    "key_file": os.getenv('OCI_KEY_FILE'),
                    "region": os.getenv('LOGAN_REGION')
                }
            raise Exception(f"Failed to load OCI config: {e}")
    
    def get_all_compartments(self) -> List[Dict]:
        """Get all compartments in the tenancy"""
        try:
            compartments = []
            
            # Add root compartment
            tenancy = self.identity_client.get_tenancy(self.config["tenancy"]).data
            compartments.append({
                "id": tenancy.id,
                "name": tenancy.name,
                "description": "Root compartment",
                "lifecycle_state": "ACTIVE",
                "is_root": True
            })
            
            # Get all compartments
            response = oci.pagination.list_call_get_all_results(
                self.identity_client.list_compartments,
                compartment_id=self.config["tenancy"],
                compartment_id_in_subtree=True
            )
            
            for comp in response.data:
                if comp.lifecycle_state == "ACTIVE":
                    compartments.append({
                        "id": comp.id,
                        "name": comp.name,
                        "description": comp.description or "",
                        "lifecycle_state": comp.lifecycle_state,
                        "is_root": False
                    })
            
            return compartments
        except Exception as e:
            sys.stderr.write(f"Error getting compartments: {e}\n")
            return []
    
    def get_compute_instances(self, compartment_id: Optional[str] = None, search_all_compartments: bool = False) -> Dict:
        """Get all compute instances with their details"""
        try:
            if not compartment_id:
                compartment_id = self.compartment_id
            
            instances = []
            
            # Get all compartments if we need to search across tenancy
            compartments = [compartment_id]
            if search_all_compartments and compartment_id == self.config["tenancy"]:
                compartments = [comp["id"] for comp in self.get_all_compartments()]
            
            for comp_id in compartments:
                try:
                    # Get instances in this compartment
                    response = oci.pagination.list_call_get_all_results(
                        self.compute_client.list_instances,
                        compartment_id=comp_id
                    )
                    
                    for instance in response.data:
                        instance_details = self._get_instance_details(instance)
                        if instance_details:
                            instances.append(instance_details)
                
                except Exception as e:
                    sys.stderr.write(f"Error getting instances for compartment {comp_id}: {e}\n")
                    continue
            
            return {
                "success": True,
                "instances": instances,
                "total_count": len(instances),
                "region": self.region
            }
        
        except Exception as e:
            sys.stderr.write(f"Error getting compute instances: {e}\n")
            return {"success": False, "error": str(e)}
    
    def _get_instance_details(self, instance) -> Optional[Dict]:
        """Get detailed information about a specific instance"""
        try:
            instance_dict = {
                "id": instance.id,
                "display_name": instance.display_name,
                "lifecycle_state": instance.lifecycle_state,
                "availability_domain": instance.availability_domain,
                "compartment_id": instance.compartment_id,
                "shape": instance.shape,
                "region": self.region,
                "time_created": instance.time_created.isoformat() if instance.time_created else None,
                "fault_domain": getattr(instance, 'fault_domain', None),
                "image_id": getattr(instance, 'image_id', None),
                "volumes": [],
                "vnics": []
            }
            
            # Get shape details
            if hasattr(instance, 'shape_config') and instance.shape_config:
                instance_dict["shape_config"] = {
                    "ocpus": getattr(instance.shape_config, 'ocpus', None),
                    "memory_in_gbs": getattr(instance.shape_config, 'memory_in_gbs', None),
                    "baseline_ocpu_utilization": getattr(instance.shape_config, 'baseline_ocpu_utilization', None)
                }
            
            # Get boot volume attachments
            boot_volume_attachments = oci.pagination.list_call_get_all_results(
                self.compute_client.list_boot_volume_attachments,
                availability_domain=instance.availability_domain,
                compartment_id=instance.compartment_id,
                instance_id=instance.id
            )
            
            for boot_attachment in boot_volume_attachments.data:
                if boot_attachment.lifecycle_state == "ATTACHED":
                    boot_volume = self._get_boot_volume_details(boot_attachment.boot_volume_id)
                    instance_dict["volumes"].append({
                        "type": "boot",
                        "attachment_id": boot_attachment.id,
                        "volume_id": boot_attachment.boot_volume_id,
                        "lifecycle_state": boot_attachment.lifecycle_state,
                        "details": boot_volume
                    })
            
            # Get block volume attachments
            block_volume_attachments = oci.pagination.list_call_get_all_results(
                self.compute_client.list_volume_attachments,
                compartment_id=instance.compartment_id,
                instance_id=instance.id
            )
            
            for block_attachment in block_volume_attachments.data:
                if block_attachment.lifecycle_state == "ATTACHED":
                    block_volume = self._get_block_volume_details(block_attachment.volume_id)
                    instance_dict["volumes"].append({
                        "type": "block",
                        "attachment_id": block_attachment.id,
                        "volume_id": block_attachment.volume_id,
                        "lifecycle_state": block_attachment.lifecycle_state,
                        "device": getattr(block_attachment, 'device', None),
                        "details": block_volume
                    })
            
            # Get VNIC attachments
            vnic_attachments = oci.pagination.list_call_get_all_results(
                self.compute_client.list_vnic_attachments,
                compartment_id=instance.compartment_id,
                instance_id=instance.id
            )
            
            for vnic_attachment in vnic_attachments.data:
                if vnic_attachment.lifecycle_state == "ATTACHED":
                    vnic_details = self._get_vnic_details(vnic_attachment.vnic_id)
                    instance_dict["vnics"].append({
                        "attachment_id": vnic_attachment.id,
                        "vnic_id": vnic_attachment.vnic_id,
                        "lifecycle_state": vnic_attachment.lifecycle_state,
                        "details": vnic_details
                    })
            
            return instance_dict
        
        except Exception as e:
            sys.stderr.write(f"Error getting instance details for {instance.id}: {e}\n")
            return None
    
    def _get_boot_volume_details(self, boot_volume_id: str) -> Dict:
        """Get boot volume details"""
        try:
            boot_volume = self.blockstorage_client.get_boot_volume(boot_volume_id).data
            return {
                "id": boot_volume.id,
                "display_name": boot_volume.display_name,
                "size_in_gbs": boot_volume.size_in_gbs,
                "lifecycle_state": boot_volume.lifecycle_state,
                "availability_domain": boot_volume.availability_domain,
                "volume_group_id": getattr(boot_volume, 'volume_group_id', None),
                "is_hydrated": getattr(boot_volume, 'is_hydrated', None),
                "vpus_per_gb": getattr(boot_volume, 'vpus_per_gb', None)
            }
        except Exception as e:
            # Don't fail the entire operation if we can't get volume details
            sys.stderr.write(f"Warning: Could not get boot volume details for {boot_volume_id}: {e}\n")
            return {"id": boot_volume_id, "display_name": "Unknown", "size_in_gbs": "Unknown", "lifecycle_state": "Unknown"}
    
    def _get_block_volume_details(self, volume_id: str) -> Dict:
        """Get block volume details"""
        try:
            volume = self.blockstorage_client.get_volume(volume_id).data
            return {
                "id": volume.id,
                "display_name": volume.display_name,
                "size_in_gbs": volume.size_in_gbs,
                "lifecycle_state": volume.lifecycle_state,
                "availability_domain": volume.availability_domain,
                "volume_group_id": getattr(volume, 'volume_group_id', None),
                "is_hydrated": getattr(volume, 'is_hydrated', None),
                "vpus_per_gb": getattr(volume, 'vpus_per_gb', None)
            }
        except Exception as e:
            # Don't fail the entire operation if we can't get volume details
            sys.stderr.write(f"Warning: Could not get block volume details for {volume_id}: {e}\n")
            return {"id": volume_id, "display_name": "Unknown", "size_in_gbs": "Unknown", "lifecycle_state": "Unknown"}
    
    def _get_vnic_details(self, vnic_id: str) -> Dict:
        """Get VNIC details"""
        try:
            vnic = self.network_client.get_vnic(vnic_id).data
            return {
                "id": vnic.id,
                "display_name": vnic.display_name,
                "private_ip": vnic.private_ip,
                "public_ip": vnic.public_ip,
                "subnet_id": vnic.subnet_id,
                "lifecycle_state": vnic.lifecycle_state,
                "is_primary": vnic.is_primary,
                "hostname_label": vnic.hostname_label
            }
        except Exception as e:
            sys.stderr.write(f"Error getting VNIC details: {e}\n")
            return {"error": str(e)}
    
    def start_instance(self, instance_id: str) -> Dict:
        """Start a compute instance"""
        try:
            response = self.compute_client.instance_action(
                instance_id=instance_id,
                action="START"
            )
            
            return {
                "success": True,
                "instance_id": instance_id,
                "action": "START",
                "lifecycle_state": response.data.lifecycle_state,
                "time_created": response.data.time_created.isoformat() if response.data.time_created else None
            }
        
        except Exception as e:
            sys.stderr.write(f"Error starting instance {instance_id}: {e}\n")
            return {"success": False, "error": str(e)}
    
    def stop_instance(self, instance_id: str) -> Dict:
        """Stop a compute instance"""
        try:
            response = self.compute_client.instance_action(
                instance_id=instance_id,
                action="STOP"
            )
            
            return {
                "success": True,
                "instance_id": instance_id,
                "action": "STOP",
                "lifecycle_state": response.data.lifecycle_state,
                "time_created": response.data.time_created.isoformat() if response.data.time_created else None
            }
        
        except Exception as e:
            sys.stderr.write(f"Error stopping instance {instance_id}: {e}\n")
            return {"success": False, "error": str(e)}
    
    def reboot_instance(self, instance_id: str) -> Dict:
        """Reboot a compute instance"""
        try:
            response = self.compute_client.instance_action(
                instance_id=instance_id,
                action="RESET"
            )
            
            return {
                "success": True,
                "instance_id": instance_id,
                "action": "RESET",
                "lifecycle_state": response.data.lifecycle_state,
                "time_created": response.data.time_created.isoformat() if response.data.time_created else None
            }
        
        except Exception as e:
            sys.stderr.write(f"Error rebooting instance {instance_id}: {e}\n")
            return {"success": False, "error": str(e)}
    
    def get_instance_status(self, instance_id: str) -> Dict:
        """Get current status of a compute instance"""
        try:
            instance = self.compute_client.get_instance(instance_id).data
            
            return {
                "success": True,
                "instance_id": instance_id,
                "display_name": instance.display_name,
                "lifecycle_state": instance.lifecycle_state,
                "availability_domain": instance.availability_domain,
                "shape": instance.shape,
                "time_created": instance.time_created.isoformat() if instance.time_created else None
            }
        
        except Exception as e:
            sys.stderr.write(f"Error getting instance status {instance_id}: {e}\n")
            return {"success": False, "error": str(e)}
    
    def test_connection(self) -> Dict:
        """Test connection to OCI services"""
        try:
            # Test compute client
            compartments = self.get_all_compartments()
            
            return {
                "success": True,
                "region": self.region,
                "compartments_count": len(compartments),
                "services": ["compute", "blockstorage", "identity", "network"],
                "message": "Successfully connected to OCI services"
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to connect to OCI services"
            }

def main():
    """Command line interface for OCI Compute Client"""
    parser = argparse.ArgumentParser(description='OCI Compute Client')
    parser.add_argument('action', choices=['list', 'start', 'stop', 'reboot', 'status', 'test', 'compartments'], 
                       help='Action to perform')
    parser.add_argument('--instance-id', help='Instance ID for start/stop/reboot/status actions')
    parser.add_argument('--compartment-id', help='Compartment ID for list action')
    parser.add_argument('--all-compartments', action='store_true', help='Search all compartments in tenancy')
    
    args = parser.parse_args()
    
    try:
        client = OCIComputeClient()
        
        if args.action == 'test':
            result = client.test_connection()
        elif args.action == 'compartments':
            compartments = client.get_all_compartments()
            result = {
                "success": True,
                "compartments": compartments,
                "total_count": len(compartments)
            }
        elif args.action == 'list':
            result = client.get_compute_instances(args.compartment_id, args.all_compartments)
        elif args.action == 'start':
            if not args.instance_id:
                result = {"success": False, "error": "Instance ID required for start action"}
            else:
                result = client.start_instance(args.instance_id)
        elif args.action == 'stop':
            if not args.instance_id:
                result = {"success": False, "error": "Instance ID required for stop action"}
            else:
                result = client.stop_instance(args.instance_id)
        elif args.action == 'reboot':
            if not args.instance_id:
                result = {"success": False, "error": "Instance ID required for reboot action"}
            else:
                result = client.reboot_instance(args.instance_id)
        elif args.action == 'status':
            if not args.instance_id:
                result = {"success": False, "error": "Instance ID required for status action"}
            else:
                result = client.get_instance_status(args.instance_id)
        else:
            result = {"success": False, "error": "Invalid action"}
        
        print(json.dumps(result, indent=2))
    
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()