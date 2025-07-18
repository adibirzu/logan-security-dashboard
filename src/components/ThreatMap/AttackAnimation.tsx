'use client'

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

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

interface AttackAnimationProps {
  threats: ThreatEvent[];
  isAnimating: boolean;
  animationSpeed: number;
  zoom: number;
}

export function AttackAnimation({ 
  threats, 
  isAnimating, 
  animationSpeed, 
  zoom 
}: AttackAnimationProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !isAnimating) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    // Simple projection function (this would be more sophisticated with d3)
    const projectPoint = (coords: [number, number]) => {
      const [lng, lat] = coords;
      // Simple mercator-like projection
      const x = ((lng + 180) / 360) * rect.width;
      const y = ((90 - lat) / 180) * rect.height;
      return [x, y];
    };

    // Clear previous animations
    svg.innerHTML = '';

    threats.forEach((threat, index) => {
      const [x1, y1] = projectPoint(threat.sourceCoords);
      const [x2, y2] = projectPoint(threat.targetCoords);
      
      // Create animated path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      // Create bezier curve for attack path
      const midX = (x1 + x2) / 2;
      const midY = Math.min(y1, y2) - 50; // Arc upward
      
      const pathData = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', getSeverityColor(threat.severity));
      path.setAttribute('stroke-width', getSeverityWidth(threat.severity).toString());
      path.setAttribute('opacity', '0.6');
      
      // Add animation
      const pathLength = path.getTotalLength();
      path.style.strokeDasharray = `${pathLength}`;
      path.style.strokeDashoffset = `${pathLength}`;
      
      const duration = 2000 / animationSpeed;
      path.style.animation = `drawPath ${duration}ms ease-in-out infinite`;
      
      svg.appendChild(path);
      
      // Add particle effect
      const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      particle.setAttribute('r', '3');
      particle.setAttribute('fill', getSeverityColor(threat.severity));
      particle.setAttribute('opacity', '0.8');
      
      const animateMotion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
      animateMotion.setAttribute('dur', `${duration}ms`);
      animateMotion.setAttribute('repeatCount', 'indefinite');
      animateMotion.setAttribute('path', pathData);
      
      particle.appendChild(animateMotion);
      svg.appendChild(particle);
    });

    // Add CSS animation for path drawing
    const style = document.createElement('style');
    style.textContent = `
      @keyframes drawPath {
        0% {
          stroke-dashoffset: ${1000};
        }
        50% {
          stroke-dashoffset: 0;
        }
        100% {
          stroke-dashoffset: ${-1000};
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [threats, isAnimating, animationSpeed, zoom]);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return '#dc2626';
    case 'high':
      return '#f97316';
    case 'medium':
      return '#eab308';
    case 'low':
      return '#22c55e';
    default:
      return '#6b7280';
  }
}

function getSeverityWidth(severity: string): number {
  switch (severity) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 1;
  }
}
