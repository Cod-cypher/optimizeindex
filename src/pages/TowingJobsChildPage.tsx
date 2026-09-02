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

import { useNavigate } from 'react-router-dom';
import FaqSection from '../components/FaqSection';
import TowingJobsLeadForm from '../components/towing/TowingJobsLeadForm';
import { TOWING_UPDATED } from '../content/towing';
import { TOWING_JOBS_CLUSTER, type TowingJobsChild } from '../content/towingJobsCluster';
import { TOWING_BASE, TOWING_JOBS_PATH } from '../routes';
import {
  AuditLink,
  CallLink,
  SectionBlock,
  SourceList,
  TowingLayout,
  UpdatedStamp,
} from './towingShared';

export default function TowingJobsChildPage({ child }: { child: TowingJobsChild }) {
  const navigate = useNavigate();
  const siblings = TOWING_JOBS_CLUSTER.filter((c) => c.slug !== child.slug);

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    window.scrollTo({ top: 0 });
  };

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

            <div className="mt-6">
              <UpdatedStamp date={TOWING_UPDATED} />
            </div>
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
          {child.sections.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}

          {child.sources && child.sources.length > 0 && <SourceList sources={child.sources} />}
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
