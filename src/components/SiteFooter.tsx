/**
 * The site footer.
 *
 * Extracted from src/App.tsx so the proposal portal ends with the real footer
 * rather than a two-line stub — same reason as SiteNav: a prospect reading a
 * proposal should be able to reach the rest of the business from it.
 *
 * Self-contained, doing its own routing, so any page can render it.
 */

import { Shield, ChevronDown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { GOALS } from '../data';
import { TOWING_STATES } from '../content/towing';
import { TOWING_BASE } from '../routes';

// The first two point at the services page rather than straight into the audit
// form. Every entry here used to dead-end at /audit, which meant a column
// labelled SERVICES contained no link to a page describing a service.
const SERVICE_LINKS = [
  { label: 'ORGANIC SEO', href: '/services' },
  { label: 'GENERATIVE GEO', href: '/services' },
  { label: 'PAID SEARCH ADS', href: '/audit?goal=roi&service=paid-search' },
  { label: 'PAID SOCIAL ADS', href: '/audit?goal=cac&service=paid-social' },
  { label: 'CRO TESTING', href: '/audit?goal=profit&service=cro' },
];

/** One card in the Proudly Serving picker. */
const stateCardClass =
  'flex flex-col gap-0.5 border-1.5 border-ink rounded-xl px-3.5 py-3 transition-all focus-ring';

const AGENCY_LINKS = [
  { label: 'CASE STUDIES', href: '/case-studies' },
  { label: 'CONTACT US', href: 'mailto:contact@optimizeindex.com', external: true },
  { label: 'FREE AUDIT', href: '/audit' },
  { label: 'GET FREE QUOTE', href: '/quote' },
];

export default function SiteFooter() {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const linkClass = 'hover:text-ink transition-colors text-left font-bold block';

  return (
    <footer className="defer-paint bg-cream border-t-2 border-ink pt-16 pb-8 px-6 md:px-12 select-none overflow-hidden relative">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 relative z-10">
        <div className="col-span-2 space-y-4 text-left">
          <Logo size={38} variant="light" />
          <p className="font-sans text-stone text-xs leading-relaxed max-w-sm">
            We are SEO and GEO performance engineers. We replace slide decks with profit
            attribution. Every line of code is written to convert intent into scalable transactions.
          </p>

          <div className="pt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-paper border border-ink text-forest font-mono text-[9px] font-bold rounded uppercase">
              <Shield className="w-3.5 h-3.5" />
              No-Contract Security Active
            </span>
          </div>
        </div>

        <div className="text-left space-y-3">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-ink/10 pb-2">
            SERVICES
          </p>
          <ul className="space-y-2 font-mono text-[11px] text-stone uppercase">
            {SERVICE_LINKS.map((s) => (
              <li key={s.label}>
                <a href={s.href} onClick={go(s.href)} className={linkClass}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-left space-y-3">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-ink/10 pb-2">
            BY PERFORMANCE GOAL
          </p>
          <ul className="space-y-2 font-mono text-[11px] text-stone uppercase">
            {GOALS.map((goal) => (
              <li key={goal.id}>
                <a
                  href={`/audit?goal=${goal.id}`}
                  onClick={go(`/audit?goal=${goal.id}`)}
                  className="hover:text-ink transition-colors text-left block"
                  id={`footer-goal-nav-${goal.id}`}
                >
                  {goal.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-left space-y-3">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-ink/10 pb-2">
            THE AGENCY
          </p>
          <ul className="space-y-2 font-mono text-[11px] text-stone uppercase">
            {AGENCY_LINKS.map((a) => (
              <li key={a.label}>
                <a
                  href={a.href}
                  {...(a.external ? {} : { onClick: go(a.href) })}
                  className={linkClass}
                >
                  {a.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Proudly Serving — one parent control instead of a column of states.
          That column was at eight links and grew with every state we add.

          Built on <details>/<summary> rather than a JS dropdown for a specific
          reason: these are the sitewide internal links into the towing cluster,
          and <details> keeps every anchor in the rendered HTML whether the panel
          is open or not. A JS-mounted menu would drop them from the pre-rendered
          pages, which is the thing making the cluster crawlable in the first
          place. Same reasoning as FaqSection.

          Expands inline rather than floating: the footer sets overflow-hidden,
          so an absolutely positioned panel would be clipped. */}
      <div className="max-w-7xl mx-auto mt-12 relative z-10">
        <details className="group border-1.5 border-ink rounded-2xl bg-paper shadow-hard overflow-hidden">
          <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 focus-ring hover:bg-cream transition-colors">
            <span className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime border border-ink shrink-0" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                Proudly Serving
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone">
                {TOWING_STATES.length} states
              </span>
            </span>
            {/* The chevron alone sits a long way from the label on a wide
                screen, so the bar does not obviously read as expandable. The
                hint carries the affordance; it swaps on open so the control
                always describes what the next click does. */}
            <span className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider text-stone">
                <span className="group-open:hidden">Select a state</span>
                <span className="hidden group-open:inline">Close</span>
              </span>
              <ChevronDown
                className="w-4 h-4 text-ink transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </span>
          </summary>

          <div className="px-5 pb-5 pt-1 border-t border-ink/10">
            <p className="font-sans text-stone text-xs leading-relaxed mt-3 mb-4 max-w-2xl">
              We build for towing and recovery operators. Pick a state for what actually differs
              there — who sets your rates, where the freight runs, and what an AI agency should be
              measuring.
            </p>

            <ul className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <li className="col-span-2 md:col-span-1">
                <a
                  href={TOWING_BASE}
                  onClick={go(TOWING_BASE)}
                  className={`${stateCardClass} bg-ink text-lime hover:bg-forest`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                    Overview
                  </span>
                  <span className="font-display font-extrabold text-sm">All towing companies</span>
                </a>
              </li>

              {TOWING_STATES.map((s) => {
                const href = `${TOWING_BASE}/${s.slug}`;
                // Marking where you already are; a picker that gives no sense of
                // position is just a list.
                const active = location.pathname.replace(/\/+$/, '') === href;
                return (
                  <li key={s.slug}>
                    <a
                      href={href}
                      onClick={go(href)}
                      aria-current={active ? 'page' : undefined}
                      className={`${stateCardClass} ${
                        active
                          ? 'bg-lime text-ink'
                          : 'bg-cream text-ink hover:bg-paper hover:shadow-hard'
                      }`}
                    >
                      <span className="font-mono text-[10px] uppercase tracking-wider text-stone">
                        {active ? 'You are here' : s.metros[0]}
                      </span>
                      <span className="font-display font-extrabold text-sm">{s.state}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
      </div>

      {/* Oversized watermark bleeding off the bottom. It sits at 4% opacity
          by design — it is texture, not content — so the word itself lives in
          CSS (.brand-watermark::after) rather than the DOM. Keeping it as a
          real text node meant every accessibility audit correctly flagged a
          1.08:1 contrast failure on decoration nobody is meant to read. */}
      <div className="brand-watermark" aria-hidden="true" />

      <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-ink/10 flex flex-col md:flex-row justify-between items-center text-[10px] font-mono text-stone relative z-10">
        <p>© 2026 OPTIMIZEINDEX PERFORMANCE AGENCY. ALL RIGHTS RESERVED.</p>
        <div className="flex gap-4 mt-2 md:mt-0 uppercase">
          <a href="/privacy-policy" onClick={go('/privacy-policy')} className="hover:underline">
            PRIVACY POLICY
          </a>
          <span>·</span>
          <a href="/terms-of-service" onClick={go('/terms-of-service')} className="hover:underline">
            TERMS OF SERVICE
          </a>
        </div>
      </div>
    </footer>
  );
}
