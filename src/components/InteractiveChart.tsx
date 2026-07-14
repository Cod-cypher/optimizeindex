/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, MousePointerClick, Calendar, Award } from 'lucide-react';

export default function InteractiveChart() {
  const [activePoint, setActivePoint] = useState<number | null>(null);

  const dataPoints = [
    { month: 'Jul 25', revenue: 42000, organic: '12%', label: 'Baseline SEO' },
    { month: 'Sep 25', revenue: 58000, organic: '18%', label: 'Cluster Build' },
    { month: 'Nov 25', revenue: 84000, organic: '28%', label: 'GEO Citations Live' },
    { month: 'Jan 26', revenue: 112000, organic: '45%', label: 'Domain Stacking' },
    { month: 'Mar 26', revenue: 148000, organic: '61%', label: 'Authority Stacking' },
    { month: 'May 26', revenue: 184000, organic: '76%', label: 'Max Market Share' }
  ];

  // SVG coordinates calculations
  const width = 480;
  const height = 180;
  const padding = 20;

  const minRevenue = 30000;
  const maxRevenue = 200000;

  const getX = (index: number) => {
    return padding + (index * (width - padding * 2)) / (dataPoints.length - 1);
  };

  const getY = (value: number) => {
    const scale = (value - minRevenue) / (maxRevenue - minRevenue);
    return height - padding - scale * (height - padding * 2);
  };

  // Build SVG path
  let pathD = '';
  dataPoints.forEach((pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.revenue);
    if (idx === 0) {
      pathD += `M ${x} ${y}`;
    } else {
      // Smooth cubic bezier curves for premium visual weight
      const prevX = getX(idx - 1);
      const prevY = getY(dataPoints[idx - 1].revenue);
      const cpX1 = prevX + (x - prevX) / 2;
      const cpY1 = prevY;
      const cpX2 = prevX + (x - prevX) / 2;
      const cpY2 = y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x} ${y}`;
    }
  });

  // Build Area path
  const firstX = getX(0);
  const lastX = getX(dataPoints.length - 1);
  const bottomY = height - padding;
  const areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Top Meta Details */}
      <div className="flex items-center justify-between border-b border-cream/10 pb-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-lime animate-ping" />
          <p className="font-mono text-[10px] text-cream/70 tracking-widest uppercase">
            LIVE FORECAST: TARGET DOMAIN
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-lime text-ink text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-ink">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+312% REVENUE</span>
        </div>
      </div>

      {/* Headline Stat Row */}
      <div className="mb-4">
        <p className="font-mono text-[11px] text-cream/60 uppercase">MONTHLY ORGANIC REVENUE</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="font-display font-extrabold text-3xl text-lime">
            {activePoint !== null 
              ? `$${dataPoints[activePoint].revenue.toLocaleString()}`
              : `$184,000`
            }
          </span>
          <span className="font-mono text-xs text-cream/70">
            {activePoint !== null 
              ? `(${dataPoints[activePoint].organic} of total)`
              : `(76% of total pipeline)`
            }
          </span>
        </div>
        <p className="text-[10px] font-mono text-cream/40 mt-1">
          {activePoint !== null 
            ? `Milestone: ${dataPoints[activePoint].label} - ${dataPoints[activePoint].month}`
            : 'Interactive forecast — Hover nodes to inspect milestones'
          }
        </p>
      </div>

      {/* SVG Container */}
      <div className="relative flex-1 min-h-[160px] flex items-center justify-center bg-ink/30 border border-cream/5 rounded-xl p-2 select-none overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padding + ratio * (height - padding * 2);
            return (
              <line
                key={idx}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#F6F1E6"
                strokeOpacity={0.06}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Area Fill */}
          <path
            d={areaD}
            fill="url(#gradient-lime)"
            opacity={0.12}
          />

          {/* Line Path */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="#C9F31D"
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />

          {/* Interactive Data Points */}
          {dataPoints.map((pt, idx) => {
            const x = getX(idx);
            const y = getY(pt.revenue);
            const isHovered = activePoint === idx;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setActivePoint(idx)}
                onMouseLeave={() => setActivePoint(null)}
              >
                {/* Expand hover targets */}
                <circle
                  cx={x}
                  cy={y}
                  r={16}
                  fill="transparent"
                />
                
                {/* Shadow/Outline */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 8 : 4}
                  fill={isHovered ? '#1B3828' : '#141210'}
                  stroke="#C9F31D"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-150"
                />

                {isHovered && (
                  <circle
                    cx={x}
                    cy={y}
                    r={12}
                    fill="none"
                    stroke="#C9F31D"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    className="animate-spin"
                    style={{ transformOrigin: `${x}px ${y}px`, animationDuration: '6s' }}
                  />
                )}
              </g>
            );
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="gradient-lime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9F31D" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#C9F31D" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating custom HTML tooltip overlay when hovered */}
        <AnimatePresence>
          {activePoint !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute pointer-events-none bg-paper border-1.5 border-ink text-ink p-2.5 rounded-lg shadow-hard text-left z-20"
              style={{
                left: `${Math.max(10, Math.min(80, (activePoint / (dataPoints.length - 1)) * 100))}%`,
                top: '45%'
              }}
            >
              <p className="font-mono text-[9px] text-stone font-bold uppercase">{dataPoints[activePoint].month}</p>
              <p className="font-display font-extrabold text-sm text-ink">{dataPoints[activePoint].label}</p>
              <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono text-forest">
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>REVENUE: ${dataPoints[activePoint].revenue.toLocaleString()}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Attribution footer */}
      <div className="flex items-center justify-between border-t border-cream/10 pt-3 mt-2 text-[9px] font-mono text-cream/40">
        <span className="flex items-center gap-1">
          <MousePointerClick className="w-3 h-3 text-lime" />
          HOVER GRAPH NODES
        </span>
        <span className="flex items-center gap-1 uppercase">
          <Calendar className="w-3 h-3" />
          LAST UPDATE: TODAY
        </span>
      </div>
    </div>
  );
}
