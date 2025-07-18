export interface MitreTactic {
  id: string;
  name: string;
  shortName: string;
  description: string;
  url: string;
}

export interface MitreTechniqueDetail {
  id: string;
  name: string;
  description: string;
  url: string;
  tactics: string[]; // Array of tactic IDs this technique belongs to
  detectionName?: string;
  platforms?: string[];
  dataSources?: string[];
  subTechniques?: string[];
}

export interface TechniqueHitData {
  techniqueId: string;
  count: number;
  color: string;
  metadata?: {
    lastSeen?: string;
    severity?: string;
    sources?: string[];
  };
}

// MITRE ATT&CK Enterprise Tactics (v14)
export const MITRE_TACTICS: MitreTactic[] = [
  {
    id: 'TA0001',
    name: 'Initial Access',
    shortName: 'Initial Access',
    description: 'The adversary is trying to get into your network.',
    url: 'https://attack.mitre.org/tactics/TA0001/'
  },
  {
    id: 'TA0002',
    name: 'Execution',
    shortName: 'Execution',
    description: 'The adversary is trying to run malicious code.',
    url: 'https://attack.mitre.org/tactics/TA0002/'
  },
  {
    id: 'TA0003',
    name: 'Persistence',
    shortName: 'Persistence',
    description: 'The adversary is trying to maintain their foothold.',
    url: 'https://attack.mitre.org/tactics/TA0003/'
  },
  {
    id: 'TA0004',
    name: 'Privilege Escalation',
    shortName: 'Privilege Escalation',
    description: 'The adversary is trying to gain higher-level permissions.',
    url: 'https://attack.mitre.org/tactics/TA0004/'
  },
  {
    id: 'TA0005',
    name: 'Defense Evasion',
    shortName: 'Defense Evasion',
    description: 'The adversary is trying to avoid being detected.',
    url: 'https://attack.mitre.org/tactics/TA0005/'
  },
  {
    id: 'TA0006',
    name: 'Credential Access',
    shortName: 'Credential Access',
    description: 'The adversary is trying to steal account names and passwords.',
    url: 'https://attack.mitre.org/tactics/TA0006/'
  },
  {
    id: 'TA0007',
    name: 'Discovery',
    shortName: 'Discovery',
    description: 'The adversary is trying to figure out your environment.',
    url: 'https://attack.mitre.org/tactics/TA0007/'
  },
  {
    id: 'TA0008',
    name: 'Lateral Movement',
    shortName: 'Lateral Movement',
    description: 'The adversary is trying to move through your environment.',
    url: 'https://attack.mitre.org/tactics/TA0008/'
  },
  {
    id: 'TA0009',
    name: 'Collection',
    shortName: 'Collection',
    description: 'The adversary is trying to gather data of interest.',
    url: 'https://attack.mitre.org/tactics/TA0009/'
  },
  {
    id: 'TA0011',
    name: 'Command and Control',
    shortName: 'Command and Control',
    description: 'The adversary is trying to communicate with compromised systems.',
    url: 'https://attack.mitre.org/tactics/TA0011/'
  },
  {
    id: 'TA0010',
    name: 'Exfiltration',
    shortName: 'Exfiltration',
    description: 'The adversary is trying to steal data.',
    url: 'https://attack.mitre.org/tactics/TA0010/'
  },
  {
    id: 'TA0040',
    name: 'Impact',
    shortName: 'Impact',
    description: 'The adversary is trying to manipulate, interrupt, or destroy your systems.',
    url: 'https://attack.mitre.org/tactics/TA0040/'
  }
];

