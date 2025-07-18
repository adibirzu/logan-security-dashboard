'use client'

import React, { useState } from 'react';
import { 
  MITRE_TACTICS, 
  MITRE_TECHNIQUES, 
  getTechniquesByTactic, 
  getTechniqueById,
  MATRIX_COLORS,
  TechniqueHitData,
  MitreTechniqueDetail 
} from '@/lib/mitre-attack/mitre-framework';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Info, ZoomIn, ZoomOut, Download, AlertCircle } from 'lucide-react';

interface MitreNavigatorProps {
  techniqueHits: TechniqueHitData[];
  title?: string;
  description?: string;
  onTechniqueClick?: (technique: MitreTechniqueDetail, hitData?: TechniqueHitData) => void;
  onExport?: () => void;
  showLegend?: boolean;
  compact?: boolean;
  isLoading?: boolean;
}

export function MitreNavigator({
  techniqueHits,
  title = 'MITRE ATT&CK Navigator',
  description = 'Interactive visualization of detected techniques',
  onTechniqueClick,
  onExport,
  showLegend = true,
  compact = false,
  isLoading = false
}: MitreNavigatorProps) {
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredTechnique, setHoveredTechnique] = useState<string | null>(null);

  // Error boundary for invalid technique data
  const validTechniqueHits = techniqueHits.filter(hit => {
    const technique = getTechniqueById(hit.techniqueId);
    if (!technique) {
      console.warn(`Unknown technique ID: ${hit.techniqueId}`);
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>Loading MITRE ATT&CK Matrix...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (validTechniqueHits.length === 0 && techniqueHits.length > 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-yellow-600 mb-2">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No valid MITRE ATT&CK techniques found in the provided data.</p>
            <p className="text-sm mt-2">
              This might be due to technique IDs not matching the current framework.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create a map of technique hits for easy lookup
  const hitMap = new Map<string, TechniqueHitData>();
  validTechniqueHits.forEach(hit => {
    hitMap.set(hit.techniqueId, hit);
  });

  // Calculate max hits for color scaling
  const maxHits = Math.max(...validTechniqueHits.map(h => h.count), 1);

  // Get color for technique based on hit count
  const getTechniqueColor = (techniqueId: string): string => {
    const hit = hitMap.get(techniqueId);
    if (!hit || hit.count === 0) {
      return MATRIX_COLORS.techniqueDefault;
    }

    const intensity = Math.min(hit.count / maxHits, 1);
    const colorIndex = Math.floor(intensity * (MATRIX_COLORS.heatmap.length - 1));
    return MATRIX_COLORS.heatmap[colorIndex];
  };

  // Handle technique cell click
  const handleTechniqueClick = (technique: MitreTechniqueDetail) => {
    setSelectedTechnique(technique.id);
    const hitData = hitMap.get(technique.id);
    onTechniqueClick?.(technique, hitData);
  };

  // Export functionality
  const handleExport = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple export - in a real implementation you'd want to use html2canvas or similar
    onExport?.();
  };

  return (
    <TooltipProvider>
      <div className="w-full">
        {/* Header */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {title}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              </div>
              <div className="flex items-center gap-2">
                {!compact && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">{Math.round(zoomLevel * 100)}%</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {onExport && (
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Matrix Grid */}
        <Card className="mb-4">
          <CardContent className="p-0">
            <div 
              className="overflow-auto"
              style={{ 
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top left',
                width: `${100 / zoomLevel}%`
              }}
            >
              <div className="min-w-fit">
                {/* Tactic Headers */}
                <div className="flex border-b-2 border-gray-300 sticky top-0 bg-white z-10">
                  {MITRE_TACTICS.map((tactic) => (
                    <div
                      key={tactic.id}
                      className="flex-1 min-w-32 p-3 text-center font-semibold text-sm"
                      style={{ 
                        backgroundColor: MATRIX_COLORS.tacticBackground,
                        color: MATRIX_COLORS.tacticHeader,
                        borderRight: `1px solid ${MATRIX_COLORS.border}`
                      }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <div className="font-bold text-xs">{tactic.shortName}</div>
                            <div className="text-xs opacity-75">{tactic.id}</div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs">
                            <div className="font-semibold">{tactic.name}</div>
                            <div className="text-sm mt-1">{tactic.description}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>

                {/* Technique Rows */}
                <div className="flex">
                  {MITRE_TACTICS.map((tactic) => {
                    const techniques = getTechniquesByTactic(tactic.id);
                    const maxTechniques = Math.max(...MITRE_TACTICS.map(t => getTechniquesByTactic(t.id).length));
                    
                    return (
                      <div
                        key={tactic.id}
                        className="flex-1 min-w-32"
                        style={{ borderRight: `1px solid ${MATRIX_COLORS.border}` }}
                      >
                        {/* Techniques for this tactic */}
                        {techniques.map((technique) => {
                          const hit = hitMap.get(technique.id);
                          const hasHit = hit && hit.count > 0;
                          const isSelected = selectedTechnique === technique.id;
                          const isHovered = hoveredTechnique === technique.id;
                          
                          return (
                            <Tooltip key={technique.id}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`
                                    p-2 m-1 rounded cursor-pointer text-xs border transition-all duration-200
                                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                                    ${isHovered ? 'shadow-md' : ''}
                                    ${hasHit ? 'font-semibold' : ''}
                                  `}
                                  style={{
                                    backgroundColor: isHovered 
                                      ? MATRIX_COLORS.techniqueHover 
                                      : getTechniqueColor(technique.id),
                                    color: hasHit ? '#1f2937' : MATRIX_COLORS.text,
                                    borderColor: hasHit ? '#3b82f6' : MATRIX_COLORS.border
                                  }}
                                  onClick={() => handleTechniqueClick(technique)}
                                  onMouseEnter={() => setHoveredTechnique(technique.id)}
                                  onMouseLeave={() => setHoveredTechnique(null)}
                                >
                                  <div className="font-mono text-xs">{technique.id}</div>
                                  <div className="text-xs mt-1 leading-tight">
                                    {technique.name.length > 20 
                                      ? technique.name.substring(0, 20) + '...' 
                                      : technique.name}
                                  </div>
                                  {hasHit && (
                                    <div className="flex items-center justify-between mt-1">
                                      <Badge variant="secondary" className="text-xs">
                                        {hit.count}
                                      </Badge>
                                      {hit.metadata?.severity && (
                                        <div 
                                          className="w-2 h-2 rounded-full"
                                          style={{ 
                                            backgroundColor: MATRIX_COLORS.severity[hit.metadata.severity as keyof typeof MATRIX_COLORS.severity] || MATRIX_COLORS.severity.low
                                          }}
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <div>
                                  <div className="font-semibold">{technique.name}</div>
                                  <div className="text-xs text-gray-600 mt-1">{technique.id}</div>
                                  <div className="text-sm mt-2">{technique.description}</div>
                                  {hasHit && (
                                    <div className="mt-3 pt-3 border-t">
                                      <div className="text-sm font-semibold text-blue-600">
                                        {hit.count} detection{hit.count !== 1 ? 's' : ''}
                                      </div>
                                      {hit.metadata?.lastSeen && (
                                        <div className="text-xs text-gray-600 mt-1">
                                          Last seen: {new Date(hit.metadata.lastSeen).toLocaleString()}
                                        </div>
                                      )}
                                      {hit.metadata?.severity && (
                                        <div className="text-xs mt-1">
                                          Severity: <span className="font-medium">{hit.metadata.severity}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                                    <ExternalLink className="h-3 w-3" />
                                    <span>View on MITRE</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        
                        {/* Fill empty cells to maintain column height */}
                        {Array.from({ length: maxTechniques - techniques.length }).map((_, index) => (
                          <div
                            key={`empty-${index}`}
                            className="p-2 m-1 rounded opacity-20"
                            style={{ backgroundColor: MATRIX_COLORS.techniqueDefault }}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        {showLegend && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Heat Map Legend */}
                <div>
                  <h4 className="font-semibold mb-3">Detection Intensity</h4>
                  <div className="space-y-2">
                    {MATRIX_COLORS.heatmap.map((color, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm">
                          {index === 0 && 'No detections'}
                          {index === 1 && '1-2 detections'}
                          {index === 2 && '3-5 detections'}
                          {index === 3 && '6-10 detections'}
                          {index === 4 && '11-20 detections'}
                          {index === 5 && '21-50 detections'}
                          {index === 6 && '51-100 detections'}
                          {index === 7 && '100+ detections'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Severity Legend */}
                <div>
                  <h4 className="font-semibold mb-3">Severity Levels</h4>
                  <div className="space-y-2">
                    {Object.entries(MATRIX_COLORS.severity).map(([level, color]) => (
                      <div key={level} className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm capitalize">{level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-semibold mb-2">Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Total Techniques</div>
                    <div className="text-2xl font-bold text-blue-600">{MITRE_TECHNIQUES.length}</div>
                  </div>
                  <div>
                    <div className="font-medium">Detected</div>
                    <div className="text-2xl font-bold text-green-600">{validTechniqueHits.length}</div>
                  </div>
                  <div>
                    <div className="font-medium">Total Detections</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {validTechniqueHits.reduce((sum, hit) => sum + hit.count, 0)}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Coverage</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((validTechniqueHits.length / MITRE_TECHNIQUES.length) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
