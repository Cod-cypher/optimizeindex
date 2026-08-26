/**
 * The page a prospect opens — usually on a phone, from a text message, between
 * jobs.
 *
 * Built as five beats, in this order, and nothing else:
 *
 *   1. The opportunity   — who this is for, and the number
 *   2. Where it comes from — how customers find them today
 *   3. What we'll do      — the plan, in plain language
 *   4. What it could mean — revenue, only when there is a real figure behind it
 *   5. Next step          — one CTA
 *
 * Two rules govern everything here.
 *
 * The first is that the number is the page. An owner-operator scrolling this at
 * a truck stop has about five seconds of patience, so "+15 calls a month" is the
 * largest thing on the screen and everything else supports it.
 *
 * The second is that nothing is invented. Every section is conditional on data
 * the admin actually entered — no placeholder statistics, no filler cards, no
 * revenue figure without a stated average job value, and no projection at all
 * without a written basis. A section with no data does not render.
 *
 * Prospect-facing copy deliberately avoids the vocabulary used in the admin
 * ("projected calls", "deliverables", "investment"). The person reading this
 * runs trucks, not marketing campaigns.
 */

import { useEffect, useRef, useState } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { Button, ButtonLink } from '../portal/ui';
import type { PublicProposal } from '../../shared/proposalTypes';
import { initProposalTracking, trackProposalEvent } from './tracking';

export default function ProposalPage({
  proposal,
  preview = false,
}: {
  proposal: PublicProposal;
  /** Rendered inside the admin editor. Suppresses tracking and the sticky bar. */
  preview?: boolean;
}) {
  useEffect(() => {
    if (preview) return;
    document.title = `${proposal.companyName} — more calls | OptimizeIndex`;
    return initProposalTracking(proposal.slug);
  }, [proposal.slug, proposal.companyName, preview]);

  const lift = growthLift(proposal);
  const track = (name: string, label?: string) => {
    if (!preview) trackProposalEvent(proposal.slug, name, label);
  };

  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* The real site header. A prospect should be able to go and read the
          case studies from here like anyone else — the stripped-down bar this
          replaced made the page feel like an emailed document rather than part
          of the business. Who the page is for is said by the H1 below, not
          duplicated up here. */}
      <SiteNav />
      <Hero proposal={proposal} lift={lift} />
      <WhereTheyFindYou proposal={proposal} />
      <WhatWeWillDo proposal={proposal} />
      <WhatItCouldMean proposal={proposal} lift={lift} />
      <NextStep proposal={proposal} track={track} preview={preview} />
      <SiteFooter />
      {/* Clears the sticky mobile bar so the footer's last line is never covered. */}
      <div className="h-20 md:hidden" aria-hidden="true" />
      {!preview && <StickyCta proposal={proposal} track={track} />}
    </div>
  );
}

/* =========================================================================
   Derived values
========================================================================= */

interface Lift {
  current: number;
  projected: number;
  extra: number;
  percent: number;
}

/**
 * Returns null unless there is a real, positive, well-founded increase to show.
 * A projection that is not higher than today is not an opportunity, and one
 * without a stated basis is a fabricated statistic.
 */
function growthLift(p: PublicProposal): Lift | null {
  if (p.currentCalls == null || p.projectedCalls == null) return null;
  if (p.currentCalls <= 0 || p.projectedCalls <= p.currentCalls) return null;
  if (!p.projectionBasis) return null;

  const extra = p.projectedCalls - p.currentCalls;
  return {
    current: p.currentCalls,
    projected: p.projectedCalls,
    extra,
    percent: Math.round((extra / p.currentCalls) * 100),
  };
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/* =========================================================================
   Primitives
========================================================================= */

const SHELL = 'mx-auto w-full max-w-5xl px-5 sm:px-6 lg:px-10';

const CONTACT_EMAIL = 'contact@optimizeindex.com';

/** A mailto that arrives pre-identified, so nobody has to explain who they are. */
function emailHref(proposal: PublicProposal): string {
  const subject = `${proposal.companyName} — about the proposal`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Fades content up as it enters the viewport.
 *
 * Hand-rolled on IntersectionObserver rather than pulling in the site's
 * animation library — this page is a separate lazy chunk, and importing
 * `motion` for one fade would add ~97 KB to a document people open on mobile
 * data. Content is visible from the start if motion is reduced or the observer
 * is unavailable, so nothing depends on the animation running.
 */
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(14px)',
        transition: `opacity .5s ease ${delay}ms, transform .5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Counts up to `value` once on screen. Falls back to the final number. */
function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setShown(value);
      return;
    }
    const node = ref.current;
    if (!node) return;

    setShown(0);
    let frame = 0;
    let start = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        const step = (now: number) => {
          if (!start) start = now;
          const t = Math.min(1, (now - start) / 850);
          setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
          if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {shown}
    </span>
  );
}

function Eyebrow({ children, tone = 'dark' }: { children: React.ReactNode; tone?: 'dark' | 'light' }) {
  return (
    <p
      className={`font-mono text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] flex items-center gap-1.5 ${
        tone === 'light' ? 'text-lime' : 'text-stone'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-lime border border-ink shrink-0" />
      {children}
    </p>
  );
}

