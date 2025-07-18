'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedTimeFilter, TimeRange, useTimeRange } from '@/components/TimeFilter/UnifiedTimeFilter';
import { RITAApplicationAnalysis } from '@/components/ThreatAnalytics/RITAApplicationAnalysis';
import { RITAIPCommunications } from '@/components/ThreatAnalytics/RITAIPCommunications';
import NetworkGraphVisualization from '@/components/ThreatAnalytics/NetworkGraphVisualization';
import IPLogViewer from '@/components/ThreatAnalytics/IPLogViewer';
import ModernLayout from '@/components/Layout/ModernLayout';
import { 
  Network, 
  Activity, 
  Globe, 
  Eye,
  Search,
  BarChart3
} from 'lucide-react';

export default function RITADiscoveryPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    type: 'preset',
    preset: '240',
    minutes: 240
  });
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  const { getTimeRangeInMinutes, getDateRange, getOCITimeFilter } = useTimeRange(timeRange);

  const handleIPClick = (ip: string) => {
    setSelectedIP(ip);
    setActiveTab('ip-details');
  };

  // Convert new TimeRange format to legacy string format for existing components
  const getLegacyTimeRangeString = (): string => {
    const minutes = getTimeRangeInMinutes();
    if (minutes <= 60) return '1h';
    if (minutes <= 240) return '4h';
    if (minutes <= 1440) return '24h';
    if (minutes <= 2880) return '48h';
    return '48h'; // Default fallback
  };

  return (
    <ModernLayout
      title="RITA Discovery"
      subtitle="Real Intelligence Threat Analytics - Network behavior analysis and threat detection"
    >
      <div className="space-y-6">
        {/* Unified Time Filter */}
        <UnifiedTimeFilter
          value={timeRange}
          onChange={setTimeRange}
          showTitle={true}
        />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="network-graph" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Network Graph
          </TabsTrigger>
          <TabsTrigger value="ip-details" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            IP Details
            {selectedIP && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground px-1 rounded">
                {selectedIP}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Application Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RITAApplicationAnalysis />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Communication Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RITAIPCommunications />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Network Topology
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NetworkGraphVisualization
                timeRange={getLegacyTimeRangeString()}
                onIpClick={handleIPClick}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <RITAApplicationAnalysis />
        </TabsContent>

        <TabsContent value="communications">
          <RITAIPCommunications />
        </TabsContent>

        <TabsContent value="network-graph">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Interactive Network Graph
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NetworkGraphVisualization
                timeRange={getLegacyTimeRangeString()}
                onIpClick={handleIPClick}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ip-details">
          {selectedIP ? (
            <IPLogViewer
              ip={selectedIP}
              timeRange={getLegacyTimeRangeString()}
              onClose={() => setSelectedIP(null)}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  IP Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12">
                <div className="text-muted-foreground">
                  Click on an IP address in the network graph, applications, or communications to view detailed logs and analysis.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </ModernLayout>
  );
}