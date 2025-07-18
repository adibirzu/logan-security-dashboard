/**
 * Utility functions for parsing OCI Logging Analytics log data
 */

export interface ParsedLogData {
  eventName?: string;
  compartmentName?: string;
  message?: string;
  timestamp?: string;
  user?: string;
  sourceIp?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  details?: string;
  userAgent?: string;
  action?: string;
  eventId?: string;
}

/**
 * Parse OCI log content from the nested JSON structure
 */
export function parseOCILogContent(logContent: string): ParsedLogData | null {
  try {
    let parsed: any;
    try {
      // Attempt to parse as a complete JSON object first
      parsed = JSON.parse(logContent);
    } catch (jsonError) {
      // If direct JSON parsing fails, try to extract key-value pairs
      // This handles cases where the log is not a perfect JSON string but contains JSON-like data
      const keyValuePairs: Record<string, any> = {};
      
      // Regex to find key-value pairs that look like "key": "value" or "key": number/boolean
      // It's more lenient to handle potential malformations
      const kvRegex = /"([^"]+)":\s*(?:"([^"]*)"|(\d+)|(true|false))/g;
      let match;
      
      while ((match = kvRegex.exec(logContent)) !== null) {
        const key = match[1];
        const value = match[2] || match[3] || match[4]; // Prioritize string, then number, then boolean
        keyValuePairs[key] = value;
      }

      if (Object.keys(keyValuePairs).length > 0) {
        // If key-value pairs are found, wrap them in a 'data' object
        // This mimics the structure expected by the rest of the parser
        parsed = { data: keyValuePairs };
        console.warn('Log content not perfect JSON, extracted key-value pairs:', keyValuePairs);
      } else {
        // If no meaningful key-value pairs can be extracted, return null
        console.warn('Failed to parse log content and no key-value pairs found:', jsonError);
        return null;
      }
    }
    
    // Ensure 'parsed' has a 'data' property, or use 'parsed' directly if it's the data itself
    const data = parsed.data || parsed;
    
    if (!data || typeof data !== 'object') {
      console.warn('Parsed data is not an object or is empty:', data);
      return null;
    }
    
    const result: ParsedLogData = {};
    
    // Extract basic event information
    result.eventName = data.eventName || data.event_name;
    result.compartmentName = data.compartmentName || data.compartment_name;
    result.message = data.message || data.eventName || data.event_name || 'OCI Event';
    
    // Extract timestamp and standardize to UTC
    let rawTimestamp = data.eventTime || data.time || data.timestamp;
    if (rawTimestamp) {
      // Ensure timestamp is in UTC format
      const parsedDate = new Date(rawTimestamp);
      if (!isNaN(parsedDate.getTime())) {
        result.timestamp = parsedDate.toISOString();
      } else {
        result.timestamp = new Date().toISOString();
      }
    } else {
      result.timestamp = new Date().toISOString();
    }
    
    // Extract identity information
    if (data.identity) {
      result.user = data.identity.principalName || data.identity.callerId || data.identity.user_name;
      result.sourceIp = data.identity.ipAddress || data.identity.source_ip;
      result.userAgent = data.identity.userAgent || data.identity.user_agent;
    } else if (data.principalName) { // Sometimes identity fields are top-level
      result.user = data.principalName;
      result.sourceIp = data.ipAddress;
      result.userAgent = data.userAgent;
    }
    
    // Extract request information
    if (data.request) {
      result.action = data.request.action || data.request.method;
    } else if (data.action) { // Sometimes action is top-level
      result.action = data.action;
    }
    
    // Extract event ID (shortened)
    if (data.eventGroupingId) {
      result.eventId = data.eventGroupingId.substring(0, 8);
    } else if (data.id) {
      result.eventId = String(data.id).substring(0, 8);
    }
    
    // Determine severity
    result.severity = determineSeverity(result.message, result.eventName);
    
    // Create details string
    const detailParts = [];
    if (data.availabilityDomain) detailParts.push(`AD: ${data.availabilityDomain}`);
    if (result.eventId) detailParts.push(`Event: ${result.eventId}`);
    if (result.action) detailParts.push(`Action: ${result.action}`);
    if (result.userAgent) {
      const shortAgent = result.userAgent.split(' ')[0]; // Get first part
      detailParts.push(`Agent: ${shortAgent}`);
    }
    
    result.details = detailParts.join(' | ');
    
    return result;
  } catch (error) {
    console.error('Critical error in parseOCILogContent:', error);
    return null;
  }
}

/**
 * Determine severity based on message content and event type
 */
function determineSeverity(message?: string, eventName?: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  if (!message) return 'info';
  
  const msgLower = message.toLowerCase();
  
  // Critical events
  if (msgLower.includes('unauthorized') || 
      msgLower.includes('access denied') || 
      msgLower.includes('security violation') ||
      msgLower.includes('breach')) {
    return 'critical';
  }
  
  // High severity events
  if (msgLower.includes('failed') || 
      msgLower.includes('error') || 
      msgLower.includes('denied') ||
      msgLower.includes('invalid credentials')) {
    return 'high';
  }
  
  // Medium severity events
  if (msgLower.includes('warning') || 
      msgLower.includes('invalid parameter') ||
      msgLower.includes('timeout') ||
      (eventName === 'Query' && msgLower.includes('invalid'))) {
    return 'medium';
  }
  
  // Low severity events
  if (msgLower.includes('info') || 
      msgLower.includes('debug') ||
      eventName === 'Query') {
    return 'low';
  }
  
  return 'info';
}

/**
 * Format timestamp to human readable format with improved UTC handling
 */
export function formatTimestamp(timestamp: string): string {
  try {
    // Handle various timestamp formats
    let date: Date;
    
    if (timestamp.includes('T') && timestamp.includes('Z')) {
      // ISO format with Z (UTC)
      date = new Date(timestamp);
    } else if (timestamp.includes('T') && timestamp.includes('+')) {
      // ISO format with timezone offset
      date = new Date(timestamp);
    } else if (timestamp.includes('T')) {
      // ISO format without timezone, assume UTC
      date = new Date(timestamp + 'Z');
    } else {
      // Try parsing as-is
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid timestamp';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Show both relative and absolute time for better clarity
    const absoluteTime = date.toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    if (diffDays > 0) {
      return `${diffDays}d ago (${absoluteTime})`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago (${absoluteTime})`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago (${absoluteTime})`;
    } else {
      return `Just now (${absoluteTime})`;
    }
  } catch (error) {
    console.warn('Error formatting timestamp:', error);
    return `Invalid timestamp: ${timestamp}`;
  }
}

/**
 * Extract source information for display
 */
export function formatSource(eventName?: string, compartmentName?: string): string {
  if (!eventName) return 'Unknown';
  
  if (compartmentName && compartmentName !== 'Unknown Compartment') {
    return `${eventName} (${compartmentName})`;
  }
  
  return eventName;
}
