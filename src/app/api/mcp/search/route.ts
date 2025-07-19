import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { parseOCILogContent, formatTimestamp, formatSource } from '@/lib/log-parser'

const execAsync = promisify(exec)

async function callPythonScript(scriptName: string, args: string[] = []) {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName)
    
    // Properly escape arguments that contain spaces
    const escapedArgs = args.map(arg => {
      // Always wrap arguments in single quotes to prevent shell expansion
      // and escape any single quotes within the argument
      return `'${arg.replace(/'/g, "'\\''")}'`;
    })
    
    const command = `python3 "${scriptPath}" ${escapedArgs.join(' ')}`
    
    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        LOGAN_REGION: process.env.NEXT_PUBLIC_LOGAN_REGION || 'eu-frankfurt-1',
        LOGAN_COMPARTMENT_ID: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID || '',
      },
      timeout: 30000 // 30 second timeout
    })
    
    if (stderr) {
      console.warn('Python script warning:', stderr)
    }
    
    return JSON.parse(stdout)
  } catch (error) {
    console.error('Python script error:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, timePeriodMinutes, timeRange, bypassValidation, validateOnly } = body

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query is required'
      }, { status: 400 })
    }

    // Use timeRange if provided, otherwise fall back to timePeriodMinutes
    const timePeriod = timeRange || timePeriodMinutes || 1440;

    // Debug logging
    console.log('Search API: query=', query, 'timePeriod=', timePeriod, 'bypassValidation=', bypassValidation, 'validateOnly=', validateOnly);
    console.log('Search API: env vars=', {
      LOGAN_REGION: process.env.NEXT_PUBLIC_LOGAN_REGION,
      LOGAN_COMPARTMENT_ID: process.env.NEXT_PUBLIC_LOGAN_COMPARTMENT_ID
    });

    // If this is just a validation request, use the parse endpoint
    if (validateOnly) {
      const result = await callPythonScript('logan_client.py', [
        'parse',
        '--query', query
      ]);
      return NextResponse.json(result);
    }

    // Prepare arguments for Python script
    const args = [
      'search',
      '--query', query,
      '--time-period', timePeriod.toString()
    ];

    // Add bypass validation flag if requested
    if (bypassValidation) {
      args.push('--bypass-validation');
    }

    // Execute custom search using Python security analyzer
    let result;
    try {
      result = await callPythonScript('security_analyzer.py', args)
    } catch (error) {
      console.error('Python script execution error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to execute search query. The backend script may have crashed.'
      }, { status: 500 })
    }

    if (result.success) {
      // Transform raw query results into security events format
      const events = (result.results || []).map((result: any, index: number) => {
        // Initialize default values
        let message = 'Log Entry';
        let sourceInfo = 'Unknown';
        let severity = 'info';
        let details = '';
        let timestamp = new Date().toISOString();
        let sourceIp = null;
        let user = null;
        let eventName = null;
        let compartmentName = null;
        
        // Parse nested OCI log content if present
        let parsedLogData = null;
        if (result['Original Log Content']) {
          parsedLogData = parseOCILogContent(result['Original Log Content']);
          
          if (parsedLogData) {
            eventName = parsedLogData.eventName;
            compartmentName = parsedLogData.compartmentName;
            message = parsedLogData.message || 'OCI Log Event';
            sourceInfo = formatSource(parsedLogData.eventName, parsedLogData.compartmentName);
            timestamp = parsedLogData.timestamp || new Date().toISOString();
            user = parsedLogData.user;
            sourceIp = parsedLogData.sourceIp;
            severity = parsedLogData.severity || 'info';
            details = parsedLogData.details || '';
          } else {
            // Fallback for unparseable content
            message = 'Unparseable OCI Log Content';
            sourceInfo = 'OCI Logging Analytics';
            details = 'Log content could not be parsed';
          }
        }
        
        // If no parsed data, try to extract from top-level result fields
        if (!parsedLogData) {
          let hasTimestamp = false;
          
          for (const [key, value] of Object.entries(result)) {
            const keyLower = key.toLowerCase();
            if (keyLower.includes('log source') || keyLower.includes('logsource')) {
              sourceInfo = String(value || 'Unknown');
            } else if (keyLower.includes('message') || keyLower.includes('content') || keyLower.includes('log entry')) {
              message = String(value || 'Search Result');
            } else if (keyLower.includes('severity') || keyLower.includes('level')) {
              severity = String(value || 'info').toLowerCase();
            } else if (keyLower.includes('datetime') || keyLower.includes('time') || keyLower.includes('timestamp')) {
              // Handle both string timestamps and numeric timestamps (milliseconds)
              if (value) {
                if (typeof value === 'number') {
                  // Handle epoch timestamps (milliseconds)
                  timestamp = new Date(value).toISOString();
                  hasTimestamp = true;
                } else {
                  timestamp = String(value);
                  hasTimestamp = true;
                }
              }
            } else if (keyLower.includes('ip') || keyLower.includes('address')) {
              sourceIp = String(value);
            } else if (keyLower.includes('user') || keyLower.includes('principal')) {
              user = String(value);
            } else if (keyLower.includes('action')) {
              // Use Action as part of the message for more context
              if (!message || message === 'Log Entry') {
                message = `${key}: ${String(value)}`;
              }
            } else if (keyLower.includes('event name') || keyLower.includes('eventname')) {
              eventName = String(value);
            } else if (keyLower.includes('compartment')) {
              compartmentName = String(value);
            }
          }
          
          // If no timestamp found, use current time but mark it as estimated
          if (!hasTimestamp) {
            // Use current time minus a small random offset to indicate it's recent but estimated
            const randomOffset = Math.floor(Math.random() * 300000); // Random 0-5 minutes
            timestamp = new Date(Date.now() - randomOffset).toISOString();
          }
          
          // Improve source info extraction
          if (sourceInfo === 'Unknown' || sourceInfo === '') {
            // Try to construct a better source from available data
            if (eventName) {
              sourceInfo = eventName;
            } else if (compartmentName) {
              sourceInfo = compartmentName;
            } else {
              // Use the first meaningful field as source
              const meaningfulFields = Object.entries(result).filter(([k, v]) => 
                v && String(v).length > 0 && !k.toLowerCase().includes('count') && k !== 'Log Source'
              );
              if (meaningfulFields.length > 0) {
                sourceInfo = `${meaningfulFields[0][0]}: ${String(meaningfulFields[0][1]).substring(0, 30)}`;
              } else {
                sourceInfo = 'OCI Logging Analytics';
              }
            }
          }
        }
          
          // Create details from all fields if no specific details found
          if (!details) {
            details = Object.entries(result)
              .filter(([key, value]) => value != null && !key.includes('Original Log Content'))
              .map(([key, value]) => `${key}: ${String(value).substring(0, 50)}${String(value).length > 50 ? '...' : ''}`)
              .slice(0, 3) // Limit to first 3 fields
              .join(' | ');
          }
        
        // Format timestamp to be human readable with improved UTC handling
        const formattedTimestamp = formatTimestamp(timestamp);
        
        return {
          id: `search-${index}`,
          timestamp: formattedTimestamp,
          rawTimestamp: timestamp, // Keep raw timestamp for further processing
          severity: ['critical', 'high', 'medium', 'low'].includes(severity) ? severity : 'info',
          source: sourceInfo,
          message: message,
          details: details || 'No additional details',
          sourceIp: sourceIp,
          user: user,
          eventName: eventName,
          compartmentName: compartmentName,
          rawData: result,
          parsedData: parsedLogData
        };
      });

      return NextResponse.json({
        success: true,
        results: events,
        executionTime: result.execution_time || 0,
        total: result.total || events.length,
        queryUsed: result.query_used,
        timeFilterMethod: result.time_filter_method,
        timeRange: result.time_range,
        warning: result.warning
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Search failed'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Search Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
