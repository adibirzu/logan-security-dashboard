import { ParsedLogData } from '@/lib/log-parser';

export interface MitreTechnique {
  id: string;
  name: string;
  description: string;
  url: string;
}

export interface MappedTechnique extends MitreTechnique {
  score: number; // Represents hits/frequency
  comment: string;
}

// A simplified list of MITRE ATT&CK techniques for mapping purposes
// In a real-world scenario, this would be a more comprehensive dataset
export const MITRE_ATTACK_TECHNIQUES: MitreTechnique[] = [
  {
    id: 'T1110',
    name: 'Brute Force',
    description: 'Attempting to guess credentials or encryption keys.',
    url: 'https://attack.mitre.org/techniques/T1110/'
  },
  {
    id: 'T1078',
    name: 'Valid Accounts',
    description: 'Use of legitimate credentials to access systems.',
    url: 'https://attack.mitre.org/techniques/T1078/'
  },
  {
    id: 'T1548',
    name: 'Abuse Elevation Control',
    description: 'Abuse of features to elevate privileges.',
    url: 'https://attack.mitre.org/techniques/T1548/'
  },
  {
    id: 'T1046',
    name: 'Network Service Discovery',
    description: 'Discovery of network services and open ports.',
    url: 'https://attack.mitre.org/techniques/T1046/'
  },
  {
    id: 'T1059',
    name: 'Command and Scripting Interpreter',
    description: 'Execution of commands or scripts.',
    url: 'https://attack.mitre.org/techniques/T1059/'
  },
  {
    id: 'T1071',
    name: 'Application Layer Protocol',
    description: 'Use of common network protocols for communication.',
    url: 'https://attack.mitre.org/techniques/T1071/'
  },
  {
    id: 'T1003',
    name: 'OS Credential Dumping',
    description: 'Accessing credentials from the operating system.',
    url: 'https://attack.mitre.org/techniques/T1003/'
  },
  {
    id: 'T1087',
    name: 'Account Discovery',
    description: 'Discovery of local or domain accounts.',
    url: 'https://attack.mitre.org/techniques/T1087/'
  },
  {
    id: 'T1098',
    name: 'Account Manipulation',
    description: 'Modifying accounts to maintain access.',
    url: 'https://attack.mitre.org/techniques/T1098/'
  },
  {
    id: 'T1021',
    name: 'Remote Services',
    description: 'Use of legitimate remote access protocols.',
    url: 'https://attack.mitre.org/techniques/T1021/'
  }
];

/**
 * Maps a parsed OCI log event to relevant MITRE ATT&CK techniques.
 * This is a simplified mapping and can be expanded for more accuracy.
 * @param logData The parsed log data.
 * @returns An array of MITRE ATT&CK technique IDs that match the log event.
 */
export function mapLogToMitreTechniques(logData: ParsedLogData): string[] {
  const techniques: Set<string> = new Set();

  const messageLower = logData.message?.toLowerCase() || '';
  const eventNameLower = logData.eventName?.toLowerCase() || '';
  const actionLower = logData.action?.toLowerCase() || '';
  const severity = logData.severity;
  
  // If we have minimal data due to parsing issues, try to infer from whatever is available
  const allText = `${messageLower} ${eventNameLower} ${actionLower} ${logData.details?.toLowerCase() || ''}`.toLowerCase();
  
  // First check if MITRE technique IDs are explicitly present in the log data
  const techniqueIdPattern = /T\d{4}(\.\d{3})?/gi;
  const explicitTechniques = allText.match(techniqueIdPattern);
  if (explicitTechniques) {
    explicitTechniques.forEach(id => {
      const normalizedId = id.toUpperCase();
      // Only add if it's one of our known techniques
      if (MITRE_ATTACK_TECHNIQUES.some(t => t.id === normalizedId)) {
        techniques.add(normalizedId);
      }
    });
  }

  // T1110: Brute Force (e.g., failed login attempts)
  if (messageLower.includes('failed login') || messageLower.includes('invalid credentials') || allText.includes('brute force')) {
    techniques.add('T1110');
  }

  // T1078: Valid Accounts (e.g., successful logins, API calls with valid credentials)
  if (messageLower.includes('successful login') || eventNameLower.includes('api call') && severity !== 'high' && severity !== 'critical') {
    techniques.add('T1078');
  }

  // T1548: Abuse Elevation Control (e.g., privilege escalation attempts)
  if (messageLower.includes('privilege escalation') || messageLower.includes('unauthorized access') && (eventNameLower.includes('iam') || eventNameLower.includes('security'))) {
    techniques.add('T1548');
  }

  // T1046: Network Service Discovery (e.g., port scanning, network enumeration)
  if (messageLower.includes('port scan') || messageLower.includes('network discovery')) {
    techniques.add('T1046');
  }

  // T1059: Command and Scripting Interpreter (e.g., suspicious command execution)
  if (messageLower.includes('command execution') || messageLower.includes('script run') || actionLower.includes('exec')) {
    techniques.add('T1059');
  }

  // T1071: Application Layer Protocol (e.g., unusual HTTP/DNS activity)
  if (logData.sourceIp && (messageLower.includes('http request') || messageLower.includes('dns query')) && severity === 'high') {
    techniques.add('T1071');
  }

  // T1003: OS Credential Dumping (e.g., access to sensitive files, memory dumps)
  if (messageLower.includes('credential dump') || messageLower.includes('memory access') && severity === 'critical') {
    techniques.add('T1003');
  }

  // T1087: Account Discovery (e.g., enumeration of users/groups)
  if (messageLower.includes('user enumeration') || messageLower.includes('group discovery')) {
    techniques.add('T1087');
  }

  // T1098: Account Manipulation (e.g., account creation/modification/deletion)
  if (eventNameLower.includes('user create') || eventNameLower.includes('user modify') || eventNameLower.includes('user delete')) {
    techniques.add('T1098');
  }

  // T1021: Remote Services (e.g., RDP/SSH connections from unusual IPs)
  if (messageLower.includes('remote login') || messageLower.includes('ssh connection') || messageLower.includes('rdp connection') && logData.sourceIp) {
    techniques.add('T1021');
  }

  return Array.from(techniques);
}

/**
 * Retrieves a MITRE ATT&CK technique by its ID.
 * @param techniqueId The ID of the technique (e.g., 'T1110').
 * @returns The MitreTechnique object or undefined if not found.
 */
export function getMitreTechniqueById(techniqueId: string): MitreTechnique | undefined {
  return MITRE_ATTACK_TECHNIQUES.find(t => t.id === techniqueId);
}
