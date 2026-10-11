/**
 * Shared building blocks for the towing pillar and state pages.
 *
 * These live outside src/App.tsx deliberately. App.tsx is a single 2,100-line
 * component with a hand-rolled if/else view switch; adding two more branches to
 * it would make both harder to change. src/AppRouter.tsx already exists to
 * split whole pages out, so these plug in there instead.
 *
 * Everything here renders on the server too — scripts/prerender.ts bakes these
 * pages into static HTML, so a crawler that does not run JavaScript (and the
 * AI crawlers' own documentation does not say they do) still gets the text.
 */

import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { CONTACT_PHONE, CONTACT_PHONE_DISPLAY } from '../routes';
import { trackCallClick } from '../lib/analytics';
import type { SourceRef, TowingSection } from '../content/towing';

/**
 * Scrolls to an element that may not have rendered yet.
 *
 * After a client-side navigation the destination page commits a frame or more
 * later, and nothing in this app restores scroll position or follows a hash,
 * so the target is polled for briefly and then given up on quietly.
 */
function scrollToId(id: string, framesLeft = 30) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView();
    return;
  }
  if (framesLeft > 0) requestAnimationFrame(() => scrollToId(id, framesLeft - 1));
  else window.scrollTo({ top: 0 });
}

/**
 * Client-side navigation for in-page links, with the plain href left in place
 * for crawlers and for anyone opening the link in a new tab.
 *
 * A href with a #fragment lands on that section of the destination; anything
 * else lands at the top, as every towing page always has.
 */
export function useGo() {
  const navigate = useNavigate();
  return (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    const hash = href.split('#')[1];
    if (hash) scrollToId(hash);
    else window.scrollTo({ top: 0 });
  };
}

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
 * Renders **double-asterisk** spans as bold, everything else as plain text.
 *
 * Content lives in src/content as plain strings, so a label written as markdown
 * used to render with the asterisks visible. This is deliberately the only
 * markup supported - not a markdown parser, just the one convention the content
 * files use for a run-in label. An unbalanced pair degrades to plain text
 * rather than throwing.
 */
function withBold(text: string): React.ReactNode[] {
  return text
    .split('**')
    .map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-bold text-ink">
          {part}
        </strong>
      ) : (
        part
      ),
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
          {withBold(para)}
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
 * One contextual hand-off to another page, rendered after the section that
 * mentions it.
 *
 * Lives in the page components rather than the content files because section
 * detail[] renders as plain text and cannot carry a link. The content names the
 * destination in words ("our guide to where towing work comes from"); this is
 * the link that makes that mention clickable, placed straight after it.
 *
 * Anchors are written per page and per context, never shared across pages:
 * scripts/verify-seo.ts compares every towing page pairwise on 5-grams, and a
 * hand-off line repeated on sixteen pages would be sixteen copies of the same
 * shingles.
 */
export interface SectionLink {
  /** Text before the link. */
  lead: string;
  /** Descriptive anchor that names the destination page. */
  anchor: string;
  /** Path, optionally with a #section-id on the destination. */
  href: string;
  /** Text after the link. Defaults to a full stop. */
  tail?: string;
  /** Overrides the generated element id, to keep an id that already exists. */
  id?: string;
}

/** Section id → the hand-offs rendered after that section. */
export type SectionLinkMap = Record<string, SectionLink[]>;

/** "/towing-jobs/paid-towing-leads" → "paid-towing-leads"; "/towing-companies#cost" → "towing-companies-cost". */
function linkTarget(href: string): string {
  const [path, hash] = href.split('#');
  const last = path.split('/').filter(Boolean).pop() ?? 'home';
  return hash ? `${last}-${hash}` : last;
}

/**
 * Renders the hand-offs for one section, or nothing.
 *
 * Returns a fragment rather than a wrapper element so the parent's `space-y-*`
 * spacing applies to each line exactly as it did to the one-off bridges these
 * replaced.
 */
