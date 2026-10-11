/**
 * /towing-jobs/<slug> — one component, one entry per supporting page.
 *
 * Layout only. Everything that differs lives in src/content/towingJobsCluster/,
 * which is what lets scripts/verify-seo.ts compare these pages against each
 * other and against the pillar for templated drift.
 *
 * The H1 renders as plain text rather than with the styled span the pillar uses,
 * because the gate asserts $('h1').text() equals the title's leading clause and
 * these titles are long enough that a decorative span buys nothing.
 *
 * The lead form sits high — after the lede and first CTA, before the long
 * sections — mirroring the pillar's hero placement so a reader does not have to
 * finish the article to find the conversion path.
 */

import FaqSection from '../components/FaqSection';
import TowingJobsLeadForm from '../components/towing/TowingJobsLeadForm';
import { TOWING_JOBS_CLUSTER, type TowingJobsChild } from '../content/towingJobsCluster';
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
 * Guide slug → section id → the hand-offs rendered straight after that section.
 *
 * Each entry is the link for a destination the section's own copy already
 * names in words ("our towing services overview", "the cash-call playbook"),
 * because section detail[] renders as plain text and cannot carry one. Anchors
 * describe the destination and are worded per page, so no two of the sixteen
 * towing pages share a hand-off line. A section id that no longer exists
 * simply renders nothing.
 */
