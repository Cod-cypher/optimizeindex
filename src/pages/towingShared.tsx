/**
 * Shared building blocks for the towing pillar and state pages.
 *
 * These live outside src/App.tsx deliberately. App.tsx is a single 2,100-line
 * component with a hand-rolled if/else view switch; adding two more branches to
 * it would make both harder to change. src/AppRouter.tsx already exists to
 * split whole pages out, so these plug in there instead.
 *
 * Everything here renders on the server too — scripts/prerender.ts bakes these
 * pages into static HTML, which is the only reason an AI assistant that does
 * not run JavaScript can read them at all.
 */

import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { CONTACT_PHONE, CONTACT_PHONE_DISPLAY } from '../routes';
import { trackCallClick } from '../lib/analytics';
import type { SourceRef, TowingSection } from '../content/towing';

/**
 * Tap-to-call.
 *
 * The number comes from the shared constant rather than being written inline,
 * so it cannot drift from the JSON-LD or from the other tel: links on the site.
 * lib/tracker.ts already captures every tel: click first-party; the onClick
 * adds the GA4 conversion and the attribution to a named block.
 */
export function CallLink({
  label,
  source,
  tone = 'light',
}: {
  label: string;
  source: string;
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <a
      href={`tel:${CONTACT_PHONE}`}
      id={`towing-call-${source}`}
      onClick={() => trackCallClick(source)}
      className={`inline-flex items-center gap-2 px-5 py-3 border-2 border-ink font-mono text-xs font-bold uppercase rounded-full shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all focus-ring ${
        dark ? 'bg-lime text-ink' : 'bg-ink text-lime'
      }`}
    >
      <Phone className="w-4 h-4" aria-hidden="true" />
      <span>
        {label} · {CONTACT_PHONE_DISPLAY}
      </span>
    </a>
  );
}

/** Secondary path into the existing audit funnel, so GA4 lead tracking is unchanged. */
export function AuditLink({ label, goal = 'revenue' }: { label: string; goal?: string }) {
  const navigate = useNavigate();
  const href = `/audit?goal=${goal}&service=gmb`;
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
      className="inline-flex items-center gap-1.5 px-5 py-3 bg-paper text-ink border-2 border-ink font-mono text-xs font-bold uppercase rounded-full shadow-hard hover:shadow-hard-hover transition-all focus-ring"
    >
      <span>{label}</span>
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </a>
  );
}

/**
 * One answer-first block.
 *
 * The heading is the question and the first paragraph is a complete answer to
 * it. That shape is not stylistic: AI search retrieves passages rather than
 * pages, so the answer has to stand on its own once the surrounding page is
 * stripped away. Everything below it is for the reader who kept going.
 */
export function SectionBlock({
  section,
  eyebrow,
}: {
  section: TowingSection;
  eyebrow?: string;
}) {
  return (
    <section
      id={section.id}
      className="border-1.5 border-ink rounded-2xl bg-paper p-6 md:p-9 shadow-hard"
    >
      {eyebrow && (
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-stone">
          {eyebrow}
        </span>
      )}

      <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight leading-tight mt-2">
        {section.question}
      </h2>

      {/* The standalone answer, visually distinguished so a reader skimming
          gets the same thing a retrieval system extracts. */}
      <p className="font-sans text-ink text-base md:text-lg leading-relaxed mt-4 border-l-4 border-lime pl-4">
        {section.answer}
      </p>

      {section.detail?.map((para, i) => (
        <p key={i} className="font-sans text-stone text-sm md:text-base leading-relaxed mt-4">
          {para}
        </p>
      ))}

      {section.callCta && (
        <div className="mt-6 pt-5 border-t border-ink/10">
          <CallLink label={section.callCta} source={section.id} />
        </div>
      )}
    </section>
  );
}

/**
 * Primary sources for anything on the page that asserts a rule or requirement.
 *
 * Rendered visibly rather than kept in a comment. The rest of this site already
 * names the tool behind every statistic; a regulatory claim deserves the same
 * treatment, and a reader who wants to check us should not have to ask.
 */
export function SourceList({ sources }: { sources: SourceRef[] }) {
  return (
    <section className="border-1.5 border-ink rounded-2xl bg-cream p-6 md:p-8">
      <h2 className="font-display font-extrabold text-xl text-ink tracking-tight">
        Sources for the claims on this page
      </h2>
      <p className="font-sans text-stone text-sm leading-relaxed mt-2">
        Every rule, program requirement and comparative claim above links to the source it came
        from, with the date we last checked it. Statutes get amended and agency programs change —
        confirm against the current source before relying on any of this operationally.
      </p>
      <ul className="mt-5 space-y-4">
        {sources.map((s) => (
          <li key={s.url} className="border-l-2 border-ink/20 pl-4">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans font-bold text-sm text-ink underline hover:text-lime focus-ring"
            >
              {s.label}
            </a>
            <p className="font-sans text-stone text-xs leading-relaxed mt-1">{s.supports}</p>
            {/* The checked date is the difference between a citation and a
                claim that merely has a link next to it. */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-stone/70 mt-1.5">
              Checked <time dateTime={s.checkedAt}>{s.checkedAt}</time>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Links to the published case studies.
 *
 * These pages repeatedly tell a reader to demand attribution from a named
 * tool, and the buyer's guide makes it a criterion — so not linking to the
 * place we publish ours was both a credibility gap and an internal-linking
 * one. A link-graph crawl found the two case studies had 2 inbound links each
 * against 16 for every other route, and none at all from the towing cluster.
 *
 * The anchor text is descriptive rather than "click here", because this is the
 * only in-content route these pages get.
 */
export function ProofLinks({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const navigate = useNavigate();
  const dark = tone === 'dark';
  const link = `font-bold underline focus-ring ${
    dark ? 'text-lime hover:text-cream' : 'text-ink hover:text-lime'
  }`;
  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    window.scrollTo({ top: 0 });
  };

  return (
    <p className={`font-sans text-sm leading-relaxed ${dark ? 'text-cream/75' : 'text-stone'}`}>
      We hold ourselves to the same criterion. Our published results name the tool behind every
      figure —{' '}
      <a href="/case-study/jade-title-services" onClick={go('/case-study/jade-title-services')} className={link}>
        Jade Title Services, verified in GA4
      </a>{' '}
      and{' '}
      <a href="/case-study/sujood-mats" onClick={go('/case-study/sujood-mats')} className={link}>
        Sujood Mats, verified in Search Console
      </a>
      . Neither is a towing client yet, and we would rather say so than imply otherwise. See{' '}
      <a href="/case-studies" onClick={go('/case-studies')} className={link}>
        all case studies
      </a>
      .
    </p>
  );
}

/** Visible freshness. Undated content is discounted by LLM-backed search. */
export function UpdatedStamp({ date }: { date: string }) {
  const pretty = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-stone">
      Last updated <time dateTime={date}>{pretty}</time>
    </p>
  );
}

/** Nav + footer wrapper, so both towing pages sit in the real site chrome. */
export function TowingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-cream min-h-screen">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
