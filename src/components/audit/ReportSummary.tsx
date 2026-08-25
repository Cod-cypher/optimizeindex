/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Check, AlertTriangle, X, Loader2, Minus } from 'lucide-react';
import type { AuditCategory, AuditResult } from '../../lib/audit';
import { bandStyle, CHECK_STATUS } from './palette';

/* -------------------------------------------------------------------------
   KPI row
   The three counts used to be inline mono text that read as a footnote. They
   are the headline finding after the score itself, so they get tiles — and
   each carries an icon and a word, never colour alone.
------------------------------------------------------------------------- */

const TILES = [
  { key: 'pass', icon: Check, label: 'Working', hint: 'nothing wrong here' },
  { key: 'warn', icon: AlertTriangle, label: 'Could improve', hint: 'costing you customers' },
  { key: 'fail', icon: X, label: 'Needs fixing', hint: 'losing you work right now' },
] as const;

export function StatusTiles({
  passed,
  warnings,
  critical,
}: {
  passed: number;
  warnings: number;
  critical: number;
}) {
  const counts = { pass: passed, warn: warnings, fail: critical };

  return (
    <dl className="grid grid-cols-3 gap-2 sm:gap-3">
      {TILES.map(({ key, icon: Icon, label, hint }, i) => {
        const status = CHECK_STATUS[key];
        const value = counts[key];
        const muted = value === 0;

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 + i * 0.06 }}
            className={`bg-paper border-1.5 border-ink rounded-xl px-3 py-3 ${
              muted ? 'opacity-55' : 'shadow-hard'
            }`}
          >
            {/* Reserve two lines for the label so the three counts sit on the
                same baseline. At 390px "Could be better" wraps and the others
                don't, which left the numbers stepped down the row. */}
            <div className="flex items-start gap-1.5 min-h-[2.6em]">
              <span
                className="shrink-0 w-4 h-4 mt-px rounded-full border border-ink flex items-center justify-center"
                style={{ backgroundColor: muted ? 'transparent' : status.fill }}
                aria-hidden="true"
              >
                <Icon
                  className="w-2.5 h-2.5 stroke-[3.5]"
                  style={{ color: muted ? '#8A867C' : status.on }}
                />
              </span>
              {/* No truncate: at 390px "To improve" clipped to "TO IM...".
                  Wrapping is better than lying about the label. */}
              <dt className="font-sans text-[13px] font-bold text-stone leading-tight">
                {label}
              </dt>
            </div>
            <dd
              className="font-display font-black text-4xl leading-none mt-1.5"
              style={{ color: muted ? '#8A867C' : status.ink }}
            >
              {value}
            </dd>
            <p className="font-sans text-[12px] text-stone leading-snug mt-1">{hint}</p>
          </motion.div>
        );
      })}
    </dl>
  );
}

/* -------------------------------------------------------------------------
   Category meters
   The four category scores previously existed only inside four separate
   cards further down the page, so "where am I actually weak" took scrolling
   and scanning. As a meter row it is one glance.

   Form choice: comparing magnitude across four named things is a bar, not
   four more rings. The track is a lighter step of the same hue so the band
   reads across the full width, and the number is always present — which is
   also what relieves the amber's low contrast against the surface.
------------------------------------------------------------------------- */

function Meter({ category, index }: { category: AuditCategory; index: number }) {
  const measured = category.state === 'ready' && category.score != null;
  const band = measured ? bandStyle(category.score!) : null;

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
      <p className="font-sans font-bold text-[15px] text-ink leading-tight truncate">
        {category.label}
      </p>

      <p className="font-mono text-[14px] font-bold tabular-nums text-right">
        {measured ? (
          <span style={{ color: band!.ink }}>{category.score}</span>
        ) : category.state === 'pending' ? (
          <span className="text-stone inline-flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
            <span className="sr-only">Measuring</span>
          </span>
        ) : (
          <span className="text-stone inline-flex items-center gap-1">
            <Minus className="w-3 h-3" aria-hidden="true" />
            <span className="sr-only">Not measured</span>
          </span>
        )}
      </p>

      <div
        className="col-span-2 h-2.5 rounded-full border border-ink/70 overflow-hidden"
        style={{ backgroundColor: band ? band.track : 'rgba(20,18,16,0.07)' }}
        role="img"
        aria-label={
          measured
            ? `${category.label}: ${category.score} out of 100, rated ${band!.label}`
            : `${category.label}: ${category.state === 'pending' ? 'still measuring' : 'not measured'}`
        }
      >
        {measured && (
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: band!.fill }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, category.score!)}%` }}
            transition={{ duration: 0.7, delay: 0.25 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
        {category.state === 'pending' && (
          <div className="h-full w-1/3 bg-ink/15 animate-pulse" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

export function CategoryMeters({ categories }: { categories: AuditCategory[] }) {
  return (
    <section className="bg-paper border-1.5 border-ink shadow-hard rounded-2xl p-5">
      <h3 className="font-sans text-[15px] font-bold text-ink mb-4">
        How each part of your site is doing
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {categories.map((c, i) => (
          <Meter key={c.id} category={c} index={i} />
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
   The verdict line
   One sentence, in body type rather than the display face — the score ring is
   the hero figure, and a second display-sized element beside it just split the
   reader's attention.
------------------------------------------------------------------------- */

export function VerdictLine({ result }: { result: AuditResult }) {
  const all = result.categories.flatMap((c) => c.checks);
  const critical = all.filter((c) => c.status === 'fail');
  const warnings = all.filter((c) => c.status === 'warn');

  const worst = [...result.categories]
    .filter((c) => c.state === 'ready' && c.score != null)
    .sort((a, b) => a.score! - b.score!)[0];

  if (critical.length > 0) {
    return (
      <p className="font-sans text-[17px] md:text-lg text-ink leading-relaxed">
        <strong className="font-bold">
          {critical.length} thing{critical.length === 1 ? '' : 's'} {critical.length === 1 ? 'is' : 'are'} costing you work
        </strong>
        {worst && (
          <>
            , concentrated in{' '}
            <strong className="font-bold">{worst.label.toLowerCase()}</strong>
          </>
        )}
        . Each one below says what we found and what to do about it.
      </p>
    );
  }

  if (warnings.length > 0) {
    return (
      <p className="font-sans text-[17px] md:text-lg text-ink leading-relaxed">
        <strong className="font-bold">Nothing is broken</strong> — but{' '}
        {warnings.length} thing{warnings.length === 1 ? '' : 's'}
        {worst ? ` in ${worst.label.toLowerCase()} ` : ' '}
        {warnings.length === 1 ? 'is' : 'are'} holding you back.
      </p>
    );
  }

  return (
    <p className="font-sans text-[17px] md:text-lg text-ink leading-relaxed">
      <strong className="font-bold">Everything checks out.</strong> That is rare. From here the
      wins come from more pages and more reviews, not technical fixes.
    </p>
  );
}
