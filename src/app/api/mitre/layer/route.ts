import { NextResponse } from 'next/server';
import { generateMitreAttackLayer } from '@/lib/mitre-attack/layer-generator';
import { parseOCILogContent } from '@/lib/log-parser';

export async function POST(request: Request) {
  try {
    const { logDataArray, layerName, description } = await request.json();

    if (!logDataArray || !Array.isArray(logDataArray)) {
      return NextResponse.json({ 
        error: 'Invalid input: logDataArray is required and must be an array.' 
      }, { status: 400 });
    }

    // Parse raw log data into a consistent format
    const parsedLogData = logDataArray
      .map((log: any) => {
        // Handle different input formats
        if (typeof log === 'string') {
          return parseOCILogContent(log);
        } else if (typeof log === 'object') {
          return parseOCILogContent(JSON.stringify(log));
        }
        return null;
      })
      .filter((data): data is NonNullable<typeof data> => data !== null);

    if (parsedLogData.length === 0) {
      return NextResponse.json({ 
        error: 'No valid log data could be parsed for MITRE ATT&CK mapping.' 
      }, { status: 400 });
    }

    const mitreLayer = generateMitreAttackLayer(
      parsedLogData, 
      layerName || 'OCI Security Events', 
      description
    );

    // Calculate additional statistics
    const stats = {
      totalLogs: logDataArray.length,
      parsedLogs: parsedLogData.length,
      techniquesDetected: mitreLayer.techniques.length,
      maxHits: mitreLayer.gradient?.maxValue || 0,
      coverageTactics: getUniqueTactics(mitreLayer.techniques)
    };

    return NextResponse.json({ 
      success: true, 
      layer: mitreLayer,
      stats,
      navigatorUrl: generateNavigatorUrl(mitreLayer)
    });
  } catch (error: any) {
    console.error('Error generating MITRE ATT&CK layer:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate MITRE ATT&CK layer.' 
    }, { status: 500 });
  }
}

/**
 * Get unique tactics covered by the techniques
 */
function getUniqueTactics(techniques: any[]): string[] {
  const tactics = new Set<string>();
  
  // This is a simplified mapping - in a real implementation, 
  // you'd have the full MITRE data with tactic mappings
  const tacticMapping: { [key: string]: string[] } = {
    'T1110': ['credential-access'],
    'T1078': ['initial-access', 'persistence', 'privilege-escalation'],
    'T1548': ['privilege-escalation'],
    'T1046': ['discovery'],
    'T1059': ['execution'],
    'T1071': ['command-and-control'],
    'T1003': ['credential-access'],
    'T1087': ['discovery'],
    'T1098': ['persistence'],
    'T1021': ['lateral-movement']
  };

  techniques.forEach(tech => {
    const techTactics = tacticMapping[tech.techniqueID] || [];
    techTactics.forEach(tactic => tactics.add(tactic));
  });

  return Array.from(tactics);
}

/**
 * Generate a URL to open the layer in the MITRE ATT&CK Navigator
 */
function generateNavigatorUrl(layer: any): string {
  // Encode the layer as base64 for the URL
  const layerData = JSON.stringify(layer);
  const encodedLayer = Buffer.from(layerData).toString('base64');
  
  // Return URL for the official MITRE ATT&CK Navigator
  return `https://mitre-attack.github.io/attack-navigator/#layerURL=data:application/json;base64,${encodedLayer}`;
}
