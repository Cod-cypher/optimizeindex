/**
 * /towing-jobs — layout only.
 *
 * Content comes entirely from src/content/towingJobs.ts, matching the split
 * used by the pillar and state pages: it is what lets this page reuse the same
 * section renderer and lets scripts/verify-seo.ts compare all towing pages
 * against each other for templated-content drift.
 *
 * The H1 is "How to Get More Towing Jobs" and must stay character-identical to
 * the leading clause of the title in routes.ts — verify-seo.ts asserts the two
 * match on this page, so the styled <span> below is spaced with explicit {' '}
 * to keep the rendered text exact.
 */

import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import FaqSection from '../components/FaqSection';
import TowingJobsLeadForm from '../components/towing/TowingJobsLeadForm';
import { TOWING_JOBS, JOB_SOURCE_LABELS } from '../content/towingJobs';
import { TOWING_STATES, TOWING_UPDATED } from '../content/towing';
import { TOWING_JOBS_CLUSTER } from '../content/towingJobsCluster';
import { TOWING_BASE, PROUDLY_SERVING, TOWING_JOBS_PATH } from '../routes';
import {
  AuditLink,
  CallLink,
  SectionBlock,
  SourceList,
  TowingLayout,
  UpdatedStamp,
} from './towingShared';

/**
 * Which pillar section hands off to which supporting page.
 *
 * Anchor text is varied per link rather than repeating one exact-match phrase,
 * for the reason documented at TowingPillarPage.tsx:156-159.
 */
const CLUSTER_LINKS: Record<string, { lead: string; anchor: string; href: string }> = {
  commercial: {
    lead: 'This is the channel that is sold rather than searched, and it has its own process:',
    anchor: 'winning commercial and fleet accounts',
    href: '/towing-jobs/commercial-towing-accounts',
  },
  'direct-calls': {
    lead: 'For what to actually configure, and what to count afterwards, see',
    anchor: 'the cash-call playbook',
    href: '/towing-jobs/more-direct-towing-calls',
  },
  'motor-club': {
    lead: 'Weighing whether network dispatch earns its place on your board?',
    anchor: 'We go through the trade-offs in detail',
    href: '/towing-jobs/motor-club-towing',
  },
  'load-boards': {
    lead: 'Paying a third party for calls is a different question again:',
    anchor: 'whether bought towing leads are worth it',
    href: '/towing-jobs/paid-towing-leads',
  },
};

