'use client'

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

interface ThreatEvent {
  id: string;
  sourceIp: string;
  targetIp: string;
  sourceCountry: string;
  targetCountry: string;
  sourceCoords: [number, number];
  targetCoords: [number, number];
  severity: 'low' | 'medium' | 'high' | 'critical';
  attackType: string;
  timestamp: Date;
  active: boolean;
}

interface WorldMapProps {
  threats: ThreatEvent[];
  zoom: number;
  showHeatMap: boolean;
  selectedCountry: string | null;
  onCountryClick: (countryCode: string, countryName: string) => void;
  onThreatClick: (threat: ThreatEvent) => void;
}

// Client-side only map component
const LeafletMap = dynamic(() => import('./LeafletMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-full rounded-lg overflow-hidden border bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
        <div>Loading World Map...</div>
      </div>
    </div>
  )
});

export function WorldMap(props: WorldMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="relative w-full h-full rounded-lg overflow-hidden border bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <div>Loading World Map...</div>
        </div>
      </div>
    );
  }

  return <LeafletMap {...props} />;
}
