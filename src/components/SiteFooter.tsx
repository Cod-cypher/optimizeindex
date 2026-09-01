/**
 * The site footer.
 *
 * Extracted from src/App.tsx so the proposal portal ends with the real footer
 * rather than a two-line stub — same reason as SiteNav: a prospect reading a
 * proposal should be able to reach the rest of the business from it.
 *
 * Self-contained, doing its own routing, so any page can render it.
 */

import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { GOALS } from '../data';
import { PROUDLY_SERVING, TOWING_BASE } from '../routes';

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

const AGENCY_LINKS = [
  { label: 'CASE STUDIES', href: '/case-studies' },
  { label: 'CONTACT US', href: 'mailto:contact@optimizeindex.com', external: true },
  { label: 'FREE AUDIT', href: '/audit' },
  { label: 'GET FREE QUOTE', href: '/quote' },
];

export default function SiteFooter() {
  const navigate = useNavigate();

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const linkClass = 'hover:text-ink transition-colors text-left font-bold block';

  return (
    <footer className="defer-paint bg-cream border-t-2 border-ink pt-16 pb-8 px-6 md:px-12 select-none overflow-hidden relative">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-6 gap-8 relative z-10">
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

        {/* One link, not a column. The per-state list was at eight entries and
            grew with every state; /proudly-serving is the hub that scales.
            The cost is that state pages move from depth 1 to depth 2 — see the
            note at the top of ProudlyServingPage. */}
        <div className="text-left space-y-3">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-ink/10 pb-2">
            COVERAGE
          </p>
          <ul className="space-y-2 font-mono text-[11px] text-stone uppercase">
            <li>
              <a
                href={PROUDLY_SERVING}
                onClick={go(PROUDLY_SERVING)}
                id="footer-proudly-serving"
                className={linkClass}
              >
                Proudly Serving
              </a>
            </li>
            <li>
              <a href={TOWING_BASE} onClick={go(TOWING_BASE)} className={linkClass}>
                Towing Companies
              </a>
            </li>
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
