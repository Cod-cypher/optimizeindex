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

import { CASE_STUDIES, SERVICES, AUDIT_FAQS, QUOTE_FAQS } from './data';
import { LEGAL_NAME } from './content/about';
import { SERVICES_FAQS } from './content/services';
import { TOWING_PILLAR, TOWING_STATES, stateHeadline } from './content/towing';
import { TOWING_JOBS } from './content/towingJobs';
import { TOWING_JOBS_CLUSTER } from './content/towingJobsCluster';
import type { CaseStudy, Faq } from './types';

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
  /**
   * Marks a route as indexable. Omitted for routes that should not be indexed.
   *
   * No longer written to the sitemap (Google and Bing both ignore <priority>);
   * it stays because prerender.ts, verify-seo.ts and indexnow.ts all use
   * `priority != null` as the indexability filter.
   */
  priority?: number;
  /**
   * When the page's content was first published, and when it last changed
   * substantively. ISO 8601 date-time with offset, e.g.
   * 2026-09-22T05:45:22+05:00.
   *
   * Every indexable route carries both. They feed the sitemap's <lastmod>,
   * Article datePublished/dateModified and, on the towing pages, the visible
   * "Last updated" stamp. Towing routes copy them from their content objects;
   * every other route sets them here.
   *
   * Taken from git history (`git log --format=%cI`) and bumped by hand, in the
   * same commit, when the copy actually changes. Never generated from the build
   * date: an automatic date would claim a fresh review on every deploy, which
   * is exactly the kind of unearned freshness signal this codebase refuses to
   * fabricate. A change to shared chrome (nav, footer, the phone band) is not a
   * substantive change to the page.
   */
  published?: string;
  updated?: string;
  /**
   * Set on pages that must never enter the index: the 404, and the client
   * onboarding form. Keeps a route out of the sitemap, robots and llms.txt
   * checks, and off the 404 page's list of site pages.
   */
  noindex?: boolean;
  /** Page-specific structured data, merged with the sitewide graph. */
  jsonLd?: Record<string, unknown>[];
}

/* -------------------------------------------------------------------------
   Sitewide structured data
   Present on every page. Organization + WebSite are what let an AI assistant
   treat the business as a named entity it can cite.

   Deliberately absent: AggregateRating/Review (there are no real reviews to
   cite), PostalAddress (no real address exists in the codebase), and any
   LocalBusiness type, ProfessionalService included (Google reserves
   LocalBusiness markup for a business with a real physical address, and
   schema.org marks ProfessionalService deprecated). Inventing any of them
   would be exactly the fabrication this work exists to remove.
------------------------------------------------------------------------- */

/**
 * The entity in one sentence. Consumed by the Organization schema below and
 * copied verbatim, by hand, into line 3 of public/llms.txt (which the chat
 * widget reads at boot), so a change here is a change there too.
 *
 * Written from the owner's answers of 2026-10-12: the AI voice agent (answers,
 * qualifies, books, hands to the operator's dispatcher) and the chat assistant
 * on client websites are live for every client; towing and roadside operators
 * are the current focus (a present-tense focus, not a claim that no other
 * business is or ever will be served). Identity first, then the mechanisms.
 * Plain punctuation only, so the llms.txt copy can match it character for
 * character.
 */
