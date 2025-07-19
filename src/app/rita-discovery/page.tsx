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
    preset: '60',
    minutes: 60
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
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">View</span>
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-1 text-xs sm:text-sm">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Applications</span>
            <span className="sm:hidden">Apps</span>
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-1 text-xs sm:text-sm">
            <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Communications</span>
            <span className="sm:hidden">Comm</span>
          </TabsTrigger>
          <TabsTrigger value="network-graph" className="flex items-center gap-1 text-xs sm:text-sm">
            <Network className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Network Graph</span>
            <span className="sm:hidden">Graph</span>
          </TabsTrigger>
          <TabsTrigger value="ip-details" className="col-span-2 lg:col-span-1 flex items-center gap-1 text-xs sm:text-sm">
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">IP Details</span>
            <span className="sm:hidden">IPs</span>
            {selectedIP && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground px-1 rounded truncate max-w-[80px]">
                {selectedIP}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Applications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Loading...</div>
                  <p className="text-xs text-muted-foreground">Unique applications</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Communications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Loading...</div>
                  <p className="text-xs text-muted-foreground">Active connections</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Network Nodes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Loading...</div>
                  <p className="text-xs text-muted-foreground">Unique IPs</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Network Graph */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Network Topology
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px]">
                  <NetworkGraphVisualization
                    timeRange={getLegacyTimeRangeString()}
                    onIpClick={handleIPClick}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <RITAApplicationAnalysis timeRange={getLegacyTimeRangeString()} />
        </TabsContent>

        <TabsContent value="communications" className="mt-6">
          <RITAIPCommunications timeRange={getLegacyTimeRangeString()} />
        </TabsContent>

        <TabsContent value="network-graph" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Interactive Network Graph
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <NetworkGraphVisualization
                  timeRange={getLegacyTimeRangeString()}
                  onIpClick={handleIPClick}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ip-details" className="mt-6">
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