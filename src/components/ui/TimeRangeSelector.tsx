'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  TIME_RANGES, 
  getTimeRangeLabel, 
  parseCustomTimeRange, 
  isValidCustomTimeRange,
  formatDuration 
} from '@/lib/timeUtils';
import { Clock, Calendar, Settings } from 'lucide-react';

interface TimeRangeSelectorProps {
  selectedTimeRange: string;
  onTimeRangeChange: (timeRange: string) => void;
  className?: string;
  showCustom?: boolean;
  showCategories?: boolean;
}

export function TimeRangeSelector({
  selectedTimeRange,
  onTimeRangeChange,
  className = '',
  showCustom = true,
  showCategories = true
}: TimeRangeSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customError, setCustomError] = useState('');

  const handleCustomSubmit = () => {
    if (!customValue.trim()) {
      setCustomError('Please enter a time range');
      return;
    }

    if (!isValidCustomTimeRange(customValue)) {
      setCustomError('Invalid format. Use: 15m, 2h, 1d, etc.');
      return;
    }

    const minutes = parseCustomTimeRange(customValue);
    if (minutes && minutes > 0) {
      if (minutes > 43200) { // More than 30 days
        setCustomError('Maximum time range is 30 days');
        return;
      }
      onTimeRangeChange(customValue);
      setShowCustomInput(false);
      setCustomValue('');
      setCustomError('');
    }
  };

  const handleCustomCancel = () => {
    setShowCustomInput(false);
    setCustomValue('');
    setCustomError('');
  };

  const groupedRanges = TIME_RANGES.reduce((acc, range) => {
    if (!acc[range.category]) {
      acc[range.category] = [];
    }
    acc[range.category].push(range);
    return acc;
  }, {} as Record<string, typeof TIME_RANGES>);

  const categoryIcons = {
    quick: Clock,
    standard: Calendar,
    extended: Settings
  };

  const categoryLabels = {
    quick: 'Quick Access',
    standard: 'Standard',
    extended: 'Extended'
  };

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Time Range</h3>
            <Badge variant="outline" className="text-xs">
              {getTimeRangeLabel(selectedTimeRange)}
            </Badge>
          </div>

          {showCategories ? (
            <div className="space-y-3">
              {Object.entries(groupedRanges).map(([category, ranges]) => {
                const Icon = categoryIcons[category as keyof typeof categoryIcons];
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Icon className="w-3 h-3" />
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ranges.map((range) => (
                        <Button
                          key={range.value}
                          variant={selectedTimeRange === range.value ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onTimeRangeChange(range.value)}
                        >
                          {range.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {TIME_RANGES.map((range) => (
                <Button
                  key={range.value}
                  variant={selectedTimeRange === range.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onTimeRangeChange(range.value)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          )}

          {showCustom && (
            <div className="border-t pt-3">
              {!showCustomInput ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setShowCustomInput(true)}
                >
                  Custom Time Range
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., 45m, 8h, 3d"
                      value={customValue}
                      onChange={(e) => {
                        setCustomValue(e.target.value);
                        setCustomError('');
                      }}
                      className="h-8 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomSubmit();
                        } else if (e.key === 'Escape') {
                          handleCustomCancel();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={handleCustomSubmit}
                    >
                      Apply
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={handleCustomCancel}
                    >
                      Cancel
                    </Button>
                  </div>
                  {customError && (
                    <p className="text-xs text-red-500">{customError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Format: number + unit (m=minutes, h=hours, d=days)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}