export const ENTITY_DESCRIPTION =
  'AI solutions for businesses that are missing revenue, focused on towing and roadside operators: an AI voice agent that answers, qualifies and books their calls, an AI chat assistant for their websites, and AI-driven SEO, Google Business Profile, AEO and GEO that get a business found on Google, Google Maps and in AI assistants.';

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_ORIGIN}/#organization`,
  name: SITE_NAME,
  /*
    The brand as the mobile carriers have it registered for the SMS program
    (SMS_BRAND_DISPLAY in src/content/sms.ts). A literal rather than an import:
    sms.ts imports from this file, and a cycle would evaluate one of the two
    before its constants exist.
  */
  alternateName: 'Optimize Index',
  /*
    The entity behind the trade name.

    Unlike the fields deliberately absent (see the note above), this one is a
    fact rather than a flattering guess, and it is the answer to the question a cautious
    buyer and an AI assistant both ask first: who is this actually. Stated in
    the schema and in prose on /about, which is the page that has to carry it.
  */
  legalName: LEGAL_NAME,
  url: SITE_ORIGIN,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_ORIGIN}/logo.png`,
    width: 327,
    height: 329,
  },
  email: CONTACT_EMAIL,
  telephone: CONTACT_PHONE,
  /*
    One sentence, repeated verbatim in public/llms.txt and paraphrased in the
    homepage description, so Google, the chat widget and an AI assistant all
    read the same answer to "what is this company". Identity first (AI
    solutions, the revenue problem), then the mechanisms (the voice agent, SEO,
    Google Business Profile, AEO, GEO) as the how; the search terms are also
    what Search Console shows the site being surfaced for.
  */
  description: ENTITY_DESCRIPTION,
  areaServed: 'US',
  // Derived from the same list /services renders, so the schema cannot offer
  // something the page does not describe or omit something it does. Lead
  // generation and dispatch are not in SERVICES and must not be added here
  // until they ship — see ABOUT_ROADMAP in src/content/about.ts.
  makesOffer: SERVICES.map((s) => ({
    '@type': 'Offer',
    itemOffered: { '@type': 'Service', name: s.title },
  })),
  // No sameAs. Add it back, with real profile URLs, when they exist: an empty
  // array says nothing, and a fabricated one is worse than nothing.
};

/*
  Google's site-name documentation asks for WebSite markup with the name, an
  alternate name and the canonical home URL, which is the root with its
  trailing slash (canonicalFor('/')).
*/
const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE_ORIGIN}/#website`,
  url: `${SITE_ORIGIN}/`,
  name: SITE_NAME,
  // Same literal as on ORGANIZATION, for the same reason.
  alternateName: 'Optimize Index',
  publisher: { '@id': `${SITE_ORIGIN}/#organization` },
  inLanguage: 'en-US',
};

export const SITEWIDE_JSONLD = [ORGANIZATION, WEBSITE];

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

/*
  Page dates for the case-study pages, from git history (see RouteMeta).

  Both studies arrived with the first commit (408042c). Their last substantive
  change is 642a3ea, which made the case-study renderer show links and
  italics instead of literal markdown characters. These are page dates only:
  they are not the measurement periods behind the figures, which the owner has
  not supplied and which must not be guessed.
*/
const CASE_STUDY_DATES: Record<string, { published: string; updated: string }> = {
  'sujood-mats': {
    published: '2026-07-15T03:42:23+05:00',
    updated: '2026-09-17T21:54:36+05:00',
  },
  'jade-title-services': {
    published: '2026-07-15T03:42:23+05:00',
    updated: '2026-09-17T21:54:36+05:00',
  },
};

/**
 * The visible trail on a case-study page, and the BreadcrumbList that mirrors
 * it. One function so the two cannot drift: App.tsx renders this as
 * <nav aria-label="Breadcrumb">, and the route below marks up the same items.
 */
export function caseStudyTrail(study: CaseStudy): { name: string; path: string }[] {
  return [
    { name: 'Home', path: '/' },
    { name: 'Case Studies', path: '/case-studies' },
    { name: study.client, path: `/case-study/${study.id}` },
  ];
}

const caseStudyRoutes: RouteMeta[] = CASE_STUDIES.map((study) => {
  const dates = CASE_STUDY_DATES[study.id];
  return {
    path: `/case-study/${study.id}`,
    title: `${study.client} Case Study | ${SITE_NAME}`,
    description:
      CASE_STUDY_DESCRIPTIONS[study.id] ??
      `${study.outcome} ${study.stat} ${study.metric}, ${study.dataOrigin}.`.slice(0, 158),
    priority: 0.8,
    published: dates?.published,
    updated: dates?.updated,
    jsonLd: [
      {
        '@type': 'Article',
        headline: `${study.client}: ${study.stat} ${study.metric}`,
        description: study.outcome,
        // No `about`: the category is a label such as "GMB + SEO + AEO + GEO",
        // not an entity, and a bare string there is not a Thing.
        datePublished: dates?.published,
        dateModified: dates?.updated,
        author: { '@id': `${SITE_ORIGIN}/#organization` },
        publisher: { '@id': `${SITE_ORIGIN}/#organization` },
        mainEntityOfPage: `${SITE_ORIGIN}/case-study/${study.id}`,
        inLanguage: 'en-US',
      },
      breadcrumb(caseStudyTrail(study)),
    ],
  };
});

