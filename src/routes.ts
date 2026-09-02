/**
 * Route metadata — the single source of truth for titles, descriptions,
 * canonicals and structured data.
 *
 * Consumed by three places that must never disagree:
 *   1. scripts/prerender.ts  — bakes the tags into each static HTML file
 *   2. src/App.tsx           — updates them on client-side navigation
 *   3. scripts/prerender.ts  — generates public sitemap.xml from the same list
 *
 * Before this existed, index.html hardcoded `canonical` to the homepage on
 * every route, so /services, /audit and both case studies each told Google
 * "don't index me, index the homepage instead". That is the single most
 * damaging on-page bug the site had.
 *
 * Length rules, enforced by scripts/verify-seo.ts:
 *   title       30-60 chars   (Google truncates past ~60)
 *   description 70-160 chars  (Google truncates past ~160)
 */

import { CASE_STUDIES, AUDIT_FAQS, QUOTE_FAQS } from './data';
import { TOWING_PILLAR, TOWING_STATES, TOWING_UPDATED } from './content/towing';
import { TOWING_JOBS } from './content/towingJobs';
import type { Faq } from './types';

export const SITE_ORIGIN = 'https://optimizeindex.com';
export const SITE_NAME = 'OptimizeIndex';
export const CONTACT_EMAIL = 'contact@optimizeindex.com';
/** E.164 — must match the JSON-LD and every tel: link. */
export const CONTACT_PHONE = '+12028107042';
export const CONTACT_PHONE_DISPLAY = '202 810 7042';

export interface RouteMeta {
  path: string;
  title: string;
  description: string;
  /** Sitemap priority. Omitted for routes that should not be indexed. */
  priority?: number;
  /** Set on the 404 page so it never enters the index. */
  noindex?: boolean;
  /** Page-specific structured data, merged with the sitewide graph. */
  jsonLd?: Record<string, unknown>[];
}

/* -------------------------------------------------------------------------
   Sitewide structured data
   Present on every page. Organization + WebSite are what let an AI assistant
   treat the business as a named entity it can cite.

   Deliberately absent: AggregateRating/Review (there are no real reviews to
   cite) and PostalAddress (no real address exists in the codebase). Inventing
   either would be exactly the fabrication this work exists to remove.
------------------------------------------------------------------------- */

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_ORIGIN}/#organization`,
  name: SITE_NAME,
  url: SITE_ORIGIN,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_ORIGIN}/logo.png`,
    width: 327,
    height: 329,
  },
  email: CONTACT_EMAIL,
  telephone: CONTACT_PHONE,
  description:
    'Performance marketing agency specializing in Google Business Profile optimization, SEO, Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) for AI-powered search.',
  areaServed: 'US',
  // Populate with real profile URLs when they exist — an empty array is
  // honest, a fabricated one is not.
  sameAs: [] as string[],
};

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE_ORIGIN}/#website`,
  url: SITE_ORIGIN,
  name: SITE_NAME,
  publisher: { '@id': `${SITE_ORIGIN}/#organization` },
  inLanguage: 'en-US',
};

const PROFESSIONAL_SERVICE = {
  '@type': 'ProfessionalService',
  '@id': `${SITE_ORIGIN}/#service`,
  name: SITE_NAME,
  url: SITE_ORIGIN,
  image: `${SITE_ORIGIN}/logo.png`,
  telephone: CONTACT_PHONE,
  email: CONTACT_EMAIL,
  priceRange: '$$',
  areaServed: 'US',
  parentOrganization: { '@id': `${SITE_ORIGIN}/#organization` },
  makesOffer: [
    'Google Business Profile Optimization',
    'Search Engine Optimization (SEO)',
    'Answer Engine Optimization (AEO)',
    'Generative Engine Optimization (GEO)',
    'Paid Search & Social Advertising',
    'Conversion Rate Optimization',
  ].map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
};

export const SITEWIDE_JSONLD = [ORGANIZATION, WEBSITE, PROFESSIONAL_SERVICE];

/**
 * Mirrors the FAQs rendered on the page. Marked-up Q&A is what AI assistants
 * quote when answering a question, so the schema and the visible copy must
 * stay identical — Google penalises FAQ markup that isn't on the page.
 */
