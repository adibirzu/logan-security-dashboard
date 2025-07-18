'use client'

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  AlertTriangle, 
  Shield, 
  Globe, 
  Clock, 
  Target,
  TrendingUp,
  Users
} from 'lucide-react';

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

interface ThreatStats {
  totalThreats: number;
  activeThreats: number;
  criticalThreats: number;
  highThreats: number;
  mediumThreats: number;
  lowThreats: number;
  uniqueCountries: number;
  topAttackingCountries: { country: string; count: number }[];
  topTargetedCountries: { country: string; count: number }[];
}

interface ThreatStatisticsProps {
  stats: ThreatStats;
  timeRangeMinutes: number;
  isLoading: boolean;
  selectedCountry: string | null;
  threats: ThreatEvent[];
}

export function ThreatStatistics({ 
  stats, 
  timeRangeMinutes, 
  isLoading, 
  selectedCountry, 
  threats 
}: ThreatStatisticsProps) {
  const safeThreats = threats || []
  const filteredThreats = selectedCountry 
    ? safeThreats.filter(t => t.sourceCountry === selectedCountry || t.targetCountry === selectedCountry)
    : safeThreats;

  const attackTypes = filteredThreats.reduce((acc, threat) => {
    acc[threat.attackType] = (acc[threat.attackType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topAttackTypes = Object.entries(attackTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Threat Overview
          </CardTitle>
          <CardDescription>
            Last {timeRangeMinutes} minutes
            {selectedCountry && (
              <span className="ml-2 text-blue-600 font-medium">
                • Filtered by {selectedCountry}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {isLoading ? '...' : stats.totalThreats}
              </div>
              <div className="text-sm text-gray-600">Total Threats</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {isLoading ? '...' : stats.activeThreats}
              </div>
              <div className="text-sm text-gray-600">Active Now</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Critical</span>
              <Badge variant="destructive">{stats.criticalThreats}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">High</span>
              <Badge variant="destructive">{stats.highThreats}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Medium</span>
              <Badge variant="default">{stats.mediumThreats}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Low</span>
              <Badge variant="secondary">{stats.lowThreats}</Badge>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe className="h-4 w-4" />
              <span>{stats.uniqueCountries} countries involved</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Attack Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Attack Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topAttackTypes.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate">{type}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
            {topAttackTypes.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No attack types detected
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Attacking Countries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Top Attacking Countries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topAttackingCountries.map(({ country, count }) => (
              <div key={country} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{country}</span>
                <Badge variant="destructive">{count}</Badge>
              </div>
            ))}
            {stats.topAttackingCountries.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No attack sources detected
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Targeted Countries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Top Targeted Countries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topTargetedCountries.map(({ country, count }) => (
              <div key={country} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{country}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
            {stats.topTargetedCountries.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No attack targets detected
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredThreats.slice(0, 5).map((threat) => (
              <div key={threat.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    threat.severity === 'critical' ? 'bg-red-500' :
                    threat.severity === 'high' ? 'bg-orange-500' :
                    threat.severity === 'medium' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                  <span className="text-gray-600 truncate">
                    {threat.sourceCountry} → {threat.targetCountry}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(threat.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {filteredThreats.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