/* -------------------------------------------------------------------------
   Towing vertical

   Generated from src/content/towing.ts using the same pattern as the case
   studies above, so a sixth state is one entry in TOWING_STATES and needs no
   change here, in the sitemap generator, or in the SEO gate.

   Every state page targets a comparison query, so each sets titleOverride
   and h1Override to stateHeadline(), "Best AI Towing Agency in <State>", and
   the two match. That keyword is deliberate; the "towing seo" intent belongs
   to the pillar's <title>. The generated fallback below is kept because
   head.ts holds titles and H1s independently — a future state that wants
   brand-voice framing can simply omit both overrides and get it.
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
 * The towing business setup form, behind the header's "Become a Tow Provider".
 *
 * Not part of the vertical's content: it targets no query and is noindex, so
 * it sits outside both prefixes verify-seo.ts pools for the towing guardrails.
 * Single segment, so it joins the reserved proposal slugs automatically.
 */
export const TOWING_ONBOARDING_PATH = '/towing-onboarding';

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
    name: area
      ? `AI search and visibility solutions for towing companies in ${area}`
      : 'AI search and visibility solutions for towing companies',
    serviceType: 'AI search and visibility solutions for towing companies',
    provider: { '@id': `${SITE_ORIGIN}/#organization` },
    audience: { '@type': 'BusinessAudience', name: 'Towing companies' },
    areaServed: area ? { '@type': 'State', name: area } : 'US',
    inLanguage: 'en-US',
    // No dateModified: it is not a Service property. Page dates live on the
    // route (RouteMeta.updated) and reach the sitemap from there.
  };
}