function faqPage(faqs: Faq[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

function breadcrumb(trail: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_ORIGIN}${item.path}`,
    })),
  };
}

/* -------------------------------------------------------------------------
   Hand-written per-case-study descriptions.
   Keyed by id rather than generated from `outcome`, because generated copy
   would blow the 160-char budget and read like a template. Every figure here
   is copied verbatim from src/data.ts — no rounding, no embellishment.
------------------------------------------------------------------------- */

const CASE_STUDY_DESCRIPTIONS: Record<string, string> = {
  'sujood-mats':
    'How a unified Google Business Profile, SEO, AEO and GEO campaign grew Sujood Mats to +185% search and map clicks, verified in Google Search Console.',
  'jade-title-services':
    'How Jade Title Services went from 5 to 250+ monthly organic visitors — a +4,900% increase in traffic and a rebuilt B2B pipeline, verified in GA4.',
};

const caseStudyRoutes: RouteMeta[] = CASE_STUDIES.map((study) => ({
  path: `/case-study/${study.id}`,
  title: `${study.client} Case Study | ${SITE_NAME}`,
  description:
    CASE_STUDY_DESCRIPTIONS[study.id] ??
    `${study.outcome} ${study.stat} ${study.metric}, ${study.dataOrigin}.`.slice(0, 158),
  priority: 0.8,
  jsonLd: [
    {
      '@type': 'Article',
      headline: `${study.client}: ${study.stat} ${study.metric}`,
      description: study.outcome,
      about: study.category,
      author: { '@id': `${SITE_ORIGIN}/#organization` },
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
      mainEntityOfPage: `${SITE_ORIGIN}/case-study/${study.id}`,
      inLanguage: 'en-US',
    },
    breadcrumb([
      { name: 'Home', path: '/' },
      { name: 'Case Studies', path: '/case-studies' },
      { name: study.client, path: `/case-study/${study.id}` },
    ]),
  ],
}));

/* -------------------------------------------------------------------------
   Towing vertical

   Generated from src/content/towing.ts using the same pattern as the case
   studies above, so a sixth state is one entry in TOWING_STATES and needs no
   change here, in the sitemap generator, or in the SEO gate.

   Every state page now targets a comparison query, so each sets titleOverride
   and h1Override to "Best AI Towing Agency in <State>" and the two match. The
   generated fallback below is kept because head.ts holds titles and H1s
   independently — a future state that wants brand-voice framing can simply
   omit both overrides and get it.
------------------------------------------------------------------------- */

export const TOWING_BASE = '/towing-companies';

/**
 * The service-area hub the footer points at.
 *
 * Single segment, so it automatically joins the reserved set in
 * server/proposals/slug.ts and can never be taken by a proposal slug.
 */
export const PROUDLY_SERVING = '/proudly-serving';

/**
 * "Towing jobs" — the operator's other question.
 *
 * Every other page in this vertical targets agency-hiring intent. This one
 * targets the query an operator types before they have decided they want an
 * agency at all: where the work comes from and how to get more of it.
 *
 * Named _PATH because src/content/towingJobs.ts already exports TOWING_JOBS as
 * the page's content object, which this file imports for faqPage().
 *
 * Top-level rather than nested under TOWING_BASE: the URL matches the query,
 * and a single segment joins the reserved set in server/proposals/slug.ts
 * automatically. The breadcrumb still places it under the pillar.
 */
export const TOWING_JOBS_PATH = '/towing-jobs';

/**
 * `Service` narrowed by audience and, on the state pages, by area.
 *
 * areaServed is how this site expresses geographic relevance at all: there is
 * no real postal address, so a State entity is the honest way to say "we work
 * here" without inventing a LocalBusiness that does not exist.
 */
function towingService(area?: string) {
  return {
    '@type': 'Service',
    name: area ? `Towing company marketing in ${area}` : 'Towing company marketing',
    serviceType: 'Towing company marketing',
    provider: { '@id': `${SITE_ORIGIN}/#organization` },
    audience: { '@type': 'BusinessAudience', name: 'Towing companies' },
    areaServed: area ? { '@type': 'State', name: area } : 'US',
    inLanguage: 'en-US',
    dateModified: TOWING_UPDATED,
  };
}

