import { MappedTechnique, MitreTechnique, MITRE_ATTACK_TECHNIQUES, getMitreTechniqueById, mapLogToMitreTechniques } from './technique-mappings';
import { ParsedLogData } from '@/lib/log-parser';

export interface MitreAttackLayer {
  version: string;
  name: string;
  description: string;
  domain: string;
  created: string;
  created_by: string;
  techniques: {
    techniqueID: string;
    score: number;
    comment: string;
    color?: string;
    enabled?: boolean;
    metadata?: Array<{
      name: string;
      value: string;
    }>;
  }[];
  gradient?: {
    colors: string[];
    minValue: number;
    maxValue: number;
  };
  showTacticRowBackground?: boolean;
  tacticRowBackground?: string;
  selectTechniquesAcrossTactics?: boolean;
  legendItems?: Array<{
    label: string;
    color: string;
  }>;
  metadata?: Array<{
    name: string;
    value: string;
  }>;
}

/**
 * Generates a MITRE ATT&CK Navigator layer from a list of parsed log data.
 * The layer will show technique IDs with a score based on their frequency (hits).
 * @param logDataArray An array of parsed OCI log data.
 * @param layerName The name for the generated layer.
 * @param description Optional description for the layer.
 * @returns A MitreAttackLayer object compatible with the official MITRE ATT&CK Navigator.
 */
export function generateMitreAttackLayer(
  logDataArray: ParsedLogData[], 
  layerName: string = 'OCI Security Events',
  description?: string
): MitreAttackLayer {
  const techniqueCounts: { [key: string]: number } = {};

  // Count occurrences of each mapped technique
  logDataArray.forEach(logData => {
    const mappedTechniqueIds = mapLogToMitreTechniques(logData); // Use the actual mapping function

    mappedTechniqueIds.forEach((techId: string) => { // Explicitly type techId as string
      if (techId) { // Ensure techId is not undefined or null
        techniqueCounts[techId] = (techniqueCounts[techId] || 0) + 1;
      }
    });
  });

  const techniquesInLayer: MitreAttackLayer['techniques'] = [];
  let maxScore = 0;

  // Prepare techniques for the layer
  for (const techId in techniqueCounts) {
    const count = techniqueCounts[techId];
    const technique = getMitreTechniqueById(techId); // Get full technique details

    if (technique) {
      techniquesInLayer.push({
        techniqueID: technique.id,
        score: count, // Score is the hit count
        comment: `${count} hits detected in OCI logs for ${technique.name}`,
        enabled: true,
        metadata: [
          { name: 'technique_name', value: technique.name },
          { name: 'hit_count', value: count.toString() },
          { name: 'source', value: 'OCI Logging Analytics' },
          { name: 'last_updated', value: new Date().toISOString() }
        ]
      });
      if (count > maxScore) {
        maxScore = count;
      }
    }
  }

  // Assign colors based on score using a proper gradient
  const colors = ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'];
  
  techniquesInLayer.forEach(tech => {
    if (maxScore > 0) {
      const normalizedScore = tech.score / maxScore;
      const colorIndex = Math.min(Math.floor(normalizedScore * colors.length), colors.length - 1);
      tech.color = colors[colorIndex];
    } else {
      tech.color = colors[0]; // Lightest color for no hits
    }
  });

  const currentTime = new Date().toISOString();
  
  return {
    version: '4.5', // Current ATT&CK Navigator layer format version
    name: layerName,
    description: description || `MITRE ATT&CK techniques detected in OCI Logging Analytics data. Generated from ${logDataArray.length} log entries with ${techniquesInLayer.length} unique techniques identified.`,
    domain: 'enterprise-attack', // Enterprise domain
    created: currentTime,
    created_by: 'Logan Security Dashboard',
    techniques: techniquesInLayer,
    gradient: {
      colors: colors,
      minValue: 0,
      maxValue: maxScore
    },
    showTacticRowBackground: false,
    tacticRowBackground: '#dddddd',
    selectTechniquesAcrossTactics: true,
    legendItems: [
      { label: 'No Activity', color: colors[0] },
      { label: 'Low Activity', color: colors[2] },
      { label: 'Medium Activity', color: colors[5] },
      { label: 'High Activity', color: colors[8] }
    ],
    metadata: [
      { name: 'source', value: 'OCI Logging Analytics' },
      { name: 'generated_by', value: 'Logan Security Dashboard' },
      { name: 'total_logs_analyzed', value: logDataArray.length.toString() },
      { name: 'unique_techniques_detected', value: techniquesInLayer.length.toString() },
      { name: 'max_technique_hits', value: maxScore.toString() },
      { name: 'generation_timestamp', value: currentTime }
    ]
  };
}
