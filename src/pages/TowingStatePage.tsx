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

import FaqSection from '../components/FaqSection';
import { DEMAND_LABELS, SERVICE_LABELS, TOWING_STATES, type TowingState } from '../content/towing';
import { TOWING_BASE, TOWING_JOBS_PATH } from '../routes';
import {
  AuditLink,
  CallLink,
  PageCredit,
  SectionBlock,
  SectionLinks,
  SourceList,
  TowingLayout,
  useGo,
  type SectionLinkMap,
} from './towingShared';

const guide = (slug: string) => `${TOWING_JOBS_PATH}/${slug}`;

/**
 * State slug → section id → the guides that section actually discusses.
 *
 * Only where the section's subject is a guide's subject: heavy recovery on the
 * freight corridors, impound and property work, rotation against network
 * dispatch, the profile and review routine. Every state reaches at least one
 * /towing-jobs/ guide. Anchors are worded per state, because one hand-off line
 * repeated across seven pages is seven copies of the same shingles in the
 * similarity gate. A section id the content no longer has renders nothing.
 */
const STATE_LINKS: Record<string, SectionLinkMap> = {
  california: {
    'ca-rotation': [
      {
        lead: 'Rotation is one channel priced by someone else; motor club dispatch is another, and we weigh it in',
        anchor: 'the case for and against motor club work',
        href: guide('motor-club-towing'),
      },
    ],
    'ca-reviews': [
      {
        lead: 'The request routine itself, from the text dispatch sends to the single follow-up, is in',
        anchor: 'the review section of our direct-calls guide',
        href: `${guide('more-direct-towing-calls')}#be-chosen`,
      },
    ],
  },
  florida: {
    'fl-rates': [
      {
        lead: 'Florida\'s posting, storage-distance and police-notification rules for a private-property tow are set beside other states\' in',
        anchor: 'the private property towing contracts guide',
        href: guide('private-property-towing-contracts'),
      },
    ],
    'fl-transport': [
      {
        lead: 'Long distance is the towing search where your own page actually gets read; for',
        anchor: 'which towing searches deserve a page of their own',
        href: guide('towing-near-me-searches'),
        tail: ', see our near-me guide.',
      },
    ],
  },
  georgia: {
    'ga-reviews': [
      {
        lead: 'Signing a property, setting its enforcement terms and keeping it without a dispute cluster is the subject of',
        anchor: 'how apartment and HOA towing contracts are won',
        href: guide('private-property-towing-contracts'),
      },
    ],
    'ga-freight': [
      {
        lead: 'Georgia\'s TRIP quick-clearance program, and what it asks of a heavy-recovery company, is covered in',
        anchor: 'the heavy-duty accounts guide',
        href: `${guide('heavy-duty-towing-accounts')}#dot-programs`,
      },
    ],
  },
  pennsylvania: {
    'pa-winter': [
      {
        lead: 'The profile settings worth checking before the first storm, one at a time, are in',
        anchor: 'the setup steps of our direct-calls guide',
        href: `${guide('more-direct-towing-calls')}#appear`,
      },
    ],
    'pa-two-metros': [
      {
        lead: 'For the Philadelphia side, Pennsylvania\'s posting standard for private lots is set out in',
        anchor: 'our guide to winning property towing contracts',
        href: guide('private-property-towing-contracts'),
      },
    ],
  },
  indiana: {
    'in-corridors': [
      {
        lead: 'Carriers, adjusters and what each checks before the first call:',
        anchor: 'who buys heavy recovery, and how to reach them',
        href: guide('heavy-duty-towing-accounts'),
      },
    ],
    'in-reviews': [
      {
        lead: 'The things that do win fleet work, from the equipment sheet to certificates of insurance, are covered in',
        anchor: 'what a fleet buyer checks before signing',
        href: guide('commercial-towing-accounts'),
      },
    ],
  },
  michigan: {
    'mi-signage': [
      {
        lead: 'Michigan\'s posted-notice rule, set beside the posting standards of other states, is in',
        anchor: 'how property towing contracts are won and kept',
        href: guide('private-property-towing-contracts'),
      },
    ],
    'mi-border': [
      {
        lead: 'Getting onto a carrier\'s or an adjuster\'s list before the incident is covered in',
        anchor: 'selling heavy recovery to carriers and adjusters',
        href: guide('heavy-duty-towing-accounts'),
      },
    ],
  },
  washington: {
    'wa-identity': [
      {
        lead: 'Why Google wants one profile per location, and when a second base earns a second profile and page, is in',
        anchor: 'one profile per location, and when a second is right',
        href: `${guide('towing-near-me-searches')}#one-profile`,
      },
    ],
    'wa-classes': [
      {
        lead: 'Washington\'s Major Incident Tow program states its truck requirement in these classes; we go through it in',
        anchor: 'Washington\'s MIT program, in our heavy-duty guide',
        href: `${guide('heavy-duty-towing-accounts')}#dot-programs`,
      },
    ],
  },
};

