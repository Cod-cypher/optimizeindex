/**
 * The site header — logo, primary nav, the two CTAs and the mobile drawer.
 *
 * Extracted from src/App.tsx so the proposal portal renders the *same* header
 * as the marketing site rather than a lookalike. A prospect who lands on
 * optimizeindex.com/abc-trucking should be able to go and read the case studies
 * like anybody else; a stripped-down bar made the page feel like a document
 * someone emailed rather than part of the business.
 *
 * Self-contained on purpose: it owns its mobile-menu state and does its own
 * routing, so it can be dropped into any page without that page having to
 * thread state through.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';

interface NavLink {
  label: string;
  href: string;
  /** Set for in-page anchors on the homepage. */
  hash?: string;
  id: string;
}

const LINKS: NavLink[] = [
  { label: 'SERVICES', href: '/services', id: 'services' },
  { label: 'CASE STUDIES', href: '/case-studies', id: 'cases' },
  { label: 'PROCESS', href: '/', hash: '#process', id: 'process' },
  { label: 'TESTIMONIALS', href: '/', hash: '#testimonials', id: 'testimonials' },
];

export default function SiteNav({
  onLogoClick,
}: {
  /** Extra work on logo click, e.g. resetting the homepage audit tool. */
  onLogoClick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close the drawer whenever the route changes, so navigating from inside it
  // does not leave it hanging open over the new page.
  useEffect(() => setOpen(false), [location.pathname]);

  const go = (link: NavLink) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);

    // Already on the homepage and heading for an anchor on it: scroll rather
    // than re-navigate, which would jump to the top first.
    if (link.hash && location.pathname === '/') {
      document.getElementById(link.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    navigate({ pathname: link.href, hash: link.hash ?? '' });
  };

  const isCurrent = (link: NavLink) => !link.hash && location.pathname === link.href;

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-cream/95 backdrop-blur-md border-b-1.5 border-ink select-none">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-18 flex items-center justify-between gap-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onLogoClick?.();
              setOpen(false);
              navigate('/');
            }}
            className="flex items-center group p-1 shrink-0"
            id="nav-logo"
          >
            <Logo size={32} variant="light" priority />
          </a>

          <nav className="hidden md:flex items-center gap-7 font-mono text-xs font-bold uppercase tracking-wider">
            {LINKS.map((link) => (
              <a
                key={link.id}
                href={link.hash ? `/${link.hash}` : link.href}
                onClick={go(link)}
                className="nav-link focus-ring rounded-sm cursor-pointer text-left font-bold"
                aria-current={isCurrent(link) ? 'page' : undefined}
                id={`nav-link-${link.id}`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/quote"
              onClick={(e) => {
                e.preventDefault();
                navigate('/quote');
              }}
              className="group hidden lg:inline-flex items-center gap-1.5 px-4 py-2 border-1.5 border-ink/25 text-ink font-mono text-[11px] font-bold uppercase rounded-full hover:border-ink hover:bg-ink hover:text-cream transition-colors duration-150 cursor-pointer focus-ring"
              id="nav-quote-btn"
            >
              <span>Get Free Quote</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="/audit"
              onClick={(e) => {
                e.preventDefault();
                navigate('/audit');
              }}
              className={`group hidden sm:flex px-4 py-2 text-[11px] font-mono font-bold uppercase rounded-full border-1.5 border-ink transition-all duration-200 cursor-pointer focus-ring items-center gap-1.5 ${
                location.pathname === '/audit'
                  ? 'bg-lime text-ink shadow-hard'
                  : 'bg-ink text-cream hover:bg-lime hover:text-ink hover:shadow-hard hover:-translate-y-0.5'
              }`}
              aria-current={location.pathname === '/audit' ? 'page' : undefined}
              id="nav-audit-btn"
            >
              <span>Free Audit</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>

            <button
              onClick={() => setOpen(!open)}
              className="flex md:hidden p-2 text-ink border-2 border-ink bg-paper rounded-xl shadow-hard hover:bg-cream transition-all cursor-pointer focus-ring"
              aria-label="Toggle menu"
              aria-expanded={open}
              id="mobile-menu-toggle"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="md:hidden fixed top-18 left-0 right-0 z-30 bg-cream border-b-2 border-ink shadow-hard-lg px-6 py-8 select-none"
          >
            <nav className="flex flex-col gap-1 font-mono text-sm font-bold uppercase tracking-wider text-ink">
              {LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.hash ? `/${link.hash}` : link.href}
                  onClick={go(link)}
                  className={`flex items-center gap-3 py-3 px-3 -mx-3 rounded-xl transition-colors ${
                    isCurrent(link) ? 'bg-ink text-lime' : 'text-ink/70 hover:text-ink hover:bg-ink/5'
                  }`}
                  aria-current={isCurrent(link) ? 'page' : undefined}
                  id={`mobile-nav-${link.id}`}
                >
                  {link.label}
                </a>
              ))}

              <div className="flex flex-col gap-3 pt-5 mt-3 border-t border-ink/10">
                <a
                  href="/quote"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    navigate('/quote');
                  }}
                  className="py-3.5 px-5 border-1.5 border-ink text-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-ink hover:text-cream transition-all text-center"
                  id="mobile-nav-quote"
                >
                  Get Free Quote &rarr;
                </a>
                <a
                  href="/audit"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    navigate('/audit');
                  }}
                  className="py-3.5 px-5 bg-lime text-ink font-mono text-xs font-bold uppercase rounded-full border-1.5 border-ink hover:bg-lime/90 transition-all shadow-hard text-center"
                  id="mobile-nav-audit"
                >
                  Free Audit &rarr;
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
