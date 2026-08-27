/**
 * /towing-companies — the national towing pillar.
 *
 * Content comes entirely from src/content/towing.ts; this file is layout only.
 * That split is what lets the state pages reuse the same section renderer and
 * lets scripts/verify-seo.ts compare the pages against each other for
 * templated-content drift.
 */

import { useNavigate } from 'react-router-dom';
import FaqSection from '../components/FaqSection';
import {
  TOWING_PILLAR,
  TOWING_STATES,
  TOWING_UPDATED,
  SERVICE_LABELS,
  DEMAND_LABELS,
} from '../content/towing';
import { TOWING_BASE } from '../routes';
import {
  AuditLink,
  CallLink,
  SectionBlock,
  SourceList,
  TowingLayout,
  UpdatedStamp,
} from './towingShared';

export default function TowingPillarPage() {
  const navigate = useNavigate();

  return (
    <TowingLayout>
      {/* Hero. The H1 carries the brand voice; the <title> in routes.ts carries
          the search terms. head.ts keeps the two independent on purpose. */}
      <section className="bg-cream border-b-1.5 border-ink px-6 md:px-12 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-stone flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lime border border-ink animate-pulse" />
            Towing &amp; recovery operators
          </span>

          <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-ink tracking-tight mt-4 leading-[1.05]">
            Proudly Serving{' '}
            <span className="font-serif-accent italic text-lime bg-ink px-3 py-1 rounded-sm shadow-hard inline-block -rotate-1">
              Towing
            </span>{' '}
            Companies
          </h1>

          <p className="font-sans text-lg md:text-xl text-stone leading-relaxed mt-6">
            {TOWING_PILLAR.intro}
          </p>

          {/* Tap-to-call above the fold. Towing is a phone business — burying
              the number under a form would be optimising for the wrong verb. */}
          <div className="flex flex-wrap gap-3 mt-8">
            <CallLink label="Call us" source="pillar-hero" />
            <AuditLink label="Free visibility check" />
          </div>

          <div className="mt-6">
            <UpdatedStamp date={TOWING_UPDATED} />
          </div>
        </div>
      </section>

      {/* The funnel this whole vertical is built around. Stated plainly because
          it is the actual differentiator against agencies reporting rankings. */}
      <section className="bg-forest border-b-1.5 border-ink px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-cream tracking-tight leading-tight">
            We measure tow calls, not traffic
          </h2>
          <p className="font-sans text-cream/80 leading-relaxed mt-4 text-base md:text-lg">
            A towing company gets paid for tows. So the chain we report on runs impressions →
            clicks → calls → booked tows → revenue, and we name where each number comes from.
            Impressions and clicks come from Google Search Console. Calls come from your phone
            system and our own click tracking. Booked tows and revenue come from your dispatch
            records — we will say so rather than quietly presenting your numbers as ours.
          </p>
          <p className="font-sans text-cream/60 leading-relaxed mt-4 text-sm">
            A tap on a phone number is not the same thing as an answered call, and we do not
            report it as one. Connecting the two properly needs call tracking with dynamic number
            insertion, which we will set up if the volume justifies it.
          </p>
        </div>
      </section>

      {/* Body */}
      <div className="bg-cream px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto space-y-8">
          {TOWING_PILLAR.sections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              eyebrow={
                section.service
                  ? SERVICE_LABELS[section.service]
                  : section.demand
                    ? DEMAND_LABELS[section.demand]
                    : undefined
              }
            />
          ))}

          {TOWING_PILLAR.sources && TOWING_PILLAR.sources.length > 0 && (
            <SourceList sources={TOWING_PILLAR.sources} />
          )}
        </div>
      </div>

      {/* State cluster. Internal links are what make these six pages read as one
          topic rather than six orphans. */}
      <section className="bg-paper border-y-1.5 border-ink px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
            Towing markets we write about by state
          </h2>
          <p className="font-sans text-stone leading-relaxed mt-3">
            Towing economics genuinely differ by state — who sets your rates, where the freight
            runs, whether winter or storm season drives the peak. These pages cover what changes.
          </p>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {TOWING_STATES.map((s) => {
              const href = `${TOWING_BASE}/${s.slug}`;
              return (
                <li key={s.slug}>
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(href);
                      window.scrollTo({ top: 0 });
                    }}
                    id={`towing-state-link-${s.slug}`}
                    className="block border-1.5 border-ink rounded-xl bg-cream p-5 shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all focus-ring"
                  >
                    <span className="font-display font-extrabold text-lg text-ink">
                      Towing company marketing in {s.state}
                    </span>
                    <span className="block font-sans text-stone text-sm leading-relaxed mt-1.5">
                      {s.metros.slice(0, 4).join(', ')} and statewide.
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <FaqSection
        heading="Towing marketing questions, answered"
        faqs={TOWING_PILLAR.faqs}
        tone="light"
        id="towing-faq"
      />

      <section className="bg-forest px-6 md:px-12 py-16 border-t-1.5 border-ink">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-black text-3xl md:text-4xl text-cream tracking-tight leading-tight">
            Find out what your operation looks like on Google
          </h2>
          <p className="font-sans text-cream/75 leading-relaxed mt-4">
            Call and we will look at your Google Business Profile, your reviews and how AI
            assistants describe you while you are on the phone. No contract, and a 15-day
            money-back guarantee on anything you go on to buy.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <CallLink label="Call now" source="pillar-footer" tone="dark" />
            <AuditLink label="Run the free check" />
          </div>
        </div>
      </section>
    </TowingLayout>
  );
}