export default function TowingStatePage({ state }: { state: TowingState }) {
  const siblings = TOWING_STATES.filter((s) => s.slug !== state.slug);
  const go = useGo();
  const links = STATE_LINKS[state.slug] ?? {};

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

          {/* Two H1 strategies, deliberately. The brand-voice default reads
              "Proudly Serving <State> Towing Companies"; a state targeting a
              comparison query sets h1Override so the H1 is the query itself.
              Nothing else about the page changes, which is what makes the two
              comparable in Search Console. */}
          <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-ink tracking-tight mt-5 leading-[1.05]">
            {state.h1Override ?? (
              <>
                Proudly Serving{' '}
                <span className="font-serif-accent italic text-lime bg-ink px-3 py-1 rounded-sm shadow-hard inline-block -rotate-1">
                  {state.state}
                </span>{' '}
                Towing Companies
              </>
            )}
          </h1>

          {/* Renders directly under the H1, which makes it the passage a
              retriever is most likely to lift and the first thing Google reads.
              On the brand-voice pages it is the market paragraph; on a
              comparison page it is the lede that answers the query outright. */}
          <p className="font-sans text-lg md:text-xl text-stone leading-relaxed mt-6">
            {state.landscape}
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <CallLink label="Call us" source={`${state.slug}-hero`} />
            <AuditLink label="Free visibility check" />
          </div>

          <PageCredit updated={state.updated} />
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

      {/* The evaluation framework, on the pages that target a comparison query.
          Placed here — straight after the bridge, before the market sections —
          because someone who typed "best <x> agency" wants to compare, and a
          page that makes them scroll past three market sections first has
          answered a different question than the one they asked.

          Position follows from presence, so no ordering flag is needed. */}
      {state.buyersGuide && (
        <section className="bg-paper border-b-1.5 border-ink px-6 md:px-12 py-14">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight leading-tight">
              {state.buyersGuide.heading}
            </h2>
            {/* The intro's question count is derived from criteria.length in
                buyersGuideFor() (src/content/towing.ts), so it cannot miscount
                when a criterion is added or dropped. */}
            <p className="font-sans text-stone leading-relaxed mt-4 text-base md:text-lg">
              {state.buyersGuide.intro}
            </p>

            <ol className="mt-10 space-y-6">
              {state.buyersGuide.criteria.map((c, i) => (
                <li
                  key={c.question}
                  className="border-1.5 border-ink rounded-2xl bg-cream p-5 md:p-7 shadow-hard"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs font-bold text-stone shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-display font-bold text-lg md:text-xl text-ink tracking-tight">
                      {c.question}
                    </h3>
                  </div>

                  <p className="font-sans text-stone text-sm md:text-base leading-relaxed mt-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink">
                      A good answer:
                    </span>{' '}
                    {c.goodAnswer}
                  </p>

                  {/* Answering the same question about ourselves is what stops
                      this being a neutral listicle with no commercial point. */}
                  <p className="font-sans text-ink text-sm md:text-base leading-relaxed mt-3 border-l-4 border-lime pl-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone">
                      Ours:
                    </span>{' '}
                    {c.ours}
                  </p>
                </li>
              ))}
            </ol>

            {/* The scope boundary, said once on the pillar rather than restated
                on seven pages. It replaced the after-hours criterion and FAQ
                these pages used to carry; the link lives here because a
                content string cannot hold one. */}
            <p className="font-sans text-stone leading-relaxed mt-8 border-l-4 border-lime pl-4">
              What OptimizeIndex will and will not do for a {state.state} operator is no different
              from any other state, so it is answered once, in{' '}
              <a
                href={`${TOWING_BASE}#towing-faq`}
                onClick={go(`${TOWING_BASE}#towing-faq`)}
                id={`${state.slug}-scope-link`}
                className="font-bold text-ink underline hover:text-lime focus-ring"
              >
                the questions on our towing services overview
              </a>
              .
            </p>

            <div className="flex flex-wrap gap-3 mt-10">
              <CallLink label="Ask us these questions" source={`${state.slug}-buyers-guide`} />
              <AuditLink label="Free visibility check" />
            </div>
          </div>
        </section>
      )}

      <div className="bg-cream px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto space-y-8">
          {state.sections.map((section) => [
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
            />,
            <SectionLinks
              key={`${section.id}-links`}
              links={links[section.id]}
              sectionId={section.id}
              idPrefix={state.slug}
            />,
          ])}

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
            We work with operators in every state, not only these. Or step back to{' '}
            <a
              href={TOWING_BASE}
              onClick={go(TOWING_BASE)}
              className="font-bold text-ink underline hover:text-lime focus-ring"
            >
              our towing services overview
            </a>
            , or to{' '}
            <a
              href={TOWING_JOBS_PATH}
              onClick={go(TOWING_JOBS_PATH)}
              id="state-towing-jobs-link"
              className="font-bold text-ink underline hover:text-lime focus-ring"
            >
              where towing work comes from
            </a>
            , channel by channel.
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
