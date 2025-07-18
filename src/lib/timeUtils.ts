export interface TimeRange {
  label: string;
  value: string;
  minutes: number;
  category: 'quick' | 'standard' | 'extended';
}

export const TIME_RANGES: TimeRange[] = [
  // Quick Access
  { label: '15 minutes', value: '15m', minutes: 15, category: 'quick' },
  { label: '30 minutes', value: '30m', minutes: 30, category: 'quick' },
  { label: '1 hour', value: '1h', minutes: 60, category: 'quick' },
  
  // Standard
  { label: '2 hours', value: '2h', minutes: 120, category: 'standard' },
  { label: '3 hours', value: '3h', minutes: 180, category: 'standard' },
  { label: '4 hours', value: '4h', minutes: 240, category: 'standard' },
  { label: '6 hours', value: '6h', minutes: 360, category: 'standard' },
  { label: '12 hours', value: '12h', minutes: 720, category: 'standard' },
  { label: '24 hours', value: '24h', minutes: 1440, category: 'standard' },
  
  // Extended
  { label: '2 days', value: '2d', minutes: 2880, category: 'extended' },
  { label: '3 days', value: '3d', minutes: 4320, category: 'extended' },
  { label: '7 days', value: '7d', minutes: 10080, category: 'extended' },
  { label: '14 days', value: '14d', minutes: 20160, category: 'extended' },
  { label: '30 days', value: '30d', minutes: 43200, category: 'extended' },
];

export function getTimePeriodMinutes(timeRange: string): number {
  const range = TIME_RANGES.find(r => r.value === timeRange);
  return range?.minutes || 60; // Default to 1 hour
}

export function getTimeRangeLabel(timeRange: string): string {
  const range = TIME_RANGES.find(r => r.value === timeRange);
  return range?.label || timeRange;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
}

export function parseCustomTimeRange(customRange: string): number | null {
  const match = customRange.match(/^(\d+)\s*(m|h|d)$/i);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'm':
      return value;
    case 'h':
      return value * 60;
    case 'd':
      return value * 1440;
    default:
      return null;
  }
}

export function isValidCustomTimeRange(customRange: string): boolean {
  return parseCustomTimeRange(customRange) !== null;
}

export function getMaxRecordsForTimeRange(minutes: number): number {
  // Scale records based on time period, respecting OCI 50k limit
  const baseRate = 50; // records per minute
  const maxRecords = Math.min(50000, Math.max(1000, minutes * baseRate));
  return maxRecords;
}

export function getOptimalQueryLimit(minutes: number, queryType: 'vcn' | 'audit' | 'graph' | 'simple'): number {
  switch (queryType) {
    case 'vcn':
      return Math.min(50000, Math.max(1000, minutes * 30));
    case 'audit':
      return Math.min(10000, Math.max(500, minutes * 10));
    case 'graph':
      return Math.min(50000, Math.max(1000, minutes * 50));
    case 'simple':
      return Math.min(5000, Math.max(100, minutes * 5));
    default:
      return Math.min(10000, Math.max(500, minutes * 10));
  }
}