/**
 * STIX 2.1 Converter for OCI Logging Analytics data
 * Converts OCI log events into STIX format for interoperability
 */

import { ParsedLogData } from '@/lib/log-parser';
import { mapLogToMitreTechniques, getMitreTechniqueById } from '@/lib/mitre-attack/technique-mappings';
import { v4 as uuidv4 } from 'uuid';

// STIX 2.1 Object Types
export interface STIXObject {
  type: string;
  spec_version: string;
  id: string;
  created: string;
  modified: string;
}

export interface STIXIdentity extends STIXObject {
  type: 'identity';
  name: string;
  identity_class: string;
}

export interface STIXIndicator extends STIXObject {
  type: 'indicator';
  labels: string[];
  pattern: string;
  valid_from: string;
  description?: string;
  kill_chain_phases?: Array<{
    kill_chain_name: string;
    phase_name: string;
  }>;
}

export interface STIXObservedData extends STIXObject {
  type: 'observed-data';
  first_observed: string;
  last_observed: string;
  number_observed: number;
  objects: { [key: string]: any };
}

export interface STIXAttackPattern extends STIXObject {
  type: 'attack-pattern';
  name: string;
  description?: string;
  external_references: Array<{
    source_name: string;
    external_id: string;
    url: string;
  }>;
  kill_chain_phases?: Array<{
    kill_chain_name: string;
    phase_name: string;
  }>;
}

export interface STIXSighting extends STIXObject {
  type: 'sighting';
  first_seen: string;
  last_seen: string;
  count: number;
  sighting_of_ref: string;
  observed_data_refs?: string[];
}

export interface STIXBundle {
  type: 'bundle';
  id: string;
  objects: STIXObject[];
}

/**
 * Main STIX converter class
 */
export class STIXConverter {
  private identity: STIXIdentity;
  private timestamp: string;

  constructor() {
    this.timestamp = new Date().toISOString();
    this.identity = {
      type: 'identity',
      spec_version: '2.1',
      id: `identity--${uuidv4()}`,
      created: this.timestamp,
      modified: this.timestamp,
      name: 'OCI Logging Analytics',
      identity_class: 'system'
    };
  }

  /**
   * Convert array of log data to STIX bundle
   */
  convertLogsToSTIX(logDataArray: ParsedLogData[], bundleName: string = 'OCI Security Events'): STIXBundle {
    const objects: STIXObject[] = [this.identity];
    const indicators = new Map<string, STIXIndicator>();
    const attackPatterns = new Map<string, STIXAttackPattern>();
    const observedDataList: STIXObservedData[] = [];

    // Process each log entry
    logDataArray.forEach((logData, index) => {
      // Create observed data for the log entry
      const observedData = this.createObservedData(logData, index);
      observedDataList.push(observedData);

      // Extract indicators from log data
      const logIndicators = this.extractIndicators(logData);
      logIndicators.forEach(indicator => {
        indicators.set(indicator.id, indicator);
      });

      // Map to MITRE ATT&CK techniques
      const techniques = mapLogToMitreTechniques(logData);
      techniques.forEach(techniqueId => {
        const technique = getMitreTechniqueById(techniqueId);
        if (technique && !attackPatterns.has(techniqueId)) {
          const attackPattern = this.createAttackPattern(technique);
          attackPatterns.set(techniqueId, attackPattern);
        }
      });
    });

    // Add all objects to the bundle
    objects.push(...observedDataList);
    objects.push(...Array.from(indicators.values()));
    objects.push(...Array.from(attackPatterns.values()));

    // Create sightings for indicators and attack patterns
    const sightings = this.createSightings(indicators, attackPatterns, observedDataList);
    objects.push(...sightings);

    return {
      type: 'bundle',
      id: `bundle--${uuidv4()}`,
      objects
    };
  }

  /**
   * Create STIX Observed Data from log entry
   */
  private createObservedData(logData: ParsedLogData, index: number): STIXObservedData {
    const timestamp = logData.timestamp || this.timestamp;
    const objects: { [key: string]: any } = {};

    let objectCount = 0;

    // Add IP address if present
    if (logData.sourceIp) {
      objects[objectCount.toString()] = {
        type: 'ipv4-addr',
        value: logData.sourceIp
      };
      objectCount++;
    }

    // Add user account if present
    if (logData.user) {
      objects[objectCount.toString()] = {
        type: 'user-account',
        user_id: logData.user
      };
      objectCount++;
    }

    // Add process information if available in details
    if (logData.action) {
      objects[objectCount.toString()] = {
        type: 'process',
        name: logData.action
      };
      objectCount++;
    }

    // Add network traffic if we have relevant data
    if (logData.sourceIp && logData.action) {
      objects[objectCount.toString()] = {
        type: 'network-traffic',
        src_ref: '0', // Reference to IP object
        protocols: ['tcp'] // Default assumption
      };
      objectCount++;
    }

    return {
      type: 'observed-data',
      spec_version: '2.1',
      id: `observed-data--${uuidv4()}`,
      created: this.timestamp,
      modified: this.timestamp,
      first_observed: timestamp,
      last_observed: timestamp,
      number_observed: 1,
      objects
    };
  }