/** Hand-written so each reads like a sentence rather than a filled template. */
/**
 * Hand-written per state, 70-160 chars, all unique.
 *
 * These frame the buying decision rather than the market, because every state
 * page targets a comparison query ("best AI towing agency in <state>"). None
 * of them claim we are the best - the pages answer that question honestly and
 * the description has to match what the page actually says.
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
    // Owner, 2026-10-12: towing operators are served in every US state; seven
    // states have a page. Nothing here may imply the others are not served,
    // or claim clients in any particular state.
    description:
      'We serve towing operators in every US state. Seven states have their own page on what differs there: rate rules, truck classes, freight and weather.',
    priority: 0.7,
    // acb5820 created the hub; 0eb7f9a added its link to /towing-jobs. Bump
    // `updated` in the commit that ships the 2026-10-12 coverage wording.
    published: '2026-09-02T01:30:42+05:00',
    updated: '2026-09-02T22:10:52+05:00',
    jsonLd: [
      // No BreadcrumbList: this page shows no visible trail, and structured
      // data has to describe what is on the page.
      //
      // Truthful: an ordered list of the state pages this hub links to. No
      // ratings, no reviews, nothing that cannot be substantiated. Named for
      // what it is, the pages, not "markets served": operators are served in
      // every state, not only these seven.
      {
        '@type': 'ItemList',
        name: 'State pages for towing companies',
        itemListElement: TOWING_STATES.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: s.titleOverride ?? stateHeadline(s.state),
          url: `${SITE_ORIGIN}${TOWING_BASE}/${s.slug}`,
        })),
      },
    ],
  },
  {
    path: TOWING_BASE,
    // "Towing seo" and "towing company seo" are the queries Search Console
    // shows this site for; the title says so. No "lead generation": that is
    // roadmap, not a service (ABOUT_ROADMAP), and a title is not the place to
    // soften that.
    title: 'Towing SEO & AI Search Agency | OptimizeIndex',
    description:
      'Towing SEO and AI search for towing companies: Google Business Profile, reviews, local rankings and how AI assistants describe you. Measured in booked tows.',
    priority: 0.9,
    published: TOWING_PILLAR.published,
    updated: TOWING_PILLAR.updated,
    jsonLd: [
      towingService(),
      // No BreadcrumbList: the pillar shows no visible trail.
      faqPage(TOWING_PILLAR.faqs),
    ],
  },
  {
    path: TOWING_JOBS_PATH,
    title: 'How to Get More Towing Jobs | OptimizeIndex',
    description:
      'Where towing jobs come from — motor club, rotation, private property, fleet and direct calls — and how to shift the mix toward work you price yourself.',
    priority: 0.8,
    published: TOWING_JOBS.published,
    updated: TOWING_JOBS.updated,
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
      // The parent-child relationship, stated in structured data rather than
      // left for a crawler to infer from URL nesting alone. Same pattern the
      // Proudly Serving hub uses for the state pages. Truthful: an ordered
      // list of guides that genuinely exist and are linked from this page.
      {
        '@type': 'ItemList',
        name: 'Guides to each source of towing work',
        itemListElement: TOWING_JOBS_CLUSTER.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.h1,
          url: `${SITE_ORIGIN}${TOWING_JOBS_PATH}/${c.slug}`,
        })),
      },
      // Deliberately no JobPosting: there are no real openings behind this
      // page, and marking up jobs that do not exist would be both a Google
      // policy violation and the exact fabrication this vertical refuses.
    ],
  },
  /*
    Supporting pages beneath /towing-jobs.

    Article rather than towingService: these are informational guides, and the
    service offering they support is described on /towing-companies. No
    JobPosting anywhere in this cluster — there are no real vacancies behind it.
  */
  ...TOWING_JOBS_CLUSTER.map((c) => ({
    path: `${TOWING_JOBS_PATH}/${c.slug}`,
    title: c.title,
    description: c.description,
    priority: 0.7,
    published: c.published,
    updated: c.updated,
    jsonLd: [
      {
        '@type': 'Article',
        headline: c.h1,
        description: c.description,
        inLanguage: 'en-US',
        datePublished: c.published,
        dateModified: c.updated,
        // The byline on the page reads "By OptimizeIndex" and links to /about;
        // the author here is the same Organization node.
        author: { '@id': `${SITE_ORIGIN}/#organization` },
        publisher: { '@id': `${SITE_ORIGIN}/#organization` },
        mainEntityOfPage: `${SITE_ORIGIN}${TOWING_JOBS_PATH}/${c.slug}`,
      },
      breadcrumb([
        { name: 'Home', path: '/' },
        { name: 'Towing Companies', path: TOWING_BASE },
        { name: 'Towing Jobs', path: TOWING_JOBS_PATH },
        { name: c.h1, path: `${TOWING_JOBS_PATH}/${c.slug}` },
      ]),
      faqPage(c.faqs),
    ],
  })),
  ...TOWING_STATES.map((s) => ({
    path: `${TOWING_BASE}/${s.slug}`,
    // Every state currently sets titleOverride to stateHeadline(); the fallback
    // is the same helper so a state that omits it still targets the same
    // comparison query rather than an older phrasing.
    title: `${s.titleOverride ?? stateHeadline(s.state)} | ${SITE_NAME}`,
    description: TOWING_STATE_DESCRIPTIONS[s.slug],
    priority: 0.8,
    published: s.published,
    updated: s.updated,
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

/*
  Titles: every title except the homepage's is "<topic> | OptimizeIndex", one
  brand form, at the end. The homepage keeps the brand first; its wording waits
  for Search Console query data.

  Page dates on the routes below come from git history (see RouteMeta). The
  App-rendered pages all arrived with the first commit (408042c); each
  `updated` is the last commit that changed that page's own content.
*/
export const ROUTES: RouteMeta[] = [
  {
    path: '/',
    // Brand first, then the category in the words people search. Towing is
    // deliberately not named here so the homepage does not compete with
    // /towing-companies for the towing queries.
    title: 'OptimizeIndex | AI Search Optimization & Solutions',
    description:
      'AI solutions for businesses missing revenue: AI-driven SEO, Google Business Profile, AEO and GEO that get you found on Google, Google Maps and in AI assistants.',
    priority: 1.0,
    // a066589 swapped the homepage's second service card.
    published: '2026-07-15T03:42:23+05:00',
    updated: '2026-10-08T05:59:44+05:00',
  },
  {
    path: '/services',
    title: 'AI Search Optimization: SEO, AEO & GEO | OptimizeIndex',
    description:
      'SEO, Google Business Profile, Answer Engine Optimization and Generative Engine Optimization, plus paid, content and CRO work: what each does and who it is for.',
    priority: 0.9,
    // a066589 rewrote the Conversion Optimization description listed here.
    published: '2026-07-15T03:42:23+05:00',
    updated: '2026-10-08T05:59:44+05:00',
    // No BreadcrumbList: a single-level page with no visible trail.
    jsonLd: [faqPage(SERVICES_FAQS)],
  },
  {
    path: '/case-studies',
    title: 'AI Case Studies & Client Results | OptimizeIndex',
    description:
      'Real client results with real attribution — how we grew organic visibility and lead volume for local and B2B businesses, verified in GA4 and Search Console.',
    priority: 0.9,
    // aaca486 is the last commit to change the case-studies list view.
    published: '2026-07-15T03:42:23+05:00',
    updated: '2026-08-25T05:03:32+05:00',
  },
  ...caseStudyRoutes,
  ...towingRoutes,
  {
    path: '/about',
    // From the owner's answers of 2026-10-12: towing and roadside operators are
    // the current focus. Brand at the end, like every other inner page.
    title: 'About: AI for Towing and Roadside Operators | OptimizeIndex',
    description:
      'OptimizeIndex, a trade name of Idea Brothers LLC, builds AI solutions for towing and roadside operators, including an AI voice agent that answers calls.',
    priority: 0.7,
    // 755a1b1 created the page; it has not changed in git since. Bump
    // `updated` in the commit that ships the 2026-10-12 rewrite of about.ts.
    published: '2026-09-10T23:59:21+05:00',
    updated: '2026-09-10T23:59:21+05:00',
    jsonLd: [
      /*
        AboutPage rather than a second Organization node. The sitewide graph
        already declares the organization with an @id; repeating it here would
        give a consumer two descriptions of one entity to reconcile. This
        points at the existing node instead, which is what mainEntity is for.
      */
      {
        '@type': 'AboutPage',
        name: 'About OptimizeIndex',
        description:
          'Who OptimizeIndex is, what it builds for towing and roadside operators, and the boundary of what it does and does not do.',
        url: `${SITE_ORIGIN}/about`,
        inLanguage: 'en-US',
        mainEntity: { '@id': `${SITE_ORIGIN}/#organization` },
      },
      // No BreadcrumbList: a single-level page with no visible trail.
    ],
  },
  {
    path: '/audit',
    title: 'Free SEO & AI Search Audit | OptimizeIndex',
    description:
      'A free 15-point SEO and AI search audit: crawlability, on-page content, speed, and whether AI assistants can read your site. Fix plan within 24 hours.',
    priority: 0.9,
    // aaca486 added the audit FAQs and is the last change to this view.
    published: '2026-07-15T03:42:23+05:00',
    updated: '2026-08-25T05:03:32+05:00',
    // No BreadcrumbList: a single-level page with no visible trail.
    jsonLd: [faqPage(AUDIT_FAQS)],
  },
  {
    path: '/quote',
    title: 'Free SEO Quote & AI Search Proposal | OptimizeIndex',
    description:
      'Get a free SEO and AI search quote: tell us your goal and get a proposal with scope, timeline and expected impact. No contracts, 15-day money-back guarantee.',
    priority: 0.9,
    // aaca486 added the quote FAQs and is the last change to this view.
    published: '2026-07-15T03:42:23+05:00',
    updated: '2026-08-25T05:03:32+05:00',
    // No BreadcrumbList: a single-level page with no visible trail.
    jsonLd: [faqPage(QUOTE_FAQS)],
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy | OptimizeIndex',
    description:
      'How OptimizeIndex collects, uses and protects your data — including analytics, cookies, and the information you submit through our audit and quote forms.',
    priority: 0.3,
    // 5d46225 is the last change to the policy text (SMS section 5).
    published: '2026-07-15T03:42:23+05:00',
    updated: '2026-09-20T04:01:56+05:00',
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service | OptimizeIndex',
    description:
      'The terms governing your use of the OptimizeIndex website and services, including our no-contract policy and the 15-day money-back guarantee.',
    priority: 0.3,
    // 5d46225 is the last change to the terms text (SMS section 5).
    published: '2026-07-15T03:42:23+05:00',
    updated: '2026-09-20T04:01:56+05:00',
  },
  {
    // The path is a literal rather than SMS_PROGRAM_PATH from content/sms.ts,
    // because that file imports CONTACT_EMAIL from here and a cycle between
    // the two would evaluate one of them before its constants exist.
    path: '/sms-program',
    title: 'Text Messaging (SMS) Program | OptimizeIndex',
    description:
      'How the OptimizeIndex text messaging program works: what we text about, how you opt in on a call, message frequency, and how to reply STOP or HELP.',
    priority: 0.3,
    // 867a547 created the page; 1efa0c3 added the consent summary at its top.
    published: '2026-09-17T22:57:50+05:00',
    updated: '2026-09-20T04:16:45+05:00',
  },
  {
    // Reached from the header's "Become a Tow Provider" button. A form with no
    // search intent of its own, so noindex and no priority keep it out of the
    // index and the sitemap, and it is not in llms.txt.
    path: TOWING_ONBOARDING_PATH,
    title: 'Tow Provider Sign-Up | OptimizeIndex',
    description:
      'Sign up as a tow provider with OptimizeIndex: your business details, fleet, service area, dispatch, the jobs you want and your Google Business Profile.',
    noindex: true,
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