const CHILD_LINKS: Record<string, SectionLinkMap> = {
  'more-direct-towing-calls': {
    'the-chain': [
      {
        lead: 'Motor club, rotation, property and commercial work, set side by side with who sets the rate on each:',
        anchor: 'our guide to where towing work comes from',
        href: TOWING_JOBS_PATH,
      },
    ],
    'be-chosen': [
      {
        lead: 'Why impound and private-property tows draw one-stars that no service quality prevents, and what a reply can still do, is in',
        anchor: 'the impound reviews section of our towing services overview',
        href: `${TOWING_BASE}#impound-reviews`,
      },
    ],
    'what-to-count': [
      {
        lead: 'Every rung from impressions to revenue, and what each one fails to prove, is laid out in',
        anchor: 'the measurement ladder on our towing jobs guide',
        href: `${TOWING_JOBS_PATH}#measurement`,
      },
    ],
  },
  'towing-near-me-searches': {
    'query-by-query': [
      {
        lead: 'The configuration that decides the map-pack searches is walked through in',
        anchor: 'our guide to getting more direct towing calls',
        href: `${guide('more-direct-towing-calls')}#appear`,
      },
      {
        lead: 'The second heavy-duty buyer, who qualifies operators before anything goes wrong, has a guide of its own:',
        anchor: 'winning heavy-duty towing accounts',
        href: guide('heavy-duty-towing-accounts'),
      },
    ],
    'one-profile': [
      {
        lead: 'Setting the area you actually dispatch to, rather than the outer limit, is one step in',
        anchor: 'the direct-calls setup',
        href: `${guide('more-direct-towing-calls')}#appear`,
      },
    ],
    limits: [
      {
        lead: 'If the work you want is applied for or sold rather than found, start with',
        anchor: 'the six places towing work comes from',
        href: TOWING_JOBS_PATH,
      },
    ],
  },
  'commercial-towing-accounts': {
    'who-buys': [
      {
        lead: 'For property work, the posting, notice and storage rules and what the contract obliges are in',
        anchor: 'our guide to private property towing contracts',
        href: guide('private-property-towing-contracts'),
      },
      {
        lead: 'For the reviews that impound work attracts, see',
        anchor: 'what to do about impound one-stars',
        href: `${TOWING_BASE}#impound-reviews`,
      },
    ],
    'what-buyers-check': [
      {
        lead: 'When the vehicles are Class 8 and the work is heavy recovery, the buyers and the bar change:',
        anchor: 'how heavy-duty towing accounts are won',
        href: guide('heavy-duty-towing-accounts'),
      },
    ],
    'website-role': [
      {
        lead: 'The visibility mechanics themselves, from the Business Profile to AI answers, are in',
        anchor: 'our towing services overview',
        href: TOWING_BASE,
      },
    ],
  },
  'heavy-duty-towing-accounts': {
    'who-buys': [
      {
        lead: 'How rotation lists are run, and why there is no national one, is covered in',
        anchor: 'the rotation section of our guide to where towing work comes from',
        href: `${TOWING_JOBS_PATH}#rotation`,
      },
    ],
    'dot-programs': [
      {
        lead: 'The CHP rotation program, a different thing from a quick-clearance incentive, is covered on',
        anchor: 'our California towing page',
        href: `${TOWING_BASE}/california`,
      },
    ],
    'what-buyers-check': [
      {
        lead: 'Who signs, certificates of insurance and billing terms work as they do for any account, and live in',
        anchor: 'our guide to commercial towing accounts',
        href: guide('commercial-towing-accounts'),
      },
    ],
    'search-and-us': [
      {
        lead: 'Corridor pages, and why fleet buyers search by route, are in',
        anchor: 'the heavy-duty section of our towing services overview',
        href: `${TOWING_BASE}#heavy-duty`,
      },
    ],
  },
  'motor-club-towing': {
    'judging-it': [
      {
        lead: 'The other five channels, compared on who sets the rate, are in',
        anchor: 'our guide to where towing work comes from',
        href: TOWING_JOBS_PATH,
      },
    ],
    'shifting-the-mix': [
      {
        lead: 'Building the side that arrives on your own number is covered in',
        anchor: 'the step-by-step setup for direct calls',
        href: guide('more-direct-towing-calls'),
      },
    ],
  },
  'paid-towing-leads': {
    'renting-vs-owning': [
      {
        lead: 'What building the owned side involves, from the profile to call tracking, is in',
        anchor: 'our guide to more direct towing calls',
        href: guide('more-direct-towing-calls'),
      },
    ],
    'not-a-lead-seller': [
      {
        lead: 'What we do instead, and how it is measured, is set out in',
        anchor: 'our towing services overview',
        href: TOWING_BASE,
      },
    ],
  },
  'private-property-towing-contracts': {
    'what-they-want': [
      {
        lead: 'The reviews impound work attracts, and how to reply to them, are covered in',
        anchor: 'the impound section of our towing services overview',
        href: `${TOWING_BASE}#impound-reviews`,
      },
    ],
    'by-state': [
      {
        lead: 'Florida\'s county rate caps for non-consensual towing are on',
        anchor: 'our Florida towing page',
        href: `${TOWING_BASE}/florida`,
      },
      {
        lead: 'Washington\'s registered tow truck operator rules are on',
        anchor: 'our Washington towing page',
        href: `${TOWING_BASE}/washington`,
      },
    ],
    'how-you-win': [
      {
        lead: 'Certificates of insurance, who signs and billing terms are covered in',
        anchor: 'our guide to winning commercial towing accounts',
        href: guide('commercial-towing-accounts'),
      },
    ],
  },
};

