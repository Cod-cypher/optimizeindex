/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertTriangle, X, Minus, ChevronDown, Loader2 } from 'lucide-react';
import type { AuditCategory, AuditCheck, CheckStatus } from '../../lib/audit';
import { scoreBand } from './ScoreGauge';

const STATUS_STYLE: Record<CheckStatus, { icon: typeof Check; bg: string; fg: string; word: string }> = {
  pass: { icon: Check, bg: 'bg-forest', fg: 'text-cream', word: 'Pass' },
  warn: { icon: AlertTriangle, bg: 'bg-[#8F5700]', fg: 'text-white', word: 'Warning' },
  fail: { icon: X, bg: 'bg-[#B4232A]', fg: 'text-white', word: 'Failing' },
  unknown: { icon: Minus, bg: 'bg-stone/30', fg: 'text-ink', word: 'Not measured' },
};

function CheckRow({ check }: { check: AuditCheck }) {
  const [open, setOpen] = useState(false);
  const style = STATUS_STYLE[check.status];
  const Icon = style.icon;
  const actionable = check.status === 'fail' || check.status === 'warn';

  return (
    <li className="border-t-1.5 border-ink/10 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 py-3 text-left cursor-pointer focus-ring rounded-lg px-1 -mx-1 hover:bg-ink/[0.03] transition-colors"
      >
        <span
          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-1.5 border-ink flex items-center justify-center ${style.bg} ${style.fg}`}
        >
          <Icon className="w-3 h-3 stroke-[3]" aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-sans font-bold text-[13px] text-ink leading-snug">{check.label}</span>
            <span className="sr-only">{style.word}.</span>
          </span>
          <span className="block font-mono text-[11px] text-stone leading-relaxed mt-0.5 break-words">
            {check.detail}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-stone mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-3 pl-8 pr-1 space-y-2">
              {check.why && (
                <p className="font-sans text-[12px] text-stone leading-relaxed">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/60 block mb-0.5">
                    Why it matters
                  </span>
                  {check.why}
                </p>
              )}
              {check.fix && actionable && (
                <p className="font-sans text-[12px] text-ink leading-relaxed bg-lime/25 border-1.5 border-ink/15 rounded-lg px-3 py-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/70 block mb-0.5">
                    The fix
                  </span>
                  {check.fix}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function CategoryCard({ category }: { category: AuditCategory }) {
  const failing = category.checks.filter((c) => c.status === 'fail').length;
  const warning = category.checks.filter((c) => c.status === 'warn').length;
  const band = category.score != null ? scoreBand(category.score) : null;

  return (
    <section className="bg-paper border-1.5 border-ink shadow-hard rounded-2xl p-5 flex flex-col">
      <header className="flex items-start justify-between gap-3 pb-3 border-b-1.5 border-ink/10">
        <div className="min-w-0">
          <h3 className="font-display font-extrabold text-base text-ink leading-tight">{category.label}</h3>
          <p className="font-sans text-[12px] text-stone leading-snug mt-0.5">{category.blurb}</p>
        </div>
        {category.state === 'ready' && category.score != null ? (
          <div className="shrink-0 text-right">
            <div
              className="font-display font-black text-2xl leading-none"
              style={{ color: band!.color === '#C9F31D' ? '#141210' : band!.color }}
            >
              {category.score}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-stone">/ 100</div>
          </div>
        ) : category.state === 'pending' ? (
          <Loader2 className="w-5 h-5 shrink-0 text-stone animate-spin" aria-label="Measuring" />
        ) : (
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-stone border-1.5 border-ink/20 rounded-full px-2 py-1">
            N/A
          </span>
        )}
      </header>

      {category.state === 'pending' ? (
        <div className="py-6 space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 rounded-full bg-ink/[0.07] animate-pulse" style={{ width: `${88 - i * 16}%` }} />
          ))}
          <p className="font-mono text-[11px] text-stone pt-2">{category.note}</p>
        </div>
      ) : category.state === 'unavailable' ? (
        <p className="font-sans text-[12px] text-stone leading-relaxed py-4">{category.note}</p>
      ) : (
        <>
          {(failing > 0 || warning > 0) && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-stone pt-3">
              {failing > 0 && <span className="text-[#B4232A] font-bold">{failing} failing</span>}
              {failing > 0 && warning > 0 && ' · '}
              {warning > 0 && <span>{warning} to improve</span>}
            </p>
          )}
          <ul className="mt-1">
            {category.checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </ul>
          {category.note && (
            <p className="font-mono text-[10px] text-stone leading-relaxed pt-3 border-t-1.5 border-ink/10 mt-1">
              {category.note}
            </p>
          )}
        </>
      )}
    </section>
  );
}
