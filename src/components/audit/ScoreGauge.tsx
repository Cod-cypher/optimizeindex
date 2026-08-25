/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { bandStyle } from './palette';

interface ScoreGaugeProps {
  score: number;
  /** Preliminary scores are visibly marked so a later change reads as completion. */
  preliminary?: boolean;
  size?: number;
}

export { bandStyle, bandFor } from './palette';

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

/**
 * The report's single hero figure.
 *
 * A full ring rather than the three-quarter arc it replaced: the arc's open
 * bottom read as a broken circle at a glance and gave no cue about where the
 * scale ended. The unfilled track is a lighter step of the same hue, so the
 * band is legible across the whole ring instead of only the filled part.
 */
export default function ScoreGauge({ score, preliminary = false, size = 168 }: ScoreGaugeProps) {
  const displayed = useCountUp(score);
  const band = bandStyle(score);

  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, displayed)) / 100;

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        {/* -rotate-90 puts 0 at twelve o'clock so the ring fills clockwise. */}
        <svg width={size} height={size} className="-rotate-90 block" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={band.track}
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={band.fill}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: circumference * (1 - progress) }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Proportional figures, not tabular — at this size tabular digits
              make a number like 100 look loose. */}
          <span
            className="font-display font-black text-ink leading-none tracking-tight"
            style={{ fontSize: size * 0.36 }}
          >
            {displayed}
          </span>
          <span className="font-sans text-[13px] font-bold text-stone mt-1">
            / 100
          </span>
        </div>
      </div>

      <p
        className="mt-3 font-sans text-[15px] font-bold uppercase tracking-wide"
        style={{ color: band.ink }}
      >
        {band.label}
      </p>
      {preliminary && (
        <p className="font-sans text-[12px] text-stone mt-0.5">
          Still checking
        </p>
      )}
      <span className="sr-only">
        Your website scores {score} out of 100. Rated {band.label}.
        {preliminary ? " We're still timing your site, so this may change." : ''}
      </span>
    </div>
  );
}