/** Hand-written so each reads like a sentence rather than a filled template. */
/**
 * Hand-written per state, 70-160 chars, all unique.
 *
 * These frame the buying decision rather than the market, because every state
 * page now targets a comparison query ("best AI towing agency in <state>").
 * None of them claim we are the best - the pages answer that question honestly
 * and the description has to match what the page actually says.
 */
const TOWING_STATE_DESCRIPTIONS: Record<string, string> = {
  california:
    'Comparing AI agencies for your California towing company? No agency can honestly call itself the best. Here is how to judge one, and where AI actually helps.',
  florida:
    'Florida caps non-consensual tow rates by county, so AI has to earn its place elsewhere. How to evaluate an AI agency for a Florida towing company.',
  georgia:
    'Atlanta consumer calls and Savannah freight work need different systems. How to choose an AI agency for a Georgia towing company, and what to ask it.',
  pennsylvania:
    'Pennsylvania towing revenue lands in a few weather weeks. How to evaluate an AI agency for a Pennsylvania towing company, and what it should measure.',
  indiana:
    'Most Indiana towing revenue comes from freight your analytics never sees. How to choose an AI agency for an Indiana towing company, and what to ask.',
  michigan:
    'Comparing AI agencies for your Michigan towing company? No agency can honestly call itself the best. Here is how to judge one, and what we do differently.',
  washington:
    'Washington already classifies your trucks and your business identity. How to choose an AI agency for a Washington towing company, and what to ask it.',
};

const towingRoutes: RouteMeta[] = [
  {
    path: PROUDLY_SERVING,
    title: 'Proudly Serving Towing Companies | OptimizeIndex',
    description:
      'The states where we work with towing and recovery operators, each with a page on what actually differs there — rate rules, truck classes, freight and weather.',
    priority: 0.7,
    jsonLd: [
      breadcrumb([
        { name: 'Home', path: '/' },
        { name: 'Proudly Serving', path: PROUDLY_SERVING },
      ]),
      // Truthful: an ordered list of the state pages this hub links to. No
      // ratings, no reviews, nothing that cannot be substantiated.
      {
        '@type': 'ItemList',
        name: 'Towing markets served',
        itemListElement: TOWING_STATES.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: `Best AI Towing Agency in ${s.state}`,
          url: `${SITE_ORIGIN}${TOWING_BASE}/${s.slug}`,
        })),
      },
    ],
  },
  {
    path: TOWING_BASE,
    title: 'Towing Company Marketing & Lead Generation | OptimizeIndex',
    description:
      'We help towing companies get found on Google Maps and AI assistants, and turn that into direct calls. Measured in calls and booked tows, not rankings.',
    priority: 0.9,
    jsonLd: [
      towingService(),
      breadcrumb([
        { name: 'Home', path: '/' },
        { name: 'Towing Companies', path: TOWING_BASE },
      ]),
      faqPage(TOWING_PILLAR.faqs),
    ],
  },
  {
    path: TOWING_JOBS_PATH,
    title: 'How to Get More Towing Jobs | OptimizeIndex',
    description:
      'Where towing jobs come from — motor club, rotation, private property, fleet and direct calls — and how to shift the mix toward work you price yourself.',
    priority: 0.8,
    jsonLd: [
      towingService(),
      // Nested under the pillar even though the URL is top-level: the page is
      // part of that topic, and the trail is what tells Google so.
      breadcrumb([
        { name: 'Home', path: '/' },
        { name: 'Towing Companies', path: TOWING_BASE },
        { name: 'Towing Jobs', path: TOWING_JOBS_PATH },
      ]),
      faqPage(TOWING_JOBS.faqs),
      // Deliberately no JobPosting: there are no real openings behind this
      // page, and marking up jobs that do not exist would be both a Google
      // policy violation and the exact fabrication this vertical refuses.
    ],
  },
  ...TOWING_STATES.map((s) => ({
    path: `${TOWING_BASE}/${s.slug}`,
    // titleOverride is set only where the page targets a comparison query and
    // the title needs to be that query. Everything else about the route is
    // generated identically, which is what keeps the two title strategies
    // comparable in Search Console later.
    title: `${s.titleOverride ?? `Towing Company Marketing in ${s.state}`} | ${SITE_NAME}`,
    description: TOWING_STATE_DESCRIPTIONS[s.slug],
    priority: 0.8,
    jsonLd: [
      towingService(s.state),
      breadcrumb([
        { name: 'Home', path: '/' },
        { name: 'Towing Companies', path: TOWING_BASE },
        { name: s.state, path: `${TOWING_BASE}/${s.slug}` },
      ]),
      faqPage(s.faqs),
    ],
  })),
];

