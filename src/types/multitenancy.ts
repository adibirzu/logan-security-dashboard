export interface OCIEnvironment {
  id: string;
  name: string;
  region: string;
  compartmentId: string;
  namespace: string;
  authType: 'config_file' | 'instance_principal' | 'delegation_token';
  configProfile?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface MultitenancyConfig {
  environments: OCIEnvironment[];
  defaultEnvironmentId: string;
  queryMode: 'single' | 'parallel' | 'sequential';
  parallelQueryLimit: number;
  timeoutMs: number;
}

export interface EnvironmentQueryResult {
  environmentId: string;
  environmentName: string;
  success: boolean;
  data?: any;
  error?: string;
  executionTimeMs: number;
}

export interface MultitenantQueryOptions {
  targetEnvironments?: string[]; // Environment IDs to query, if empty queries all active
  aggregateResults?: boolean;
  includeEnvironmentInfo?: boolean;
  timeoutMs?: number;
  continueOnError?: boolean;
}