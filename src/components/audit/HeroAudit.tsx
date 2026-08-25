/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ArrowRight,
  Loader2,
  RotateCcw,
  AlertCircle,
  Globe,
  Gauge,
  FileSearch,
} from 'lucide-react';
import type { GoalId } from '../../types';
import { trackEvent } from '../../lib/tracker';
import {
  runScan,
  runPsi,
  mergePsi,
  markPsiUnavailable,
  bucketIssues,
  looksLikeDomain,
  displayDomain,
  AuditFailure,
  type AuditResult,
} from '../../lib/audit';
import ScanProgress, { type ScanStage } from './ScanProgress';
import ScoreGauge from './ScoreGauge';
import CategoryCard from './CategoryCard';
import AuditLeadForm from './AuditLeadForm';
import { StatusTiles, CategoryMeters, VerdictLine } from './ReportSummary';
import { DARK_STATUS, vitalStatus } from './palette';

type Phase = 'idle' | 'scanning' | 'results' | 'error';

interface HeroAuditProps {
  selectedGoal: GoalId;
  onGoalSelect: (goal: GoalId) => void;
  /** Lets the hero collapse its two-column layout once the audit takes over. */
  onActiveChange?: (active: boolean) => void;
  onRequestQuote: () => void;
}

/** Maps a failure to copy that says what actually happened. */
function describeFailure(err: AuditFailure, domain: string): { title: string; body: string } {
  switch (err.code) {
    case 'DNS_FAILED':
      return {
        title: `We couldn't find ${domain}`,
        body: "Nothing is registered at that address. Check the spelling. If the site is brand new it can take a day to go live.",
      };
    case 'UNREACHABLE':
    case 'TIMEOUT':
      return {
        title: `We couldn't reach ${domain}`,
        body: "Your site didn't answer in time. That might just be a hiccup, or it might be why customers are leaving.",
      };
    case 'BOT_BLOCKED':
      return {
        title: `${domain} wouldn't let us in`,
        body: "Your site has security that blocks automated checks. That's normal and nothing is wrong — we'll just need to check it by hand.",
      };
    case 'BAD_STATUS':
      return {
        title: `${domain} showed an error`,
        body: err.message,
      };
    case 'RATE_LIMITED':
      return { title: "You've checked a few sites already", body: err.message };
    case 'BLOCKED_HOST':
    case 'INVALID_URL':
      return { title: 'Check that address', body: err.message };
    case 'TOO_MANY_REDIRECTS':
      return {
        title: `${domain} keeps sending us in circles`,
        body: "Your address keeps forwarding to another address and never lands. Google gives up too, so this one is worth fixing.",
      };
    default:
      return {
        title: "That check didn't finish",
        body: err.message || 'Something went wrong on our end. Try again in a moment.',
      };
  }
}

