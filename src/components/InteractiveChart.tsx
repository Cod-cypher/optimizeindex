/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, MousePointerClick, Info, Award } from 'lucide-react';
import { HERO_CHART } from '../data';

/**
 * The homepage hero panel: the same chart visual the hero has always had, now
 * an illustration of the five engagement steps rather than a revenue forecast.
 * All copy, and the rule that it carries no figures, lives in HERO_CHART
 * (src/data.ts).
 */
export default function InteractiveChart() {
  const [activePoint, setActivePoint] = useState<number | null>(null);

  const steps = HERO_CHART.steps;
  const active = activePoint !== null ? steps[activePoint] : null;

  // SVG coordinates calculations
  const width = 480;
  const height = 180;
  const padding = 20;

  const getX = (index: number) => {
    return padding + (index * (width - padding * 2)) / (steps.length - 1);
  };

  const getY = (level: number) => {
    return height - padding - (level / 100) * (height - padding * 2);
  };

  // Build SVG path
  let pathD = '';
  steps.forEach((pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.level);
    if (idx === 0) {
      pathD += `M ${x} ${y}`;
    } else {
      // Smooth cubic bezier curves for premium visual weight
      const prevX = getX(idx - 1);
      const prevY = getY(steps[idx - 1].level);
      const cpX1 = prevX + (x - prevX) / 2;
      const cpY1 = prevY;
      const cpX2 = prevX + (x - prevX) / 2;
      const cpY2 = y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x} ${y}`;
    }
  });

  // Build Area path
  const firstX = getX(0);
  const lastX = getX(steps.length - 1);
  const bottomY = height - padding;
  const areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Top Meta Details */}
      <div className="flex items-center justify-between gap-2 border-b border-cream/10 pb-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-lime" />
          <p className="font-mono text-[10px] text-cream/75 tracking-widest uppercase">
            {HERO_CHART.title}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-lime text-ink text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-ink uppercase whitespace-nowrap">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{HERO_CHART.badge}</span>
        </div>
      </div>

      {/* Headline Row */}
      <div className="mb-4">
        <p className="font-mono text-[11px] text-cream/60 uppercase">
          {active ? `Step ${activePoint! + 1} of ${steps.length}` : HERO_CHART.idleLabel}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-2 mt-0.5">
          <span className="font-display font-extrabold text-2xl sm:text-3xl text-lime whitespace-nowrap">
            {active ? active.label : HERO_CHART.idleValue}
          </span>
          {!active && (
            <span className="font-mono text-xs text-cream/75 whitespace-nowrap">
              ({HERO_CHART.idleNote})
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-cream/60 mt-1">
          {active ? `We report: ${active.reports}` : HERO_CHART.idleHint}
        </p>
      </div>

      {/* SVG Container */}
      {/* min-h 120, not 160: at 160 the panel's fixed 340px clipped the
          footer, and with it the "not client data" label. */}
      <div className="relative flex-1 min-h-[120px] flex items-center justify-center bg-ink/30 border border-cream/5 rounded-xl p-2 select-none overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          aria-hidden="true"
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

          {/* Interactive Step Nodes */}
          {steps.map((pt, idx) => {
            const x = getX(idx);
            const y = getY(pt.level);
            const isHovered = activePoint === idx;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setActivePoint(idx)}
                onMouseLeave={() => setActivePoint(null)}
                // Phones have no hover: a tap shows the step, a second tap hides it.
                onClick={() => setActivePoint(activePoint === idx ? null : idx)}
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
          {active && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute pointer-events-none bg-paper border-1.5 border-ink text-ink p-2.5 rounded-lg shadow-hard text-left z-20"
              style={{
                left: `${Math.max(10, Math.min(70, (activePoint! / (steps.length - 1)) * 100))}%`,
                top: '45%'
              }}
            >
              <p className="font-mono text-[9px] text-stone font-bold uppercase">Step {activePoint! + 1} of {steps.length}</p>
              <div className="flex items-center gap-1.5 mt-0.5 font-display font-extrabold text-sm text-ink">
                <Award className="w-3.5 h-3.5 shrink-0 text-forest" />
                <span>{active.label}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-cream/10 pt-3 mt-2 text-[9px] font-mono text-cream/60">
        <span className="flex items-center gap-1 uppercase">
          <MousePointerClick className="w-3 h-3 text-lime" />
          {HERO_CHART.hoverHint}
        </span>
        <span className="flex items-center gap-1 uppercase">
          <Info className="w-3 h-3" />
          {HERO_CHART.footnote}
        </span>
      </div>
    </div>
  );
}
