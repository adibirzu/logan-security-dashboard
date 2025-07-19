/**
 * Threat Intelligence Page Component
 * Main page for the Threat Intelligence module
 */

import React from 'react'
import ThreatIntelligence from '@/components/ThreatHunting/ThreatIntelligence'
import { useThreatIntel } from '@/store'

export default function ThreatIntelligencePage() {
  const { 
    indicators, 
    threatActors, 
    campaigns, 
    ociConnectionStatus,
    addIndicator,
    updateIndicator,
    setOciConnectionStatus 
  } = useThreatIntel()

  return (
    <div className="container mx-auto py-6">
      <ThreatIntelligence />
    </div>
  )
}