function Section({
  id,
  eyebrow,
  title,
  tone = 'cream',
  children,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  tone?: 'cream' | 'paper' | 'ink';
  children: React.ReactNode;
}) {
  const tones = {
    cream: 'bg-cream text-ink',
    paper: 'bg-paper text-ink border-y-1.5 border-ink',
    ink: 'bg-ink text-cream',
  } as const;

  return (
    <section id={id} className={`${tones[tone]} py-14 sm:py-20 lg:py-24 scroll-mt-24`}>
      <div className={SHELL}>
        {eyebrow && <Eyebrow tone={tone === 'ink' ? 'light' : 'dark'}>{eyebrow}</Eyebrow>}
        {title && (
          <h2
            className={`font-display font-extrabold tracking-tight mt-3 mb-8 sm:mb-10 text-[28px] leading-[1.1] sm:text-4xl lg:text-[42px] ${
              tone === 'ink' ? 'text-cream' : 'text-ink'
            }`}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </section>
  );
}

/* =========================================================================
   1 — The opportunity
========================================================================= */

function Hero({ proposal, lift }: { proposal: PublicProposal; lift: Lift | null }) {
  /*
    Only the facts that make them believe we actually looked, capped at three.
    Listing everything on file turns the proof line into a data dump and wraps to
    three lines on a phone, pushing the number below the fold — which is the one
    thing this layout cannot afford.
  */
  const facts = (
    [
      proposal.city && proposal.state ? `${proposal.city}, ${proposal.state}` : proposal.city,
      proposal.serviceRadius != null ? `${proposal.serviceRadius} mile radius` : null,
      proposal.fleetSize != null ? `${proposal.fleetSize} trucks` : null,
      // All the equipment in one chip. Split into separate chips it got
      // truncated to whichever type happened to be first, which reads as us
      // having missed the rest of what they run.
      proposal.truckTypes?.length ? proposal.truckTypes.join(', ') : null,
    ].filter(Boolean) as string[]
  ).slice(0, 4);

  return (
    <header className="bg-cream pt-8 pb-12 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20">
      <div className={SHELL}>
        <Reveal>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-stone">
            Prepared for
          </p>
          <h1 className="font-display font-extrabold text-ink tracking-tight leading-[1.02] text-[36px] sm:text-5xl lg:text-6xl mt-2">
            {proposal.companyName}
          </h1>
          {facts.length > 0 && (
            /*
              One chip per fact, in sans at a readable size. This was a single
              mono uppercase line with dot separators — dense, shouty, and the
              hardest thing on the page to read at arm's length, which is a poor
              use of the line that proves we looked at their business.
            */
            <ul className="flex flex-wrap gap-2 mt-4">
              {facts.map((f) => (
                <li
                  key={f}
                  className="font-sans text-[14px] sm:text-[15px] text-ink bg-paper border-1.5 border-ink/25 rounded-full px-3.5 py-1.5"
                >
                  {f}
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        {/*
          Photo and number sit in one row from `lg` up, and stack on a phone.
          Stacked at every width, a 21:9 truck photo eats the entire desktop
          fold and pushes the number — the only thing on this page that has to
          be seen — below it. Side by side they balance, and both land in the
          first screen.

          DOM order is photo-then-number so the phone reads the way the link is
          received: their truck, then their number. `order` flips it on desktop,
          where the number leads and the photo supports.
        */}
        <div
          className={`mt-6 sm:mt-8 grid gap-5 lg:gap-6 items-stretch ${
            proposal.heroImageUrl && lift ? 'lg:grid-cols-[1.05fr_0.95fr]' : ''
          }`}
        >
          {proposal.heroImageUrl && (
            <Reveal delay={80} className="order-1 lg:order-2">
              <img
                src={proposal.heroImageUrl}
                alt={proposal.companyName}
                className={`w-full object-cover rounded-2xl border-2 border-ink shadow-hard-lg ${
                  lift
                    ? 'aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-[380px]'
                    : 'aspect-[16/9] sm:aspect-[21/9]'
                }`}
              />
            </Reveal>
          )}

          {lift ? (
            <Reveal delay={140} className="order-2 lg:order-1 flex flex-col">
              <OpportunityBlock lift={lift} months={proposal.timeframeMonths} />
            </Reveal>
          ) : (
            <Reveal delay={140} className="order-2">
              <p className="font-display font-extrabold text-2xl sm:text-3xl text-ink tracking-tight max-w-2xl leading-tight mt-2">
                We looked at how customers find you, and put together a plan to get you in front of
                more of them.
              </p>
            </Reveal>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * The number, at the size it deserves.
 *
 * `+15 calls / month` is the whole message of the page, so it is the biggest
 * element on every breakpoint. The today → potential pair sits underneath as
 * the evidence, not the headline: a trucker does not need to do arithmetic to
 * find out what is on offer.
 */
function OpportunityBlock({ lift, months }: { lift: Lift; months: number | null }) {
  return (
    <div className="bg-forest border-2 border-ink rounded-2xl shadow-hard-lg overflow-hidden flex-1 flex flex-col">
      <div className="px-5 sm:px-8 lg:px-9 pt-7 sm:pt-9 pb-6 sm:pb-8 flex-1">
        <p className="font-mono text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] text-lime">
          You could be getting
        </p>

        <div className="flex items-end gap-3 sm:gap-5 mt-2 sm:mt-3 flex-wrap">
          <span className="font-display font-extrabold text-lime leading-[0.85] tracking-tight text-[86px] sm:text-[130px] lg:text-[150px]">
            +<CountUp value={lift.extra} />
          </span>
          <span className="font-display font-extrabold text-cream text-xl sm:text-3xl leading-tight pb-2 sm:pb-4">
            more calls
            <br className="hidden sm:block" /> a month
          </span>
        </div>

        <p className="font-mono text-xs sm:text-sm text-cream/70 mt-1">
          that&rsquo;s {lift.percent}% more than today
          {months != null && ` · targeted within ${months} month${months === 1 ? '' : 's'}`}
        </p>
      </div>

      {/* Evidence row */}
      <div className="grid grid-cols-2 border-t-1.5 border-cream/15">
        <Figure label="Average calls this month" value={lift.current} />
        <div className="border-l-1.5 border-cream/15">
          <Figure label="Could be" value={lift.projected} highlight />
        </div>
      </div>
    </div>
  );
}

function Figure({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="px-5 sm:px-8 lg:px-10 py-5 sm:py-6">
      <p className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-cream/50 leading-tight min-h-[2.2em]">
        {label}
      </p>
      <p
        className={`font-display font-extrabold tracking-tight text-4xl sm:text-5xl mt-1 ${
          highlight ? 'text-lime' : 'text-cream'
        }`}
      >
        {value}
      </p>
      <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-cream/40">
        calls / mo
      </p>
    </div>
  );
}

/* =========================================================================
   2 — Where the opportunity comes from
========================================================================= */

function WhereTheyFindYou({ proposal }: { proposal: PublicProposal }) {
  const sources = (proposal.callSources ?? []).filter((s) => s.source?.trim());
  if (sources.length === 0 && !proposal.currentNotes) return null;

  const hasBars = sources.some((s) => s.share != null || s.calls != null);

  return (
    <Section
      id="how"
      tone="paper"
      eyebrow="Where you are today"
      title="How customers find you now"
    >
      {sources.length > 0 && (
        <ul className="space-y-4 sm:space-y-5">
          {sources.map((s, i) => {
            const pct = s.share != null ? Math.max(0, Math.min(100, s.share)) : null;
            return (
              <Reveal key={`${s.source}-${i}`} delay={i * 60}>
                <li>
                  <div className="flex items-baseline justify-between gap-4 mb-2">
                    <span className="font-display font-extrabold text-lg sm:text-xl text-ink">
                      {s.source}
                    </span>
                    {(s.calls != null || pct != null) && (
                      <span className="font-mono text-sm font-bold text-ink shrink-0">
                        {s.calls != null ? `${s.calls}/mo` : `${pct}%`}
                      </span>
                    )}
                  </div>
                  {pct != null && (
                    <div className="h-3.5 bg-cream border-1.5 border-ink rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime rounded-full"
                        style={{ width: `${pct}%`, transition: 'width .7s ease' }}
                      />
                    </div>
                  )}
                  {s.note && (
                    <p className="text-[15px] text-stone mt-2 leading-relaxed">{s.note}</p>
                  )}
                </li>
              </Reveal>
            );
          })}
        </ul>
      )}

      {proposal.currentNotes && (
        <Reveal delay={sources.length * 60}>
          {/*
            This is the "we actually looked at your business" paragraph — the
            most persuasive text on the page. As plain body copy it read like a
            disclaimer, so it gets a card, a marker and a label.
          */}
          <div className={`${hasBars ? 'mt-10' : ''} max-w-2xl`}>
            <div className="flex items-start gap-4 bg-cream border-2 border-ink rounded-2xl shadow-hard p-5 sm:p-6">
              <span
                aria-hidden="true"
                className="shrink-0 w-10 h-10 rounded-full bg-ink text-lime flex items-center justify-center"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.2-3.2" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-stone mb-2">
                  What we found
                </p>
                <p className="font-sans text-lg sm:text-xl text-ink leading-relaxed whitespace-pre-line">
                  {proposal.currentNotes}
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      )}
    </Section>
  );
}

/* =========================================================================
   3 — What we'll do
========================================================================= */

function WhatWeWillDo({ proposal }: { proposal: PublicProposal }) {
  const phases = (proposal.phases ?? []).filter((p) => p.title?.trim());
  const deliverables = (proposal.deliverables ?? []).filter((d) => d?.trim());
  const extras = (proposal.customSections ?? []).filter((s) => s.heading?.trim() || s.body?.trim());

  if (phases.length === 0 && deliverables.length === 0 && extras.length === 0) return null;

  return (
    <Section eyebrow="The plan" title="What we&rsquo;ll do">
      {phases.length > 0 && (
        <ol className="grid gap-4 sm:gap-5 sm:grid-cols-2">
          {phases.map((phase, i) => (
            <Reveal key={`${phase.title}-${i}`} delay={i * 70}>
              <li className="h-full bg-paper border-2 border-ink rounded-2xl shadow-hard p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="font-mono text-xs font-bold text-lime bg-ink rounded-full px-2.5 py-1">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {phase.timeline && (
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone">
                      {phase.timeline}
                    </span>
                  )}
                </div>
                <h3 className="font-display font-extrabold text-xl sm:text-2xl text-ink tracking-tight leading-tight">
                  {phase.title}
                </h3>
                {phase.items?.filter((it) => it?.trim()).length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {phase.items
                      .filter((it) => it?.trim())
                      .map((item, j) => (
                        <li key={j} className="flex gap-2.5 text-[15px] text-stone leading-relaxed">
                          <span
                            aria-hidden="true"
                            className="w-1.5 h-1.5 rounded-full bg-lime border border-ink mt-2 shrink-0"
                          />
                          {item}
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            </Reveal>
          ))}
        </ol>
      )}

      {deliverables.length > 0 && (
        <Reveal>
          <div className={phases.length > 0 ? 'mt-10 sm:mt-12' : ''}>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-stone mb-4">
              You also get
            </p>
            <ul className="flex flex-wrap gap-2.5">
              {deliverables.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 bg-paper border-1.5 border-ink rounded-full pl-2.5 pr-4 py-2 text-[15px] text-ink"
                >
                  <span
                    aria-hidden="true"
                    className="font-mono text-[10px] text-lime bg-ink rounded-full w-5 h-5 flex items-center justify-center shrink-0"
                  >
                    ✓
                  </span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}

      {extras.map((s, i) => (
        <Reveal key={`${s.heading}-${i}`}>
          <div className="mt-10 sm:mt-12 max-w-2xl">
            {s.heading && (
              <h3 className="font-display font-extrabold text-xl sm:text-2xl text-ink tracking-tight mb-2">
                {s.heading}
              </h3>
            )}
            {s.body && (
              <p className="font-sans text-lg text-ink/85 leading-relaxed whitespace-pre-line">
                {s.body}
              </p>
            )}
          </div>
        </Reveal>
      ))}
    </Section>
  );
}

/* =========================================================================
   4 — What this could mean
========================================================================= */

function WhatItCouldMean({ proposal, lift }: { proposal: PublicProposal; lift: Lift | null }) {
  const showMoney = lift != null && proposal.avgJobValue != null && proposal.avgJobValue > 0;
  const showPrice = proposal.monthlyPrice != null;

  // Nothing to say without a projection or a price — skip rather than pad.
  if (!lift && !showPrice) return null;

  return (
    <Section tone="ink" eyebrow="What it could mean" title={lift ? `What ${lift.extra} more calls could mean` : 'What it takes'}>
      <div className="grid gap-5 lg:grid-cols-2 items-start">
        {lift && (
          <Reveal>
            <div className="bg-forest border-2 border-ink rounded-2xl p-6 sm:p-8">
              <p className="font-display font-extrabold text-lime text-6xl sm:text-7xl leading-none tracking-tight">
                +{lift.extra}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-wider text-cream/60 mt-2">
                potential calls / month
              </p>

              {showMoney && (
                <div className="mt-6 pt-6 border-t-1.5 border-cream/15">
                  <p className="font-display font-extrabold text-cream text-3xl sm:text-4xl tracking-tight">
                    ≈ {formatMoney(lift.extra * proposal.avgJobValue!)}
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-cream/60 mt-2">
                    potential additional booked work / month
                  </p>
                  {/* Never a promise. States its own arithmetic. */}
                  <p className="text-[13px] text-cream/45 mt-3 leading-relaxed">
                    An estimate: {lift.extra} calls × the {formatMoney(proposal.avgJobValue!)} average
                    job value you gave us. Not a guarantee.
                  </p>
                </div>
              )}
            </div>
          </Reveal>
        )}

        <Reveal delay={80}>
          <div className="space-y-5">
            {/* The basis sits here, at full size, in the prospect's own words —
                never as small print under the headline number. */}
            {lift && proposal.projectionBasis && (
              <div className="bg-ink border-1.5 border-cream/20 rounded-2xl p-6">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-lime mb-3">
                  Where that number comes from
                </p>
                <p className="font-sans text-[17px] text-cream leading-relaxed">
                  {proposal.projectionBasis}
                </p>
              </div>
            )}

            {showPrice && (
              <div className="bg-ink border-1.5 border-cream/20 rounded-2xl p-6">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-lime mb-3">
                  What it takes
                </p>
                <p className="font-display font-extrabold text-cream text-4xl sm:text-5xl tracking-tight leading-none">
                  {formatMoney(proposal.monthlyPrice!)}
                  <span className="font-mono text-base font-normal text-cream/50"> / mo</span>
                </p>
                <div className="mt-3 space-y-1 text-[15px] text-cream/70">
                  {proposal.setupFee != null && proposal.setupFee > 0 && (
                    <p>Plus a one-time setup of {formatMoney(proposal.setupFee)}.</p>
                  )}
                  {proposal.termMonths != null && (
                    <p className={proposal.termMonths === 0 ? 'text-lime font-semibold' : ''}>
                      {proposal.termMonths === 0
                        ? 'No contract — month to month.'
                        : `${proposal.termMonths}-month term.`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* =========================================================================
   5 — Next step
========================================================================= */

function NextStep({
  proposal,
  track,
  preview,
}: {
  proposal: PublicProposal;
  track: (name: string, label?: string) => void;
  preview: boolean;
}) {
  const [askOpen, setAskOpen] = useState(false);

  return (
    <Section id="next-step" eyebrow="Next step" title="Want to talk it through?">
      <Reveal>
        <p className="font-sans text-lg sm:text-xl text-ink/80 leading-relaxed max-w-xl mb-8">
          Drop us a line and we&rsquo;ll walk through what we found for {proposal.companyName}. You
          can decide from there — no pressure either way.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          {/* Two ways to reach a person, and nothing else. A booking link used to
              sit here too; three competing buttons made the choice harder than
              the decision they are actually being asked to make. */}
          <ButtonLink
            href={emailHref(proposal)}
            tone="lime"
            size="lg"
            onClick={() => track('email_click', 'next-step')}
            className="w-full sm:w-auto"
          >
            Send us an email &rarr;
          </ButtonLink>
          <ButtonLink
            href="tel:+12028107042"
            tone="outline"
            size="lg"
            onClick={() => track('phone_click', 'next-step')}
            className="w-full sm:w-auto"
          >
            Call 202 810 7042
          </ButtonLink>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-wider text-stone mt-6">
          No contracts · 15-day money-back guarantee · We reply within 24 hours
        </p>
      </Reveal>

      {/* Folded away by default so it does not compete with the CTA, but there
          for the prospect who has a question rather than a calendar slot. */}
      <div className="mt-10 pt-8 border-t-1.5 border-ink/12">
        {askOpen ? (
          <AskForm proposal={proposal} track={track} preview={preview} />
        ) : (
          <button
            onClick={() => setAskOpen(true)}
            className="font-sans text-[17px] text-ink underline underline-offset-4 decoration-lime decoration-2 hover:decoration-ink transition-colors focus-ring rounded"
          >
            Or send us a question instead &rarr;
          </button>
        )}
      </div>
    </Section>
  );
}

/**
 * Writes into the existing Lead table with type "proposal_reply", so it rides
 * the notification path already wired up for every other form on the site.
 */
function AskForm({
  proposal,
  track,
  preview,
}: {
  proposal: PublicProposal;
  track: (name: string, label?: string) => void;
  preview: boolean;
}) {
  const [email, setEmail] = useState(proposal.email ?? '');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) return;
    setState('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'proposal_reply',
          email,
          website: proposal.websiteUrl || `${window.location.origin}/${proposal.slug}`,
          company: proposal.companyName,
          name: proposal.contactName || '',
          comments: message,
          submittedFrom: `/${proposal.slug}`,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      track('reply_submit');
      setState('sent');
    } catch {
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <p className="font-sans text-lg text-ink leading-relaxed">
        Thanks — that&rsquo;s with us. We&rsquo;ll come back to you at <strong>{email}</strong>,
        usually the same day.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4">
      <label className="block">
        <span className="form-label">Your email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
      </label>
      <label className="block">
        <span className="form-label">Your question</span>
        <textarea
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="field"
          placeholder="Anything at all — pricing, timelines, how calls get tracked…"
        />
      </label>
      {state === 'error' && (
        <p role="alert" className="text-sm text-red-700 font-semibold">
          That didn&rsquo;t send. Call 202 810 7042 and we&rsquo;ll pick it up there.
        </p>
      )}
      <Button type="submit" tone="ink" size="lg" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send question'}
      </Button>
    </form>
  );
}

/* =========================================================================
   Chrome
========================================================================= */

/**
 * Mobile action bar.
 *
 * Appears once the opening screen is behind them and hides again at the final
 * CTA, so it never sits on top of the button it duplicates.
 */
function StickyCta({
  proposal,
  track,
}: {
  proposal: PublicProposal;
  track: (name: string, label?: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById('next-step');

    const update = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.7;
      const atFinalCta = target ? target.getBoundingClientRect().top < window.innerHeight * 0.9 : false;
      setVisible(pastHero && !atFinalCta);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Email and phone are always available, so this bar always has something to do.

  return (
    <div
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t-1.5 border-ink bg-paper/95 backdrop-blur-sm px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2"
      style={{
        transform: visible ? 'none' : 'translateY(110%)',
        transition: 'transform .25s ease',
      }}
      aria-hidden={!visible}
    >
      <ButtonLink
        href={emailHref(proposal)}
        tone="lime"
        size="md"
        className="flex-1"
        onClick={() => track('email_click', 'sticky')}
      >
        Send us an email
      </ButtonLink>
      <ButtonLink
        href="tel:+12028107042"
        tone="outline"
        size="md"
        onClick={() => track('phone_click', 'sticky')}
      >
        Call
      </ButtonLink>
    </div>
  );
}