export default function HeroAudit({
  selectedGoal,
  onGoalSelect,
  onActiveChange,
  onRequestQuote,
}: HeroAuditProps) {
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [stage, setStage] = useState<ScanStage>('fetching');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [failure, setFailure] = useState<{ title: string; body: string } | null>(null);
  const [inputError, setInputError] = useState('');

  const scannedDomain = useRef('');
  // Guards against a slow PageSpeed response landing after a reset.
  const runIdRef = useRef(0);

  useEffect(() => {
    onActiveChange?.(phase !== 'idle');
  }, [phase, onActiveChange]);

  const reset = () => {
    runIdRef.current += 1;
    setPhase('idle');
    setResult(null);
    setFailure(null);
    setInputError('');
    setInput('');
    trackEvent('audit_reset');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) {
      setInputError('Type your website address to start.');
      return;
    }
    if (!looksLikeDomain(raw)) {
      setInputError("That doesn't look like a web address. Try something like yourbusiness.com.");
      return;
    }

    const runId = ++runIdRef.current;
    const domain = displayDomain(raw);
    scannedDomain.current = domain;

    setInputError('');
    setFailure(null);
    setStage('fetching');
    setPhase('scanning');
    trackEvent('audit_scan', domain);

    let scanned: AuditResult;
    try {
      scanned = await runScan(raw);
    } catch (err) {
      if (runId !== runIdRef.current) return;
      const failureObj =
        err instanceof AuditFailure ? err : new AuditFailure('UNKNOWN', 'Something went wrong.');
      setFailure(describeFailure(failureObj, domain));
      setPhase('error');
      trackEvent('audit_error', domain, { code: failureObj.code });
      return;
    }
    if (runId !== runIdRef.current) return;

    setResult(scanned);
    scannedDomain.current = scanned.domain;

    // A cached audit already carries its PageSpeed data — go straight to it.
    if (!scanned.meta.psiPending) {
      setPhase('results');
      trackEvent('audit_complete', scanned.domain, { score: scanned.overall, cached: true });
      return;
    }

    // Kick off the slow half immediately; the brief hold below is only so the
    // completed checklist is legible, and it doesn't delay this request.
    // Settled into a result object rather than left as a bare promise — during
    // the hold there is no catch attached yet, and a rejection in that window
    // would surface as an unhandled rejection.
    const psiPromise = runPsi(scanned.auditId, scanned.finalUrl || scanned.url).then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const }),
    );

    setStage('speed');
    await new Promise((r) => setTimeout(r, 550));
    if (runId !== runIdRef.current) return;
    setPhase('results');
    trackEvent('audit_complete', scanned.domain, { score: scanned.overall });

    const settled = await psiPromise;
    if (runId !== runIdRef.current) return;

    if (settled.ok) {
      const psi = settled.value;
      setResult((prev) => (prev ? mergePsi(prev, psi) : prev));
      trackEvent('audit_psi', scanned.domain, {
        available: psi.available,
        score: psi.category.score,
      });
    } else {
      setResult((prev) =>
        prev
          ? markPsiUnavailable(
              prev,
              "We couldn't get Google's speed measurement for this site right now — we'll measure it by hand in your full report.",
            )
          : prev,
      );
      trackEvent('audit_psi', scanned.domain, { available: false });
    }
  };

  /* ----------------------------------------------------------------- idle */
  if (phase === 'idle') {
    return (
      <div className="w-full space-y-4">
        <form onSubmit={handleSubmit} className="w-full">
          <label htmlFor="hero-audit-input" className="form-label">
            Type your website address and see how you show up on Google
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <span className="field-wrap flex-1">
              <Globe className="field-icon" aria-hidden="true" />
              <input
                id="hero-audit-input"
                type="text"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (inputError) setInputError('');
                }}
                placeholder="yourbusiness.com"
                aria-invalid={Boolean(inputError)}
                aria-describedby={inputError ? 'hero-audit-error' : undefined}
                className="field field-mono py-4"
              />
            </span>
            <button
              type="submit"
              id="hero-audit-submit"
              className="shrink-0 px-7 py-4 bg-lime text-ink font-sans font-extrabold text-sm border-2 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 rounded-full transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus-ring"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              <span>Check my website</span>
            </button>
          </div>
          {inputError && (
            <p id="hero-audit-error" role="alert" className="font-mono text-[11px] text-[#B4232A] mt-2">
              {inputError}
            </p>
          )}
        </form>

        <div className="space-y-2">
          <p className="font-sans text-[14px] text-stone">
            Free · No signup · Takes about 20 seconds
          </p>
          <p className="font-sans text-[14px] text-stone">
            Or{' '}
            <button
              type="button"
              onClick={onRequestQuote}
              id="hero-secondary-cta"
              className="underline decoration-lime decoration-2 underline-offset-2 font-semibold text-ink hover:text-forest transition-colors cursor-pointer focus-ring rounded"
            >
              get a price from a person
            </button>{' '}
            instead.
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- scanning */
  if (phase === 'scanning') {
    return <ScanProgress domain={scannedDomain.current} stage={stage} />;
  }

  /* ---------------------------------------------------------------- error */
  if (phase === 'error' && failure) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-paper border-1.5 border-ink shadow-hard-lg rounded-2xl p-6 md:p-8 text-center">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#B4232A] border-1.5 border-ink shadow-hard mb-3">
            <AlertCircle className="w-5 h-5 text-white stroke-[2.5]" aria-hidden="true" />
          </span>
          <h3 className="font-display font-extrabold text-xl md:text-2xl text-ink leading-tight" role="alert">
            {failure.title}
          </h3>
          <p className="font-sans text-sm text-stone leading-relaxed mt-2 max-w-lg mx-auto">
            {failure.body}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <button
              type="button"
              onClick={reset}
              id="audit-scan-again"
              className="px-6 py-3 bg-paper text-ink font-sans font-extrabold text-sm border-2 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 rounded-full transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus-ring"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Try another address</span>
            </button>
            <button
              type="button"
              onClick={onRequestQuote}
              id="audit-manual-cta"
              className="px-6 py-3 bg-lime text-ink font-sans font-extrabold text-sm border-2 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 rounded-full transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus-ring"
            >
              <span>Have a person check it</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- results */
  if (phase === 'results' && result) {
    const { critical, warnings, passed } = bucketIssues(result);
    const psiPending = result.meta.psiPending;

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full space-y-6"
      >
        {/* Report header rail — identifies what this is and what it's about
            before any number appears, and keeps "scan another" out of the
            way of the findings. */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-lime rounded-full font-sans text-[12px] font-bold">
              <FileSearch className="w-3 h-3" aria-hidden="true" />
              Your website report
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[15px] font-bold text-ink min-w-0">
              <Globe className="w-3.5 h-3.5 shrink-0 text-stone" aria-hidden="true" />
              <span className="truncate">{result.domain}</span>
            </span>
            {result.meta.cached && (
              <span className="font-sans text-[13px] text-stone">
                · from a recent scan
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={reset}
            id="audit-scan-again"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-paper border-1.5 border-ink rounded-full font-sans text-[13px] font-bold text-ink hover:shadow-hard hover:-translate-y-0.5 transition-all cursor-pointer focus-ring"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Check another site
          </button>
        </div>

        {/* Verdict block: one hero figure, one sentence, one KPI row. */}
        <div className="bg-cream border-1.5 border-ink shadow-hard-lg rounded-2xl p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            <div className="shrink-0 mx-auto md:mx-0">
              <ScoreGauge score={result.overall} preliminary={psiPending} />
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <VerdictLine result={result} />

              <StatusTiles
                passed={passed}
                warnings={warnings.length}
                critical={critical.length}
              />

              {/* Provenance line. Fills the space the gauge column left under
                  the tiles, and says how much work is behind the number —
                  which is the thing that makes a score credible. */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t-1.5 border-ink/10">
                <p className="font-sans text-[13px] text-stone pt-2">
                  {result.categories.flatMap((c) => c.checks).length} things checked across{' '}
                  {result.categories.length} areas
                  {result.meta.durationMs > 0 && ` · took ${(result.meta.durationMs / 1000).toFixed(1)} seconds`}
                </p>
                {psiPending && (
                  <p className="font-sans text-[13px] text-stone inline-flex items-center gap-1.5 pt-2">
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    Google is still timing your site
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Where the weakness actually is — one glance, no scrolling. */}
        <CategoryMeters categories={result.categories} />

        {/* Core Web Vitals strip */}
        <AnimatePresence>
          {result.cwv && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-forest border-1.5 border-ink shadow-hard rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-lime" aria-hidden="true" />
                <h4 className="font-sans text-[15px] font-bold text-cream">
                  How fast your site loads
                </h4>
                <span className="font-sans text-[13px] text-cream/75">
                  {result.cwv.source === 'field'
                    ? 'Measured on real visitors, last 28 days'
                    : 'Estimated — not enough visitors yet for real data'}
                </span>
              </div>
              {/* Each metric carries its verdict word and Google's threshold,
                  so the reader learns what "good" even means here. Previously
                  it was a bare coloured number, which told someone unfamiliar
                  with Core Web Vitals nothing — and read as colour alone. */}
              <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
                {[
                  { label: 'Time to show up', name: 'Largest Contentful Paint (LCP)', value: result.cwv.lcpMs, unit: 'ms', good: 2500, poor: 4000 },
                  { label: 'Page jumping', name: 'Cumulative Layout Shift (CLS)', value: result.cwv.cls, unit: '', good: 0.1, poor: 0.25 },
                  {
                    label: result.cwv.source === 'field' ? 'Tap response' : 'Time frozen',
                    name: result.cwv.source === 'field' ? 'Interaction to Next Paint (INP)' : 'Total Blocking Time (TBT)',
                    value: result.cwv.inpMs,
                    unit: 'ms',
                    good: 200,
                    poor: 600,
                  },
                  { label: 'Server speed', name: 'Time to First Byte (TTFB)', value: result.cwv.ttfbMs, unit: 'ms', good: 800, poor: 1800 },
                ].map((m) => {
                  const status = DARK_STATUS[vitalStatus(m.value, m.good, m.poor)];
                  const fmt = (v: number) =>
                    m.unit === 'ms' && v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}${m.unit}`;

                  return (
                    <div key={m.label} className="min-w-0">
                      <dt className="font-sans text-[13px] font-bold text-cream/75 truncate">
                        <abbr title={m.name} className="no-underline">
                          {m.label}
                        </abbr>
                      </dt>
                      <dd className="mt-0.5">
                        <span
                          className="font-display font-black text-xl leading-none block"
                          style={{ color: status.fill }}
                        >
                          {m.value == null ? '—' : fmt(m.value)}
                        </span>
                        <span className="flex items-center gap-1.5 mt-1.5">
                          <span
                            className="shrink-0 w-2 h-2 rounded-full"
                            style={{ backgroundColor: status.fill }}
                            aria-hidden="true"
                          />
                          <span className="font-sans text-[13px] font-bold text-cream">
                            {status.word}
                          </span>
                        </span>
                        {m.value != null && (
                          <span className="block font-mono text-[12px] text-cream/75 mt-1">
                            good is {fmt(m.good)} or less
                          </span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {result.categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>

        <AuditLeadForm result={result} selectedGoal={selectedGoal} onGoalSelect={onGoalSelect} />

        <p className="font-sans text-[13px] text-stone leading-relaxed text-center max-w-2xl mx-auto">
          Everything above was measured on {result.domain} just now, not estimated. Speed comes
          straight from Google. If we couldn't measure something, we say so rather than guess.
        </p>
      </motion.div>
    );
  }

  return null;
}
