/**
 * /about — who OptimizeIndex is.
 *
 * Layout only. Every sentence on this page comes from src/content/about.ts,
 * which is where the rules about what may be claimed live.
 *
 * Imported eagerly in src/AppRouter.tsx, like the towing pages and unlike the
 * admin and proposal apps: scripts/prerender.ts bakes this into static HTML,
 * and renderToString emits the Suspense fallback for a lazy component — so a
 * lazy About page would ship crawlers and AI assistants an empty div, on the
 * one page whose entire job is telling them who the business is.
 *
 * Exactly one h1, and no heading level skipped: scripts/verify-seo.ts asserts
 * both across the whole rendered document.
 */

import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import {
  ABOUT_DOES,
  ABOUT_DOES_NOT,
  ABOUT_INTRO,
  ABOUT_PILLARS,
  ABOUT_ROADMAP,
  ABOUT_VALUES,
  LEGAL_NAME,
} from '../content/about';
import { TOWING_BASE } from '../routes';
import { AuditLink, CallLink } from './towingShared';

export default function AboutPage() {
  const navigate = useNavigate();

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="bg-cream min-h-screen">
      <SiteNav />
      <main>
        {/* --- hero --- */}
        <section className="bg-forest border-b-1.5 border-ink px-6 md:px-12 py-16 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#F6F1E6_1px,transparent_1px),linear-gradient(to_bottom,#F6F1E6_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="max-w-4xl mx-auto relative z-10">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-lime inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
              AI for towing and roadside
            </span>

            <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-cream tracking-tight mt-4 leading-[1.05]">
              About{' '}
              <span className="font-serif-accent italic text-lime bg-ink px-3 py-1 rounded-sm shadow-hard inline-block -rotate-1">
                OptimizeIndex
              </span>
            </h1>

            {ABOUT_INTRO.map((para, i) => (
              <p
                key={i}
                className={[
                  'font-sans leading-relaxed max-w-2xl',
                  i === 0
                    ? 'text-lg md:text-xl text-cream/90 mt-6'
                    : 'text-base md:text-lg text-cream/70 mt-4',
                ].join(' ')}
              >
                {para}
              </p>
            ))}

            <div className="flex flex-wrap gap-3 mt-8">
              <AuditLink label="Run a free check on your site" goal="revenue" />
              <CallLink label="Talk to a person" source="about-hero" />
            </div>
          </div>
        </section>

        {/* --- the four pillars --- */}
        <section className="px-6 md:px-12 py-16 md:py-20">
          <div className="max-w-4xl mx-auto space-y-6">
            {ABOUT_PILLARS.map((block) => (
              <article
                key={block.title}
                className="border-1.5 border-ink rounded-2xl bg-paper p-6 md:p-9 shadow-hard"
              >
                <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight leading-tight">
                  {block.title}
                </h2>

                {/* The answer stands alone, because AI search retrieves
                    passages rather than pages. Same shape as SectionBlock on
                    the towing pages, and the same reason for it. */}
                <p className="font-sans text-ink text-base md:text-lg leading-relaxed mt-4 border-l-4 border-lime pl-4">
                  {block.answer}
                </p>

                {block.detail.map((para, i) => (
                  <p
                    key={i}
                    className="font-sans text-stone text-sm md:text-base leading-relaxed mt-4"
                  >
                    {para}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </section>

        {/* --- values --- */}
        <section className="px-6 md:px-12 pb-16 md:pb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              How we work with the people who hire us
            </h2>

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              {ABOUT_VALUES.map((value) => (
                <div
                  key={value.title}
                  className="border-1.5 border-ink rounded-2xl bg-paper p-5 md:p-6"
                >
                  <h3 className="font-display font-extrabold text-lg text-ink tracking-tight">
                    {value.title}
                  </h3>
                  <p className="font-sans text-stone text-sm leading-relaxed mt-2">{value.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- what we do and do not do --- */}
        <section className="px-6 md:px-12 pb-16 md:pb-20">
          <div className="max-w-4xl mx-auto border-1.5 border-ink rounded-2xl bg-cream p-6 md:p-9">
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              What we do, and what we do not
            </h2>
            <p className="font-sans text-stone text-sm md:text-base leading-relaxed mt-3">
              This vertical is full of companies that imply they can guarantee you work. We would
              rather be the one that tells you where our influence ends.
            </p>

            <div className="grid gap-6 md:grid-cols-2 mt-7">
              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-stone">
                  What we do
                </h3>
                <ul className="mt-3 space-y-3">
                  {ABOUT_DOES.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Check
                        size={16}
                        strokeWidth={3}
                        className="shrink-0 mt-0.5 text-ink"
                        aria-hidden="true"
                      />
                      <span className="font-sans text-ink text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-stone">
                  What we do not
                </h3>
                <ul className="mt-3 space-y-3">
                  {ABOUT_DOES_NOT.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <X
                        size={16}
                        strokeWidth={3}
                        className="shrink-0 mt-0.5 text-stone/60"
                        aria-hidden="true"
                      />
                      <span className="font-sans text-stone text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Explicitly a roadmap, and labelled as one. See the comment on
                ABOUT_ROADMAP in src/content/about.ts. */}
            <div className="mt-8 pt-6 border-t border-ink/15">
              <h3 className="font-display font-extrabold text-lg text-ink tracking-tight">
                What we are building next
              </h3>
              <p className="font-sans text-ink text-sm md:text-base leading-relaxed mt-2 border-l-4 border-lime pl-4">
                {ABOUT_ROADMAP.answer}
              </p>
              <p className="font-sans text-stone text-sm leading-relaxed mt-3">
                {ABOUT_ROADMAP.detail}
              </p>
            </div>
          </div>
        </section>

        {/* --- the legal entity --- */}
        <section className="px-6 md:px-12 pb-16 md:pb-20">
          <div className="max-w-4xl mx-auto border-1.5 border-ink rounded-2xl bg-paper p-6 md:p-9">
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              Who you would be contracting with
            </h2>
            <p className="font-sans text-stone text-sm md:text-base leading-relaxed mt-3">
              OptimizeIndex is a trade name. The company behind it is{' '}
              <strong className="text-ink font-bold">{LEGAL_NAME}</strong>, and that is the entity
              named on any agreement, invoice or refund under our 15-day money-back guarantee. We
              would rather you read that here than find it out at signing.
            </p>
            <p className="font-sans text-stone text-sm md:text-base leading-relaxed mt-4">
              Most of our work is with towing and recovery operators.{' '}
              <a
                href={TOWING_BASE}
                onClick={go(TOWING_BASE)}
                className="text-ink font-bold underline decoration-2 underline-offset-2 hover:text-lime focus-ring rounded-sm"
              >
                What that looks like in practice
              </a>{' '}
              covers the specifics, and the{' '}
              <a
                href="/case-studies"
                onClick={go('/case-studies')}
                className="text-ink font-bold underline decoration-2 underline-offset-2 hover:text-lime focus-ring rounded-sm"
              >
                case studies
              </a>{' '}
              name the tool behind every figure so you can check them.
            </p>
          </div>
        </section>

        {/* --- close --- */}
        <section className="bg-forest border-t-1.5 border-ink px-6 md:px-12 py-14 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-cream tracking-tight">
              Want to see what this would do for your operation?
            </h2>
            <p className="font-sans text-cream/70 text-base leading-relaxed mt-3">
              Run the free check on your website, or call and ask. No contract either way.
            </p>
            {/* forest, not ink: CallLink's default tone is bg-ink with an
                ink border, which on an ink panel is a lime word floating with
                no button around it. Same pairing as the hero. */}
            <div className="flex flex-wrap gap-3 justify-center mt-7">
              <AuditLink label="Run the free check" goal="revenue" />
              <CallLink label="Call us" source="about-footer" />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
