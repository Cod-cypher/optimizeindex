/**
 * /proudly-serving — the service-area hub.
 *
 * Exists because the footer used to carry one link per state, which does not
 * scale: the column was at eight entries and grew with every state added. The
 * footer now carries a single "Proudly Serving" link here.
 *
 * That trade is worth stating plainly. Sitewide per-state links put every
 * state page at depth 1 with an inbound link from every page on the site;
 * routing through a hub makes them depth 2 with fewer inbound links. At this
 * size that is fine — seventeen pages, all still reachable — and it is the
 * standard hub-and-spoke shape. But the hub has to earn it by being a real
 * page rather than a link dump: hence the metro lists, the per-state framing,
 * and the honest section about the states we deliberately have no page for.
 */

import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { TOWING_STATES } from '../content/towing';
import { TOWING_BASE } from '../routes';
import { AuditLink, CallLink } from './towingShared';

export default function ProudlyServingPage() {
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
        <section className="bg-forest border-b-1.5 border-ink px-6 md:px-12 py-16 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#F6F1E6_1px,transparent_1px),linear-gradient(to_bottom,#F6F1E6_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-lime inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
              {TOWING_STATES.length} states with a dedicated page
            </span>

            <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-cream tracking-tight mt-4 leading-[1.05]">
              Proudly{' '}
              <span className="font-serif-accent italic text-lime bg-ink px-3 py-1 rounded-sm shadow-hard inline-block -rotate-1">
                Serving
              </span>{' '}
              Towing Companies
            </h1>

            <p className="font-sans text-lg md:text-xl text-cream/80 leading-relaxed mt-6 max-w-2xl mx-auto">
              We work with towing and recovery operators on AI search visibility, Google Business
              Profile and local search, and call attribution. The states below each have a page of
              their own, covering what actually differs about towing there.
            </p>

            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <CallLink label="Call us" source="proudly-serving-hero" tone="dark" />
              <AuditLink label="Free visibility check" />
            </div>
          </div>
        </section>

        {/* The grid. Each card carries the state's real metros rather than just
            a name — a list of seven state names is a nav menu, not a page. */}
        <section className="bg-cream px-6 md:px-12 py-14 md:py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              Choose your state
            </h2>
            <p className="font-sans text-stone leading-relaxed mt-3 max-w-3xl">
              Towing economics genuinely differ by state — who sets your rates, how your trucks are
              classified, where the freight runs, and whether winter or storm season drives the
              peak. Each page covers what changes, and what an AI agency should be measuring there.
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {TOWING_STATES.map((s) => {
                const href = `${TOWING_BASE}/${s.slug}`;
                return (
                  <li key={s.slug}>
                    <a
                      href={href}
                      onClick={go(href)}
                      id={`proudly-serving-${s.slug}`}
                      // Matches the visible action line exactly. An aria-label
                      // that says something different from the text a sighted
                      // user reads fails WCAG 2.5.3, and the visible line is
                      // now descriptive enough to be the accessible name.
                      aria-label={`Explore towing visibility in ${s.state}`}
                      className="group h-full flex flex-col border-1.5 border-ink rounded-2xl bg-paper p-6 shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all focus-ring"
                    >
                      <span className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-lime shrink-0" aria-hidden="true" />
                        <span className="font-display font-black text-xl text-ink tracking-tight">
                          {s.state}
                        </span>
                      </span>

                      <span className="block font-mono text-[10px] uppercase tracking-widest text-stone mt-3">
                        {s.metros.length} metros covered
                      </span>

                      <span className="block flex-1 font-sans text-stone text-sm leading-relaxed mt-1.5">
                        {s.metros.join(' · ')}
                      </span>

                      <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-ink mt-5 pt-4 border-t border-ink/10">
                        Explore towing visibility in {s.state}
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

        {/* Saying what we do NOT have a page for. A service-area page implying
            nationwide coverage it cannot evidence is exactly the kind of claim
            the rest of this site exists to avoid. */}
        <section className="bg-paper border-y-1.5 border-ink px-6 md:px-12 py-14">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              Not seeing your state?
            </h2>
            <p className="font-sans text-stone leading-relaxed mt-4">
              We work with operators outside the states listed above. Those states have pages
              because we have researched what genuinely differs about towing there — the rate
              rules, the licensing and truck classification, the freight and weather patterns — and
              we would rather publish nothing than publish a page with a state name swapped into
              the same paragraphs.
            </p>
            <p className="font-sans text-stone leading-relaxed mt-4">
              If you operate somewhere without a page, the work is the same and the questions worth
              asking us are the same. Start with the{' '}
              <a
                href={TOWING_BASE}
                onClick={go(TOWING_BASE)}
                className="font-bold text-ink underline hover:text-lime focus-ring"
              >
                towing company overview
              </a>
              , or call and we will look at your market while you are on the phone.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <CallLink label="Call about your market" source="proudly-serving-footer" />
              <AuditLink label="Run the free check" />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
