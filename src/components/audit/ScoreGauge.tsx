/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface ScoreGaugeProps {
  score: number;
  /** Preliminary scores are visibly marked so a later change reads as completion. */
  preliminary?: boolean;
  size?: number;
  label?: string;
}

export function scoreBand(score: number): { color: string; verdict: string } {
  if (score >= 80) return { color: '#1B3828', verdict: 'Strong' };
  if (score >= 60) return { color: '#C9F31D', verdict: 'Needs work' };
  if (score >= 40) return { color: '#8F5700', verdict: 'Weak' };
  return { color: '#B4232A', verdict: 'Critical' };
}

/** Counts from the previous value to the new one so the change is legible. */
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic — fast then settling, so the final number feels decided
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return value;
}

export default function ScoreGauge({
  score,
  preliminary = false,
  size = 148,
  label = 'Search health',
}: ScoreGaugeProps) {
  const displayed = useCountUp(score);
  const { color, verdict } = scoreBand(score);

  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Three-quarter arc, opening at the bottom.
  const arcPortion = 0.75;
  const arcLength = circumference * arcPortion;
  const progress = Math.max(0, Math.min(100, displayed)) / 100;

  return (
    <div className="flex flex-col items-center select-none" aria-live="polite">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-[225deg]" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#141210"
            strokeOpacity={0.12}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength * progress} ${circumference}`}
            initial={false}
            animate={{ strokeDasharray: `${arcLength * progress} ${circumference}` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-black text-ink leading-none" style={{ fontSize: size * 0.3 }}>
            {displayed}
          </span>
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-stone mt-0.5">
            out of 100
          </span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <p className="font-display font-extrabold text-sm text-ink leading-tight">{verdict}</p>
        <p className="font-mono text-[9px] uppercase tracking-widest text-stone mt-0.5">
          {preliminary ? 'Preliminary · speed test running' : label}
        </p>
      </div>
    </div>
  );
}
