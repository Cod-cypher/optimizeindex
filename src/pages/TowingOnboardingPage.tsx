/**
 * /towing-onboarding — the setup form a towing client fills in after paying.
 *
 * Layout only. The copy is in src/content/onboarding.ts and the form's
 * behaviour in src/components/towing/TowingOnboardingForm.tsx.
 *
 * Imported eagerly in src/AppRouter.tsx like every pre-rendered page:
 * renderToString emits the Suspense fallback for a lazy component, which here
 * would be an empty div where the form should be.
 *
 * noindex, out of the sitemap and llms.txt, and linked from nothing on the
 * site — it is sent to people who have already bought. Exactly one h1 and no
 * skipped heading level all the same, because scripts/verify-seo.ts checks
 * every route in ROUTES whether it is indexed or not.
 */

import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import TowingOnboardingForm from '../components/towing/TowingOnboardingForm';
import { ONBOARDING_INTRO } from '../content/onboarding';

export default function TowingOnboardingPage() {
  return (
    <div className="bg-cream min-h-screen">
      <SiteNav />
      <main>
        {/* --- hero --- */}
        <section className="bg-forest border-b-1.5 border-ink px-6 md:px-12 py-14 md:py-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#F6F1E6_1px,transparent_1px),linear-gradient(to_bottom,#F6F1E6_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="max-w-3xl mx-auto relative z-10">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-lime inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
              {ONBOARDING_INTRO.eyebrow}
            </span>

            <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-cream tracking-tight mt-4 leading-[1.05]">
              {ONBOARDING_INTRO.h1Lead}{' '}
              <span className="font-serif-accent italic text-lime bg-ink px-3 py-1 rounded-sm shadow-hard inline-block -rotate-1">
                {ONBOARDING_INTRO.h1Accent}
              </span>
            </h1>

            <p className="font-sans text-lg md:text-xl text-cream/90 leading-relaxed max-w-2xl mt-6">
              {ONBOARDING_INTRO.lede}
            </p>

            <ul className="flex flex-wrap gap-2 mt-7">
              {ONBOARDING_INTRO.facts.map((fact) => (
                <li
                  key={fact}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-1.5 border-cream/25 font-mono text-[11px] font-bold uppercase tracking-wide text-cream/80"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-lime" aria-hidden="true" />
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* --- the form --- */}
        <section className="px-6 md:px-12 py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            <TowingOnboardingForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
