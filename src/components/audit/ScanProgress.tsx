/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Check, Loader2 } from 'lucide-react';

/**
 * The scanning sequence.
 *
 * Every step here reflects work that has actually happened. `stage` is driven
 * by real request milestones — not a timer pretending to be one. Steps within
 * a completed stage stagger in purely so the eye can follow them; nothing is
 * shown as done before it is done.
 */
export type ScanStage = 'fetching' | 'analyzing' | 'speed';

const STEPS: { id: string; label: string; stage: ScanStage }[] = [
  { id: 'fetch', label: 'Opening your website', stage: 'fetching' },
  { id: 'technical', label: 'Checking Google can find you', stage: 'analyzing' },
  { id: 'content', label: 'Reading what your pages say', stage: 'analyzing' },
  { id: 'geo', label: 'Checking if AI assistants can read you', stage: 'analyzing' },
  { id: 'speed', label: 'Timing how fast your site loads', stage: 'speed' },
];

const ORDER: ScanStage[] = ['fetching', 'analyzing', 'speed'];

export default function ScanProgress({
  domain,
  stage,
}: {
  domain: string;
  stage: ScanStage;
}) {
  const currentIndex = ORDER.indexOf(stage);

  return (
    <div className="w-full max-w-xl mx-auto text-center py-4">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-paper border-1.5 border-ink rounded-full shadow-hard -rotate-1 mb-5">
        <Loader2 className="w-3 h-3 text-ink animate-spin" aria-hidden="true" />
        <span className="font-sans text-[13px] font-bold text-ink">
          Checking {domain}
        </span>
      </div>

      <ul className="space-y-2 text-left" aria-live="polite" aria-busy="true">
        {STEPS.map((step, i) => {
          const stepIndex = ORDER.indexOf(step.stage);
          const done = stepIndex < currentIndex;
          const active = stepIndex === currentIndex;
          const stagger = done || active ? Math.min(i, 3) * 0.09 : 0;

          return (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: done || active ? 1 : 0.35, y: 0 }}
              transition={{ duration: 0.3, delay: stagger }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-1.5 ${
                active
                  ? 'border-ink bg-paper shadow-hard'
                  : done
                    ? 'border-ink/15 bg-paper/60'
                    : 'border-ink/10 bg-transparent'
              }`}
            >
              <span
                className={`shrink-0 w-5 h-5 rounded-full border-1.5 border-ink flex items-center justify-center ${
                  done ? 'bg-forest text-cream' : active ? 'bg-lime text-ink' : 'bg-transparent text-ink/55'
                }`}
              >
                {done ? (
                  <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />
                ) : active ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/25" aria-hidden="true" />
                )}
              </span>
              <span
                className={`font-sans text-[15px] leading-snug ${
                  done || active ? 'text-ink font-medium' : 'text-stone'
                }`}
              >
                {step.label}
              </span>
            </motion.li>
          );
        })}
      </ul>

      <p className="font-sans text-[13px] text-stone mt-5">
        {stage === 'speed'
          ? "Google's speed test can take up to 30 seconds"
          : 'Usually takes a few seconds'}
      </p>
    </div>
  );
}