export const ROUTES: RouteMeta[] = [
  {
    path: '/',
    title: 'Get Found on Google | OptimizeIndex SEO Agency',
    description:
      'We get local and trade businesses found on Google, Google Maps and AI assistants. Free instant website check, no contracts and no jargon.',
    priority: 1.0,
  },
  {
    path: '/services',
    title: 'SEO, GEO & Paid Search Services | OptimizeIndex',
    description:
      'Growth services across organic search, AI answer engines, paid media and conversion optimization — every engagement measured in revenue, not vanity metrics.',
    priority: 0.9,
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }])],
  },
  {
    path: '/case-studies',
    title: 'SEO Case Studies & Client Results | OptimizeIndex',
    description:
      'Real client results with real attribution — how we grew organic visibility and lead volume for local and B2B businesses, verified in GA4 and Search Console.',
    priority: 0.9,
    jsonLd: [
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Case Studies', path: '/case-studies' }]),
    ],
  },
  ...caseStudyRoutes,
  ...towingRoutes,
  {
    path: '/audit',
    title: 'Free 15-Point SEO & AI Search Audit | OptimizeIndex',
    description:
      'Get a free 15-point audit of your search footprint — technical SEO, content, speed and AI search readiness — with a prioritized fix plan within 24 hours.',
    priority: 0.9,
    jsonLd: [
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Free Audit', path: '/audit' }]),
      faqPage(AUDIT_FAQS),
    ],
  },
  {
    path: '/quote',
    title: 'Get a Free SEO & Growth Quote | OptimizeIndex',
    description:
      "Tell us your growth goal and we'll send back a custom proposal with scope, timeline and projected impact. No contracts, 15-day money-back guarantee.",
    priority: 0.9,
    jsonLd: [
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Get a Quote', path: '/quote' }]),
      faqPage(QUOTE_FAQS),
    ],
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy | OptimizeIndex Agency',
    description:
      'How OptimizeIndex collects, uses and protects your data — including analytics, cookies, and the information you submit through our audit and quote forms.',
    priority: 0.3,
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service | OptimizeIndex Agency',
    description:
      'The terms governing your use of the OptimizeIndex website and services, including our no-contract policy and the 15-day money-back guarantee.',
    priority: 0.3,
  },
];

/** Rendered to dist/404.html and served with a real 404 status. */
export const NOT_FOUND_ROUTE: RouteMeta = {
  path: '/404',
  title: 'Page Not Found (404) | OptimizeIndex',
  description:
    "That page doesn't exist. Head back to the homepage to run a free search audit, or browse our services and client case studies instead.",
  noindex: true,
};

/**
 * Permanent redirects for URLs that previously served duplicate content at
 * HTTP 200. Two URLs with identical content split their own ranking signals.
 */
export const REDIRECTS: Record<string, string> = {
  '/free-audit': '/audit',
  '/free-quote': '/quote',
  '/terms-of-conversion': '/terms-of-service',
};

const ROUTE_BY_PATH = new Map(ROUTES.map((r) => [r.path, r]));

/** Falls back to the 404 metadata so an unknown path never inherits the homepage's. */
export function getRouteMeta(pathname: string): RouteMeta {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return ROUTE_BY_PATH.get(clean) ?? NOT_FOUND_ROUTE;
}

export function canonicalFor(pathname: string): string {
  return `${SITE_ORIGIN}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;
}
