'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  Activity,
  Shield,
  AlertTriangle,
  MapPin,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';
import { WorldMap } from './WorldMap';
import { ThreatStatistics } from './ThreatStatistics';
import { AttackAnimation } from './AttackAnimation';
import { getMCPApi } from '@/lib/api/mcp-api';
import { processThreatData } from '@/lib/threat-map/threat-processor';

interface ThreatEvent {
  id: string;
  sourceIp: string;
  targetIp: string;
  sourceCountry: string;
  targetCountry: string;
  sourceCoords: [number, number]; // [longitude, latitude]
  targetCoords: [number, number];
  severity: 'low' | 'medium' | 'high' | 'critical';
  attackType: string;
  timestamp: Date;
  active: boolean;
}

interface ThreatMapProps {
  timeRangeMinutes: number;
}

export function CyberThreatMap({ timeRangeMinutes }: ThreatMapProps) {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const animationRef = useRef<number | null>(null);

  const fetchThreatData = useCallback(async (query?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/threat-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRangeMinutes: timeRangeMinutes,
          maxEvents: 200,
          customQuery: query || undefined, // Pass custom query if provided
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setThreats(result.threats || []);
      } else {
        setError(result.error || 'Failed to fetch threat data');
      }
    } catch (err: any) {
      console.error('Error fetching threat data:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [timeRangeMinutes]);

  useEffect(() => {
    fetchThreatData(customQuery); // Fetch with custom query on initial load and timeRange change
    const interval = setInterval(() => fetchThreatData(customQuery), 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchThreatData, customQuery]); // Re-fetch when customQuery changes

  useEffect(() => {
    if (isAnimating) {
      const animate = () => {
        // Update threat animations
        setThreats(prev => prev.map(threat => ({
          ...threat,
          active: Math.random() > 0.7 // Randomly activate threats for animation
        })));
        
        animationRef.current = window.setTimeout(() => {
          requestAnimationFrame(animate);
        }, 1000 / animationSpeed);
      };
      animate();
    }
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isAnimating, animationSpeed]);

  const handleCountryClick = (countryCode: string, countryName: string) => {
    setSelectedCountry(selectedCountry === countryCode ? null : countryCode);
  };

  const handleThreatClick = (threat: ThreatEvent) => {
    setSelectedThreat(threat);
  };

  const resetView = () => {
    setZoom(1);
    setSelectedCountry(null);
    setSelectedThreat(null);
  };

  const safeThreats = threats || []
  const stats = {
    totalThreats: safeThreats.length,
    activeThreats: safeThreats.filter(t => t.active).length,
    criticalThreats: safeThreats.filter(t => t.severity === 'critical').length,
    highThreats: safeThreats.filter(t => t.severity === 'high').length,
    mediumThreats: safeThreats.filter(t => t.severity === 'medium').length,
    lowThreats: safeThreats.filter(t => t.severity === 'low').length,
    uniqueCountries: new Set([...safeThreats.map(t => t.sourceCountry), ...safeThreats.map(t => t.targetCountry)]).size,
    topAttackingCountries: getTopCountries(safeThreats, 'source'),
    topTargetedCountries: getTopCountries(safeThreats, 'target'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8 text-blue-600" />
            Cyber Threat Map
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time visualization of cyber threats from OCI logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsAnimating(!isAnimating)}
          >
            {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowHeatMap(!showHeatMap)}
          >
            {showHeatMap ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={resetView}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Animation Speed:</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">{animationSpeed}x</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(zoom + 0.5, 3))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(zoom - 0.5, 0.5))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-red-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Critical: {stats.criticalThreats}
              </Badge>
              <Badge variant="outline" className="text-orange-600">
                High: {stats.highThreats}
              </Badge>
              <Badge variant="outline" className="text-yellow-600">
                Medium: {stats.mediumThreats}
              </Badge>
              <Badge variant="outline" className="text-green-600">
                Low: {stats.lowThreats}
              </Badge>
            </div>
          </div>
          {/* Custom Query Input */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Enter custom log query (e.g., 'Log Source' in ('OCI VCN Flow Unified Schema Logs') and Action in (drop, reject) | rename 'Source IP' as Source | stats count by Source | top 10 Count)"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              className="flex-1 p-2 border rounded-md text-sm"
            />
            <Button 
              onClick={() => fetchThreatData(customQuery)} 
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Run Custom Query'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Statistics Panel */}
        <div className="lg:col-span-1">
          <ThreatStatistics 
            stats={stats}
            timeRangeMinutes={timeRangeMinutes}
            isLoading={isLoading}
            selectedCountry={selectedCountry}
            threats={threats}
          />
        </div>

        {/* World Map */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Global Threat Overview
                {isLoading && <Activity className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                {stats.totalThreats} threats detected in the last {timeRangeMinutes} minutes
                {stats.activeThreats > 0 && (
                  <span className="ml-2 text-red-600 font-medium">
                    • {stats.activeThreats} active
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                <WorldMap
                  threats={threats}
                  zoom={zoom}
                  showHeatMap={showHeatMap}
                  selectedCountry={selectedCountry}
                  onCountryClick={handleCountryClick}
                  onThreatClick={handleThreatClick}
                />
                <AttackAnimation
                  threats={threats.filter(t => t.active)}
                  isAnimating={isAnimating}
                  animationSpeed={animationSpeed}
                  zoom={zoom}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Threat Details */}
      {selectedThreat && (
        <Card>
          <CardHeader>
            <CardTitle>Threat Details</CardTitle>
            <CardDescription>
              Attack from {selectedThreat.sourceCountry} to {selectedThreat.targetCountry}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Source IP</label>
                <p className="font-mono text-sm">{selectedThreat.sourceIp}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Target IP</label>
                <p className="font-mono text-sm">{selectedThreat.targetIp}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Attack Type</label>
                <p className="text-sm">{selectedThreat.attackType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Severity</label>
                <Badge variant={
                  selectedThreat.severity === 'critical' ? 'destructive' :
                  selectedThreat.severity === 'high' ? 'destructive' :
                  selectedThreat.severity === 'medium' ? 'default' : 'secondary'
                }>
                  {selectedThreat.severity}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getTopCountries(threats: ThreatEvent[], type: 'source' | 'target') {
  const countryCounts = threats.reduce((acc, threat) => {
    const country = type === 'source' ? threat.sourceCountry : threat.targetCountry;
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(countryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([country, count]) => ({ country, count }));
}
