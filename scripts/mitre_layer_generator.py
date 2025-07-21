import json
import sys
import re
from logan_client import LoganClient

def generate_mitre_layer(query, time_period_minutes):
    """
    Generates a MITRE ATT&CK layer based on a query and log analysis.
    """
    try:
        # Initialize Logan client to fetch relevant data
        client = LoganClient()
        
        # Execute the query to get security events
        search_results = client.search_logs(query, time_period_minutes)
        
        # Analyze log data and map to MITRE techniques
        technique_scores = analyze_logs_for_mitre_techniques(search_results)
        
        # Generate layer with actual techniques and scores
        layer = {
            "name": f"Security Analysis: {query[:50]}... ({time_period_minutes}m)",
            "versions": {
                "attack": "14",
                "navigator": "4.8.2",
                "layer": "4.4"
            },
            "domain": "enterprise-attack",
            "description": f"Generated from OCI Logging Analytics query over {time_period_minutes} minutes. Shows detected MITRE ATT&CK techniques based on security events.",
            "filters": {
                "platforms": [
                    "Windows",
                    "Linux",
                    "macOS",
                    "Network",
                    "PRE",
                    "Containers",
                    "Office 365",
                    "SaaS",
                    "Google Workspace",
                    "IaaS",
                    "Azure AD"
                ]
            },
            "sorting": 0,
            "layout": {
                "layout": "side",
                "showID": False,
                "showName": True
            },
            "hideDisabled": False,
            "techniques": create_technique_objects(technique_scores),
            "gradient": {
                "colors": [
                    "#ffffff",
                    "#ff6666"
                ],
                "minValue": 0,
                "maxValue": max(technique_scores.values()) if technique_scores else 1
            },
            "legendItems": [
                {
                    "label": "No Activity",
                    "color": "#ffffff"
                },
                {
                    "label": "High Activity",
                    "color": "#ff6666"
                }
            ],
            "showTacticRowBackground": True,
            "tacticRowBackground": "#dddddd",
            "selectTechniquesAcrossTactics": True,
            "selectSubtechniquesWithParent": False
        }
        
        return {
            "success": True,
            "layer": layer,
            "total_events": len(search_results.get('data', [])),
            "techniques_detected": len(technique_scores)
        }
    except Exception as e:
        # Fallback to basic layer structure with error info
        return generate_fallback_layer(query, time_period_minutes, str(e))

def analyze_logs_for_mitre_techniques(search_results):
    """
    Analyzes log search results and maps events to MITRE ATT&CK techniques.
    Returns a dictionary with technique IDs as keys and occurrence counts as values.
    """
    technique_scores = {}
    
    # Define MITRE technique mappings based on log patterns
    technique_patterns = {
        'T1110': [  # Brute Force
            r'failed.*login',
            r'authentication.*failed',
            r'invalid.*credentials',
            r'brute.*force',
            r'password.*attempt'
        ],
        'T1078': [  # Valid Accounts
            r'successful.*login',
            r'authentication.*success',
            r'valid.*credentials',
            r'user.*authenticated'
        ],
        'T1548': [  # Abuse Elevation Control
            r'privilege.*escalation',
            r'elevation.*attempt',
            r'unauthorized.*access',
            r'admin.*rights',
            r'sudo.*attempt'
        ],
        'T1046': [  # Network Service Discovery
            r'port.*scan',
            r'network.*discovery',
            r'service.*enumeration',
            r'host.*discovery'
        ],
        'T1059': [  # Command and Scripting Interpreter
            r'command.*execution',
            r'script.*executed',
            r'shell.*command',
            r'powershell',
            r'cmd\.exe'
        ],
        'T1071': [  # Application Layer Protocol
            r'suspicious.*http',
            r'malicious.*traffic',
            r'c2.*communication',
            r'command.*control'
        ],
        'T1003': [  # OS Credential Dumping
            r'credential.*dump',
            r'memory.*access',
            r'password.*extract',
            r'hash.*dump'
        ],
        'T1087': [  # Account Discovery
            r'user.*enumeration',
            r'account.*discovery',
            r'group.*enumeration',
            r'member.*list'
        ],
        'T1098': [  # Account Manipulation
            r'user.*create',
            r'account.*modify',
            r'user.*delete',
            r'privilege.*change'
        ],
        'T1021': [  # Remote Services
            r'remote.*login',
            r'ssh.*connection',
            r'rdp.*connection',
            r'remote.*access'
        ]
    }
    
    # Process log entries
    if 'data' in search_results and search_results['data']:
        for log_entry in search_results['data']:
            # Extract relevant text from log entry
            log_text = ''
            if isinstance(log_entry, dict):
                # Get message or combine multiple fields
                message = log_entry.get('Message', '')
                event_name = log_entry.get('Event Name', '')
                action = log_entry.get('Action', '')
                log_text = f"{message} {event_name} {action}".lower()
            elif isinstance(log_entry, str):
                log_text = log_entry.lower()
            
            # Check for technique patterns
            for technique_id, patterns in technique_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, log_text, re.IGNORECASE):
                        technique_scores[technique_id] = technique_scores.get(technique_id, 0) + 1
                        break  # Count once per log entry per technique
    
    return technique_scores

