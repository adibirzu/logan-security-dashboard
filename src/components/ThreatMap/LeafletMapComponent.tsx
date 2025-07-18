'use client'

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as topojson from 'topojson-client';
import 'leaflet/dist/leaflet.css';

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

// Custom component to handle map zoom updates
function MapController({ zoom }: { zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setZoom(zoom);
  }, [map, zoom]);

  return null;
}

// Custom component for threat animations
function ThreatMarkers({ threats, onThreatClick }: { threats: ThreatEvent[], onThreatClick: (threat: ThreatEvent) => void }) {
  const getSeverityColor = (severity: ThreatEvent['severity']) => {
    const colors = {
      low: '#22c55e',
      medium: '#eab308', 
      high: '#f97316',
      critical: '#dc2626'
    };
    return colors[severity];
  };

  const getSeverityRadius = (severity: ThreatEvent['severity']) => {
    const radii = {
      low: 5,
      medium: 8,
      high: 12,
      critical: 16
    };
    return radii[severity];
  };

  return (
    <>
      {threats.map((threat) => (
        <CircleMarker
          key={threat.id}
          center={[threat.sourceCoords[1], threat.sourceCoords[0]]} // Leaflet uses [lat, lng]
          radius={getSeverityRadius(threat.severity)}
          fillColor={getSeverityColor(threat.severity)}
          color="#ffffff"
          weight={2}
          opacity={0.8}
          fillOpacity={threat.active ? 0.9 : 0.6}
          className={threat.active ? 'animate-pulse' : ''}
          eventHandlers={{
            click: () => onThreatClick(threat),
            mouseover: (e) => {
              e.target.openPopup();
            },
            mouseout: (e) => {
              e.target.closePopup();
            }
          }}
        >
          <Popup>
            <div className="p-2">
              <div className="font-semibold text-sm">{threat.attackType}</div>
              <div className="text-xs text-gray-600">
                From: {threat.sourceCountry} ({threat.sourceIp})
              </div>
              <div className="text-xs text-gray-600">
                To: {threat.targetCountry} ({threat.targetIp})
              </div>
              <div className={`text-xs font-medium ${
                threat.severity === 'critical' ? 'text-red-600' :
                threat.severity === 'high' ? 'text-orange-600' :
                threat.severity === 'medium' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                Severity: {threat.severity.toUpperCase()}
              </div>
              <div className="text-xs text-gray-500">
                {threat.timestamp?.toLocaleString() || 'Just now'}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

// Country data with threat counts for heat map
function CountryLayer({ 
  threats, 
  showHeatMap, 
  selectedCountry, 
  onCountryClick 
}: { 
  threats: ThreatEvent[], 
  showHeatMap: boolean, 
  selectedCountry: string | null,
  onCountryClick: (countryCode: string, countryName: string) => void 
}) {
  const [worldData, setWorldData] = useState<any>(null);

  useEffect(() => {
    // Load world topology data
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(world => {
        const countries = topojson.feature(world, world.objects.countries);
        setWorldData(countries);
      })
      .catch(error => {
        console.error('Error loading world data:', error);
      });
  }, []);

  // Calculate threat counts by country
  const countryThreats = threats.reduce((acc, threat) => {
    acc[threat.sourceCountry] = (acc[threat.sourceCountry] || 0) + 1;
    acc[threat.targetCountry] = (acc[threat.targetCountry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxThreats = Math.max(...Object.values(countryThreats), 1);

  const getCountryStyle = (feature: any) => {
    const countryCode = feature.properties.ISO_A2;
    const threatCount = countryThreats[countryCode] || 0;
    
    if (!showHeatMap) {
      return {
        fillColor: selectedCountry === countryCode ? '#fbbf24' : '#e5e7eb',
        weight: selectedCountry === countryCode ? 3 : 1,
        opacity: 0.7,
        color: selectedCountry === countryCode ? '#d97706' : '#9ca3af',
        fillOpacity: 0.3
      };
    }

    // Heat map coloring
    const intensity = threatCount / maxThreats;
    const red = Math.floor(255 * intensity);
    const fillColor = threatCount > 0 ? `rgb(${red}, ${255 - red * 0.8}, 0)` : '#e5e7eb';

    return {
      fillColor,
      weight: selectedCountry === countryCode ? 3 : 1,
      opacity: 0.7,
      color: selectedCountry === countryCode ? '#d97706' : '#9ca3af',
      fillOpacity: threatCount > 0 ? 0.6 : 0.2
    };
  };

  const onEachCountry = (feature: any, layer: any) => {
    const countryCode = feature.properties.ISO_A2;
    const countryName = feature.properties.NAME;
    const threatCount = countryThreats[countryCode] || 0;

    layer.bindTooltip(
      `<div class="p-2">
        <div class="font-semibold">${countryName}</div>
        <div class="text-sm text-gray-600">${threatCount} threats</div>
      </div>`,
      { sticky: true }
    );

    layer.on({
      click: () => onCountryClick(countryCode, countryName),
      mouseover: (e: any) => {
        e.target.setStyle({
          weight: 3,
          color: '#1e293b'
        });
      },
      mouseout: (e: any) => {
        const style = getCountryStyle(feature);
        e.target.setStyle(style);
      }
    });
  };

  if (!worldData) return null;

  return (
    <GeoJSON
      data={worldData}
      style={getCountryStyle}
      onEachFeature={onEachCountry}
    />
  );
}

export default function LeafletMapComponent({ 
  threats, 
  zoom, 
  showHeatMap, 
  selectedCountry, 
  onCountryClick, 
  onThreatClick 
}: WorldMapProps) {
  const mapRef = useRef<L.Map>(null);

  // Custom dark map style that resembles HoneyMap
  const darkMapStyle = `
    .leaflet-container {
      background: #1a1a2e;
    }
    .leaflet-control-zoom a {
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      border: 1px solid #444;
    }
    .leaflet-control-zoom a:hover {
      background-color: rgba(0, 0, 0, 0.9);
    }
    .leaflet-popup-content-wrapper {
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border-radius: 8px;
    }
    .leaflet-popup-tip {
      background: rgba(0, 0, 0, 0.9);
    }
  `;

  useEffect(() => {
    // Inject custom styles
    const styleSheet = document.createElement("style");
    styleSheet.innerText = darkMapStyle;
    document.head.appendChild(styleSheet);

    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, [darkMapStyle]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border">
      <MapContainer
        ref={mapRef}
        center={[20, 0]}
        zoom={zoom}
        minZoom={2}
        maxZoom={10}
        style={{ height: '100%', width: '100%' }}
        worldCopyJump={true}
        maxBounds={[[-90, -180], [90, 180]]}
        className="z-0"
      >
        {/* Dark tile layer for cybersecurity theme */}
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
        />
        
        {/* Country boundaries and heat map */}
        <CountryLayer 
          threats={threats}
          showHeatMap={showHeatMap}
          selectedCountry={selectedCountry}
          onCountryClick={onCountryClick}
        />
        
        {/* Threat markers */}
        <ThreatMarkers threats={threats} onThreatClick={onThreatClick} />
        
        {/* Map controller for zoom updates */}
        <MapController zoom={zoom} />
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white p-3 rounded-lg shadow-lg z-10">
        <div className="text-sm font-medium mb-2">Threat Severity</div>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Low</span>
          </div>
        </div>
        
        {showHeatMap && (
          <div className="mt-3 pt-2 border-t border-gray-600">
            <div className="text-sm font-medium mb-1">Heat Map</div>
            <div className="text-xs text-gray-300">
              Countries colored by threat density
            </div>
          </div>
        )}
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg shadow-lg z-10">
        <div className="text-sm font-medium mb-1">Live Threats</div>
        <div className="text-2xl font-bold text-red-400">
          {threats.filter(t => t.active).length}
        </div>
        <div className="text-xs text-gray-300">
          Total: {threats.length}
        </div>
      </div>
    </div>
  );
}