// Expanded MITRE ATT&CK Enterprise Techniques (focused on cloud and common techniques)
export const MITRE_TECHNIQUES: MitreTechniqueDetail[] = [
  // Initial Access
  {
    id: 'T1078',
    name: 'Valid Accounts',
    description: 'Use of legitimate credentials to access systems.',
    url: 'https://attack.mitre.org/techniques/T1078/',
    tactics: ['TA0001', 'TA0003', 'TA0004', 'TA0005'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace', 'Containers']
  },
  {
    id: 'T1190',
    name: 'Exploit Public-Facing Application',
    description: 'Exploitation of weaknesses in public-facing applications.',
    url: 'https://attack.mitre.org/techniques/T1190/',
    tactics: ['TA0001'],
    platforms: ['Windows', 'Linux', 'macOS', 'Network', 'Containers']
  },
  {
    id: 'T1566',
    name: 'Phishing',
    description: 'Sending malicious messages to obtain access.',
    url: 'https://attack.mitre.org/techniques/T1566/',
    tactics: ['TA0001'],
    platforms: ['Windows', 'Linux', 'macOS', 'Office 365', 'SaaS', 'Google Workspace']
  },

  // Execution
  {
    id: 'T1059',
    name: 'Command and Scripting Interpreter',
    description: 'Execution of commands or scripts.',
    url: 'https://attack.mitre.org/techniques/T1059/',
    tactics: ['TA0002'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace', 'Containers']
  },
  {
    id: 'T1053',
    name: 'Scheduled Task/Job',
    description: 'Execution of malicious tasks at specified times.',
    url: 'https://attack.mitre.org/techniques/T1053/',
    tactics: ['TA0002', 'TA0003', 'TA0004'],
    platforms: ['Windows', 'Linux', 'macOS', 'Containers']
  },

  // Persistence
  {
    id: 'T1098',
    name: 'Account Manipulation',
    description: 'Modifying accounts to maintain access.',
    url: 'https://attack.mitre.org/techniques/T1098/',
    tactics: ['TA0003'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace']
  },
  {
    id: 'T1136',
    name: 'Create Account',
    description: 'Creation of new accounts for persistence.',
    url: 'https://attack.mitre.org/techniques/T1136/',
    tactics: ['TA0003'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace']
  },

  // Privilege Escalation
  {
    id: 'T1548',
    name: 'Abuse Elevation Control Mechanism',
    description: 'Abuse of features to elevate privileges.',
    url: 'https://attack.mitre.org/techniques/T1548/',
    tactics: ['TA0004', 'TA0005'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace']
  },

  // Defense Evasion
  {
    id: 'T1562',
    name: 'Impair Defenses',
    description: 'Preventing or disabling security tools.',
    url: 'https://attack.mitre.org/techniques/T1562/',
    tactics: ['TA0005'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace', 'Containers']
  },
  {
    id: 'T1070',
    name: 'Indicator Removal',
    description: 'Deletion or modification of generated evidence.',
    url: 'https://attack.mitre.org/techniques/T1070/',
    tactics: ['TA0005'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace', 'Containers']
  },

  // Credential Access
  {
    id: 'T1110',
    name: 'Brute Force',
    description: 'Attempting to guess credentials or encryption keys.',
    url: 'https://attack.mitre.org/techniques/T1110/',
    tactics: ['TA0006'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace', 'Containers']
  },
  {
    id: 'T1003',
    name: 'OS Credential Dumping',
    description: 'Accessing credentials from the operating system.',
    url: 'https://attack.mitre.org/techniques/T1003/',
    tactics: ['TA0006'],
    platforms: ['Windows', 'Linux', 'macOS']
  },
  {
    id: 'T1552',
    name: 'Unsecured Credentials',
    description: 'Searching for credentials in unsecured locations.',
    url: 'https://attack.mitre.org/techniques/T1552/',
    tactics: ['TA0006'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace', 'Containers']
  },

  // Discovery
  {
    id: 'T1087',
    name: 'Account Discovery',
    description: 'Discovery of local or domain accounts.',
    url: 'https://attack.mitre.org/techniques/T1087/',
    tactics: ['TA0007'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace']
  },
  {
    id: 'T1046',
    name: 'Network Service Discovery',
    description: 'Discovery of network services and open ports.',
    url: 'https://attack.mitre.org/techniques/T1046/',
    tactics: ['TA0007'],
    platforms: ['Windows', 'Linux', 'macOS', 'Containers']
  },
  {
    id: 'T1083',
    name: 'File and Directory Discovery',
    description: 'Enumeration of files and directories.',
    url: 'https://attack.mitre.org/techniques/T1083/',
    tactics: ['TA0007'],
    platforms: ['Windows', 'Linux', 'macOS', 'IaaS', 'Containers']
  },

  // Lateral Movement
  {
    id: 'T1021',
    name: 'Remote Services',
    description: 'Use of legitimate remote access protocols.',
    url: 'https://attack.mitre.org/techniques/T1021/',
    tactics: ['TA0008'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace']
  },
  {
    id: 'T1210',
    name: 'Exploitation of Remote Services',
    description: 'Exploiting remote services for lateral movement.',
    url: 'https://attack.mitre.org/techniques/T1210/',
    tactics: ['TA0008'],
    platforms: ['Windows', 'Linux', 'macOS', 'Containers']
  },

  // Collection
  {
    id: 'T1005',
    name: 'Data from Local System',
    description: 'Collection of data from the local system.',
    url: 'https://attack.mitre.org/techniques/T1005/',
    tactics: ['TA0009'],
    platforms: ['Windows', 'Linux', 'macOS', 'IaaS', 'Containers']
  },
  {
    id: 'T1530',
    name: 'Data from Cloud Storage',
    description: 'Collection of data from cloud storage repositories.',
    url: 'https://attack.mitre.org/techniques/T1530/',
    tactics: ['TA0009'],
    platforms: ['Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace']
  },

  // Command and Control
  {
    id: 'T1071',
    name: 'Application Layer Protocol',
    description: 'Use of common network protocols for communication.',
    url: 'https://attack.mitre.org/techniques/T1071/',
    tactics: ['TA0011'],
    platforms: ['Windows', 'Linux', 'macOS', 'Network']
  },
  {
    id: 'T1573',
    name: 'Encrypted Channel',
    description: 'Use of encrypted communication channels.',
    url: 'https://attack.mitre.org/techniques/T1573/',
    tactics: ['TA0011'],
    platforms: ['Windows', 'Linux', 'macOS', 'Network']
  },

  // Exfiltration
  {
    id: 'T1041',
    name: 'Exfiltration Over C2 Channel',
    description: 'Data exfiltration over command and control channel.',
    url: 'https://attack.mitre.org/techniques/T1041/',
    tactics: ['TA0010'],
    platforms: ['Windows', 'Linux', 'macOS', 'Network']
  },
  {
    id: 'T1567',
    name: 'Exfiltration Over Web Service',
    description: 'Data exfiltration using web services.',
    url: 'https://attack.mitre.org/techniques/T1567/',
    tactics: ['TA0010'],
    platforms: ['Windows', 'Linux', 'macOS', 'SaaS', 'IaaS']
  },

  // Impact
  {
    id: 'T1485',
    name: 'Data Destruction',
    description: 'Destruction of data to disrupt operations.',
    url: 'https://attack.mitre.org/techniques/T1485/',
    tactics: ['TA0040'],
    platforms: ['Windows', 'Linux', 'macOS', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace', 'Containers']
  },
  {
    id: 'T1486',
    name: 'Data Encrypted for Impact',
    description: 'Encryption of data to disrupt operations.',
    url: 'https://attack.mitre.org/techniques/T1486/',
    tactics: ['TA0040'],
    platforms: ['Windows', 'Linux', 'macOS', 'IaaS', 'Containers']
  },
  {
    id: 'T1498',
    name: 'Network Denial of Service',
    description: 'Denial of service attacks on network resources.',
    url: 'https://attack.mitre.org/techniques/T1498/',
    tactics: ['TA0040'],
    platforms: ['Windows', 'Linux', 'macOS', 'Network', 'Azure AD', 'Office 365', 'SaaS', 'IaaS', 'Google Workspace']
  }
];

// Helper functions
export function getTacticById(tacticId: string): MitreTactic | undefined {
  return MITRE_TACTICS.find(t => t.id === tacticId);
}

export function getTechniqueById(techniqueId: string): MitreTechniqueDetail | undefined {
  return MITRE_TECHNIQUES.find(t => t.id === techniqueId);
}

export function getTechniquesByTactic(tacticId: string): MitreTechniqueDetail[] {
  return MITRE_TECHNIQUES.filter(t => t.tactics.includes(tacticId));
}

export function getAllTechniquesForMatrix(): { [tacticId: string]: MitreTechniqueDetail[] } {
  const matrix: { [tacticId: string]: MitreTechniqueDetail[] } = {};
  
  MITRE_TACTICS.forEach(tactic => {
    matrix[tactic.id] = getTechniquesByTactic(tactic.id);
  });
  
  return matrix;
}

// Color scheme for the matrix visualization
export const MATRIX_COLORS = {
  background: '#ffffff',
  border: '#e5e5e5',
  text: '#374151',
  tacticHeader: '#1f2937',
  tacticBackground: '#f3f4f6',
  techniqueDefault: '#f9fafb',
  techniqueHover: '#e5e7eb',
  heatmap: [
    '#f7fafc', // No activity
    '#e2e8f0', // 1-2 hits
    '#cbd5e0', // 3-5 hits
    '#a0aec0', // 6-10 hits
    '#718096', // 11-20 hits
    '#4a5568', // 21-50 hits
    '#2d3748', // 51-100 hits
    '#1a202c', // 101+ hits
  ],
  severity: {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626'
  }
};
