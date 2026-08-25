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
        body: "That domain didn't resolve. Check the spelling — or if the site is brand new, DNS may still be propagating.",
      };
    case 'UNREACHABLE':
    case 'TIMEOUT':
      return {
        title: `We couldn't reach ${domain}`,
        body: 'The site took too long to respond or refused the connection. That may be a temporary blip — or something worth looking at.',
      };
    case 'BOT_BLOCKED':
      return {
        title: `${domain} blocked our scanner`,
        body: "The site sits behind bot protection that won't let an automated check through. That's common on Cloudflare — it doesn't mean anything is wrong. We can audit it by hand instead.",
      };
    case 'BAD_STATUS':
      return {
        title: `${domain} returned an error`,
        body: err.message,
      };
    case 'RATE_LIMITED':
      return { title: "You've run a few scans already", body: err.message };
    case 'BLOCKED_HOST':
    case 'INVALID_URL':
      return { title: 'That address needs another look', body: err.message };
    case 'TOO_MANY_REDIRECTS':
      return {
        title: `${domain} redirects in a loop`,
        body: "We followed several redirects without landing anywhere. That's a real SEO problem worth fixing — chains like this bleed ranking signals.",
      };
    default:
      return {
        title: 'That scan did not complete',
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
      setInputError('Enter your website address to run the scan.');
      return;
    }
    if (!looksLikeDomain(raw)) {
      setInputError("That doesn't look like a domain. Try something like acme.com.");
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
            Enter your website — get your search health score
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
                placeholder="yourcompany.com"
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
              <span>Analyze my site</span>
            </button>
          </div>
          {inputError && (
            <p id="hero-audit-error" role="alert" className="font-mono text-[11px] text-[#B4232A] mt-2">
              {inputError}
            </p>
          )}
        </form>

        <div className="space-y-2">
          <p className="font-mono text-[10px] text-stone tracking-wide uppercase">
            Free · No signup · 24 real checks · Results in seconds
          </p>
          <p className="font-sans text-[13px] text-stone">
            Or{' '}
            <button
              type="button"
              onClick={onRequestQuote}
              id="hero-secondary-cta"
              className="underline decoration-lime decoration-2 underline-offset-2 font-semibold text-ink hover:text-forest transition-colors cursor-pointer focus-ring rounded"
            >
              get a custom quote
            </button>{' '}
            from a human instead.
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
              <span>Have us audit it manually</span>
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
        {/* Summary bar */}
        <div className="bg-cream border-1.5 border-ink shadow-hard-lg rounded-2xl p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="shrink-0 mx-auto md:mx-0">
              <ScoreGauge score={result.overall} preliminary={psiPending} />
            </div>

            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-paper border-1.5 border-ink rounded-full font-mono text-[10px] font-bold text-ink">
                  <Globe className="w-3 h-3" aria-hidden="true" />
                  {result.domain}
                </span>
                {result.meta.cached && (
                  <span className="font-mono text-[9px] uppercase tracking-widest text-stone">
                    Scanned recently · showing that result
                  </span>
                )}
              </div>

              <h3 className="font-display font-extrabold text-2xl md:text-3xl text-ink leading-tight tracking-tight">
                {critical.length > 0 ? (
                  <>
                    We found{' '}
                    <span className="font-serif-accent italic text-lime bg-ink px-2.5 py-0.5 rounded-sm shadow-hard inline-block rotate-1">
                      {critical.length} critical
                    </span>{' '}
                    issue{critical.length === 1 ? '' : 's'}.
                  </>
                ) : warnings.length > 0 ? (
                  <>
                    Solid foundations, with{' '}
                    <span className="font-serif-accent italic text-lime bg-ink px-2.5 py-0.5 rounded-sm shadow-hard inline-block rotate-1">
                      {warnings.length}
                    </span>{' '}
                    to tighten.
                  </>
                ) : (
                  <>
                    Everything we test is{' '}
                    <span className="font-serif-accent italic text-lime bg-ink px-2.5 py-0.5 rounded-sm shadow-hard inline-block rotate-1">
                      passing
                    </span>
                    .
                  </>
                )}
              </h3>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 mt-3 font-mono text-[11px] uppercase tracking-wider">
                <span className="text-forest font-bold">{passed} passing</span>
                <span className="text-stone">{warnings.length} to improve</span>
                <span className="text-[#B4232A] font-bold">{critical.length} critical</span>
              </div>

              {psiPending && (
                <p className="font-mono text-[10px] text-stone mt-3 inline-flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  Google is measuring page speed — the score updates when it lands
                </p>
              )}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={reset}
                  id="audit-scan-again"
                  className="font-mono text-[10px] uppercase tracking-widest text-stone hover:text-ink underline underline-offset-4 decoration-ink/25 hover:decoration-ink transition-colors cursor-pointer focus-ring rounded inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  Scan another site
                </button>
              </div>
            </div>
          </div>
        </div>

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
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-cream">
                  Core Web Vitals
                </h4>
                <span className="font-mono text-[9px] uppercase tracking-wider text-cream/60">
                  {result.cwv.source === 'field'
                    ? 'Real Chrome users · last 28 days'
                    : 'Lab test · not enough real-user traffic'}
                </span>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'LCP', value: result.cwv.lcpMs, unit: 'ms', good: 2500 },
                  { label: 'CLS', value: result.cwv.cls, unit: '', good: 0.1 },
                  {
                    label: result.cwv.source === 'field' ? 'INP' : 'TBT',
                    value: result.cwv.inpMs,
                    unit: 'ms',
                    good: 200,
                  },
                  { label: 'TTFB', value: result.cwv.ttfbMs, unit: 'ms', good: 800 },
                ].map((m) => (
                  <div key={m.label}>
                    <dt className="font-mono text-[9px] uppercase tracking-widest text-cream/60">
                      {m.label}
                    </dt>
                    <dd
                      className={`font-display font-black text-lg leading-tight ${
                        m.value == null
                          ? 'text-cream/60'
                          : m.value <= m.good
                            ? 'text-lime'
                            : 'text-[#FF8A8F]'
                      }`}
                    >
                      {m.value == null
                        ? 'Not measured'
                        : m.unit === 'ms' && m.value >= 1000
                          ? `${(m.value / 1000).toFixed(1)}s`
                          : `${m.value}${m.unit}`}
                    </dd>
                  </div>
                ))}
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

        <p className="font-mono text-[10px] text-stone leading-relaxed text-center max-w-2xl mx-auto">
          Every finding above was measured on {result.domain} just now — open View Source and check
          us. Speed data comes from Google PageSpeed Insights. We don't estimate anything we can't
          measure.
        </p>
      </motion.div>
    );
  }

  return null;
}