def create_technique_objects(technique_scores):
    """
    Creates technique objects for the MITRE ATT&CK Navigator layer format.
    """
    techniques = []
    
    # Define technique metadata
    technique_metadata = {
        'T1110': {'name': 'Brute Force', 'tactic': 'credential-access'},
        'T1078': {'name': 'Valid Accounts', 'tactic': 'defense-evasion'},
        'T1548': {'name': 'Abuse Elevation Control', 'tactic': 'privilege-escalation'},
        'T1046': {'name': 'Network Service Discovery', 'tactic': 'discovery'},
        'T1059': {'name': 'Command and Scripting Interpreter', 'tactic': 'execution'},
        'T1071': {'name': 'Application Layer Protocol', 'tactic': 'command-and-control'},
        'T1003': {'name': 'OS Credential Dumping', 'tactic': 'credential-access'},
        'T1087': {'name': 'Account Discovery', 'tactic': 'discovery'},
        'T1098': {'name': 'Account Manipulation', 'tactic': 'persistence'},
        'T1021': {'name': 'Remote Services', 'tactic': 'lateral-movement'}
    }
    
    for technique_id, score in technique_scores.items():
        if technique_id in technique_metadata:
            technique = {
                "techniqueID": technique_id,
                "score": score,
                "color": get_color_for_score(score, max(technique_scores.values())),
                "comment": f"Detected {score} occurrences in log analysis",
                "enabled": True,
                "metadata": [
                    {
                        "name": "Detection Count",
                        "value": str(score)
                    }
                ]
            }
            techniques.append(technique)
    
    return techniques

def get_color_for_score(score, max_score):
    """
    Returns a color based on the score relative to the maximum score.
    """
    if max_score == 0:
        return "#ffffff"
    
    # Normalize score to 0-1 range
    normalized = score / max_score
    
    # Color gradient from white to red
    if normalized < 0.2:
        return "#fff5f5"
    elif normalized < 0.4:
        return "#fecaca"
    elif normalized < 0.6:
        return "#f87171"
    elif normalized < 0.8:
        return "#ef4444"
    else:
        return "#dc2626"

def generate_fallback_layer(query, time_period_minutes, error_message):
    """
    Generates a fallback layer when the main analysis fails.
    """
    return {
        "success": False,
        "error": error_message,
        "layer": {
            "name": f"Error - {query[:30]}... ({time_period_minutes}m)",
            "versions": {
                "attack": "14",
                "navigator": "4.8.2",
                "layer": "4.4"
            },
            "domain": "enterprise-attack",
            "description": f"Error occurred during analysis: {error_message}",
            "filters": {
                "platforms": ["Windows", "Linux", "macOS", "Network"]
            },
            "sorting": 0,
            "layout": {
                "layout": "side",
                "showID": False,
                "showName": True
            },
            "hideDisabled": False,
            "techniques": [],
            "gradient": {
                "colors": ["#ffffff", "#ffcccc"],
                "minValue": 0,
                "maxValue": 1
            },
            "legendItems": [],
            "showTacticRowBackground": True,
            "tacticRowBackground": "#dddddd",
            "selectTechniquesAcrossTactics": True,
            "selectSubtechniquesWithParent": False
        }
    }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: python mitre_layer_generator.py <query> <time_period_minutes>"}))
        sys.exit(1)

    query = sys.argv[1]
    time_period_minutes = sys.argv[2]
    result = generate_mitre_layer(query, time_period_minutes)
    print(json.dumps(result, indent=2))
