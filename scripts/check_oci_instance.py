#!/usr/bin/env python3
"""
Check if running on OCI instance and detect available authentication methods
"""

import json
import os
import sys
import requests
import socket
from typing import Dict, Any, Optional

def check_instance_metadata() -> Optional[Dict[str, Any]]:
    """
    Check if running on OCI instance by querying instance metadata service
    """
    try:
        # OCI instance metadata service endpoint
        metadata_url = "http://169.254.169.254/opc/v2/instance/"
        
        # Try to connect to metadata service with short timeout
        response = requests.get(metadata_url, timeout=2)
        
        if response.status_code == 200:
            instance_data = response.json()
            
            # Get additional metadata
            identity_url = "http://169.254.169.254/opc/v2/identity/"
            identity_response = requests.get(identity_url, timeout=2)
            
            return {
                'is_oci_instance': True,
                'instance_id': instance_data.get('id'),
                'compartment_id': instance_data.get('compartmentId'),
                'region': instance_data.get('region'),
                'shape': instance_data.get('shape'),
                'availability_domain': instance_data.get('availabilityDomain'),
                'fault_domain': instance_data.get('faultDomain'),
                'identity_available': identity_response.status_code == 200
            }
    except Exception:
        pass
    
    return None

def check_instance_principal_auth() -> bool:
    """
    Check if instance principal authentication is available
    """
    try:
        import oci
        # Try to create instance principal signer
        signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
        
        # Test the signer by making a simple API call
        identity = oci.identity.IdentityClient(config={}, signer=signer)
        identity.get_tenancy(signer.tenancy_id)
        
        return True
    except Exception:
        return False

def check_resource_principal_auth() -> bool:
    """
    Check if resource principal authentication is available
    """
    try:
        import oci
        # Check for resource principal environment variables
        required_vars = ['OCI_RESOURCE_PRINCIPAL_VERSION', 'OCI_RESOURCE_PRINCIPAL_RPST']
        
        if all(var in os.environ for var in required_vars):
            # Try to create resource principal signer
            signer = oci.auth.signers.get_resource_principals_signer()
            return True
    except Exception:
        pass
    
    return False

def check_config_file_auth() -> Dict[str, Any]:
    """
    Check for OCI config file authentication
    """
    config_file_path = os.path.expanduser('~/.oci/config')
    config_exists = os.path.exists(config_file_path)
    
    profiles = []
    if config_exists:
        try:
            import oci
            from configparser import ConfigParser
            
            parser = ConfigParser()
            parser.read(config_file_path)
            profiles = list(parser.sections())
            
            # Try to validate DEFAULT profile
            try:
                config = oci.config.from_file()
                oci.config.validate_config(config)
                default_valid = True
            except Exception:
                default_valid = False
                
            return {
                'available': True,
                'config_path': config_file_path,
                'profiles': profiles,
                'default_profile_valid': default_valid
            }
        except Exception as e:
            return {
                'available': False,
                'error': str(e)
            }
    
    return {
        'available': False,
        'config_path': config_file_path,
        'error': 'Config file not found'
    }

def get_environment_suggestion() -> Dict[str, Any]:
    """
    Suggest the best authentication method based on environment
    """
    instance_info = check_instance_metadata()
    
    result = {
        'is_oci_instance': instance_info is not None,
        'instance_metadata': instance_info,
        'auth_methods': {
            'instance_principal': False,
            'resource_principal': False,
            'config_file': check_config_file_auth()
        },
        'recommendations': []
    }
    
    # Check available auth methods
    if instance_info:
        result['auth_methods']['instance_principal'] = check_instance_principal_auth()
        
    result['auth_methods']['resource_principal'] = check_resource_principal_auth()
    
    # Make recommendations
    if result['auth_methods']['instance_principal']:
        result['recommendations'].append({
            'priority': 1,
            'method': 'instance_principal',
            'reason': 'Running on OCI instance with instance principal configured',
            'security': 'High - No credentials to manage',
            'setup_required': False
        })
    elif instance_info and not result['auth_methods']['instance_principal']:
        result['recommendations'].append({
            'priority': 2,
            'method': 'instance_principal',
            'reason': 'Running on OCI instance but instance principal not configured',
            'security': 'High - No credentials to manage',
            'setup_required': True,
            'setup_steps': [
                'Create dynamic group for instances',
                'Add policy statements for Logan access',
                'No instance restart required'
            ]
        })
    
    if result['auth_methods']['resource_principal']:
        result['recommendations'].append({
            'priority': 1,
            'method': 'resource_principal',
            'reason': 'Resource principal environment detected (Functions/Container)',
            'security': 'High - Managed by OCI',
            'setup_required': False
        })
    
    if result['auth_methods']['config_file']['available']:
        result['recommendations'].append({
            'priority': 3,
            'method': 'config_file',
            'reason': 'OCI CLI configuration found',
            'security': 'Medium - API key stored locally',
            'setup_required': False,
            'profiles': result['auth_methods']['config_file']['profiles']
        })
    else:
        result['recommendations'].append({
            'priority': 4,
            'method': 'config_file',
            'reason': 'Can be configured with OCI CLI',
            'security': 'Medium - API key stored locally',
            'setup_required': True,
            'setup_steps': [
                'Install OCI CLI',
                'Run: oci setup config',
                'Create API key in OCI Console',
                'Add API key to user'
            ]
        })
    
    # Sort recommendations by priority
    result['recommendations'].sort(key=lambda x: x['priority'])
    
    # Add suggested default config
    if result['recommendations']:
        best_method = result['recommendations'][0]
        
        result['suggested_config'] = {
            'authType': best_method['method'],
            'setupRequired': best_method.get('setup_required', False)
        }
        
        if instance_info and best_method['method'] == 'instance_principal':
            result['suggested_config'].update({
                'compartmentId': instance_info['compartment_id'],
                'region': instance_info['region']
            })
    
    return result

def main():
    """Main entry point"""
    try:
        result = get_environment_suggestion()
        print(json.dumps(result, indent=2))
        
        # Exit with code 0 if instance principal is available and configured
        # Exit with code 1 if on OCI but needs setup
        # Exit with code 2 if not on OCI
        if result['auth_methods']['instance_principal']:
            sys.exit(0)
        elif result['is_oci_instance']:
            sys.exit(1)
        else:
            sys.exit(2)
            
    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'is_oci_instance': False
        }, indent=2))
        sys.exit(2)

if __name__ == '__main__':
    main()