export function SectionLinks({
  links,
  sectionId,
  idPrefix,
}: {
  links?: SectionLink[];
  sectionId: string;
  idPrefix: string;
}) {
  const go = useGo();
  if (!links || links.length === 0) return null;
  return (
    <>
      {links.map((link) => (
        <p
          key={`${sectionId}-${link.href}`}
          className="font-sans text-stone leading-relaxed border-l-4 border-lime pl-4"
        >
          {link.lead}{' '}
          <a
            href={link.href}
            onClick={go(link.href)}
            id={link.id ?? `${idPrefix}-${sectionId}-${linkTarget(link.href)}`}
            className="font-bold text-ink underline hover:text-lime focus-ring"
          >
            {link.anchor}
          </a>
          {link.tail ?? '.'}
        </p>
      ))}
    </>
  );
}

/**
 * Primary sources for anything on the page that asserts a rule or requirement,
 * introduced by the one-sentence note on how the page was made.
 *
 * Rendered visibly rather than kept in a comment. The rest of this site already
 * names the tool behind every statistic; a regulatory claim deserves the same
 * treatment, and a reader who wants to check us should not have to ask.
 *
 * The intro doubles as the methods line (who checked, and that AI helps draft
 * and structure the guides). It replaced the old intro rather than adding to
 * it, because this paragraph appears on fifteen towing pages and every word
 * added here is a shingle shared by all of them. It promises nothing about
 * outcomes, deliberately.
 *
 * With no sources (a page of operator advice that cites no outside rule), the
 * same block still discloses the method and says why the list is empty.
 */
export function SourceList({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) {
    return (
      <section className="border-1.5 border-ink rounded-2xl bg-cream p-6 md:p-8">
        <h2 className="font-display font-extrabold text-xl text-ink tracking-tight">
          How this page was made
        </h2>
        <p className="font-sans text-stone text-sm leading-relaxed mt-2">
          AI helps us draft and structure our guides. This one is operator advice rather than a
          summary of published rules or figures, so it lists no outside sources.
        </p>
      </section>
    );
  }
  return (
    <section className="border-1.5 border-ink rounded-2xl bg-cream p-6 md:p-8">
      <h2 className="font-display font-extrabold text-xl text-ink tracking-tight">
        Sources for the claims on this page
      </h2>
      <p className="font-sans text-stone text-sm leading-relaxed mt-2">
        Primary sources for the rules and figures on this page, each with the date the
        OptimizeIndex team last checked it. AI helps us draft and structure our guides; the
        checking is ours. Rules change, so confirm against the current source before relying on
        any of it.
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
 * Visible freshness, from the page's own hand-set `updated` field.
 *
 * `date` is an ISO 8601 date-time with an offset (2026-09-22T05:45:22+05:00),
 * taken from git history. Only the first ten characters are used: converting
 * the full timestamp to UTC would show the previous day for anything committed
 * shortly after midnight local time, which is a page claiming a date it was
 * not changed on.
 */
export function UpdatedStamp({ date }: { date: string }) {
  const day = date.slice(0, 10);
  const pretty = new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-stone">
      Last updated <time dateTime={day}>{pretty}</time>
    </p>
  );
}

/**
 * Who the page is by, linking to the page that says who that is.
 *
 * A company byline, deliberately: no named person and no persona, because none
 * has been confirmed. The Article JSON-LD `author` stays the Organization @id
 * for the same reason. `data-byline` is the hook scripts/verify-seo.ts looks
 * for. Also rendered on the case-study view in App.tsx, so it carries no
 * towing-specific wording.
 */
export function Byline() {
  const go = useGo();
  return (
    <p data-byline className="font-mono text-[10px] uppercase tracking-widest text-stone">
      By{' '}
      <a
        href="/about"
        onClick={go('/about')}
        className="font-bold text-ink underline hover:text-lime focus-ring"
      >
        OptimizeIndex
      </a>
    </p>
  );
}

/**
 * The byline and the updated stamp, side by side in a page hero.
 *
 * One component so the sixteen towing heroes cannot drift apart in layout.
 */
export function PageCredit({ updated }: { updated: string }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1">
      <Byline />
      <UpdatedStamp date={updated} />
    </div>
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
