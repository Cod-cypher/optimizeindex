/**
 * /towing-companies/<state> — one component, one entry per state.
 *
 * Everything that differs between states lives in src/content/towing.ts, so
 * adding a sixth state is a data change and nothing else. What keeps these
 * pages from being five paraphrases of one template is the content itself:
 * each state leads with a different section, in a different order, driven by
 * what actually differs about that market. scripts/verify-seo.ts reports
 * pairwise similarity across them so drift toward a template is visible.
 */

import { useNavigate } from 'react-router-dom';
import FaqSection from '../components/FaqSection';
import {
  DEMAND_LABELS,
  SERVICE_LABELS,
  TOWING_STATES,
  TOWING_UPDATED,
  type TowingState,
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

export default function TowingStatePage({ state }: { state: TowingState }) {
  const navigate = useNavigate();
  const siblings = TOWING_STATES.filter((s) => s.slug !== state.slug);

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    window.scrollTo({ top: 0 });
  };

  return (
    <TowingLayout>
      <section className="bg-cream border-b-1.5 border-ink px-6 md:px-12 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="max-w-4xl mx-auto relative z-10">
          {/* Visible breadcrumb, mirroring the BreadcrumbList in routes.ts. */}
          <nav aria-label="Breadcrumb" className="font-mono text-[11px] uppercase tracking-widest">
            <a href="/" onClick={go('/')} className="text-stone hover:text-ink focus-ring">
              Home
            </a>
            <span className="text-stone/50 px-2">/</span>
            <a
              href={TOWING_BASE}
              onClick={go(TOWING_BASE)}
              className="text-stone hover:text-ink focus-ring"
            >
              Towing Companies
            </a>
            <span className="text-stone/50 px-2">/</span>
            <span className="text-ink font-bold">{state.state}</span>
          </nav>

          <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-ink tracking-tight mt-5 leading-[1.05]">
            Proudly Serving{' '}
            <span className="font-serif-accent italic text-lime bg-ink px-3 py-1 rounded-sm shadow-hard inline-block -rotate-1">
              {state.state}
            </span>{' '}
            Towing Companies
          </h1>

          {/* The state's own paragraph. This is the single most important piece
              of differentiation on the page — it is why this is a real landing
              page and not a doorway page with a name swapped in. */}
          <p className="font-sans text-lg md:text-xl text-stone leading-relaxed mt-6">
            {state.landscape}
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <CallLink label="Call us" source={`${state.slug}-hero`} />
            <AuditLink label="Free visibility check" />
          </div>

          <div className="mt-6">
            <UpdatedStamp date={TOWING_UPDATED} />
          </div>
        </div>
      </section>

      {/* The two axes, made explicit. Naming the demand mix and the service mix
          up front is what tells a reader — and a retrieval system — what this
          particular state page is actually about. */}
      <section className="bg-forest border-b-1.5 border-ink px-6 md:px-12 py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display font-extrabold text-xl text-cream tracking-tight">
              What drives tow demand in {state.state}
            </h2>
            <ul className="mt-4 space-y-2">
              {state.demand.map((d) => (
                <li
                  key={d}
                  className="font-sans text-cream/80 text-sm leading-relaxed flex gap-2.5"
                >
                  <span className="text-lime font-mono shrink-0" aria-hidden="true">
                    ▸
                  </span>
                  {DEMAND_LABELS[d]}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-cream tracking-tight">
              What we work on for {state.state} operators
            </h2>
            <ul className="mt-4 space-y-2">
              {state.services.map((s) => (
                <li
                  key={s}
                  className="font-sans text-cream/80 text-sm leading-relaxed flex gap-2.5"
                >
                  <span className="text-lime font-mono shrink-0" aria-hidden="true">
                    ▸
                  </span>
                  {SERVICE_LABELS[s]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* The commercial bridge. Without this the page reads as an informational
          state guide — facts, more facts, then a CTA that follows from nothing.
          This is the paragraph that turns "here is your market" into "here is
          your problem", so the engagement block below answers something. */}
      <section className="bg-paper border-b-1.5 border-ink px-6 md:px-12 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight leading-tight">
            What that means for getting found in {state.state}
          </h2>
          <p className="font-sans text-ink text-base md:text-lg leading-relaxed mt-4 border-l-4 border-lime pl-4">
            {state.searchProblem}
          </p>
        </div>
      </section>

      <div className="bg-cream px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto space-y-8">
          {state.sections.map((section) => (
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

          {state.sources && state.sources.length > 0 && <SourceList sources={state.sources} />}
        </div>
      </div>

      {/* "Why hire OptimizeIndex if I run a towing company here?" — answered as
          scope, ordered by what this state needs first. The `why` on each step
          is what keeps it from being a generic services menu with a state name
          on top. */}
      <section className="bg-forest border-y-1.5 border-ink px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-cream tracking-tight leading-tight">
            {state.engagement.heading}
          </h2>
          <p className="font-sans text-cream/80 leading-relaxed mt-4 text-base md:text-lg">
            {state.engagement.intro}
          </p>

          <ol className="mt-10 space-y-6">
            {state.engagement.steps.map((step, i) => (
              <li
                key={step.title}
                className="border-1.5 border-cream/25 rounded-xl bg-ink/40 p-5 md:p-6"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs font-bold text-lime shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-display font-bold text-lg md:text-xl text-cream tracking-tight">
                    {step.title}
                  </h3>
                </div>
                <p className="font-sans text-cream/85 text-sm md:text-base leading-relaxed mt-3">
                  {step.what}
                </p>
                <p className="font-sans text-cream/60 text-sm leading-relaxed mt-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-lime/80">
                    Why here:
                  </span>{' '}
                  {step.why}
                </p>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3 mt-10">
            <CallLink label="Talk it through" source={`${state.slug}-engagement`} tone="dark" />
            <AuditLink label="Free visibility check" />
          </div>
        </div>
      </section>

      <FaqSection
        heading={`${state.state} towing marketing questions, answered`}
        faqs={state.faqs}
        tone="light"
        id="towing-state-faq"
      />

      {/* Sibling + parent links. Without these each state page is an orphan and
          the cluster never reads as one topic. */}
      <section className="bg-paper border-y-1.5 border-ink px-6 md:px-12 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-extrabold text-xl md:text-2xl text-ink tracking-tight">
            Towing markets in other states
          </h2>
          <ul className="flex flex-wrap gap-3 mt-5">
            {siblings.map((s) => {
              const href = `${TOWING_BASE}/${s.slug}`;
              return (
                <li key={s.slug}>
                  <a
                    href={href}
                    onClick={go(href)}
                    id={`towing-sibling-${s.slug}`}
                    className="inline-block px-4 py-2 bg-cream border-1.5 border-ink rounded-full font-mono text-[11px] font-bold uppercase text-ink shadow-hard hover:shadow-hard-hover transition-all focus-ring"
                  >
                    {s.state}
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="font-sans text-stone text-sm mt-6">
            Or read the national overview:{' '}
            <a
              href={TOWING_BASE}
              onClick={go(TOWING_BASE)}
              className="font-bold text-ink underline hover:text-lime focus-ring"
            >
              towing company marketing
            </a>
            .
          </p>
        </div>
      </section>

      <section className="bg-forest px-6 md:px-12 py-16 border-t-1.5 border-ink">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-black text-3xl md:text-4xl text-cream tracking-tight leading-tight">
            See how {state.state} drivers find you today
          </h2>
          <p className="font-sans text-cream/75 leading-relaxed mt-4">
            Call and we will look at your Google Business Profile, your review position against
            nearby operators, and how AI assistants describe your business — while you are on the
            phone. No contract.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <CallLink label="Call now" source={`${state.slug}-footer`} tone="dark" />
            <AuditLink label="Run the free check" />
          </div>
        </div>
      </section>
    </TowingLayout>
  );
}