export default function TowingJobsPage() {
  const navigate = useNavigate();

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    window.scrollTo({ top: 0 });
  };

  return (
    <TowingLayout>
      {/* Hero */}
      <section className="bg-cream border-b-1.5 border-ink px-6 md:px-12 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:24px_24px]" />
        {/* Two columns on desktop, stacked on mobile. Widened from max-w-4xl
            only here, to give the assessment form a real column beside the
            copy; every section below keeps the original measure. */}
        <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_minmax(0,25rem)] gap-10 lg:gap-14 lg:items-start">
          <div>
          {/* Breadcrumb, mirroring the BreadcrumbList JSON-LD in routes.ts. */}
          <nav aria-label="Breadcrumb" className="font-mono text-[11px] uppercase tracking-widest">
            <ol className="flex flex-wrap items-center gap-2 text-stone">
              <li>
                <a href="/" onClick={go('/')} className="hover:text-ink underline focus-ring">
                  Home
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <a
                  href={TOWING_BASE}
                  onClick={go(TOWING_BASE)}
                  className="hover:text-ink underline focus-ring"
                >
                  Towing Companies
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-ink font-bold" aria-current="page">
                Towing Jobs
              </li>
            </ol>
          </nav>

          <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-ink tracking-tight mt-5 leading-[1.05]">
            How to Get More{' '}
            <span className="font-serif-accent italic text-lime bg-ink px-3 py-1 rounded-sm shadow-hard inline-block -rotate-1">
              Towing Jobs
            </span>
          </h1>

          <p className="font-sans text-lg md:text-xl text-stone leading-relaxed mt-6">
            {TOWING_JOBS.lede}
          </p>

          <p className="font-sans text-base text-ink font-bold leading-relaxed mt-5 border-l-4 border-lime pl-4">
            Find out where your next towing opportunities could come from — and whether more direct
            customer calls are realistic in your market.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <CallLink label="Call us" source="jobs-hero" />
            <AuditLink label="Free visibility check" />
          </div>

          <div className="mt-6">
            <UpdatedStamp date={TOWING_UPDATED} />
          </div>
          </div>

          {/* The form is an addition to the hero, not a replacement for the
              tap-to-call above it — towing is still a phone business, and the
              existing CTAs keep their position. */}
          <div>
            <TowingJobsLeadForm />
          </div>
        </div>
      </section>

      {/* The mix. This is the page's argument in one screen: six channels, with
          the "who controls the rate" column doing the work. */}
      <section className="bg-forest border-b-1.5 border-ink px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-cream tracking-tight leading-tight">
            Six places towing work comes from
          </h2>
          <p className="font-sans text-cream/80 leading-relaxed mt-4 text-base md:text-lg">
            You apply for some, you sell your way into others, and exactly one is won by being
            found. Direct consumer work, the first row below, is where the operator generally has the
            most control over pricing, and the only one an agency can honestly claim to affect.
          </p>

          {/* Wide table, so it scrolls inside its own container rather than
              forcing the page body sideways on a phone. */}
          <div className="mt-8 overflow-x-auto border-1.5 border-cream/25 rounded-xl">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <caption className="sr-only">
                The six sources of towing work, how an operator gets into each, and who controls
                the rate.
              </caption>
              <thead>
                <tr className="bg-ink/40">
                  {['Source', 'How you get in', 'Who controls the rate'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="font-mono text-[10px] font-bold uppercase tracking-widest text-lime px-4 py-3 border-b border-cream/20"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOWING_JOBS.mix.map((entry) => (
                  <tr key={entry.source} className="border-b border-cream/10 last:border-b-0">
                    <th
                      scope="row"
                      className="font-display font-extrabold text-sm text-cream px-4 py-4 align-top"
                    >
                      {JOB_SOURCE_LABELS[entry.source]}
                    </th>
                    <td className="font-sans text-cream/75 text-sm px-4 py-4 align-top">
                      {entry.entry}
                    </td>
                    <td className="font-sans text-cream/75 text-sm px-4 py-4 align-top">
                      {entry.whoSetsRate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="font-sans text-cream/50 text-sm leading-relaxed mt-4">
            Rate control varies by state, county and contract — the middle column describes who
            normally sets it, not a rule that holds everywhere. The channel detail below covers the
            exceptions.
          </p>

          {/* Closes the table by saying what to do with it. Deliberately routes
              by the operator's constraint rather than declaring a winner. */}
          <p className="font-sans text-cream/90 leading-relaxed mt-6 border-l-4 border-lime pl-4">
            <strong className="font-bold text-cream">The practical takeaway:</strong> if you need
            volume, applications and marketplaces can help fill capacity; if you need recurring
            work, pursue contracts and commercial relationships; if you want more control over the
            price of the work reaching your phone, direct consumer demand is the channel where
            visibility matters most.
          </p>
        </div>
      </section>

      {/* Routing block. Placed before the channel detail on purpose: an operator
          who knows which problem they have can skip straight to the section
          that addresses it rather than reading six that mostly do not. */}
      <section className="bg-paper border-b-1.5 border-ink px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Which of these is your actual problem?
          </h2>
          <p className="font-sans text-stone leading-relaxed mt-3">
            "We need more jobs" usually turns out to be one of a few different problems, and they
            point at different channels. None of these is the right answer for everybody.
          </p>

          <dl className="mt-8 space-y-4">
            {TOWING_JOBS.decisions.map((d) => (
              <div
                key={d.problem}
                className="border-1.5 border-ink rounded-xl bg-cream p-5 shadow-hard"
              >
                <dt className="font-display font-extrabold text-base md:text-lg text-ink">
                  If {d.problem.charAt(0).toLowerCase() + d.problem.slice(1)}
                </dt>
                <dd className="font-sans text-stone text-sm md:text-base leading-relaxed mt-2">
                  {d.consider}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Body */}
      <div className="bg-cream px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto space-y-8">
          {TOWING_JOBS.sections.map((section) => (
            <Fragment key={section.id}>
              <SectionBlock section={section} />

              {/* Hand-off to the supporting page that takes this channel
                  further. Lives here rather than in the content file because
                  section detail[] renders as plain text and cannot carry a
                  link (towingShared.tsx:112-116). */}
              {CLUSTER_LINKS[section.id] && (
                <p className="font-sans text-stone leading-relaxed border-l-4 border-lime pl-4">
                  {CLUSTER_LINKS[section.id].lead}{' '}
                  <a
                    href={CLUSTER_LINKS[section.id].href}
                    onClick={go(CLUSTER_LINKS[section.id].href)}
                    id={`pillar-to-${CLUSTER_LINKS[section.id].href.split('/').pop()}`}
                    className="font-bold text-ink underline hover:text-lime focus-ring"
                  >
                    {CLUSTER_LINKS[section.id].anchor}
                  </a>
                  .
                </p>
              )}

              {/* The ladder belongs directly under the measurement answer —
                  the prose makes the argument, the table shows the gap. */}
              {section.id === 'measurement' && (
                <div className="border-1.5 border-ink rounded-2xl bg-paper p-6 md:p-9 shadow-hard">
                  <h3 className="font-display font-extrabold text-xl text-ink tracking-tight">
                    What each number is, and what it is not
                  </h3>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[38rem] border-collapse text-left">
                      <thead>
                        <tr>
                          {['Metric', 'What it is', 'What it is not'].map((h) => (
                            <th
                              key={h}
                              scope="col"
                              className="font-mono text-[10px] font-bold uppercase tracking-widest text-stone px-3 py-2 border-b-1.5 border-ink"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TOWING_JOBS.metricLadder.map((rung) => (
                          <tr key={rung.metric} className="border-b border-ink/10 last:border-b-0">
                            <th
                              scope="row"
                              className="font-display font-extrabold text-sm text-ink px-3 py-3 align-top whitespace-nowrap"
                            >
                              {rung.metric}
                            </th>
                            <td className="font-sans text-stone text-sm px-3 py-3 align-top">
                              {rung.whatItIs}
                            </td>
                            <td className="font-sans text-stone text-sm px-3 py-3 align-top">
                              {rung.caveat}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Fragment>
          ))}

          {TOWING_JOBS.sources.length > 0 && <SourceList sources={TOWING_JOBS.sources} />}
        </div>
      </div>

      {/* The hub block. This page stays the parent: it compares the channels in
          breadth, and each card hands off to the page that takes one of them
          further. Driven by TOWING_JOBS_CLUSTER so a new guide appears here the
          moment it is added, rather than needing a second edit that gets
          forgotten. */}
      <section className="bg-paper border-y-1.5 border-ink px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Go deeper on one channel
          </h2>
          <p className="font-sans text-stone leading-relaxed mt-3">
            This page compares the six sources of towing work side by side. Each guide below takes
            one of them and covers what to actually do — who to approach, what to configure, and
            what to measure afterwards.
          </p>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {TOWING_JOBS_CLUSTER.map((c) => {
              const href = `${TOWING_JOBS_PATH}/${c.slug}`;
              return (
                <li key={c.slug}>
                  <a
                    href={href}
                    onClick={go(href)}
                    id={`towing-jobs-hub-${c.slug}`}
                    aria-label={`Read the guide: ${c.h1}`}
                    className="group h-full flex flex-col border-1.5 border-ink rounded-xl bg-cream p-5 shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all focus-ring"
                  >
                    <span className="font-display font-extrabold text-lg text-ink leading-snug">
                      {c.h1}
                    </span>
                    <span className="block flex-1 font-sans text-stone text-sm leading-relaxed mt-2">
                      {c.description}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-ink mt-4 pt-3 border-t border-ink/10">
                      Read the guide
                      <ArrowRight
                        className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <FaqSection
        heading="Getting more towing work, answered"
        faqs={TOWING_JOBS.faqs}
        tone="light"
        id="towing-jobs-faq"
      />

      {/* Into the rest of the cluster. This page is a hub in its own right — it
          is the natural entry point for an operator who has not yet decided
          they want an agency at all. */}
      <section className="bg-paper border-y-1.5 border-ink px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Where the rules actually differ
          </h2>
          <p className="font-sans text-stone leading-relaxed mt-3">
            Who caps your rates, which agency runs the rotation, where the freight runs and whether
            winter or storm season drives your peak — none of that is national. We cover it state by
            state, and the{' '}
            <a
              href={TOWING_BASE}
              onClick={go(TOWING_BASE)}
              className="font-bold text-ink underline hover:text-lime focus-ring"
            >
              national towing overview
            </a>{' '}
            covers the profile, review and AI-answer work that turns visibility into direct calls.
          </p>

          <ul className="flex flex-wrap gap-3 mt-7">
            {TOWING_STATES.map((s) => {
              const href = `${TOWING_BASE}/${s.slug}`;
              return (
                <li key={s.slug}>
                  <a
                    href={href}
                    onClick={go(href)}
                    id={`jobs-state-${s.slug}`}
                    className="inline-block px-4 py-2 bg-cream border-1.5 border-ink rounded-full font-mono text-[11px] font-bold uppercase text-ink shadow-hard hover:shadow-hard-hover transition-all focus-ring"
                  >
                    {s.state}
                  </a>
                </li>
              );
            })}
          </ul>

          <p className="font-sans text-stone text-sm mt-6">
            Every market we work in is listed on the{' '}
            <a
              href={PROUDLY_SERVING}
              onClick={go(PROUDLY_SERVING)}
              className="font-bold text-ink underline hover:text-lime focus-ring"
            >
              Proudly Serving page
            </a>
            .
          </p>
        </div>
      </section>

      <section className="bg-forest px-6 md:px-12 py-16 border-t-1.5 border-ink">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-black text-3xl md:text-4xl text-cream tracking-tight leading-tight">
            Find out whether your market is leaving direct towing calls on the table
          </h2>
          <p className="font-sans text-cream/75 leading-relaxed mt-4">
            The first step is not a pitch, it is a look at the one channel visibility affects. We
            will check how your Google Business Profile appears, where you stand on reviews against
            nearby operators, and how AI assistants describe your business — and tell you honestly
            if visibility is not the thing holding your mix back. No contract.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <CallLink label="Call now" source="jobs-footer" tone="dark" />
            <AuditLink label="Run the free check" />
          </div>
          <p className="font-sans text-cream/50 text-sm mt-6">
            We do not dispatch, broker or sell towing jobs, and we do not guarantee calls.
          </p>
        </div>
      </section>
    </TowingLayout>
  );
}