export default function TowingJobsChildPage({ child }: { child: TowingJobsChild }) {
  const siblings = TOWING_JOBS_CLUSTER.filter((c) => c.slug !== child.slug);
  const go = useGo();
  const links = CHILD_LINKS[child.slug] ?? {};

  return (
    <TowingLayout>
      <section className="bg-cream border-b-1.5 border-ink px-6 md:px-12 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_minmax(0,25rem)] gap-10 lg:gap-14 lg:items-start">
          <div>
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
              <a
                href={TOWING_JOBS_PATH}
                onClick={go(TOWING_JOBS_PATH)}
                className="text-stone hover:text-ink focus-ring"
              >
                Towing Jobs
              </a>
            </nav>

            <h1 className="font-display font-black text-3xl md:text-4xl lg:text-5xl text-ink tracking-tight mt-5 leading-[1.08]">
              {child.h1}
            </h1>

            {/* The passage a retriever is most likely to lift, so it answers the
                query outright rather than introducing the article. */}
            <p className="font-sans text-lg md:text-xl text-stone leading-relaxed mt-6">
              {child.lede}
            </p>

            {/* Identical to the pillar's, deliberately. The hero should read the
                same on every page of the cluster; only the H1 and lede change. */}
            <p className="font-sans text-base text-ink font-bold leading-relaxed mt-5 border-l-4 border-lime pl-4">
              Find out where your next towing opportunities could come from — and whether more
              direct customer calls are realistic in your market.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <CallLink label="Call us" source={`${child.slug}-hero`} />
              <AuditLink label="Free visibility check" />
            </div>

            <PageCredit updated={child.updated} />
          </div>

          {/* The shared component. Identical on every page, by design - it
              takes no props, so it cannot drift from the pillar's version. */}
          <div>
            <TowingJobsLeadForm />
          </div>
        </div>
      </section>

      <div className="bg-cream px-6 md:px-12 py-14">
        <div className="max-w-4xl mx-auto space-y-8">
          {child.sections.map((section) => [
            <SectionBlock key={section.id} section={section} />,
            <SectionLinks
              key={`${section.id}-links`}
              links={links[section.id]}
              sectionId={section.id}
              idPrefix={child.slug}
            />,
          ])}

          {/* Always rendered: with no sources it still carries the methods
              line and says why the list is empty. */}
          <SourceList sources={child.sources ?? []} />
        </div>
      </div>

      <FaqSection
        heading="Questions operators ask"
        faqs={child.faqs}
        tone="light"
        id="towing-jobs-child-faq"
      />

      {/* Back to the pillar and across to siblings. Without these each page is an
          orphan and the cluster never reads as one topic. */}
      <section className="bg-paper border-y-1.5 border-ink px-6 md:px-12 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-extrabold text-xl md:text-2xl text-ink tracking-tight">
            More on where towing work comes from
          </h2>
          <p className="font-sans text-stone leading-relaxed mt-3">
            This page covers one channel in depth. For how it compares with motor club dispatch,
            rotation lists, property contracts and the rest, start with{' '}
            <a
              href={TOWING_JOBS_PATH}
              onClick={go(TOWING_JOBS_PATH)}
              id={`${child.slug}-to-pillar`}
              className="font-bold text-ink underline hover:text-lime focus-ring"
            >
              where towing work comes from
            </a>
            .
          </p>

          {siblings.length > 0 && (
            <ul className="flex flex-wrap gap-3 mt-6">
              {siblings.map((s) => {
                const href = `${TOWING_JOBS_PATH}/${s.slug}`;
                return (
                  <li key={s.slug}>
                    <a
                      href={href}
                      onClick={go(href)}
                      id={`sibling-${s.slug}`}
                      className="inline-block px-4 py-2 bg-cream border-1.5 border-ink rounded-full font-mono text-[11px] font-bold uppercase text-ink shadow-hard hover:shadow-hard-hover transition-all focus-ring"
                    >
                      {s.h1.replace(/^How to /, '')}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="bg-forest px-6 md:px-12 py-16 border-t-1.5 border-ink">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-black text-3xl md:text-4xl text-cream tracking-tight leading-tight">
            Find out whether visibility is actually your constraint
          </h2>
          <p className="font-sans text-cream/75 leading-relaxed mt-4">
            We will look at how your operation appears in search, in Maps and to AI assistants, and
            tell you plainly if the thing holding your mix back is somewhere we cannot help. No
            contract.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <CallLink label="Call now" source={`${child.slug}-footer`} tone="dark" />
            <AuditLink label="Run the free check" />
          </div>
        </div>
      </section>
    </TowingLayout>
  );
}
