import { NextResponse } from 'next/server';
import { STIXConverter } from '@/lib/stix/stix-converter';
import { parseOCILogContent, ParsedLogData } from '@/lib/log-parser';

export async function POST(request: Request) {
  try {
    const { logDataArray, bundleName } = await request.json();

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
          // If it's already an object, try to parse it as JSON string first
          return parseOCILogContent(JSON.stringify(log));
        }
        return null;
      })
      .filter(Boolean);

    if (parsedLogData.length === 0) {
      return NextResponse.json({ 
        error: 'No valid log data could be parsed for STIX conversion.' 
      }, { status: 400 });
    }

    const converter = new STIXConverter();
    const stixBundle = converter.convertLogsToSTIX(parsedLogData as ParsedLogData[], bundleName || 'OCI Security Events');
    const stats = converter.getBundleStats(stixBundle);

    return NextResponse.json({ 
      success: true, 
      bundle: stixBundle,
      stats,
      exportedLogs: parsedLogData.length
    });
  } catch (error: any) {
    console.error('Error converting logs to STIX:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to convert logs to STIX format.' 
    }, { status: 500 });
  }
}
