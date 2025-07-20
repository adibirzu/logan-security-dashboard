import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { timeRangeMinutes } = await request.json();
    
    // Enhanced query specifically for Windows Sysmon events with Technique ID extraction
    const mitreQuery = `
      'Log Source' = 'Windows Sysmon Events' 
<<<<<<< Updated upstream
      and User != 'NT AUTHORITY\\\\SYSTEM'
      and Technique_id != null 
      | timestats count as logrecords by Technique_id 
=======
      and 'User' != 'NT AUTHORITY\\\\SYSTEM'
      and 'Technique_id' is not null 
      | timestats count as logrecords by 'Technique_id' 
>>>>>>> Stashed changes
      | sort -logrecords
    `;

    const response = await fetch('http://localhost:3000/api/mcp/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mitreQuery,
        timePeriodMinutes: timeRangeMinutes || 1440,
        maxResults: 1000
      }),
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json({
        success: false,
        error: data.error || 'Failed to execute MITRE query'
      }, { status: 500 });
    }

    // Process the results to extract technique data
    const techniqueData = processTechniqueResults(data.results || []);
    
    // Generate MITRE ATT&CK layer with real technique counts
    const mitreLayer = generateEnhancedMitreLayer(techniqueData);
    
    // Calculate comprehensive stats
    const stats = calculateMitreStats(techniqueData);

    return NextResponse.json({
      success: true,
      techniques: techniqueData,
      layer: mitreLayer,
      stats,
      query: mitreQuery,
      executionTime: data.executionTime,
      navigatorUrl: generateNavigatorUrl(mitreLayer)
    });

  } catch (error: any) {
    console.error('Error executing MITRE Sysmon query:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to execute MITRE query'
    }, { status: 500 });
  }
}

interface TechniqueResult {
  techniqueId: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastSeen: string;
  tactics: string[];
  name: string;
  description: string;
}

function processTechniqueResults(results: any[]): TechniqueResult[] {
  const techniqueMap = new Map<string, TechniqueResult>();

  results.forEach(result => {
    // Extract technique ID from different possible fields
    let techniqueId = extractTechniqueId(result);
    
    if (!techniqueId) return;

    // Ensure proper format (T1234 or T1234.001)
    techniqueId = normalizeTechniqueId(techniqueId);
    
    const count = parseInt(result.logrecords || result.count || 1);
    const lastSeen = result.timestamp || result.Time || new Date().toISOString();

    if (techniqueMap.has(techniqueId)) {
      const existing = techniqueMap.get(techniqueId)!;
      existing.count += count;
      existing.lastSeen = new Date(lastSeen) > new Date(existing.lastSeen) ? lastSeen : existing.lastSeen;
    } else {
      const techniqueInfo = getTechniqueInfo(techniqueId);
      
      techniqueMap.set(techniqueId, {
        techniqueId,
        count,
        severity: calculateSeverity(count),
        lastSeen,
        tactics: techniqueInfo.tactics,
        name: techniqueInfo.name,
        description: techniqueInfo.description
      });
    }
  });

  return Array.from(techniqueMap.values()).sort((a, b) => b.count - a.count);
}

function extractTechniqueId(result: any): string | null {
  // Try different field names that might contain the technique ID
  const possibleFields = [
    'Technique_id',
    'TechniqueId', 
    'technique_id',
    'mitre_technique',
    'attack_technique',
    'technique'
  ];

  for (const field of possibleFields) {
    if (result[field]) {
      return String(result[field]).trim();
    }
  }

  // Try to extract from message or other text fields
  const textFields = ['message', 'Message', 'details', 'rawData'];
  for (const field of textFields) {
    if (result[field]) {
      const match = String(result[field]).match(/T\d{4}(?:\.\d{3})?/);
      if (match) {
        return match[0];
      }
    }
  }

  return null;
}

function normalizeTechniqueId(techniqueId: string): string {
  // Remove any prefixes and normalize format
  let normalized = techniqueId.replace(/^(mitre_|attack_|technique_)/, '');
  
  // Ensure it starts with T
  if (!normalized.startsWith('T')) {
    normalized = 'T' + normalized;
  }
  
  // Ensure proper format T1234 or T1234.001
  const match = normalized.match(/T(\d{4})(?:\.(\d{3}))?/);
  if (match) {
    return match[2] ? `T${match[1]}.${match[2]}` : `T${match[1]}`;
  }
  
  return normalized;
}

function calculateSeverity(count: number): 'low' | 'medium' | 'high' | 'critical' {
  if (count >= 100) return 'critical';
  if (count >= 50) return 'high';
  if (count >= 10) return 'medium';
  return 'low';
}