  /**
   * Extract indicators from log data
   */
  private extractIndicators(logData: ParsedLogData): STIXIndicator[] {
    const indicators: STIXIndicator[] = [];

    // Create IP-based indicators for suspicious activity
    if (logData.sourceIp && logData.severity && ['high', 'critical'].includes(logData.severity)) {
      const indicator: STIXIndicator = {
        type: 'indicator',
        spec_version: '2.1',
        id: `indicator--${uuidv4()}`,
        created: this.timestamp,
        modified: this.timestamp,
        labels: ['malicious-activity'],
        pattern: `[ipv4-addr:value = '${logData.sourceIp}']`,
        valid_from: this.timestamp,
        description: `Suspicious IP address observed in OCI logs: ${logData.message}`
      };

      // Add kill chain phases based on activity type
      if (logData.message?.toLowerCase().includes('login') || logData.message?.toLowerCase().includes('auth')) {
        indicator.kill_chain_phases = [{
          kill_chain_name: 'mitre-attack',
          phase_name: 'initial-access'
        }];
      }

      indicators.push(indicator);
    }

    // Create user-based indicators for suspicious accounts
    if (logData.user && logData.severity && ['high', 'critical'].includes(logData.severity)) {
      const indicator: STIXIndicator = {
        type: 'indicator',
        spec_version: '2.1',
        id: `indicator--${uuidv4()}`,
        created: this.timestamp,
        modified: this.timestamp,
        labels: ['suspicious-account'],
        pattern: `[user-account:user_id = '${logData.user}']`,
        valid_from: this.timestamp,
        description: `Suspicious user account activity: ${logData.message}`
      };

      indicators.push(indicator);
    }

    return indicators;
  }

  /**
   * Create STIX Attack Pattern from MITRE technique
   */
  private createAttackPattern(technique: any): STIXAttackPattern {
    return {
      type: 'attack-pattern',
      spec_version: '2.1',
      id: `attack-pattern--${uuidv4()}`,
      created: this.timestamp,
      modified: this.timestamp,
      name: technique.name,
      description: technique.description,
      external_references: [{
        source_name: 'mitre-attack',
        external_id: technique.id,
        url: technique.url
      }],
      kill_chain_phases: [{
        kill_chain_name: 'mitre-attack',
        phase_name: this.getPhaseFromTechnique(technique.id)
      }]
    };
  }

  /**
   * Create sightings to link indicators and attack patterns to observed data
   */
  private createSightings(
    indicators: Map<string, STIXIndicator>,
    attackPatterns: Map<string, STIXAttackPattern>,
    observedDataList: STIXObservedData[]
  ): STIXSighting[] {
    const sightings: STIXSighting[] = [];

    // Create sightings for indicators
    indicators.forEach(indicator => {
      const relevantObservations = observedDataList.filter(obs => 
        this.isObservationRelevantToIndicator(obs, indicator)
      );

      if (relevantObservations.length > 0) {
        const sighting: STIXSighting = {
          type: 'sighting',
          spec_version: '2.1',
          id: `sighting--${uuidv4()}`,
          created: this.timestamp,
          modified: this.timestamp,
          first_seen: relevantObservations[0].first_observed,
          last_seen: relevantObservations[relevantObservations.length - 1].last_observed,
          count: relevantObservations.length,
          sighting_of_ref: indicator.id,
          observed_data_refs: relevantObservations.map(obs => obs.id)
        };
        sightings.push(sighting);
      }
    });

    return sightings;
  }

  /**
   * Check if an observation is relevant to an indicator
   */
  private isObservationRelevantToIndicator(observation: STIXObservedData, indicator: STIXIndicator): boolean {
    // Simple matching based on pattern content
    const pattern = indicator.pattern.toLowerCase();
    
    // Check if any objects in the observation match the indicator pattern
    for (const obj of Object.values(observation.objects)) {
      if (obj.type === 'ipv4-addr' && pattern.includes(obj.value)) {
        return true;
      }
      if (obj.type === 'user-account' && pattern.includes(obj.user_id)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Map MITRE technique ID to kill chain phase
   */
  private getPhaseFromTechnique(techniqueId: string): string {
    // Simplified mapping - in reality, you'd use the full MITRE data
    const phaseMapping: { [key: string]: string } = {
      'T1110': 'credential-access',
      'T1078': 'initial-access',
      'T1548': 'privilege-escalation',
      'T1046': 'discovery',
      'T1059': 'execution',
      'T1071': 'command-and-control',
      'T1003': 'credential-access',
      'T1087': 'discovery',
      'T1098': 'persistence',
      'T1021': 'lateral-movement'
    };

    return phaseMapping[techniqueId] || 'unknown';
  }

  /**
   * Export bundle as JSON string
   */
  exportAsJSON(bundle: STIXBundle): string {
    return JSON.stringify(bundle, null, 2);
  }

  /**
   * Get bundle statistics
   */
  getBundleStats(bundle: STIXBundle): {
    totalObjects: number;
    indicators: number;
    observedData: number;
    attackPatterns: number;
    sightings: number;
  } {
    const stats = {
      totalObjects: bundle.objects.length,
      indicators: 0,
      observedData: 0,
      attackPatterns: 0,
      sightings: 0
    };

    bundle.objects.forEach(obj => {
      switch (obj.type) {
        case 'indicator':
          stats.indicators++;
          break;
        case 'observed-data':
          stats.observedData++;
          break;
        case 'attack-pattern':
          stats.attackPatterns++;
          break;
        case 'sighting':
          stats.sightings++;
          break;
      }
    });

    return stats;
  }
}
