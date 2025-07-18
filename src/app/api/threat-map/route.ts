import { NextRequest, NextResponse } from 'next/server';
import { processThreatData } from '@/lib/threat-map/threat-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timeRangeMinutes = 1440, maxEvents = 100, customQuery } = body;

    // Validate inputs
    if (typeof timeRangeMinutes !== 'number' || timeRangeMinutes <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid time range' },
        { status: 400 }
      );
    }

    if (typeof maxEvents !== 'number' || maxEvents <= 0 || maxEvents > 1000) {
      return NextResponse.json(
        { success: false, error: 'Invalid max events (must be between 1 and 1000)' },
        { status: 400 }
      );
    }

    // Process threat data, passing customQuery if provided
    const threatData = await processThreatData(timeRangeMinutes, maxEvents, customQuery);

    console.log('API: Processed threat data:', JSON.stringify(threatData, null, 2)); // Log processed data

    return NextResponse.json({
      success: true,
      threats: threatData.threats,
      totalCount: threatData.totalCount,
      countries: threatData.countries,
      attackTypes: threatData.attackTypes,
      metadata: {
        timeRangeMinutes,
        maxEvents,
        customQuery: customQuery || null,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in threat-map API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const timeRangeMinutes = parseInt(searchParams.get('timeRangeMinutes') || '1440');
  const maxEvents = parseInt(searchParams.get('maxEvents') || '100');
  const customQuery = searchParams.get('customQuery') || undefined;

  // Validate inputs (similar to POST, but for GET params)
  if (isNaN(timeRangeMinutes) || timeRangeMinutes <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid time range' },
      { status: 400 }
    );
  }

  if (isNaN(maxEvents) || maxEvents <= 0 || maxEvents > 1000) {
    return NextResponse.json(
      { success: false, error: 'Invalid max events (must be between 1 and 1000)' },
      { status: 400 }
    );
  }

  // Process threat data, passing customQuery if provided
  const threatData = await processThreatData(timeRangeMinutes, maxEvents, customQuery);

  console.log('API: Processed threat data (GET):', JSON.stringify(threatData, null, 2)); // Log processed data for GET

  return NextResponse.json({
    success: true,
    threats: threatData.threats,
    totalCount: threatData.totalCount,
    countries: threatData.countries,
    attackTypes: threatData.attackTypes,
    metadata: {
      timeRangeMinutes,
      maxEvents,
      customQuery: customQuery || null,
      generatedAt: new Date().toISOString()
    }
  });
}