function getTechniqueInfo(techniqueId: string): { name: string; description: string; tactics: string[] } {
  // Enhanced technique mappings with more comprehensive data
  const techniqueDatabase: { [key: string]: { name: string; description: string; tactics: string[] } } = {
    'T1003': {
      name: 'OS Credential Dumping',
      description: 'Dump credentials from operating system and software',
      tactics: ['credential-access']
    },
    'T1059': {
      name: 'Command and Scripting Interpreter',
      description: 'Execute commands and scripts',
      tactics: ['execution']
    },
    'T1078': {
      name: 'Valid Accounts',
      description: 'Use legitimate credentials',
      tactics: ['initial-access', 'persistence', 'privilege-escalation', 'defense-evasion']
    },
    'T1110': {
      name: 'Brute Force',
      description: 'Systematically guess passwords',
      tactics: ['credential-access']
    },
    'T1548': {
      name: 'Abuse Elevation Control Mechanism',
      description: 'Circumvent mechanisms designed to control elevated privileges',
      tactics: ['privilege-escalation', 'defense-evasion']
    },
    'T1046': {
      name: 'Network Service Scanning',
      description: 'Scan for network services',
      tactics: ['discovery']
    },
    'T1071': {
      name: 'Application Layer Protocol',
      description: 'Communicate using application layer protocols',
      tactics: ['command-and-control']
    },
    'T1087': {
      name: 'Account Discovery',
      description: 'Discover accounts on the system',
      tactics: ['discovery']
    },
    'T1098': {
      name: 'Account Manipulation',
      description: 'Manipulate accounts to maintain access',
      tactics: ['persistence']
    },
    'T1021': {
      name: 'Remote Services',
      description: 'Use remote services for lateral movement',
      tactics: ['lateral-movement']
    },
    'T1055': {
      name: 'Process Injection',
      description: 'Inject code into processes',
      tactics: ['privilege-escalation', 'defense-evasion']
    },
    'T1082': {
      name: 'System Information Discovery',
      description: 'Gather system information',
      tactics: ['discovery']
    },
    'T1083': {
      name: 'File and Directory Discovery',
      description: 'Enumerate files and directories',
      tactics: ['discovery']
    },
    'T1105': {
      name: 'Ingress Tool Transfer',
      description: 'Transfer tools from external systems',
      tactics: ['command-and-control']
    },
    'T1112': {
      name: 'Modify Registry',
      description: 'Modify Windows registry',
      tactics: ['defense-evasion']
    }
  };

  const info = techniqueDatabase[techniqueId];
  if (info) {
    return info;
  }

  // Default for unknown techniques
  return {
    name: `Unknown Technique ${techniqueId}`,
    description: 'Unknown MITRE ATT&CK technique',
    tactics: ['unknown']
  };
}

function generateEnhancedMitreLayer(techniques: TechniqueResult[]): any {
  const maxCount = Math.max(...techniques.map(t => t.count), 1);
  
  const layerTechniques = techniques.map(tech => ({
    techniqueID: tech.techniqueId,
    score: tech.count,
    color: getSeverityColor(tech.severity),
    comment: `${tech.name} - ${tech.count} events detected`,
    metadata: {
      count: tech.count,
      severity: tech.severity,
      lastSeen: tech.lastSeen,
      tactics: tech.tactics
    }
  }));

  return {
    name: 'Windows Sysmon MITRE ATT&CK Mapping',
    versions: {
      attack: '13',
      navigator: '4.8.2',
      layer: '4.4'
    },
    domain: 'enterprise-attack',
    description: `MITRE ATT&CK techniques detected from Windows Sysmon events. Total techniques: ${techniques.length}`,
    filters: {
      platforms: ['windows']
    },
    sorting: 3,
    layout: {
      layout: 'side',
      aggregateFunction: 'average',
      showID: true,
      showName: true,
      showAggregateScores: true,
      countUnscored: false
    },
    techniques: layerTechniques,
    gradient: {
      colors: ['#ffffff', '#66b3ff', '#0066cc', '#004499', '#002266'],
      minValue: 0,
      maxValue: maxCount
    },
    legendItems: [
      { label: 'Low (1-9)', color: '#ffffff' },
      { label: 'Medium (10-49)', color: '#66b3ff' },
      { label: 'High (50-99)', color: '#0066cc' },
      { label: 'Critical (100+)', color: '#002266' }
    ]
  };
}

function getSeverityColor(severity: string): string {
  const colors = {
    'low': '#e5f3ff',
    'medium': '#66b3ff',
    'high': '#0066cc',
    'critical': '#002266'
  };
  return colors[severity as keyof typeof colors] || '#e5f3ff';
}

function calculateMitreStats(techniques: TechniqueResult[]): any {
  const totalEvents = techniques.reduce((sum, tech) => sum + tech.count, 0);
  const tacticsCovered = new Set<string>();
  
  techniques.forEach(tech => {
    tech.tactics.forEach(tactic => tacticsCovered.add(tactic));
  });

  const severityBreakdown = techniques.reduce((acc, tech) => {
    acc[tech.severity] = (acc[tech.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalTechniques: techniques.length,
    totalEvents,
    tacticsCovered: Array.from(tacticsCovered),
    severityBreakdown,
    topTechniques: techniques.slice(0, 10),
    coverage: {
      totalPossibleTechniques: 188, // Approximate number of Windows techniques
      detectedTechniques: techniques.length,
      coveragePercentage: Math.round((techniques.length / 188) * 100)
    }
  };
}

function generateNavigatorUrl(layer: any): string {
  try {
    const layerData = JSON.stringify(layer);
    const encodedLayer = Buffer.from(layerData).toString('base64');
    return `https://mitre-attack.github.io/attack-navigator/#layerURL=data:application/json;base64,${encodedLayer}`;
  } catch (error) {
    console.error('Error generating navigator URL:', error);
    return 'https://mitre-attack.github.io/attack-navigator/';
  }
}