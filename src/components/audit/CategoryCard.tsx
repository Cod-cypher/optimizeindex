/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertTriangle, X, Minus, ChevronDown, Loader2 } from 'lucide-react';
import type { AuditCategory, AuditCheck, CheckStatus } from '../../lib/audit';
import { bandStyle, CHECK_STATUS } from './palette';

const STATUS_ICON: Record<CheckStatus, typeof Check> = {
  pass: Check,
  warn: AlertTriangle,
  fail: X,
  unknown: Minus,
};

function CheckRow({ check }: { check: AuditCheck }) {
  const [open, setOpen] = useState(false);
  const style = CHECK_STATUS[check.status];
  const Icon = STATUS_ICON[check.status];
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
          className="mt-0.5 shrink-0 w-5 h-5 rounded-full border-1.5 border-ink flex items-center justify-center"
          style={{ backgroundColor: style.fill, color: style.on }}
        >
          <Icon className="w-3 h-3 stroke-[3]" aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-sans font-bold text-[15px] text-ink leading-snug">{check.label}</span>
            <span className="sr-only">{style.word}.</span>
          </span>
          <span className="block font-sans text-[14px] text-stone leading-relaxed mt-0.5 break-words">
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
                <p className="font-sans text-[14px] text-stone leading-relaxed">
                  <span className="font-sans text-[12px] font-bold uppercase tracking-wide text-ink/70 block mb-1">
                    What this means
                  </span>
                  {check.why}
                </p>
              )}
              {check.fix && actionable && (
                <p className="font-sans text-[14px] text-ink leading-relaxed bg-lime/25 border-1.5 border-ink/15 rounded-lg px-3 py-2.5">
                  <span className="font-sans text-[12px] font-bold uppercase tracking-wide text-ink/70 block mb-1">
                    What to do
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
  const band = category.score != null ? bandStyle(category.score) : null;

  return (
    <section className="bg-paper border-1.5 border-ink shadow-hard rounded-2xl p-5 flex flex-col">
      <header className="flex items-start justify-between gap-3 pb-3 border-b-1.5 border-ink/10">
        <div className="min-w-0">
          <h3 className="font-display font-extrabold text-xl text-ink leading-tight">{category.label}</h3>
          <p className="font-sans text-[14px] text-stone leading-snug mt-0.5">{category.blurb}</p>
        </div>
        {category.state === 'ready' && category.score != null ? (
          <div className="shrink-0 text-right">
            <div
              className="font-display font-black text-2xl leading-none"
              style={{ color: band!.ink }}
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
          <p className="font-sans text-[13px] text-stone pt-2">{category.note}</p>
        </div>
      ) : category.state === 'unavailable' ? (
        <p className="font-sans text-[14px] text-stone leading-relaxed py-4">{category.note}</p>
      ) : (
        <>
          {(failing > 0 || warning > 0) && (
            <p className="font-sans text-[13px] font-bold text-stone pt-3">
              {failing > 0 && (
                <span className="font-bold" style={{ color: CHECK_STATUS.fail.ink }}>
                  {failing} to fix
                </span>
              )}
              {failing > 0 && warning > 0 && ' · '}
              {warning > 0 && <span>{warning} could be better</span>}
            </p>
          )}
          <ul className="mt-1">
            {category.checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </ul>
          {category.note && (
            <p className="font-sans text-[13px] text-stone leading-relaxed pt-3 border-t-1.5 border-ink/10 mt-1">
              {category.note}
            </p>
          )}
        </>
      )}
    </section>
  );
}
