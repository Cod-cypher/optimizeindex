/**
 * Towing vertical content.
 *
 * The single source of truth for the towing pillar page and every state page.
 * src/routes.ts generates one route per entry here, which means the sitemap
 * (scripts/prerender.ts) and the SEO gate (scripts/verify-seo.ts) pick new
 * states up automatically — adding a sixth state is one entry in TOWING_STATES
 * and nothing else.
 *
 * Two axes, deliberately kept apart
 * --------------------------------
 * DemandIntent  = the job the operator is trying to win (who is calling).
 * ServiceIntent = what we do to win it (GBP, reviews, organic, AI, paid).
 *
 * Collapsing these two into one list is what turns a set of local landing
 * pages into five paraphrases of each other. Keeping them separate is what
 * lets each state carry a different *mix* and read as a different page.
 *
 * Sourcing rules
 * --------------
 * 1. REGULATORY AND PROGRAM CLAIMS need a primary-source citation in `sources`
 *    — a government or agency domain, not a trade blog or a competitor — plus
 *    a `checkedAt` date so the claim can be re-verified later. If it could not
 *    be confirmed from a primary source it is not here; see CONTENT_GAPS.
 *
 * 2. COMPARATIVE CLAIMS ("busiest", "fifth", "more than any state") need the
 *    same treatment. Superlatives that merely felt true — "densest tow market
 *    in the country", "most competitive by operator count" — were removed
 *    rather than sourced, because no primary source counts tow operators that
 *    way. What survives is cited.
 *
 * 3. RANKING CLAIMS follow Google's own documented framework: local results
 *    are based on relevance, distance and prominence, and Google says more
 *    reviews and positive ratings *can help* local ranking. That is the
 *    strongest form of the claim available, and the copy does not go past it
 *    into "do X and you will rank". Nobody outside Google can promise that,
 *    and a page that does is telling an operator something untrue.
 *
 * This mirrors the discipline the rest of the site already applies to
 * statistics, where every figure names the tool it was verified in.
 */

import type { Faq } from '../types';

/**
 * The H1 and title of every state page.
 *
 * "Best AI Towing Agency in <State>" is the query these pages were built to
 * target, deliberately. Do not retitle it toward "towing seo": that intent
 * belongs to /towing-companies, whose <title> carries it. One helper rather
 * than seven literals because scripts/verify-seo.ts requires a state page's
 * H1 to equal its title's leading clause, and two strings that must be
 * identical should have one source.
 */
export const stateHeadline = (state: string) => `Best AI Towing Agency in ${state}`;

/** Axis 1 — the job the operator is trying to win. */
export type DemandIntent =
  | 'emergency-roadside'
  | 'accident-recovery'
  | 'heavy-duty'
  | 'private-property'
  | 'long-distance'
  | 'roadside-services';

/** Axis 2 — what we actually do to win it. First-class, never implied. */
export type ServiceIntent =
  | 'google-business-profile'
  | 'reviews-reputation'
  | 'local-organic'
  | 'ai-answers'
  | 'paid-search';

export const DEMAND_LABELS: Record<DemandIntent, string> = {
  'emergency-roadside': 'Emergency roadside',
  'accident-recovery': 'Accident recovery',
  'heavy-duty': 'Heavy-duty and commercial',
  'private-property': 'Private property and impound',
  'long-distance': 'Long-distance transport',
  'roadside-services': 'Roadside services',
};

export const SERVICE_LABELS: Record<ServiceIntent, string> = {
  'google-business-profile': 'Google Business Profile & Maps',
  'reviews-reputation': 'Reviews & reputation',
  'local-organic': 'Local search & website',
  'ai-answers': 'AI answers (AEO/GEO)',
  'paid-search': 'Paid search',
};

/** A primary source backing a regulatory, program or comparative claim. */
export interface SourceRef {
  label: string;
  url: string;
  /** What specifically this source is cited for, so an audit is one click. */
  supports: string;
  /**
   * ISO date this URL was last read and the claim confirmed against it.
   *
   * Statutes get amended and agency programs change. Without a checked date a
   * reader cannot tell whether a citation is current or four years stale, and
   * neither can we.
   */
  checkedAt: string;
}

/**
 * One answer-first block.
 *
 * `question` is the visible heading and `answer` is a complete, standalone
 * response to it in roughly 40-60 words. The split is not cosmetic: AI search
 * retrieves passages rather than pages, so the answer has to make sense with
 * everything around it stripped away. `detail` elaborates for the human who
 * kept reading.
 */
export interface TowingSection {
  id: string;
  question: string;
  answer: string;
  detail?: string[];
  service?: ServiceIntent;
  demand?: DemandIntent;
  /** Renders a tap-to-call inside this block rather than only at page end. */
  callCta?: string;
}

/**
 * One line of scope in the "how we would build this" block.
 *
 * `why` is the field that matters. Without it the list is a generic agency
 * services menu with a state name at the top; with it, each line has to earn
 * its place from something specific about that market — which is also the
 * check on whether the state page is really bespoke or just re-ordered.
 */
export interface EngagementStep {
  service?: ServiceIntent;
  /** Some scope lines answer a demand type rather than a service surface. */
  demand?: DemandIntent;
  title: string;
  /** What the work actually is. */
  what: string;
  /** Why it is weighted this way *in this state*. */
  why: string;
}

/**
 * One criterion in the "how to choose an agency" block.
 *
 * `ours` is what stops this being a neutral listicle with no commercial point:
 * the page sets an evaluation bar and then answers against it itself.
 */
export interface BuyerCriterion {
  question: string;
  /** What a credible answer from any agency sounds like. */
  goodAnswer: string;
  /** Ours, against the same criterion. */
  ours: string;
}

export interface TowingState {
  slug: string;
  state: string;
  /**
   * When this page's content was first published, as an ISO 8601 date-time
   * with offset taken from git history (`git log --format=%cI`): the commit
   * that created it.
   */
  published: string;
  /**
   * When this page's content last changed substantively, in the same format,
   * from the commit that made the change. routes.ts copies it into the route,
   * where it drives the visible "Last updated" stamp, Article dateModified and
   * the sitemap's <lastmod>.
   *
   * Bumped by hand when the copy actually changes rather than generated from the
   * build date — an automatic date would claim a fresh review on every deploy,
   * which is exactly the kind of unearned freshness signal the rest of this
   * codebase refuses to fabricate. A refactor that leaves the rendered text
   * unchanged is not an update.
   */
  updated: string;
  /** Named in copy so the page earns metro long-tail without a page each. */
  metros: string[];
  /**
   * Renders directly under the H1, so it is the passage a retriever is most
   * likely to lift and the first thing Google reads.
   *
   * Every state page targets the comparison query, so every lede answers it
   * honestly (no independent ranking exists) and names OptimizeIndex — but each
   * opens from that state's own market, in its own words. The seven used to
   * share one opening frame with the state name swapped, which is the doorway
   * pattern. Name the state's cities as the market, never as a client list.
   */
  landscape: string;
  /**
   * Overrides the "Proudly Serving <State> Towing Companies" H1.
   *
   * Set only where the page targets a comparison query and the H1 needs to be
   * the query itself. Every state currently does, via stateHeadline(), and
   * verify-seo.ts requires the H1 to equal the title's leading clause, so set
   * both overrides from that one helper rather than typing either by hand.
   */
  h1Override?: string;
  /** Overrides the generated title. Must equal h1Override on a state page. */
  titleOverride?: string;
  /**
   * The commercial bridge: what the market facts above mean for how an
   * operator here actually gets found.
   *
   * These pages read as informational state guides without it — market facts,
   * more market facts, then a CTA that does not follow from anything. This is
   * the paragraph that turns "here is your state" into "here is your problem",
   * so that the engagement block below reads as the answer to something.
   */
  searchProblem: string;
  demand: DemandIntent[];
  services: ServiceIntent[];
  sections: TowingSection[];
  /**
   * Scope, ordered by what this state actually needs first.
   *
   * The ordering is the substance. A Florida engagement leads with seasonal
   * readiness and impound reputation; an Indiana one leads with corridor pages
   * for fleet buyers and treats consumer reviews as proportional. Same agency,
   * genuinely different first ninety days.
   */
  engagement: { heading: string; intro: string; steps: EngagementStep[] };
  /**
   * Evaluation framework for hiring an agency.
   *
   * This is how a state page earns the "best AI towing agency in <state>"
   * query without asserting we are it. Someone typing "best" wants to compare,
   * so the honest way to rank is to genuinely help them compare and then answer
   * the same questions about ourselves.
   *
   * Optional: only the comparison-query pages carry one.
   */
  buyersGuide?: { heading: string; intro: string; criteria: BuyerCriterion[] };
  /**
   * Only questions whose answer is specific to this state and not already
   * given by a section on the same page. The national Google Business Profile
   * questions (GBP_FAQS) and the statement of what OptimizeIndex does and does
   * not do live on the pillar; an FAQ that restates a section here is cut, not
   * reworded. Generated into FAQPage JSON-LD from this same array.
   */
  faqs: Faq[];
  sources?: SourceRef[];
}

export interface TowingPillar {
  /** First published, from git history. Same format and rules as TowingState. */
  published: string;
  /** Last substantive change, bumped by hand. See TowingState.updated. */
  updated: string;
  metros: string[];
  intro: string;
  sections: TowingSection[];
  faqs: Faq[];
  sources?: SourceRef[];
}

/* -------------------------------------------------------------------------
   Google's own documentation, cited on every page that describes ranking.
------------------------------------------------------------------------- */

const GOOGLE_LOCAL_RANKING: SourceRef = {
  label: 'Google Business Profile Help — Tips to improve your local ranking on Google',
  url: 'https://support.google.com/business/answer/7091?hl=en',
  supports:
    'Local results are based on relevance, distance and prominence; prominence draws on signals including links and review count; more reviews and positive ratings can help local ranking; complete and accurate business information makes a profile more likely to show in local results.',
  checkedAt: '2026-08-27',
};

// Re-read 2026-10-12. The earlier summary said Google asks for different
// services to be listed on one profile; the page does not say that in those
// words, so the supports text (and the copy citing it) now states only what the
// page says, and adds the phone-number rules the Washington section relies on.
const GOOGLE_REPRESENTING: SourceRef = {
  label: 'Google Business Profile Help — Guidelines for representing your business on Google',
  url: 'https://support.google.com/business/answer/3038177?hl=en',
  supports:
    'Do not create more than one page for each location of your business; publicly facing departments that operate as distinct entities should have their own; a practitioner should not have multiple profiles to cover their specialisations. The phone number must be under the direct control of the business and connect to the individual business location. A service-area business should hide its address from customers.',
  checkedAt: '2026-10-12',
};

/* Review solicitation. Cited on the pillar, which carries the review policy in
   full; the state pages give the same advice in their own words without
   attributing it, so no state needs these in its source list. */

const GOOGLE_REVIEW_POLICY: SourceRef = {
  label: 'Google Maps user-generated content policy — Prohibited and restricted content',
  url: 'https://support.google.com/contributionpolicy/answer/7400114?hl=en',
  supports:
    'Under rating manipulation, merchants may not discourage or prohibit negative reviews or selectively solicit positive reviews from customers, may not offer incentives such as payment, discounts or free goods or services in exchange for a review, and should not require or pressure users to leave ratings or write reviews while on the premises.',
  checkedAt: '2026-10-12',
};

const FTC_REVIEWS_GUIDE: SourceRef = {
  label: 'Federal Trade Commission — Soliciting and Paying for Online Reviews: A Guide for Marketers',
  url: 'https://www.ftc.gov/business-guidance/resources/soliciting-paying-online-reviews-guide-marketers',
  supports: '"Don\'t ask for reviews only from customers you think will leave positive ones."',
  checkedAt: '2026-10-12',
};

/* -------------------------------------------------------------------------
   Google Business Profile FAQs — pillar only

   These answers are national, so they live on /towing-companies and nowhere
   else. They used to be spread onto all seven state pages as well, which put
   the same five answers on eight URLs. Exported so scripts/verify-seo.ts can
   assert the questions appear only on the pillar. Do not spread them into a
   state's faqs again; a state page links to the pillar instead.
------------------------------------------------------------------------- */

export const GBP_FAQS: Faq[] = [
  {
    question: 'How do I get my tow truck to show up on Google Maps?',
    answer:
      'Claim and verify the Google Business Profile first — an unverified profile is not eligible to appear. Then complete it accurately: primary category, the services you offer, a service area matching where you dispatch, correct hours and real photos. Google says businesses with complete and accurate information are more likely to show in local results.',
  },
  {
    question: 'What actually decides where a towing company ranks on Google Maps?',
    answer:
      'Google documents three factors: relevance (how well your profile matches the search), distance (how far you are from the searcher) and prominence (how well known the business is, drawing on signals including links and review count). Distance is fixed by your yard. Relevance and prominence are the parts you can work on.',
  },
  {
    question: 'How do you rank a towing company on Google?',
    answer:
      'There is no single lever. Google bases local results on relevance, distance and prominence, so the work is making the profile accurately describe what you do, building review volume over time, and giving your site and third-party listings enough specific detail to establish what you cover. Anyone selling a guaranteed position is selling something Google does not offer.',
  },
  {
    question: 'How do I get more towing calls without relying on motor clubs?',
    answer:
      'Direct towing calls come from being visible and credible at the moment someone searches, which in practice means the Google Business Profile, the rating a customer sees in the map pack, and whether an assistant can describe your business. Motor-club and rotation work is priced by someone else; changing the mix means competing for the searches that happen before a driver thinks to call their club.',
  },
  {
    question: 'Should a towing company use a service area or a storefront address?',
    answer:
      'If customers never come to your yard, a service-area profile with the address hidden matches how Google asks businesses to represent themselves. Listing an unstaffed yard as a storefront conflicts with those guidelines and risks suspension — and a suspended profile is not eligible to appear in local results at all.',
  },
];

/* -------------------------------------------------------------------------
   Buyer's guide

   Every state page targets a comparison query ("best AI towing agency in
   <state>"), so every state page carries an evaluation framework, and
   scripts/verify-seo.ts fails a state page that lacks the heading below.

   The heading is the only shared part. Each state writes its own criteria —
   the question, what a credible answer sounds like, and ours — from that
   state's rules and market, plus its own intro. An earlier version shared
   eight criteria, their "good answer" prose and the intro across all seven
   pages and swapped in three per-state answers, which made the guide the
   largest templated block in the cluster. Do not reintroduce shared criteria
   or shared prose here.

   What OptimizeIndex does and does not do is stated once, as an FAQ on the
   pillar, and each state page links to it from the component.
------------------------------------------------------------------------- */

/** The required heading. One source, so the gate phrase cannot drift. */
export const buyersGuideHeading = (state: string) =>
  `How to Choose an AI Agency for a Towing Company in ${state}`;

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/**
 * Assembles a state's guide. It holds no prose: the state writes its intro as
 * a function of the criterion count, so the number the intro states is always
 * the number of criteria shown.
 */
function buyersGuideFor(
  state: string,
  intro: (count: string) => string,
  criteria: BuyerCriterion[],
) {
  return {
    heading: buyersGuideHeading(state),
    intro: intro(COUNT_WORDS[criteria.length] ?? String(criteria.length)),
    criteria,
  };
}

/* -------------------------------------------------------------------------
   Pillar
------------------------------------------------------------------------- */

export const TOWING_PILLAR: TowingPillar = {
  // Created in d5914d8; last substantive change in 6565c27 (SEO plan phases 1-4).
  published: '2026-08-27T06:13:50+05:00',
  updated: '2026-10-12T02:34:42+05:00',
  metros: [],
  intro:
    'OptimizeIndex builds AI solutions for towing companies that are missing revenue: AI-driven SEO, Google Business Profile and AI-assistant visibility that get you found on Google, Google Maps and in AI answers, and turn that into direct calls. We report on calls and booked jobs rather than rankings, because a tow operator gets paid for tows and not for impressions.',
  sections: [
    {
      id: 'what-we-do',
      service: 'local-organic',
      question: 'What does a marketing agency actually do for a towing company?',
      answer:
        'For a towing company the work is narrow and specific: get the Google Business Profile accurate and eligible to rank, build steady review volume, make the website answer the questions a stranded motorist asks, and make sure AI assistants have something quotable about you. Everything else is secondary.',
      detail: [
        'Most agencies sell towing company SEO as a generic local package — a monthly report of keyword positions, some blog posts, a backlink line item. That package is built for businesses where a customer researches, compares and decides over days. Towing usually has none of that. The buying window is short, the customer is stressed, and the decision often happens inside Google Maps without a website ever loading.',
        'So we work backwards from the call. The Google Business Profile is the storefront rather than the website. Reviews are the sales pitch. The website exists to catch the searches the map does not answer — heavy-duty, long-distance transport, private-property contracts — and to convince a fleet manager or property manager who genuinely does compare.',
        'If you are comparing towing SEO agencies, the question worth asking each one is where they think the call actually gets won. An agency that answers with keyword positions is describing a buying process your customers do not have. An agency that answers with the profile, the rating and the phone is at least looking at the right screen.',
        'And increasingly the first answer a customer sees is not a list of links at all. When someone asks an assistant for a recommendation, they get named businesses. Being one of the businesses an assistant can describe is a different piece of work from ranking in blue links.',
      ],
      callCta: 'Ask us what this looks like for your operation',
    },
    {
      id: 'gbp',
      service: 'google-business-profile',
      demand: 'emergency-roadside',
      question: 'Why does the Google Business Profile matter so much in towing?',
      answer:
        'Emergency tow searches are typically resolved in Google Maps, often without a website loading. Google documents that local results depend on relevance, distance and prominence, and that complete, accurate profiles are more likely to appear. Of the assets an operator controls, the profile is the one those factors bear on most directly.',
      detail: [
        'Consider the moment. Someone is on a shoulder with a dead car. They open Maps or search for a tow on a phone, look at the handful of businesses in the local map pack, glance at the ratings, and tap to call. Website design, page speed and blog content play little part in that transaction. Profile completeness, category accuracy, service area, hours and rating are what is actually on screen.',
        'This is also why suspension is worth taking seriously. Google asks businesses not to misrepresent a location, and an operator who lists an unstaffed yard as a storefront, or puts keywords in the business name, risks losing the profile — and a suspended profile is not eligible to appear at all. The appeal process is slow.',
        'The work itself is unglamorous and mostly one-time: correct primary category, service area matching real dispatch range, hours that reflect whether you genuinely dispatch overnight, real photographs of real trucks, services listed individually rather than implied, and a business description that says plainly what you run. Google describes complete and accurate information as making a profile more likely to show in local results, which is about as direct as its guidance gets.',
      ],
      callCta: 'Get your profile reviewed',
    },
    {
      id: 'reviews',
      service: 'reviews-reputation',
      question: 'How much do reviews matter for a towing company?',
      answer:
        'Google lists review count among the signals feeding prominence, and says more reviews and positive ratings can help local ranking. Reviews also affect the choice a customer makes once they can see you. For towing, where the decision is often made quickly, the rating carries real weight.',
      detail: [
        'It is worth being precise about what that does and does not mean. Reviews are one input into one of three documented ranking factors — they are not a lever that sets your position, and no agency can tell you how many reviews buys which rank. What can be said is that Google names them, that they are one of the few prominence inputs an operator can influence directly, and that they are visible to the customer at the moment of choosing.',
        'Recency is worth attention alongside count. A profile whose most recent review is three years old reads differently to a customer than one with reviews from last month, regardless of what it does for ranking. Asking on every job, rather than in occasional pushes, tends to produce the steadier pattern.',
        'The practical system is simple: when dispatch closes a job, the customer gets one text with a direct link to your review page, and one follow-up if it goes unanswered. Nothing else. The reason it tends to work is timing rather than persuasion.',
        'It has to go to every customer, the same way. Google\'s policy for Maps content does not allow a business to selectively solicit positive reviews, to offer incentives such as discounts or free services for a review, or to pressure customers into reviewing on the premises, and the FTC\'s guidance for marketers says not to ask only the customers you think will leave positive ones. In towing that rules out the tempting shortcuts: asking only after the jobs that went smoothly, or knocking something off the bill for a good rating. And a request made in person at a collision scene is worse than none; the text that follows later is the request.',
      ],
    },
    {
      id: 'impound-reviews',
      service: 'reviews-reputation',
      demand: 'private-property',
      question: 'What can a towing company do about impound and private-property one-stars?',
      answer:
        'Non-consensual tows generate negative reviews that service quality does not prevent — the customer is upset before the call begins. There is no removal mechanism for an accurate negative review. What is available is steady volume from asking every customer the same way, and public replies written for the next reader.',
      detail: [
        'Towing is unusual among trades here. A plumber earns a one-star for doing bad work; a towing company can earn one for doing exactly what a property owner contracted it to do. Operators running impound or private-property work carry a reputational headwind their consensual-only competitors do not.',
        'Because Google names review count and rating among prominence signals, a rating weighed down by impound complaints may also affect how the profile performs for the emergency roadside searches that are usually more valuable. We would not claim to know the size of that effect — but it is a reasonable concern rather than a hypothetical one. The answer is not to steer requests toward the jobs likely to rate well, which Google\'s review policy does not allow anyway. It is to ask every customer after every job, so the rating reflects the whole business, and to reply to the impound complaints calmly and factually.',
        'A note on a common piece of bad advice: spinning up a second Google Business Profile for the impound side is not a general fix. Google\'s guidelines say not to create more than one profile for each location of a business. A genuinely separate, separately staffed storage facility is a separate location and is a different case — but "we would rather those reviews landed somewhere else" is not, and treating it as one risks both profiles.',
      ],
      callCta: 'Talk through your review situation',
    },
    {
      id: 'direct-calls',
      demand: 'emergency-roadside',
      question: 'How do towing companies get more direct calls instead of motor-club dispatch?',
      answer:
        'Motor-club and rotation work fills the schedule at rates someone else sets. Direct calls are the ones you price yourself. Shifting the mix means being visible and credible at the moment a motorist searches — which is mostly a profile, review and content problem.',
      detail: [
        'The useful question is rarely "how do we get more tows" — it is "how do we change the mix".',
        'Direct calls come from being findable and trustworthy at the moment of the breakdown, which in practice means the Google Business Profile, the rating a customer sees, and whether an assistant has anything to say about you. We are not aware of a channel that skips those.',
        'This is also the argument for measuring calls rather than traffic. A campaign that lifts sessions without moving phone volume has not changed the mix, and a report built on impressions will not surface that.',
      ],
      callCta: 'Talk about your call mix',
    },
    {
      id: 'heavy-duty',
      demand: 'heavy-duty',
      service: 'local-organic',
      question: 'How is marketing a heavy-duty towing operation different?',
      answer:
        'Heavy-duty and commercial recovery is the part of towing that behaves like ordinary B2B. The caller is a dispatcher or fleet manager, the ticket is larger, the decision usually involves comparison, and the website matters in a way it often does not for consumer roadside work.',
      detail: [
        'A fleet dispatcher looking for heavy-duty recovery on an interstate corridor is doing something a stranded motorist rarely does: evaluating. They want tonnage capacity, equipment on the roster, corridor coverage, response time, and whether you can handle a loaded trailer. That is a website job with real specification pages rather than a Maps job.',
        'Ticket sizes are generally larger, and fleet relationships tend to recur. For operators running both sides, the heavy-duty pages often earn their keep despite attracting a fraction of the traffic — though how much depends on your equipment and what the corridor actually carries.',
        'Corridor coverage is a useful organising idea, because fleet buyers tend to think in routes rather than city names. Pages built around the interstates you actually cover generally match that better than pages built around towns.',
      ],
    },
    {
      id: 'ai-answers',
      service: 'ai-answers',
      question: 'Do AI assistants recommend local towing companies?',
      answer:
        'Assistants do return named businesses when asked for recommendations, assembled from sources they can retrieve rather than from a ranked list of pages. Being retrievable — having clear, quotable, entity-rich information about your business in places a model can reach — is a distinct piece of work from ranking.',
      detail: [
        'The mechanics differ from search in a way that matters. An assistant does not rank pages; it retrieves passages from sources it can reach and composes an answer, citing a few. So the useful question is not "where do we rank" but "does text exist that clearly associates this business with towing in this place, in a form a model can quote".',
        'Two practical consequences. First, content has to be written so a single extracted paragraph still makes sense — naming the business, the service and the area rather than leaning on the page around it. Second, much of what gets cited is not on your own site: directories, trade publications, community discussion.',
        'We will not put a number on how much towing demand currently runs through assistants; we have not seen a measurement we would stand behind, and nor has anyone quoting one at you. What we can say is that the work is cheap relative to its cost later, and that it overlaps almost entirely with writing clearly for humans.',
      ],
      callCta: 'See how assistants describe your business',
    },
    {
      id: 'cost',
      question: 'How much does towing company marketing cost?',
      answer:
        'It depends on how much of the work is one-time cleanup versus ongoing competition. Profile and review foundations are largely fixed effort; competing in a dense metro against established operators is ongoing. We scope against your call volume and quote before you commit, with no contract.',
      detail: [
        'We will not publish a price grid we would not honour. What we can be concrete about is the shape: an operator with an unclaimed or neglected profile has cheap ground to make up, and the early months are mostly correction. An operator already ranking who wants to take share in a competitive metro is a different and larger engagement.',
        'What holds either way is how it gets measured — calls, then booked jobs, rather than sessions and keyword positions. If a month of work did not move phone volume, we would rather say so than send a report about impressions.',
      ],
      callCta: 'Get a quote for your market',
    },
  ],
  faqs: [
    // The statement of scope. Every state page links here from the component
    // (TowingStatePage) instead of carrying its own after-hours or "we do not
    // do that" answer, so the boundary is written once. Owner-confirmed
    // 2026-10-12: live for every client are the AI voice agent (answers the
    // call, qualifies the caller, books the job, hands it to the operator's own
    // dispatcher) and an AI chat assistant on the client's website. Automated
    // SMS, running dispatch and lead sales are not. Keep those denials exactly
    // this strong; dispatch and lead generation are roadmap items whose wording
    // lives only in ABOUT_ROADMAP (src/content/about.ts).
    {
      question: 'What does OptimizeIndex do for a towing company, and what does it not do?',
      answer:
        'We use AI to get a towing company found, to answer the calls that follow, and to measure what that produces: the Google Business Profile, reviews, the website, how AI assistants describe the business, and call tracking. Our AI voice agent answers calls for client businesses, qualifies the caller, books the job and hands it to your own dispatcher, and we run an AI chat assistant on your website. We do not run dispatch for you, send automated SMS or sell leads, and we are not a motor club or a broker. We cannot control rankings, motor-club dispatch, rotation lists or whether a caller decides to book, so we do not promise calls, jobs or revenue.',
    },
    {
      question: 'Do you only work with towing companies?',
      answer:
        'Towing and roadside operators are our focus, and we work with them in every US state. This site has dedicated pages for seven states because their rules and demand patterns are worth setting out in detail; they are not a list of the only states we serve. The case studies we publish come from earlier work with e-commerce and B2B service businesses, so ask us for towing-specific references before you weigh them.',
    },
    ...GBP_FAQS,
    {
      question: 'How do towing companies get more Google reviews?',
      answer:
        'Ask every customer, the same way, every time. When the job closes, dispatch sends one text carrying a direct review link, plus one follow-up if there is no reply. Do not choose who gets asked by job type or by how the call went, offer nothing in return, and never ask at a collision scene. Google names review count among prominence signals and says more reviews and positive ratings can help local ranking.',
    },
    {
      question: 'How should a towing company respond to a negative review?',
      answer:
        'Reply publicly, quickly and without arguing the facts. Acknowledge the frustration, state the policy plainly, and move specifics to a phone call. The reply is not really written for the reviewer — it is written for the next person reading it while deciding who to call.',
    },
    {
      question: 'Can a towing company set up a second Google profile for its impound business?',
      answer:
        'Generally no. Google\'s guidelines say not to create more than one profile for each location of a business, while a public-facing department that operates as a distinct entity can have its own. A genuinely separate, separately staffed facility is a distinct location and a different question — check the current guidelines before acting.',
    },
    {
      question: 'How long before a towing company sees more calls?',
      answer:
        'Profile corrections are the fastest lever because eligibility and accuracy are prerequisites for appearing at all. Review volume builds over months. Organic and AI visibility are slower again. Anyone promising a fixed timeline for a specific ranking is guessing — Google does not publish one and neither should we.',
    },
  ],
  sources: [GOOGLE_LOCAL_RANKING, GOOGLE_REPRESENTING, GOOGLE_REVIEW_POLICY, FTC_REVIEWS_GUIDE],
};

/* -------------------------------------------------------------------------
   States

   Ordered by the mix that actually matters locally, not by a template. The
   `landscape` paragraph, the leading sections AND the reviews section all
   differ per state on purpose — an earlier draft shared one reviews block
   across all five, which was the single biggest source of sameness between
   these pages. scripts/verify-seo.ts reports pairwise similarity so a slide
   back toward a template is visible at build time.
------------------------------------------------------------------------- */

const california: TowingState = {
  slug: 'california',
  state: 'California',
  // Created in d5914d8; last substantive change in 6565c27 (SEO plan phases 1-4).
  published: '2026-08-27T06:13:50+05:00',
  updated: '2026-10-12T02:34:42+05:00',
  metros: ['Los Angeles', 'San Diego', 'San Jose', 'Sacramento', 'Fresno', 'the Inland Empire'],
  h1Override: stateHeadline('California'),
  titleOverride: stateHeadline('California'),
  landscape:
    'Nobody publishes an independent ranking of AI agencies for towing, so the honest answer to "best AI towing agency in California" is a method rather than a name. Judge each agency on whether it understands how California tow work is split, with CHP rotation on one side and direct calls won in Google Maps on the other, and whether it can show you which searches produced the calls you priced yourself. OptimizeIndex uses AI to make towing companies findable from Los Angeles and San Diego to Sacramento, Fresno and the Inland Empire, and to measure the calls they are missing. Below are the questions to ask, with our own answers.',
  searchProblem:
    'California is a useful place to be specific about what AI can and cannot fix, because the state hands towing companies an unusually clear commercial problem. The California Highway Patrol runs a Rotation Tow Program it describes as voluntary and not intended to be a main source of income — rotation fills the schedule, but someone else prices it. Direct calls carry the margin. Changing that mix is a measurement problem before it is a marketing one: you cannot shift a channel mix you cannot see, and most California operators cannot currently say which searches produced their direct calls.',
  engagement: {
    heading: "How we would build a California towing company's search presence",
    intro:
      'Scope varies with what you already have; for a California operator the sequence below is how we would weight the work, and why. The short version: we fix the Google Business Profile, build a review system that survives a rotation-heavy job mix, make the business legible to Google and to AI assistants, and report the result in calls rather than impressions.',
    steps: [
      {
        service: 'google-business-profile',
        title: 'Google Business Profile optimization (GMB)',
        what: 'Primary category, individually listed services, service area, hours, real fleet photos and a description that says plainly what you run, plus a check that nothing on the profile puts it at risk of suspension.',
        why: 'Your yard\'s distance from a breakdown is fixed, so on the freeways of Los Angeles, San Diego and San Jose the work goes into relevance: how well the profile matches the search. Google says complete, accurate profiles are more likely to show up locally.',
      },
      {
        service: 'reviews-reputation',
        title: 'A review system built for a rotation-heavy job mix',
        what: 'One text with a direct review link sent from dispatch after every job, rotation, roadside and private tows alike, with one follow-up and reply templates for the negatives that arrive anyway.',
        why: 'Rotation and accident tows seldom end in a review, because the customer did not choose you and has just had a collision. Asking everyone the same way is how a busy California operator stops looking quiet on Google without picking and choosing who gets asked.',
      },
      {
        service: 'local-organic',
        title: 'Pages for the services and yards you actually run',
        what: 'A page for each service you genuinely offer, and a location page only where you have a real operation: a yard, trucks based there, work that differs. Everywhere else you reach gets one accurate statement of the area you cover.',
        why: 'Your coverage across Los Angeles, Sacramento, Fresno and the Inland Empire is not equal. A second yard in the Inland Empire has something of its own to say on a page; a city your trucks merely drive into does not, and a page for it would repeat the one before.',
      },
      {
        demand: 'emergency-roadside',
        title: 'Accident and roadside service pages',
        what: 'Dedicated pages for collision recovery, roadside assistance, lockouts and jump starts, each answering what that caller actually asks.',
        why: 'These catch the searches a map result does not answer, and they give an assistant something specific to quote about what you handle.',
      },
      {
        demand: 'heavy-duty',
        title: 'Heavy-duty corridor pages, where they apply',
        what: 'Tonnage, recovery equipment and corridor coverage stated plainly for fleet dispatchers.',
        why: 'Only worth building if you run the equipment. Where you do, this buyer compares on a website in a way a stranded motorist never does.',
      },
      {
        service: 'ai-answers',
        title: 'AI-search and entity visibility',
        what: 'Passages that still name the business, the service and the metro when an assistant lifts them out of the page, plus presence in the directories and listings assistants retrieve from.',
        why: 'An assistant asked for a tow in San Jose or Fresno names the businesses it can describe from what it retrieves. Being one of them is separate work from ranking, and it has to be done metro by metro.',
      },
      {
        title: 'Call measurement split by rotation and direct work',
        what: 'Calls and form submissions logged page by page and section by section, plus booked tows from your dispatch records, so direct calls are counted apart from rotation.',
        why: 'The mix between rotation and direct calls is the thing worth changing in California, and a report built on sessions or impressions cannot show whether it moved.',
      },
    ],
  },
  demand: ['emergency-roadside', 'accident-recovery', 'private-property', 'heavy-duty'],
  services: ['ai-answers', 'google-business-profile', 'reviews-reputation', 'local-organic'],
  buyersGuide: buyersGuideFor(
    'California',
    (n) =>
      `Put these ${n} questions to any AI agency pitching a California towing company. Each comes from how tow work is won and regulated in this state; under each is what a credible answer sounds like, and how OptimizeIndex answers it. If another agency answers them better, hire them.`,
    [
      {
        question: 'Does it know where a California tow call is actually decided?',
        goodAnswer:
          'On a freeway shoulder in Los Angeles or San Diego the choice is usually made in a map result, quickly, often without a website loading. An agency that opens with blog posts and keyword reports is working on the wrong screen.',
        ours:
          'We start with the Google Business Profile and the rating a caller sees, then build service pages for the jobs a map result does not answer, and we will tell you plainly when your website is the smaller lever.',
      },
      {
        question: 'Can it separate your rotation work from your direct calls?',
        goodAnswer:
          'A California report should count CHP rotation tows and direct calls apart, because the direct calls are the ones you price yourself. A single blended lead count hides exactly the mix you are trying to change.',
        ours:
          'We log every tap-to-call and form, page by page, and match them to booked tows in your dispatch records, so the calls that came from search sit apart from the rotation work the CHP sends you.',
      },
      {
        question: 'Does it know what the CHP rotation program is before it writes on your profile?',
        goodAnswer:
          'A public reply or a service page that gets the rotation program wrong reads worse than silence. The agency should know how the program describes itself before it writes anything in your name.',
        ours:
          'We know the CHP Rotation Tow Program is voluntary and, in the CHP\'s own words, not intended to be a main source of income, and that rotation and accident-scene tows rarely produce reviews because the customer did not choose you. That shapes when a review request goes out (by text after the job, never at a collision scene) and what a public reply should say.',
      },
    ],
  ),
  sections: [
    {
      id: 'ca-rotation',
      demand: 'accident-recovery',
      question: 'Should a California towing company rely on CHP rotation work?',
      answer:
        'The California Highway Patrol states that participation in its Rotation Tow Program is voluntary and "is not intended to be a main source of income." Building a California towing business primarily on rotation runs against how the program administrator describes its own purpose.',
      detail: [
        'That line from the CHP is worth sitting with, because it settles an argument many owners have with themselves. Rotation smooths the schedule. The agency running it says it was not designed to be the business.',
        'The program also carries real compliance overhead. The CHP requires rotation tow drivers to have completed a tow truck driver training program approved by the Tow Service Agreement Advisory Committee within the previous five years, requires applicants to submit fingerprints to the Department of Justice, and requires a certificate of insurance providing not less than 30 days written notice to the CHP if the policy is cancelled or is due to expire.',
        'None of that is an argument against rotation. It is an argument for treating it as one channel among several, and for putting deliberate effort into the direct calls you price yourself, which in California means competing for the moment a motorist opens Google Maps.',
      ],
      callCta: 'Talk about your California call mix',
    },
    {
      id: 'ca-density',
      service: 'google-business-profile',
      demand: 'emergency-roadside',
      question: 'How do you compete on Google Maps in a crowded California metro?',
      answer:
        'Google weighs three things for a local result: relevance, distance and prominence. On a Los Angeles or San Diego freeway a breakdown may sit within reach of several yards, so distance may not separate them much. Relevance and prominence are the two an operator can actually work on.',
      detail: [
        'Relevance is the cheaper half and the more controllable. Complete and accurate information, Google says, makes a business more likely to show up in local results; in practice that means the primary category, individually listed services, a service area matching genuine dispatch range, truthful hours and real photographs of the fleet. Much of it is an afternoon of work.',
        'Prominence is slower. Google describes it as how well known a business is, drawing on signals including how many websites link to you and how many reviews you have, and says more reviews and positive ratings can help local ranking. It does not publish weightings, so nobody can tell you what a given number of reviews is worth — but it is one of the few prominence inputs an operator can influence directly.',
        'None of this buys a particular position in Los Angeles or anywhere else: distance still counts, and Google changes how it weighs things without publishing the weights. An incomplete profile, though, is competing with one hand tied, and that part is fixable.',
      ],
      callCta: 'Get your California profile reviewed',
    },
    {
      id: 'ca-reviews',
      service: 'reviews-reputation',
      demand: 'accident-recovery',
      question: 'Why is review-building harder for California operators doing rotation work?',
      answer:
        'Rotation and accident-scene tows are a poor source of reviews. The customer has just been in a collision, did not choose you, and is dealing with police and insurers. An operator whose volume skews to rotation can run a busy schedule and still accumulate very few reviews.',
      detail: [
        'This is the review problem specific to California, and it follows directly from the CHP rotation structure described above. The tows that fill the calendar are frequently the ones least likely to end in a review at all, while the jobs where the customer picked you are the thinner part of the mix. The result is a profile that understates how busy the business actually is.',
        'Picking the jobs likely to rate well and asking only there is not the fix. Make the request automatic and identical instead: dispatch closes any job, the system texts that customer a review link, and it nudges once more if nothing comes back. Roadside assists, lockouts, jump starts, scheduled transports and private tows will still produce most of the reviews, because those customers chose you and are in a position to say so. The rotation customer gets the same text and is free to ignore it.',
        'For rotation and accident work, the realistic goal is a calm, professional interaction and a driver who never asks for a review at the roadside of a collision. The automatic text does the asking once the customer is off the shoulder; asking at the scene is worse than not asking.',
        'None of this is a ranking guarantee. Google names review count among prominence signals and says more reviews and positive ratings can help, which is the honest ceiling on the claim. The business case stands on its own regardless: a busy operator whose profile looks quiet is losing the customers who compare before tapping.',
      ],
      callCta: 'Talk through your review mix',
    },
    {
      id: 'ca-ai',
      service: 'ai-answers',
      question: 'How do California towing companies get named by AI assistants?',
      answer:
        'Ask an assistant for a tow recommendation in a California city and it returns named businesses, assembled from sources it can retrieve — directories, reviews, published pages. Being one of them depends on clear, quotable information about your service and area existing where a model can reach it.',
      detail: [
        'For a California operator the work is to be specific in a way that is easy to extract: naming the metro, the equipment and the kind of job, rather than writing copy that would fit any operator in any state.',
        'We do not have a defensible figure for how much California towing demand currently runs through assistants, so we are not going to quote one. The argument for doing the work is that it is inexpensive, it overlaps with writing clearly for customers, and the sources assistants draw on take time to accumulate.',
      ],
    },
  ],
  faqs: [
    // The restating FAQs (CHP driver requirements, rotation as main income,
    // reviews despite being busy) were cut: ca-rotation and ca-reviews above
    // already answer them on this page. What OptimizeIndex does and does not
    // do is on the pillar, linked from the component.
    {
      question: 'How can AI help a towing company in California?',
      answer:
        'For a California operator the first jobs for AI are visibility and measurement. We work on being retrievable when someone asks an assistant for a tow in Los Angeles, San Diego or Sacramento, and on tracking which searches produced direct calls rather than rotation work — because the mix between those two is the thing worth changing, and you cannot change what you cannot see.',
    },
  ],
  sources: [
    {
      label: 'California Highway Patrol — Rotation Tow Program',
      url: 'https://www.chp.ca.gov/programs-services/for-law-enforcement/rotation-tow-program/',
      supports:
        'Existence of the Rotation Tow Program, and that participation is voluntary and not intended to be a main source of income.',
      checkedAt: '2026-08-27',
    },
    {
      label: 'California Highway Patrol — Tow Service Agreement (2025–2026)',
      url: 'https://www.chp.ca.gov/siteassets/exams/examination-study-guides/061-2025-02008---2025-2026-tsa--final.pdf',
      supports:
        'TSAAC-approved driver training within five years, Department of Justice fingerprint submission, and the 30-day insurance notice requirement.',
      checkedAt: '2026-08-27',
    },
    GOOGLE_LOCAL_RANKING,
  ],
};

const florida: TowingState = {
  slug: 'florida',
  state: 'Florida',
  // Created in d5914d8; last substantive change in 6565c27 (SEO plan phases 1-4).
  published: '2026-08-27T06:13:50+05:00',
  updated: '2026-10-12T02:34:42+05:00',
  metros: ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'Fort Lauderdale', 'St. Petersburg'],
  h1Override: stateHeadline('Florida'),
  titleOverride: stateHeadline('Florida'),
  landscape:
    'A towing company in Miami, Tampa or Orlando competes for callers who have never heard of it: visitors, seasonal residents and drivers caught out by a storm, choosing in a map result or asking an assistant. That is the test for any AI agency pitching a Florida operator. No independent ranking applies it for you, which is why nobody can honestly claim to be the best AI towing agency in Florida. OptimizeIndex builds the AI visibility that puts a towing company in front of those callers, and counts the calls it would otherwise miss; the questions below are how to judge us and anyone else.',
  searchProblem:
    'Florida sharpens the question of what an AI agency is even for, because it removes the obvious lever. Under Florida Statutes section 125.0103, counties must establish maximum rates for towing from private property and for accident-scene removal and storage, and must publish them. With price set locally and openly, what is left is being found first and trusted quickly — and knowing which of your seasons, pages and campaigns actually produced calls, in a market where demand arrives in tourist and storm surges rather than a flat line.',
  engagement: {
    heading: "How we would build a Florida towing company's search presence",
    intro:
      'How much of each piece you need turns on your mix of impound, roadside and transport work, but a Florida engagement would run in roughly this sequence. The short version: we get the Google Business Profile ready ahead of the season, take the impound reputation problem seriously rather than pretending it away, build the transport pages that capture the planned side of your demand, and measure it in calls.',
    steps: [
      {
        service: 'google-business-profile',
        title: 'Google Business Profile optimization (GMB)',
        what: 'Category, individually listed services, service area, truthful overnight hours, real photos and an accurate business description, plus a suspension-risk check.',
        why: 'Tourist and seasonal callers have no operator saved in their phone. Their decision happens in Google Maps on whatever is visible, so the profile is doing the selling.',
      },
      {
        title: 'Seasonal demand preparation',
        what: 'A pre-season pass over hours, service areas and listed services, timed to finish before tourist and storm season rather than during it.',
        why: 'Demand arrives in surges that are hard to staff for and entirely possible to be visible for. A profile corrected mid-season has already missed the calls that season produced.',
      },
      {
        service: 'reviews-reputation',
        title: 'Private-property and impound reputation management',
        what: 'Reply templates citing the published local rate framework and the statutory complaint process, plus one review text sent after every job to every customer, impound releases included, with no screening by job type.',
        why: 'Section 125.0103 requires the county or municipality to publish maximum rates and to run a fee-complaint process. Florida is the one state where a factual reply has an official destination to point at.',
      },
      {
        demand: 'long-distance',
        title: 'Vehicle transport landing pages',
        what: 'Pages answering what a planned transport customer actually asks: enclosed versus open, timelines, insurance, interstate routes.',
        why: 'Seasonal residents and dealers move vehicles deliberately and compare over days. That decision is made on a website, not in a map result.',
      },
      {
        service: 'local-organic',
        title: 'Location pages only where you are based',
        what: 'Pages for the services you actually run, and a location page only for a base with its own yard or trucks (Miami and Tampa, say, if you genuinely operate from both), with one service-area statement covering the rest.',
        why: 'Rate ceilings and demand pattern differ across the state, and a municipal ordinance can change the rate framework inside a single service area. A page for a market you really work from can say that; a page for every tourist city within reach would only repeat itself.',
      },
      {
        service: 'ai-answers',
        title: 'AI-search and entity visibility',
        what: 'Quotable, entity-rich content plus presence in the third-party sources assistants retrieve from.',
        why: 'A visitor asking an assistant for a tow in an unfamiliar city is the same caller as your tourist demand, arriving through a different door.',
      },
      {
        title: 'Call and lead measurement',
        what: 'Calls tracked per page and per month, with booked tows and revenue from your own records, so each season can be set against the last.',
        why: 'A seasonal business needs to know which months and which pages produced calls, not which produced traffic.',
      },
    ],
  },
  demand: ['private-property', 'emergency-roadside', 'long-distance', 'roadside-services'],
  services: ['ai-answers', 'reviews-reputation', 'google-business-profile', 'local-organic'],
  buyersGuide: buyersGuideFor(
    'Florida',
    (n) =>
      `Ask any AI agency that wants your Florida towing business these ${n} questions. Each one comes from how this state sets prices and how its demand arrives, and each is followed by the answer to look for, and by ours.`,
    [
      {
        question: 'Will it talk about the impound side, or avoid it?',
        goodAnswer:
          'For a Florida operator that does private-property work, that side produces the fee complaints. An agency that only wants to discuss roadside calls is planning around the easy half of the business.',
        ours:
          'We work on both. Impound replies point to the published rates and the complaint process rather than arguing the fee, while the roadside, lockout and transport side carries most of the visibility work.',
      },
      {
        question: 'Can it show what the work did in each season?',
        goodAnswer:
          'Florida demand arrives in tourist and storm surges, so reporting has to be by period. A yearly figure blends the peak with the quiet months and says little about either.',
        ours:
          'We track calls per page and per period, which is what lets you see whether the work done before a tourist or storm season actually produced calls during it — rather than discovering in April that the spend went somewhere untraceable.',
      },
      {
        question: 'Does it know section 125.0103 before it replies to a fee complaint for you?',
        goodAnswer:
          'A reply that argues about fairness reads worse than no reply. The agency should know who sets Florida\'s maximum rates and where a complaint officially goes before it drafts a single reply for you.',
        ours:
          'We work from Florida Statutes section 125.0103: counties must set and publish maximum non-consensual towing and storage rates, a municipal ordinance can displace the county\'s inside its limits, and the local government must run a fee-complaint process. A reply that points at the published rates and that process reads very differently from one arguing about fairness.',
      },
    ],
  ),
  sections: [
    {
      id: 'fl-rates',
      demand: 'private-property',
      question: "Why can't a Florida towing company compete on price?",
      answer:
        'For non-consensual tows it largely cannot set the price. Florida Statutes section 125.0103 requires counties to establish maximum rates for towing from private property and for accident-scene removal and storage, and requires those maximum rates to be published on the county or municipal website.',
      detail: [
        'The practical effect is that a category of Florida towing work competes on everything except price. Where maximum rates are set locally and published publicly, the differentiators left are being found first and being trusted quickly.',
        'The rules are genuinely local rather than statewide. Where a municipality enacts its own ordinance establishing maximum rates, the county ordinance does not apply within that municipality. An operator working across a metro can be under different published ceilings in different parts of one service area.',
        'Two further provisions shape daily operations: a county or municipality that has established maximum rates must publish them on its website and must establish a process for investigating and resolving complaints regarding fees charged; and a storage fee may not be charged if the vehicle is stored for fewer than six hours.',
        'For marketing this is clarifying rather than limiting. There is no price angle to build a campaign on, so the work moves to being the operator a property manager already knows and a motorist can find.',
      ],
      callCta: 'Talk about your Florida market',
    },
    {
      id: 'fl-reviews',
      service: 'reviews-reputation',
      demand: 'private-property',
      question: 'How should a Florida operator handle complaints about published tow rates?',
      answer:
        'Florida is the one state where a fee complaint has an official destination. Section 125.0103 requires the county or municipality setting maximum rates to establish a process for investigating and resolving fee complaints. That changes how a public review reply should be written.',
      detail: [
        'The recurring Florida review is some version of "they charged me a fortune to release my car." Because maximum rates are set by the county or municipality and published on its website, the operator is usually not the one who set the ceiling being complained about — and unlike almost anywhere else, there is a formal complaint process the reviewer can use.',
        'That makes the strongest reply a factual one rather than a defensive one: note that maximum rates for this type of tow are set and published by the local government, point to where they are published, mention that a complaint process exists, and offer to go through the invoice on the phone. It reads as confident rather than evasive, and it is written for the next reader as much as the reviewer.',
        'What it should not be is an argument about whether the fee was fair. Any reply that reads as haggling in public damages the operator more than the original review did.',
        'The second half of the Florida strategy is volume. Tourist and seasonal-resident roadside calls, lockouts and scheduled transports involve customers who chose the operator and are usually glad to have been helped, so a request that goes to every customer after every job will draw most of its reviews from them. That, not screening anyone out, is what keeps the impound complaints from being the loudest thing on the profile.',
      ],
      callCta: 'Talk through your review replies',
    },
    {
      id: 'fl-seasonal',
      demand: 'emergency-roadside',
      service: 'google-business-profile',
      question: 'How should a Florida towing company handle seasonal demand swings?',
      answer:
        'Florida demand is not flat. Tourist traffic, seasonal residents and storm season each bring callers with no local knowledge and no existing relationship — the caller most likely to search, look at what Google shows, and tap the first credible result.',
      detail: [
        'A visitor whose rental breaks down on the way to Orlando has no operator saved in their phone. Their decision happens in Maps, quickly, on what is visible.',
        'That makes profile accuracy seasonal work rather than set-and-forget. Hours should be truthful going into a period when people genuinely call overnight, service areas should reflect where you will actually dispatch during a surge, and reviews are easier to build before a season than during one.',
        'Storm season adds demand that is hard to staff for and entirely possible to be visible for. The operators positioned to capture it are generally the ones whose profile was already in order when it arrived.',
      ],
      callCta: 'Get your Florida profile season-ready',
    },
    {
      id: 'fl-transport',
      demand: 'long-distance',
      service: 'local-organic',
      question: 'How do Florida operators win long-distance vehicle transport work?',
      answer:
        'Long-distance transport is the Florida towing service where the customer plans rather than panics — seasonal residents moving vehicles, dealers relocating stock. It is researched on a website over days, so it is won with real service pages rather than in Maps.',
      detail: [
        'This demand suits Florida given the number of seasonal residents moving vehicles between states. It behaves nothing like emergency roadside: the customer compares, asks about enclosed versus open transport, timelines and insurance, and often books ahead.',
        'Because the decision is deliberate, the website carries it. A dedicated transport page answering those questions tends to do more for this segment than profile work, and it captures searches an emergency-focused profile is unlikely to surface for.',
      ],
    },
  ],
  faqs: [
    // The four statute and fee-reply FAQs were cut: fl-rates and fl-reviews
    // above already answer each of them on this page.
    {
      question: 'How can AI help a towing company in Florida?',
      answer:
        'In Florida, where county-set maximum rates remove the price lever, AI helps most on the visibility and measurement side. We work on being retrievable when an out-of-state visitor asks an assistant for a tow near Orlando or Tampa rather than asking a local, and on tracking calls per page and per season so you can tell which pre-season work actually produced calls during the surge.',
    },
  ],
  sources: [
    {
      label: 'Florida Statutes § 125.0103 — The Florida Senate',
      url: 'https://www.flsenate.gov/Laws/Statutes/2025/125.0103',
      supports:
        'County obligation to set maximum non-consensual towing and storage rates; municipal ordinances displacing county rates; the website publication and complaint-process requirements; and the six-hour storage fee provision.',
      checkedAt: '2026-08-27',
    },
    GOOGLE_LOCAL_RANKING,
  ],
};

const georgia: TowingState = {
  slug: 'georgia',
  state: 'Georgia',
  // Created in d5914d8; last substantive change in 6565c27 (SEO plan phases 1-4).
  published: '2026-08-27T06:13:50+05:00',
  updated: '2026-10-12T02:34:42+05:00',
  metros: ['Atlanta', 'Savannah', 'Augusta', 'Columbus', 'Macon'],
  h1Override: stateHeadline('Georgia'),
  titleOverride: stateHeadline('Georgia'),
  landscape:
    'Ask who the best AI towing agency in Georgia is and the honest reply is a question back: which Georgia towing business do you run? An operator doing apartment enforcement inside the I-285 perimeter needs different help from one chasing heavy recovery toward the Port of Savannah, and no published ranking compares agencies on either. OptimizeIndex uses AI to get towing companies found by the buyer each side actually has, from Atlanta to Augusta, Columbus and Macon, and to measure the calls and accounts each side is missing. Below are the questions that separate one agency from another, with our answers.',
  searchProblem:
    'Georgia is where a generic AI marketing package tends to fall over, because a Georgia operator is usually running two businesses. Around Atlanta, where I-75, I-85 and I-20 converge inside the I-285 perimeter, the buyer is a stranded motorist choosing in a map result. On the corridors feeding the Port of Savannah the buyer is a dispatcher evaluating equipment on a website days before an incident. Those two need different content, different entity signals for AI assistants, and different measurement — consumer calls versus named accounts. Most Georgia towing sites try to serve both with one page and one number.',
  engagement: {
    heading: "How we would build a Georgia towing company's search presence",
    intro:
      'The balance shifts with how much of your work is metro consumer versus corridor commercial, but for a Georgia operator we would take it in this order. The short version: we separate the two sides of the business so each can be found the way its buyer actually searches, deal with the property-contract review problem at source, and report the result in calls and accounts.',
    steps: [
      {
        service: 'google-business-profile',
        title: 'Google Business Profile optimization for the metro',
        what: 'Category, each service named separately, the perimeter suburbs you truly dispatch to, truthful hours, real fleet photos and an accurate description of the work you take.',
        why: 'The perimeter puts a breakdown within reach of yards in several suburbs, so the map result turns less on distance than on how accurately each profile describes what it covers. Overclaiming a service area produces calls you decline, and declined calls produce the reviews you least want.',
      },
      {
        service: 'reviews-reputation',
        title: 'Property-contract reputation management',
        what: 'Per-tow logging of who authorised the enforcement, agreed signage and grace periods with property managers, and reply templates that can state exactly what was authorised.',
        why: 'Apartment enforcement produces clustered one-stars from residents who live there and talk to each other. Because they cluster around one address, they can be addressed at source rather than absorbed.',
      },
      {
        demand: 'heavy-duty',
        title: 'Freight corridor and heavy-duty pages',
        what: 'Tonnage, the rotators and wreckers on the roster, whether you take loaded trailers, and which stretches of I-16, I-75, I-85 and I-95 you actually cover.',
        why: 'Traffic serving the Port of Savannah supports heavy-duty demand on the corridors feeding it, and that buyer searches by route and capability rather than by town.',
      },
      {
        service: 'local-organic',
        title: 'Atlanta and Savannah pages, if you run from both',
        what: 'A page for each service you run, and a location page for each place you genuinely operate from, such as an Atlanta base or a Savannah yard serving the port corridors, with one service-area statement for the perimeter suburbs you reach from it.',
        why: 'Atlanta towing marketing and Savannah towing marketing are different problems, and a business with a real presence in both should say so on two pages. A page for every suburb inside I-285 would say the same thing with the name changed.',
      },
      {
        service: 'reviews-reputation',
        title: 'Consumer review acquisition',
        what: 'One post-tow text with a direct review link to every customer, whatever the job, and one follow-up.',
        why: 'This is the counterweight to the property disputes. Without steady volume from every job, one contested complex can crowd out everything else a customer sees.',
      },
      {
        service: 'ai-answers',
        title: 'AI-search and entity visibility',
        what: 'Content naming the perimeter, the corridors, the equipment and the kind of recovery, plus presence in third-party sources assistants retrieve from.',
        why: 'Specificity is what makes a passage quotable. Copy that would fit any operator anywhere gives an assistant nothing to attach to your business.',
      },
      {
        title: 'Call and account measurement',
        what: 'Calls counted page by page for the consumer side, and dispatcher accounts tracked for the corridor side, since the two convert nothing alike.',
        why: 'Reporting both halves of a Georgia business on one number hides which half the work moved.',
      },
    ],
  },
  demand: ['emergency-roadside', 'heavy-duty', 'accident-recovery', 'private-property'],
  services: ['ai-answers', 'google-business-profile', 'local-organic', 'reviews-reputation'],
  buyersGuide: buyersGuideFor(
    'Georgia',
    (n) =>
      `A Georgia operator is often running two businesses at once, so the ${n} questions here check whether an AI agency can tell them apart. Under each: what a good answer covers, then ours.`,
    [
      {
        question: 'Does it treat Atlanta and Savannah as two different problems?',
        goodAnswer:
          'The metro consumer picks in a map result; the corridor dispatcher compares equipment on a website days before an incident. One campaign aimed at both serves neither.',
        ours:
          'We plan the two sides separately: profile and review work for the perimeter, capability and corridor pages for the freight side, and different reporting for each.',
      },
      {
        question: 'Will it report the corridor side as accounts rather than web traffic?',
        goodAnswer:
          'Fleet and corridor work arrives as named accounts and repeat dispatch, which never appears in analytics. An agency reporting one blended web number cannot tell you which half moved.',
        ours:
          'Consumer calls are counted page by page; corridor and fleet work is reported on its own, as accounts and repeat dispatch. Those figures have to come from you, and we label them as yours.',
      },
      {
        question: 'Is it straight about what it has and has not confirmed of Georgia\'s towing rules?',
        goodAnswer:
          'A reply that misstates the local process reads worse than no reply. An agency should know which Georgia rules it has actually confirmed, and admit it when it has not.',
        ours:
          'We have not confirmed Georgia\'s non-consensual towing rules from a primary source, so we do not cite them in replies. What we work from is the pattern: private-property enforcement around Atlanta apartments produces clustered complaints traceable to one address, so the useful work is signage, grace periods and logged authorisation per tow rather than a better-worded reply.',
      },
    ],
  ),
  sections: [
    {
      id: 'ga-atlanta',
      service: 'google-business-profile',
      demand: 'emergency-roadside',
      question: 'What makes the Atlanta towing market hard to compete in?',
      answer:
        'Atlanta\'s interstates meet in a compact area: I-75, I-85 and I-20 converge inside the I-285 perimeter. A breakdown there can be in reach of yards in several suburbs at once, so distance, one of Google\'s three documented local ranking factors, may do little to separate them.',
      detail: [
        'The perimeter shapes the market in a way worth planning around. Where proximity does not settle the map result for a search, the other two documented factors, relevance and prominence, are what is left to compete on.',
        'Relevance is the part an operator controls most directly. Google says complete and accurate information makes a business more likely to appear in local results, which in practice means category, services, hours, photos and a service area that matches reality.',
        'Service-area accuracy matters more than usual here. An operator who will genuinely run to Marietta, Decatur and Sandy Springs should say so; one who will not should not claim it. Overclaiming produces calls you decline, and declined calls tend to produce exactly the reviews you least want.',
      ],
      callCta: 'Get your Atlanta profile reviewed',
    },
    {
      id: 'ga-reviews',
      service: 'reviews-reputation',
      demand: 'private-property',
      question: 'How do Atlanta apartment towing contracts affect a Georgia operator\'s reviews?',
      answer:
        'Private-property towing from apartment and mixed-use parking produces a specific review pattern around Atlanta: bursts of angry reviews tied to one property, often from residents rather than one-off visitors.',
      detail: [
        'This is the Georgia-specific version of the reputation problem, and it differs from a general impound complaint in an important way. A resident whose car was towed from their own building lives there, talks to neighbours, and may return to the review months later. One contested property can generate a cluster of one-stars in a fortnight, and it is usually traceable to a single address and a single policy dispute.',
        'That traceability is the opening. Because the complaints cluster, they can be addressed at the source: agreeing signage and grace periods with the property manager, having dispatch log the specific enforcement request behind each tow, and being able to state in a reply exactly what was authorised and by whom. Operators who cannot reconstruct that end up replying vaguely, which reads badly.',
        'It also changes what the account is worth. A property contract that reliably generates disputes is buying revenue with reputation, and that trade is worth pricing consciously rather than discovering later. Some Atlanta operators we would advise to keep such a contract; some to renegotiate the enforcement terms; some to let it go.',
        'On the consumer side, the counterweight is volume. Roadside and accident customers around the perimeter chose the operator, so a review request sent the same way after every job, property tows included, draws most of its reviews from them and keeps one property dispute from dominating the profile.',
      ],
      callCta: 'Talk through your contract mix',
    },
    {
      id: 'ga-freight',
      demand: 'heavy-duty',
      service: 'local-organic',
      question: 'How do Georgia operators win heavy-duty work on the freight corridors?',
      answer:
        'Commercial traffic to and from the Port of Savannah — described by the Georgia Ports Authority as the third-busiest container gateway in the United States — supports heavy-duty demand on the corridors serving it. That work is booked by dispatchers evaluating a website, not by motorists tapping a map.',
      detail: [
        'Georgia gives operators a genuinely two-sided business: a consumer market around Atlanta and a freight corridor economy running to the coast, where the Georgia Ports Authority describes Garden City Terminal as among the largest single container facilities in the country. The two sides need different marketing, and conflating them is a common mistake on Georgia towing websites.',
        'Fleet and dispatcher buyers tend to search by capability and route. Pages stating tonnage capacity, recovery equipment, and which stretches of I-16, I-75, I-85 and I-95 you actually cover generally match that better than pages built around town names.',
        'Ticket sizes justify the effort. Heavy recovery work is typically worth many consumer tows, and dispatcher relationships recur once established.',
      ],
    },
    {
      id: 'ga-ai',
      service: 'ai-answers',
      question: 'How do Georgia towing companies get named by AI assistants?',
      answer:
        'Assistants answer requests for a tow recommendation with specific businesses, drawn from sources they can retrieve. Whether yours is among them comes down to whether a model can reach plain, quotable text about what you do and where you cover.',
      detail: [
        'For a Georgia operator the useful specificity is geographic and operational: naming the perimeter, the corridors, the equipment and the kind of recovery, rather than copy that would fit any operator anywhere.',
        'The other half is presence in third-party sources — directories, trade publications, community discussion — since a meaningful share of what assistants cite is not on the operator\'s own site.',
      ],
    },
  ],
  faqs: [
    // The review-cluster and Port of Savannah FAQs were cut: ga-reviews and
    // ga-freight answer both on this page (the Garden City fact moved into
    // ga-freight).
    {
      question: 'How can AI help a towing company in Georgia?',
      answer:
        'A Georgia operator usually serves two buyers, and AI helps differently for each. For the Atlanta consumer side it is about being the business an assistant names and being visible in the map result. For the Savannah corridor side it is about entity-level clarity — equipment, tonnage, which interstates you cover — so a dispatcher\'s query returns something specific. We then measure the two separately.',
    },
  ],
  sources: [
    {
      label: 'Georgia Ports Authority — Port of Savannah',
      url: 'https://gaports.com/facilities/port-of-savannah/',
      supports:
        'The Port of Savannah is the third-busiest container gateway in the United States, and Garden City Terminal is among the largest single container handling facilities in the country.',
      checkedAt: '2026-08-27',
    },
    GOOGLE_LOCAL_RANKING,
  ],
};

const pennsylvania: TowingState = {
  slug: 'pennsylvania',
  state: 'Pennsylvania',
  // Created in d5914d8; last substantive change in 6565c27 (SEO plan phases 1-4).
  published: '2026-08-27T06:13:50+05:00',
  updated: '2026-10-12T02:34:42+05:00',
  metros: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Harrisburg', 'Scranton'],
  h1Override: stateHeadline('Pennsylvania'),
  titleOverride: stateHeadline('Pennsylvania'),
  landscape:
    'In Pennsylvania the test of an AI agency is a calendar test. Towing demand here turns on the weather, so the agency worth hiring has you visible before the first storm and can show, day by day, which calls the work produced. No independent ranking can name the best AI towing agency in Pennsylvania. OptimizeIndex applies AI to one job here: keeping a towing company in Philadelphia, Pittsburgh, Allentown, Erie, Harrisburg or Scranton findable on the days that matter, and counting the calls it misses. Put the questions below to us as readily as to anyone else.',
  searchProblem:
    'Pennsylvania is the state where timing matters more than anywhere else on this site, and that changes what you should want from an agency. The National Weather Service attributes between 45 and 53 percent of seasonal snowfall along the eastern shores of Lakes Erie and Ontario to lake-effect events, with totals highest in January. Every operator in the county is busy the same days. The useful question is not whether traffic rose over the year but whether you were visible on the specific days that produced revenue, which is a day-level attribution problem an annual report will hide.',
  engagement: {
    heading: "How we would build a Pennsylvania towing company's search presence",
    intro:
      'The detail depends on which metro you serve and how weather-weighted your volume is. Here is the sequence for a Pennsylvania operator, where the timing matters as much as the list. The short version: we get you ready before the season rather than during it, fix the review pattern that makes seasonal businesses look dormant, and keep a paid lever for the days conditions turn.',
    steps: [
      {
        service: 'google-business-profile',
        title: 'Pre-season Google Business Profile readiness',
        what: 'A full profile pass in autumn: hours confirmed for genuine overnight availability, winter services listed explicitly, service area checked, photos refreshed.',
        why: 'Demand spikes on days when driving conditions deteriorate. Work finished in January has already missed the calls January produced, so the calendar drives the schedule here.',
      },
      {
        service: 'reviews-reputation',
        title: 'Year-round review acquisition',
        what: 'One review text after every job, the small warm-weather ones included rather than only the winter peak, plus reply templates for wait-time complaints.',
        why: 'A profile showing a cluster of January reviews and eight months of silence reads as a dormant business to a customer checking in July. Spreading the arrival pattern is the fix.',
      },
      {
        service: 'paid-search',
        title: 'Storm-day paid search',
        what: 'Campaigns built in advance and held ready, turned up on the days conditions deteriorate and off again after.',
        why: 'Paid earns more of a place here than in most markets: it is one of the few levers that can respond on the day, which profile and content work cannot.',
      },
      {
        service: 'local-organic',
        title: 'Philadelphia or Pittsburgh, by where your trucks are',
        what: 'A location page for each metro you genuinely run trucks from (parking and private-property work in Philadelphia, winch and recovery capability in Pittsburgh) and one service-area statement for the places you reach from there.',
        why: 'They are different markets, not two instances of one. Copy written to cover both tends to fit neither, and specificity is also what makes a passage quotable.',
      },
      {
        demand: 'roadside-services',
        title: 'Winter service pages',
        what: 'Pages for ditch recovery, winch-outs, jump starts and lockouts, worded the way people search during a storm.',
        why: 'Storm-day searches are service-specific and urgent. A general towing page does not match them, and these are also the small jobs that feed the year-round review system.',
      },
      {
        service: 'ai-answers',
        title: 'AI-search and entity visibility',
        what: 'Quotable content naming the metro, the terrain and the winter capability, plus third-party presence.',
        why: 'A driver stranded somewhere unfamiliar in bad weather is a plausible assistant query, and the answer comes from what a model can retrieve about you.',
      },
      {
        title: 'Call and lead measurement',
        what: 'Per-page call tracking reported as impressions to clicks to calls, with the seasonal shape made explicit rather than averaged away.',
        why: 'An annual average tells a weather-driven business almost nothing. What matters is whether you captured the days that mattered.',
      },
    ],
  },
  demand: ['emergency-roadside', 'accident-recovery', 'private-property', 'roadside-services'],
  services: ['ai-answers', 'google-business-profile', 'reviews-reputation', 'paid-search'],
  buyersGuide: buyersGuideFor(
    'Pennsylvania',
    (n) =>
      `Pennsylvania towing work arrives with the weather, so these ${n} questions are about timing as much as tactics. Under each, the answer worth hearing and the one we give.`,
    [
      {
        question: 'Does it plan around the season, or around the quarter?',
        goodAnswer:
          'Profile and content work has to be finished before the first storm; work started in January has missed January. An agency on a fixed monthly cadence with no seasonal plan is working to its own calendar, not yours.',
        ours:
          'We schedule the profile pass, the winter service pages and the storm-day paid campaigns for autumn, and keep review requests running through the summer so the profile does not go quiet.',
      },
      {
        question: 'Can it tell you whether you were visible on the days that mattered?',
        goodAnswer:
          'For a weather-driven business the yearly total hides the answer. Reporting has to resolve to the day, because the calls arrive on specific days.',
        ours:
          'We track calls per page and per day, so the question becomes whether you were visible on the specific days conditions turned — which is the only version of the question a Pennsylvania operator should care about.',
      },
      {
        question: 'Will it be honest about what it knows of Pennsylvania\'s towing rules?',
        goodAnswer:
          'An agency writing your replies should know which local rules it has actually confirmed. Inventing a rate framework to argue with a reviewer is worse than saying nothing about one.',
        ours:
          'We have not confirmed PennDOT or municipal towing rate and licensing rules from a primary source, so our replies do not cite them. What we work from instead is the seasonal reality: storm-day tows involve long waits nobody controls, and a reply that sets expectations honestly reads better than one defending a four-hour response after the fact.',
      },
    ],
  ),
  sections: [
    {
      id: 'pa-winter',
      demand: 'emergency-roadside',
      service: 'google-business-profile',
      question: 'How should a Pennsylvania towing company prepare for winter demand?',
      answer:
        'Winter brings the ditch recoveries, jump starts and weather accidents. Search visibility is best established before the first storm — a profile corrected in January has already missed the calls January produced.',
      detail: [
        'The seasonality is sharp enough to plan the year around, and the northwest is the extreme case. The National Weather Service records Erie\'s snowiest winter on record at 149.1 inches, and documented a late-2024 lake-effect event producing storm totals between 42.2 and 50.0 inches. Demand on days like that arrives all at once, and every operator in the county is busy simultaneously.',
        'Concretely, autumn is when the profile work belongs, because a map pack position is not something you can arrange on the morning of a storm: hours confirmed for genuine overnight availability, winter services listed explicitly so they match what people search during a storm, and review requests running through the quieter months so the profile is not showing an eight-month gap when the season turns.',
        'Paid search earns more of a place in Pennsylvania than in most markets for this reason. It is one of the few levers that can be turned up on the day conditions deteriorate, capturing demand that profile and content work cannot respond to on that timescale.',
      ],
      callCta: 'Get ready before the season',
    },
    {
      id: 'pa-reviews',
      service: 'reviews-reputation',
      question: 'What does seasonality do to a Pennsylvania towing company\'s reviews?',
      answer:
        'A winter-weighted business tends to produce reviews in bursts and then go quiet for months. The profile can end up showing a cluster of January dates and a long silence — which reads as a dormant business to a customer checking in July.',
      detail: [
        'This is the Pennsylvania-specific reputation problem, and it is a pattern problem rather than a sentiment one. The reviews may be excellent; they are simply all from the same eight weeks. An operator can be well reviewed and still look inactive for most of the year.',
        'There is a second-order version during the peak itself. Storm-day tows involve long waits that are nobody\'s fault, and a customer who waited four hours in a ditch sometimes says so. Winter therefore tends to produce both the bulk of the year\'s review volume and most of its wait-related complaints, in the same few weeks.',
        'The strategy that addresses both is deliberately unglamorous: send the same review request after every job, all year, including the small summer jobs that feel too minor to bother with — lockouts, jump starts, flat tyres, scheduled transports. They spread the arrival pattern across the calendar and dilute the storm-day complaints, and they are the easiest reviews the business will ever get.',
        'On the storm days themselves, the useful discipline is setting the expectation on the phone rather than defending it afterwards. An honest estimate at dispatch produces a different review than an optimistic one.',
      ],
      callCta: 'Talk about your review pattern',
    },
    {
      id: 'pa-two-metros',
      service: 'local-organic',
      question: 'Why do Philadelphia and Pittsburgh need separate approaches?',
      answer:
        'They are different markets rather than two instances of one. Philadelphia is dense and row-house tight, producing constant private-property and parking-related work. Pittsburgh\'s hills, rivers and bridges produce recovery work calling for different equipment and different positioning.',
      detail: [
        'An operator serving both, or an agency treating Pennsylvania as a single market, tends to produce copy that fits neither. Philadelphia\'s towing economy is shaped by narrow streets, permit parking and private lots. Pittsburgh\'s terrain makes winch and recovery capability a more meaningful differentiator.',
        'Where an operator serves only one, the useful move is being specific about the actual neighbourhoods and conditions worked. That specificity also makes the content easier to extract and quote, which is what AI retrieval rewards.',
      ],
    },
  ],
  faqs: [
    // The lake-effect and review-timing FAQs were cut: the bridge paragraph,
    // pa-winter and pa-reviews already answer both on this page.
    {
      question: 'How can AI help a towing company in Pennsylvania?',
      answer:
        'Pennsylvania\'s value is in timing, so AI helps most with being findable by a driver stranded somewhere unfamiliar in bad weather, and with day-level call measurement. Being retrievable by an assistant matters more when the caller has no local knowledge, and tracking calls by day is what tells you whether you captured the specific days that produced the year\'s revenue.',
    },
  ],
  sources: [
    {
      label: 'NOAA / National Weather Service Cleveland — Snow Climatology for Erie, PA',
      url: 'https://www.weather.gov/cle/ERI_SnowClimo',
      supports:
        'Lake-effect share of seasonal snowfall along the eastern shores of Lakes Erie and Ontario (45-53 percent, highest in January) and Erie\'s record seasonal snowfall of 149.1 inches.',
      checkedAt: '2026-08-27',
    },
    {
      label: 'National Weather Service Cleveland — Late November into Early December 2024 Lake Effect Snow Storm',
      url: 'https://www.weather.gov/cle/event_20241128_1203',
      supports: 'Storm totals of 42.2 to 50.0 inches during a single late-2024 lake-effect event.',
      checkedAt: '2026-08-27',
    },
    GOOGLE_LOCAL_RANKING,
  ],
};

const indiana: TowingState = {
  slug: 'indiana',
  state: 'Indiana',
  // Created in d5914d8; last substantive change in 6565c27 (SEO plan phases 1-4).
  published: '2026-08-27T06:13:50+05:00',
  updated: '2026-10-12T02:34:42+05:00',
  metros: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Gary'],
  h1Override: stateHeadline('Indiana'),
  titleOverride: stateHeadline('Indiana'),
  landscape:
    'Indiana\'s towing market is shaped by freight, and much of the work freight brings never shows up in a website report. A carrier needing heavy recovery on I-65 or I-70 picks an operator on equipment and corridor coverage, then books by phone or by account. That is what "best AI towing agency in Indiana" should be measured against, and no independent ranking measures it. OptimizeIndex uses AI to put towing companies from Indianapolis to Fort Wayne, Evansville, South Bend and Gary in front of those dispatchers, and to account for the calls and accounts they are missing. The questions below apply to us as much as anyone.',
  searchProblem:
    'Indiana inverts most AI marketing pitches, and that is the useful thing to know before you buy one. INDOT reports 724 million tons of freight moving through Indiana each year, making it the fifth busiest state for commercial freight traffic, with more pass-through highways than any other state and as much as a third of that freight never stopping. A fleet dispatcher picking a heavy-duty operator is checking equipment, corridor coverage and insurance — not reading reviews, and not converting anywhere your analytics can see. An agency that reports only web metrics will show you a flat quarter on the half of the business that pays best.',
  engagement: {
    heading: "How we would build an Indiana towing company's search presence",
    intro:
      'How heavily you lean toward fleet versus consumer work changes the weighting, but for most Indiana operators the work deliberately starts with the website rather than the profile, and runs in the order below. The short version: we build the corridor pages that reach dispatchers, keep the consumer profile in proportion rather than neglected, and measure the two halves separately because they convert nothing alike.',
    steps: [
      {
        demand: 'heavy-duty',
        title: 'Interstate corridor and capability pages',
        what: 'Pages built around I-65, I-70, I-69, I-74 and I-80/94 stating tonnage, rotator and wrecker capability, loaded-trailer handling and response times by segment.',
        why: 'INDOT reports Indiana as the fifth busiest state for commercial freight traffic with more pass-through highways than any other state. Fleet buyers think in routes, not town names.',
      },
      {
        service: 'reviews-reputation',
        title: 'Fleet reputation assets',
        what: 'Documented response times, dispatcher references, association membership and photographs of actual recoveries with the equipment used.',
        why: 'None of this shows up as a star rating, and it is what a dispatcher actually checks. For a fleet-weighted operator this is where the reputational effort belongs.',
      },
      {
        service: 'google-business-profile',
        title: 'Google Business Profile optimization (GMB)',
        what: 'Primary category, every service listed, an honest service area, truthful hours and real fleet photography, for each base across Indianapolis, Fort Wayne, Evansville and South Bend.',
        why: 'Prerequisites rather than tactics: completeness and accuracy are what Google says make a profile more likely to show, and they are the inputs an operator controls outright.',
      },
      {
        service: 'reviews-reputation',
        title: 'Proportional consumer review acquisition',
        what: 'The same post-tow review text after every consumer job, run steadily but without the effort a consumer-only operator would put in.',
        why: 'Proportionality rather than neglect. A dispatcher who does look you up should not find a neglected listing, and the consumer half is subject to the same ranking factors as anyone else.',
      },
      {
        service: 'local-organic',
        title: 'Northwest Indiana positioning',
        what: 'If you run trucks from the Gary and Hammond corridor, a page of its own written around I-80/94 and the surrounding freight geography; if you only reach it, a line in your service-area statement.',
        why: 'That corner competes for work generated by the Chicago metropolitan economy. Copy written for the rest of Indiana will not describe it accurately.',
      },
      {
        service: 'ai-answers',
        title: 'AI-search and entity visibility',
        what: 'Corridors, equipment and recovery types written out in extractable form, plus presence in trade and directory sources.',
        why: 'A dispatcher asking an assistant for heavy recovery on a named interstate is a realistic query, and an assistant can only answer it from what it can retrieve about you.',
      },
      {
        title: 'Split call and account measurement',
        what: 'Per-page call tracking for consumer work, and account plus repeat-dispatch tracking for fleet work, which has to come from you rather than from analytics.',
        why: 'Consumer work is judged on calls; fleet work is judged on accounts. Reporting both on one number hides which half moved.',
      },
    ],
  },
  demand: ['heavy-duty', 'accident-recovery', 'emergency-roadside', 'long-distance'],
  services: ['ai-answers', 'local-organic', 'google-business-profile', 'reviews-reputation'],
  buyersGuide: buyersGuideFor(
    'Indiana',
    (n) =>
      `Much of the best-paid work an Indiana operator does is invisible to web analytics, so the first thing to find out is whether an agency knows it. Ask these ${n} questions. Below each is what a sound answer includes, then OptimizeIndex's own.`,
    [
      {
        question: 'Will it put the freight side ahead of a consumer review campaign?',
        goodAnswer:
          'For an operator weighted toward heavy recovery, corridor pages and dispatcher reputation matter more than star ratings. An agency that leads with review volume is selling its usual package.',
        ours:
          'We lead with corridor and capability pages for the freight side and keep consumer reviews proportional, because a fleet dispatcher is choosing on equipment and coverage, not stars.',
      },
      {
        question: 'Can it measure work that never touches your website?',
        goodAnswer:
          'Fleet accounts and repeat dispatch never appear in analytics. An agency should say how they will be counted, and label any figure that comes from you as yours.',
        ours:
          'We track consumer calls per page, and report fleet work as accounts and repeat dispatch supplied by you, labelled as client-reported. An agency showing you a single web-metrics dashboard is not measuring your business.',
      },
      {
        question: 'Does it work only from what has been confirmed about Indiana?',
        goodAnswer:
          'Indiana\'s towing rules are not something to paraphrase from a blog. An agency should say which rules it has checked against the source and which it has not.',
        ours:
          'We have not been able to confirm Indiana\'s towing licensing, rate and private-property rules from a primary source, and we will not paraphrase them from secondary ones. What we do work from is INDOT\'s freight picture — fifth busiest state, more pass-through highways than any other, as much as a third of freight never stopping — which tells you the buyer is often a carrier with no local presence at all.',
      },
    ],
  ),
  sections: [
    {
      id: 'in-corridors',
      demand: 'heavy-duty',
      service: 'local-organic',
      question: 'How should an Indiana towing company market heavy-duty recovery?',
      answer:
        'Build around corridors rather than towns. INDOT reports Indiana as the fifth busiest state for commercial freight traffic, with more pass-through highways than any other state. Fleet dispatchers needing recovery on I-65, I-70, I-69 or I-80/94 search by route and capability.',
      detail: [
        'Indiana\'s interstate density is the defining commercial fact of its towing market. INDOT also notes that as much as one-third of the freight on Indiana\'s transportation network passes through the state without stopping, so a recovery on those corridors can involve a carrier with no local presence at all.',
        'That buyer behaves like a B2B customer rather than a stranded motorist. They evaluate before an incident, often keeping a shortlist of operators by corridor. Getting onto that shortlist is a website and relationship exercise, and the content that does it is specific: tonnage, rotator and wrecker capability, loaded-trailer handling, response times by segment.',
        'Ticket sizes for heavy recovery are generally well above consumer tows, and the relationships tend to recur in a way consumer work does not. Whether it is the right focus for a given operator depends on equipment, corridor access and how much of that work is already spoken for locally.',
      ],
      callCta: 'Talk about corridor coverage',
    },
    {
      id: 'in-indianapolis',
      service: 'google-business-profile',
      demand: 'emergency-roadside',
      question: 'What should an Indianapolis towing company fix on Google first?',
      answer:
        'The fundamentals, because every other factor builds on them. Google says businesses with complete and accurate information are more likely to appear in local results — correct primary category, individually listed services, an honest service area, truthful hours and real fleet photography.',
      detail: [
        'These are prerequisites rather than tactics. Distance is fixed, prominence takes time, and relevance is the factor most directly under an operator\'s control.',
        'We would not promise a position from it. What we would say is that an incomplete profile is competing against complete ones on a factor Google explicitly documents, and that fixing it costs an afternoon.',
        'Review volume is the slower companion. Review count is among the signals Google says feed prominence, and Google allows that more reviews and positive ratings can help, without saying how much.',
      ],
      callCta: 'Get your Indiana profile reviewed',
    },
    {
      id: 'in-reviews',
      service: 'reviews-reputation',
      demand: 'heavy-duty',
      question: 'Do reviews matter for an Indiana operator doing mostly fleet work?',
      answer:
        'Less than they do for consumer roadside, and it is worth being honest about that. A fleet dispatcher choosing a heavy-duty recovery operator is generally not reading Google reviews — they are checking equipment, corridor coverage, insurance and whether you answered last time.',
      detail: [
        'This is the Indiana-specific version of the reputation question, and it inverts the usual advice. Given how much of the state\'s towing demand comes from freight moving through, an operator weighted toward heavy-duty can over-invest in consumer review volume and under-invest in the things that actually win fleet accounts.',
        'For the fleet side, the reputational assets are different: documented response times, references from other dispatchers, membership of towing and recovery associations, photographs of actual recoveries with the equipment used, and a phone that gets answered at 2am. None of that shows up as a star rating.',
        'That said, an operator running both sides still needs the consumer profile in order — a dispatcher who does look you up should not find a neglected listing, and the consumer half of the business is subject to the same ranking factors as anyone else. The advice is proportionality rather than neglect: send the same review request after every consumer job, and put the reputational effort for the fleet side into references and response records.',
        'The measurement follows the same split. Consumer work is judged on calls; fleet work is judged on accounts and repeat dispatch, which will not appear in any analytics we can see and has to come from the operator.',
      ],
      callCta: 'Talk about your fleet-to-consumer mix',
    },
    {
      id: 'in-northwest',
      demand: 'long-distance',
      question: 'What is different about the northwest Indiana market?',
      answer:
        'The Gary and Hammond corridor sits on I-80/94 within the Chicago metropolitan area, and its traffic patterns and commercial mix reflect that proximity more than they reflect the rest of Indiana.',
      detail: [
        'Operators there compete for work generated by a different metro economy, on a corridor carrying heavy commercial traffic. Positioning written for the rest of Indiana will not describe that market accurately.',
        'For operators in this corner, content naming the corridor and the surrounding freight geography specifically tends to match search behaviour better than generic state-level copy.',
      ],
    },
  ],
  faqs: [
    // The freight-volume and fleet-reviews FAQs were cut: the bridge
    // paragraph, in-corridors and in-reviews already answer both on this page.
    {
      question: 'How can AI help a towing company in Indiana?',
      answer:
        'For an Indiana operator weighted toward freight, the useful AI work is entity clarity for corridor queries — stating tonnage, recovery equipment and which stretches of I-65, I-70, I-69 and I-80/94 you cover, in a form an assistant can quote to a dispatcher. On the consumer side we track calls per page. Fleet accounts have to be reported by you, because they never appear in analytics.',
    },
  ],
  sources: [
    {
      label: 'INDOT — About Us (Freight)',
      url: 'https://secure.in.gov/indot/multimodal/freight/about-us/',
      supports:
        '724 million tons of freight travel through Indiana annually; Indiana is the fifth busiest state for commercial freight traffic; Indiana has more pass-through highways than any other state; as much as one-third of freight passes through without stopping.',
      checkedAt: '2026-08-27',
    },
    GOOGLE_LOCAL_RANKING,
  ],
};

/*
   Michigan is the comparison-query experiment.

   The other five are local-service pages: brand voice in the H1, keywords in
   the title. This one targets "best towing ai agency in michigan" directly, so
   the H1 and title carry the query and the lede answers it in the first
   paragraph. Nothing else about the page differs — same data model, same
   components, same guardrails — which is what makes the two H1 strategies
   comparable in Search Console in a couple of months.

   Naming the query is not the same as claiming the superlative. The lede
   states outright that no agency can honestly declare itself best; the page
   earns the query by being the most useful answer to it. (A shared "Who is the
   best AI towing agency in <State>?" FAQ used to say the same on every state
   page; it was cut as templated text.) Michigan is now the only lede that
   opens with the query as a question — keep the other six openings distinct.
*/
const michigan: TowingState = {
  slug: 'michigan',
  state: 'Michigan',
  // Created in c2e6059; last substantive change in 6565c27 (SEO plan phases 1-4).
  published: '2026-08-28T02:43:53+05:00',
  updated: '2026-10-12T02:34:42+05:00',
  metros: ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing', 'Flint'],
  h1Override: stateHeadline('Michigan'),
  titleOverride: stateHeadline('Michigan'),
  // The lede. Deliberately explicit about AI + towing + Michigan + the entity
  // in the first hundred words, because this is the passage a retriever lifts
  // and the first thing Google reads. Every later section can afford to be
  // subtle; this one cannot. It names Michigan cities as the market the
  // framework is written for, never as a list of clients.
  landscape:
    'Looking for the best towing AI agency in Michigan? There is no independent ranking that can objectively declare one agency the best. Instead, Michigan towing companies should compare agencies on what their AI actually does, how they measure results, whether they surface the credentials Michigan lets customers check, and whether they know the state\'s dispute process. OptimizeIndex builds AI solutions for towing companies missing revenue: AI search visibility, Google Business Profile work and call measurement. The framework below, written for operators from Detroit and Warren to Grand Rapids, Lansing and Flint, is the same one we would want a towing company to apply to us.',
  searchProblem:
    'Michigan is a useful place to apply that framework, because the state already asks consumers to vet towing companies this way. The Attorney General publishes and periodically reissues a consumer alert on Michigan towing laws, fee complaints route to the Attorney General, local police or the Michigan State Police Commercial Vehicle Enforcement Division, and a towing company\'s operating authority is publicly checkable. In a market where your own legitimacy is a matter of public record, being visibly credible is part of the search problem rather than separate from it — and it is exactly the standard worth holding an AI agency to before you sign anything.',
  demand: ['emergency-roadside', 'private-property', 'heavy-duty', 'accident-recovery'],
  services: ['ai-answers', 'google-business-profile', 'reviews-reputation', 'local-organic'],
  buyersGuide: buyersGuideFor(
    'Michigan',
    (n) =>
      `These ${n} questions follow the framework above. Put them to every AI agency a Michigan towing company is considering, us included, and compare the answers side by side; beside each is the answer to listen for, and ours.`,
    [
      {
        question: 'Can it name the task its AI performs for a Michigan operator?',
        goodAnswer:
          '"AI-powered" is an unregulated phrase. A credible agency names the task, such as being quotable when a driver asks an assistant who tows in Detroit, or drafting review replies that know the Michigan dispute process, and says how you would tell whether it worked.',
        ours:
          'For a Michigan operator we would use AI to make the business retrievable by assistants, and to speed up replies and pages that a person then checks against Michigan\'s published guidance. Our audit tool and chat assistant run on this site, so you can see both working before you talk to us.',
      },
      {
        question: 'Will it put your credentials where a customer can check them?',
        goodAnswer:
          'Michigan lets the public check a towing company\'s operating authority and insurance filing. An agency should treat that as something to surface on your site and profile, not a compliance detail to leave out.',
        ours:
          'Trust and credential visibility is the first step of our Michigan scope: operating authority, insurance status and licensing on the site, beside real photos of the fleet and the yard.',
      },
      {
        question: 'Does its reporting reach booked tows, from sources it names?',
        goodAnswer:
          'Impressions and positions are inputs. A Michigan operator gets paid for tows, so the report should run from search to calls to booked jobs, with the tool behind every number named.',
        ours:
          'We report impressions and clicks from Google Search Console, calls from your phone system and our own click tracking, and booked tows and revenue from your dispatch records — labelled as client-reported, because that is what they are.',
      },
      {
        question: 'Does it know Michigan\'s dispute process before replying to a fee complaint?',
        goodAnswer:
          'Michigan gives a towed owner a court process and three places to complain. A reply that argues the fee instead of naming that process reads as defensive.',
        ours:
          'We work from Michigan\'s published guidance: an owner can contest both the tow and the reasonableness of the fees in district court, with 20 days from the notice date to request a hearing, and complaints can go to the Attorney General, local police or MSP CVED. We write replies that state that process rather than arguing the fee.',
      },
    ],
  ),
  sections: [
    {
      id: 'mi-what-ai-agency-does',
      service: 'ai-answers',
      question: 'What does an AI agency actually do for a towing company?',
      answer:
        'For a towing company, useful AI work is narrow: make the business findable and quotable by assistants, use AI to speed up the content and review-response workload, keep the Google Business Profile accurate, and make sure a call gets answered rather than deflected. A chat assistant earns its place on a towing site only if it gets a stranded driver to the phone faster, never if it stands in the way.',
      detail: [
        'The honest version of AI marketing for a towing company has two halves. The first is being retrievable — assistants answer "who should I call for a tow in Detroit" with named businesses assembled from sources they can reach, so the work is making clear, specific, quotable information exist about your operation, on your site and in the third-party places models draw from.',
        'The second is throughput. Review replies, service pages, corridor pages and Google Business Profile posts are all work that a small operator never gets to. AI makes that volume achievable, but it does not make it correct — a reply written without knowing Michigan\'s dispute process is worse than no reply.',
        'What it is not: a chat widget that deflects callers instead of routing them, a "we use AI" badge, or a monthly report with a language model summarising your rankings. If an agency cannot say which specific task the AI performs and how you would tell whether it worked, the AI is decoration.',
        'We run a chat assistant on this site and on client websites, so the distinction is worth stating plainly. The one here answers questions from published pages, runs the same automated site check the homepage offers, and its main job is to get a person into the conversation quickly. On a towing site the rule is stricter: the visitor has a vehicle in a live situation and wants a phone answered, so the assistant there should answer the quick question and make the call the obvious next step, not replace it. The call itself is where our AI voice agent works: it answers, qualifies the caller, books the job and hands it to your dispatcher.',
      ],
      callCta: 'Ask us what we would actually automate',
    },
    {
      id: 'mi-accountability',
      service: 'reviews-reputation',
      demand: 'private-property',
      question: 'Why does Michigan towing attract more consumer-protection attention than most trades?',
      answer:
        'Because the state actively publishes guidance about it. The Michigan Attorney General has issued and reissued a consumer alert on towing laws, complaints route three separate ways, and a towing company\'s operating authority and insurance status are publicly checkable.',
      detail: [
        'A Michigan vehicle owner can contest both whether the vehicle was properly towed and the reasonableness of the towing and storage fees, in district court, with 20 days from the notice date to request a hearing. If the court finds the tow was improper, the towing and storage fees are reimbursed and the abandoned vehicle fee is returned.',
        'Complaints do not only land as reviews. They can be filed with the Department of Attorney General, the local police agency, or the Michigan State Police Commercial Vehicle Enforcement Division. Operators must have active liability and workers\' compensation insurance on file or an approved exemption, and a member of the public can check operating authority through CVED\'s Intrastate Carrier Authority Registration System.',
        'For marketing this cuts in an unexpected direction. In a state where a prospective customer can verify your standing, visible legitimacy is a competitive asset rather than a compliance chore. Surfacing your authority, insurance and licensing on your own site is cheap.',
      ],
      callCta: 'Talk about your Michigan profile',
    },
    {
      id: 'mi-signage',
      demand: 'private-property',
      service: 'reviews-reputation',
      question: 'How does Michigan\'s posted-notice requirement reduce disputes before they become reviews?',
      answer:
        'Michigan requires a property owner to have clearly visible notice posted before a vehicle is towed from private property without the owner\'s consent. Confirming that signage is in place on every account you serve removes the most common basis for a dispute.',
      detail: [
        'This is the Michigan version of the impound reputation problem, and it has a more concrete lever than most states offer. The requirement sits with the property owner rather than the towing company, which is precisely why it gets missed: the operator carries the reputational cost of a tow the property never signed properly.',
        'The practical move is to make signage part of onboarding a property client rather than something assumed. Photograph the posted notice when the account starts, re-photograph periodically, and keep it with the enforcement authorisation for each tow. It costs very little and it changes what you are able to say in a public reply.',
        'It also changes which accounts are worth keeping. A property that will not maintain compliant signage is buying your revenue with your reputation, and that trade is better priced consciously than discovered in a review cluster six months later.',
      ],
    },
    {
      id: 'mi-border',
      demand: 'heavy-duty',
      service: 'local-organic',
      question: 'How do Michigan operators win cross-border and freight recovery work?',
      answer:
        'Detroit is the top port for Canadian freight, carrying 21.5 percent of northern-border truck traffic and $94.2 billion in trade according to the Bureau of Transportation Statistics. That volume supports heavy-duty demand that is won on a website rather than in Maps.',
      detail: [
        'Commercial recovery around the crossings behaves like ordinary B2B. A dispatcher wants tonnage capacity, equipment on the roster, which stretches of I-75, I-94, I-96 and I-69 you actually cover, and how fast you respond — and they evaluate that before an incident rather than during one.',
        'The border is also not a single point, which matters if you are building pages around it. BTS describes Port Huron as Detroit\'s resiliency partner, roughly 65 miles away, which is a reason to build pages around the routes you cover rather than around one crossing.',
        'Whether border recovery is worth chasing depends on the equipment you run and on how much of that corridor work is already spoken for. Where it is open to you, a dispatcher relationship on I-94 or I-75 tends to come back in a way a roadside call does not.',
      ],
      callCta: 'Talk about corridor coverage',
    },
    {
      id: 'mi-metros',
      service: 'google-business-profile',
      demand: 'emergency-roadside',
      question: 'What is different about competing in Detroit versus Grand Rapids?',
      answer:
        'They sit on opposite sides of the Lower Peninsula and are separate local markets. Around Detroit, Warren and Sterling Heights a breakdown can be a similar drive from several yards, so distance, one of Google\'s three local ranking factors beside relevance and prominence, may not separate them. Each market has to be competed for on its own.',
      detail: [
        'Towing SEO in Detroit is mostly a contested-map-pack problem. Where distance does not decide it, the factors left are relevance (whether the category, the services listed, the area claimed and the hours shown match what you really do) and prominence, which Google describes as drawing on signals including links and review count.',
        'Towing marketing in Grand Rapids, Lansing, Ann Arbor and Flint runs on the same three factors, against a different set of competitors in each city. An operator based in one of them is judged on distance from that city\'s callers, and its profile should say plainly which of them it actually covers.',
        'None of that adds up to a promised position in Detroit or Grand Rapids; Google does not publish its weightings. It does mean an operator with gaps in its profile is giving away the one factor it fully controls.',
      ],
      callCta: 'Get your Michigan profile reviewed',
    },
  ],
  engagement: {
    heading: 'How we would build a Michigan towing company\'s search presence',
    intro:
      'Your mix of consumer, property and commercial work sets the scope, but in Michigan we would start with something no other state page does, because Michigan is the state where your legitimacy is publicly checkable.',
    steps: [
      {
        service: 'local-organic',
        title: 'Trust and credential visibility',
        what: 'Surfacing operating authority, insurance status and licensing on the site, alongside real photos of the fleet and the yard.',
        why: 'A Michigan customer can already verify these through CVED. Making them easy to find converts a compliance fact into a reason to call you rather than the next result.',
      },
      {
        service: 'google-business-profile',
        title: 'Google Business Profile optimization (GMB)',
        what: 'Primary category, each service listed on its own, the area you genuinely cover, overnight hours you actually keep, real fleet photos and an accurate description, plus a check for anything that risks suspension.',
        why: 'Around Detroit several yards can be a similar drive from one breakdown, which leaves the map result to be settled on more than distance. Accuracy is the part you control, and Google links complete, accurate information to a profile being more likely to show.',
      },
      {
        demand: 'private-property',
        title: 'Signage and dispute reduction on property accounts',
        what: 'Signage verification and photography built into onboarding each property client, with enforcement authorisation logged per tow.',
        why: 'Michigan requires posted notice before a private-property tow. Confirming it removes the most common basis for a dispute, and gives you something factual to say when one arrives anyway.',
      },
      {
        service: 'reviews-reputation',
        title: 'Review acquisition and statutory-aware replies',
        what: 'One post-tow text from dispatch to every customer, carrying a link straight to your review page and followed up once, plus reply templates that state the Michigan dispute process rather than arguing the fee.',
        why: 'Fee complaints in Michigan have formal destinations, so a reply that names the process reads as confident. Arguing fairness in public damages you more than the original review did.',
      },
      {
        service: 'ai-answers',
        title: 'AI-search and entity visibility',
        what: 'Pages that state the business, its services, the Michigan cities it covers and its operating authority in a form an assistant can quote, and the same details in the third-party listings an assistant reads.',
        why: 'When someone asks an assistant who to call in Detroit, the businesses it names are the ones it can find described. Michigan gives you verifiable facts to put in that description, which generic copy does not.',
      },
      {
        demand: 'heavy-duty',
        title: 'Cross-border and heavy-duty corridor pages',
        what: 'Tonnage, recovery equipment and coverage stated plainly across I-75, I-94, I-96 and I-69, including the crossings.',
        why: 'BTS reports Detroit as the top port for northern-border truck traffic, and a carrier\'s dispatcher choosing recovery on that corridor checks capability before an incident, not during one.',
      },
      {
        service: 'local-organic',
        title: 'A Grand Rapids page only with a Grand Rapids yard',
        what: 'Location pages only for the places you genuinely run trucks from (Detroit, Grand Rapids, or both) and one service-area statement for the suburbs and towns you reach from them.',
        why: 'Competing in Detroit and competing in Grand Rapids are different problems, and an operator with a real base in each should say so on its own page. A page for a city you only drive into has nothing local to say.',
      },
      {
        title: 'Call and booked-tow measurement',
        what: 'Tap-to-call and form conversions per page, calls from your phone system, and booked tows from your dispatch records, reported as one chain from search impression to job.',
        why: 'If the work lifts sessions but not calls, the report should say so, and one built on impressions cannot.',
      },
    ],
  },
  faqs: [
    // The fee-contest, posted-sign, licence-check and ChatGPT FAQs were cut:
    // mi-accountability, mi-signage and mi-what-ai-agency-does already answer
    // each of them on this page.
    {
      question: 'How can AI help a towing company in Michigan?',
      answer:
        'Michigan rewards verifiable legitimacy, so the AI work is making the business unambiguous to both Google and assistants: clear entity information, accurate profile data, and credentials surfaced where a customer can see them. Alongside that we track which pages and searches produce calls across Detroit and Grand Rapids, so the visibility work has a number attached.',
    },
    {
      question: 'How do I compare the top AI agencies for towing companies?',
      answer:
        'Ask each the same questions and compare the answers side by side rather than comparing pitches. The useful ones are specific and checkable: show me the AI running, show me an attribution report, tell me who owns the profile at the end. Agencies that answer in capabilities rather than examples are usually describing a template.',
    },
  ],
  sources: [
    {
      label: 'Michigan Consumer Protection - Michigan\'s Towing Laws',
      url: 'https://www.michigan.gov/consumerprotection/protect-yourself/consumer-alerts/auto/towing',
      supports:
        'Vehicle owners may challenge whether a vehicle was properly towed and the reasonableness of towing and storage fees in district court; 20 days from the notice date to request a hearing; reimbursement of fees where a tow is found improper.',
      checkedAt: '2026-08-28',
    },
    {
      label: 'Michigan Attorney General - Consumer Alert on Michigan Towing Laws (July 2025)',
      url: 'https://www.michigan.gov/ag/news/press-releases/2025/07/03/attorney-general-nessel-reissues-consumer-alert-on-michigan-towing-laws',
      supports:
        'Posted-notice requirement for private-property tows; complaints may be filed with the Department of Attorney General, local police, or MSP Commercial Vehicle Enforcement Division; insurance filing requirements and public checking of operating authority via CVED\'s Intrastate Carrier Authority Registration System.',
      checkedAt: '2026-08-28',
    },
    {
      label: 'Michigan Legislature - MCL 257.252a',
      url: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-257-252a',
      supports:
        'Circumstances for police-ordered removal, LEIN entry within 24 hours of impound, and the redemption window before a vehicle is deemed abandoned.',
      checkedAt: '2026-08-28',
    },
    {
      label: 'Bureau of Transportation Statistics - Transborder Freight Data Annual Report 2025',
      url: 'https://www.bts.gov/newsroom/transborder-freight-data-annual-report-2025-0',
      supports:
        'Detroit is the top port for Canadian freight, carrying 21.5 percent of northern-border truck traffic and $94.2 billion in trade, with Port Huron as its roughly 65-mile resiliency partner.',
      checkedAt: '2026-08-28',
    },
    GOOGLE_LOCAL_RANKING,
  ],
};

/*
   Washington's distinguishing fact is that the state defines both what an
   operator is allowed to do and who the operator is allowed to be.

   Registered Tow Truck Operator rules classify trucks by capability, and the
   letter-of-appointment rules require separately-owned businesses to hold
   distinct identities. That second one collides directly with how most
   multi-location marketing advice tells operators to consolidate, and it maps
   unusually cleanly onto Google's one-profile-per-location guidance — which is
   why this page's profile section is the one no other state page has.
*/
const washington: TowingState = {
  slug: 'washington',
  state: 'Washington',
  // Created in 23c728c; last substantive change in 6565c27 (SEO plan phases 1-4).
  published: '2026-09-02T01:09:34+05:00',
  updated: '2026-10-12T02:34:42+05:00',
  metros: ['Seattle', 'Tacoma', 'Spokane', 'Vancouver', 'Bellevue', 'Everett', 'Yakima'],
  h1Override: stateHeadline('Washington'),
  titleOverride: stateHeadline('Washington'),
  landscape:
    'No independent ranking names the best AI towing agency in Washington, so judge agencies on a test this state makes unusually easy to apply: can they turn what Washington already has on file about you, your truck classes and your registered business identity, into pages Google and AI assistants can quote accurately? That is the AI work OptimizeIndex does for Washington operators, from Seattle, Tacoma and Everett to Spokane and Yakima, along with counting the calls each registered business is missing. The questions below are how to hold us, and anyone else, to it.',
  searchProblem:
    'Washington is an unusually good fit for this kind of work, because the state has already done half of it. Registered Tow Truck Operator rules classify tow trucks by size, equipment and capability, and the letter-of-appointment rules require separately-owned towing businesses to carry a different identifiable name, address and telephone number. Your capability and your identity are both defined and on file. That is exactly the structured, verifiable material Google and AI assistants need in order to describe a business accurately, and it belongs on your own website.',
  demand: ['emergency-roadside', 'heavy-duty', 'accident-recovery', 'private-property'],
  services: ['ai-answers', 'google-business-profile', 'local-organic', 'reviews-reputation'],
  buyersGuide: buyersGuideFor(
    'Washington',
    (n) =>
      `Washington defines both what your trucks can do and who your business is, so ask these ${n} questions to see whether an agency will make use of that. After each comes the answer to expect from a serious agency, and our own.`,
    [
      {
        question: 'Does it know what your truck classes mean before writing about them?',
        goodAnswer:
          'The State Patrol\'s classes, from A to E plus S and S-1, are specifications, and some count as recovery trucks only when factory-equipped. An agency that writes "we handle all towing needs" instead of naming them is wasting your best material.',
        ours:
          'We write capability pages from the classes you actually run, including the conditions on classes D and E, so an assistant can quote what you do without inventing it.',
      },
      {
        question: 'Will it keep each registered business separate?',
        goodAnswer:
          'Washington requires separately owned towing businesses to keep their own name, address and answered phone, and Google\'s guidelines allow one profile for each location. An agency that folds them onto one number and one profile for convenience puts you at odds with both.',
        ours:
          'We set up one accurate profile per location and track calls per page and per location rather than pooling them, because a blended number across businesses the state considers distinct tells you nothing about which one is working.',
      },
      {
        question: 'Does it know the Registered Tow Truck Operator rules?',
        goodAnswer:
          'Washington publishes what a registered operator and a letter-of-appointment holder must meet. That is a competence floor an agency can state on your behalf, which most trades cannot.',
        ours:
          'We work from the Registered Tow Truck Operator rules: trucks are classified by capability, letter-of-appointment applicants file a signed agreement listing maximum tow rates and must show two years of industry experience, and drivers taking patrol-initiated calls need a documented four-hour training course every five years. That is a competence floor worth stating publicly, and most operators never do.',
      },
    ],
  ),
  sections: [
    {
      id: 'wa-identity',
      service: 'google-business-profile',
      question: 'How do Washington\'s operator identity rules affect your Google Business Profile?',
      answer:
        'Washington requires each separately-owned towing business to have a different identifiable name, address and telephone number, answered at the business location during normal business hours. That is close to what Google asks for too — so in Washington, compliance and profile accuracy point the same direction.',
      detail: [
        'This is the Washington-specific issue most likely to be handled badly, and it is handled badly for an understandable reason. Standard multi-location marketing advice says consolidate: one tracking number, one brand, one profile, one inbox. Washington\'s letter-of-appointment rules push the other way, requiring each business to operate independently rather than depending on another for any required operation, with its own identifiable name, address and phone answered at that location.',
        'An operator who consolidates several registered businesses behind a single number is creating two problems at once. The state expects distinct, separately answered identities. Google, for its part, permits only one profile per location of a business, and requires a profile\'s phone number to be under the business\'s direct control and to connect to that individual location. Consolidation puts you sideways to both.',
        'The practical work is unglamorous: confirm each registered business has its own profile, its own number that actually rings at that address, and its own service area reflecting where that yard genuinely dispatches. Then track calls per location instead of pooling them, which is the only way to tell which of the businesses is actually producing work.',
      ],
      callCta: 'Talk through your Washington profiles',
    },
    {
      id: 'wa-classes',
      service: 'ai-answers',
      demand: 'heavy-duty',
      question: 'Why do Washington tow truck classes matter for how AI describes your business?',
      answer:
        'The Washington State Patrol classifies tow trucks — A, B, B-2, C, D, E, S and S-1 — by size, equipment and capability, with several of those treated as recovery trucks for patrol requests. That gives a Washington operator something most businesses lack: verifiable, structured capability language.',
      detail: [
        'AI assistants answer questions by retrieving passages they can quote, and vague capability copy gives them nothing to work with. "We handle all towing needs" is unquotable. "We operate class A and class B trucks, and class B-2 for heavy recovery" is specific, checkable and exactly the kind of statement a model can attach to a business.',
        'The same applies to the dispatcher searching for heavy recovery on I-5 or I-90. They are trying to establish whether you can physically do the job, and a state-defined class answers that faster than a paragraph of adjectives. Publishing your classes is not marketing language, it is specification.',
        'Note the limits worth stating honestly on your own site: several classes count as recovery trucks for patrol requests only under conditions — class D where the truck is factory-equipped with a boom or retractable boom, class E where it is factory-equipped with a side recovery system. Getting that right is the difference between a specification and a claim.',
      ],
      callCta: 'Get your capability pages reviewed',
    },
    {
      id: 'wa-passes',
      demand: 'heavy-duty',
      service: 'local-organic',
      question: 'How do Washington operators win mountain-pass and winter recovery work?',
      answer:
        'Snoqualmie Pass carries I-90 between North Bend and Ellensburg, and Washington requires every vehicle over 10,000 pounds to carry at least two extra tire chains regardless of whether chain-up is posted. Pass conditions create recovery demand that is geographic and seasonal at once.',
      detail: [
        'This is a different winter problem from a snowbelt city. Pass work concentrates on specific, named stretches of road, involves commercial vehicles subject to their own chain rules, and happens under conditions where response time and equipment class matter more than proximity. A dispatcher or driver searching in that situation is searching by route.',
        'Content built around the corridors you genuinely cover — I-90 over Snoqualmie, I-5 through the western metros, I-82 and I-84 in the east — will match that behaviour better than pages built around city names. State the classes you run alongside the routes, and the page answers both halves of the question at once.',
        'Washington also allows studded tires only from November 1 through March 31, and studs do not substitute for chains where chains are required. Knowing the rules your callers are subject to is part of sounding like an operator rather than an advertiser.',
      ],
      callCta: 'Talk about pass and corridor work',
    },
    {
      id: 'wa-metros',
      service: 'google-business-profile',
      demand: 'emergency-roadside',
      question: 'How does competing in Seattle differ from competing in Spokane?',
      answer:
        'They are on opposite sides of the Cascades, which split Washington into two markets. Around Seattle, Bellevue, Tacoma and Everett one call can sit within easy reach of several yards, so of Google\'s three local factors (relevance, distance and prominence) distance may do the least to separate them. Spokane and Yakima are separate markets with their own competitors.',
      detail: [
        'The Cascades split Washington into two quite different markets, and treating them as one is a common mistake. Western Washington towing is a dense-metro visibility problem across the Seattle-Tacoma-Everett corridor. Eastern Washington is more spread out, with longer runs and a larger share of highway and agricultural work.',
        'In the west, relevance is the factor with the most slack in it, and it comes down to a profile that describes the business exactly: the right primary category, every service you run, the ground each yard really covers, the hours you keep. That is the complete, accurate information Google says raises a profile\'s chance of showing in local results.',
        'In Spokane and Yakima the same fundamentals apply, against a different set of competitors. Nothing here buys a particular position on either side of the mountains — Google does not publish weightings, and the competitive set keeps moving.',
      ],
      callCta: 'Get your Washington profile reviewed',
    },
    {
      id: 'wa-credentials',
      service: 'reviews-reputation',
      demand: 'accident-recovery',
      question: 'What trust signals can a Washington towing company actually prove?',
      answer:
        'More than most states allow. Washington registration, truck classes, the two-years-experience requirement behind a letter of appointment, and documented driver training for patrol-initiated calls are all verifiable facts — and unlike reviews, they do not depend on customers choosing to write anything.',
      detail: [
        'This matters because the review side of a Washington towing business has the same structural problem it has everywhere: patrol-initiated and accident-scene tows involve customers who did not choose you and are having a bad day, while the work customers choose you for is the smaller share.',
        'Credentials are the counterweight that Washington happens to supply. An operator can state their registration, the classes they run, and that their patrol-call drivers hold current training — the state requires a minimum four-hour tow truck driver training course every five years for those drivers, documented in a file. Publishing that is not a claim, it is a fact with a record behind it.',
        'The review work still matters and still runs the same way: one request to every customer once the job closes, calm and factual replies to the negatives, and never a request at the roadside of a collision. Google counts reviews toward prominence and says more of them, with positive ratings, can help local ranking — the honest ceiling on what anyone can promise.',
      ],
    },
  ],
  engagement: {
    heading: 'How we would build a Washington towing company\'s search presence',
    intro:
      'The size of the job depends on how many registered businesses you run and how much of your work is pass and corridor recovery. Either way, a Washington engagement would lead with identity and capability, because the state has already defined both and almost nobody publishes them.',
    steps: [
      {
        service: 'google-business-profile',
        title: 'Profile and identity alignment across registered businesses',
        what: 'One accurate profile per location, each with the name, address and phone that actually answers there, and calls tracked per location rather than pooled.',
        why: 'Washington requires separately-owned towing businesses to keep distinct identifiable names, addresses and phone numbers. Consolidating them for marketing convenience puts you sideways to both the state and Google at once.',
      },
      {
        service: 'ai-answers',
        title: 'Capability pages built on your truck classes',
        what: 'Pages stating the classes you operate and what each is equipped for, written so an assistant can quote the capability without inventing it.',
        why: 'Washington classes trucks by size, equipment and capability. That is structured, verifiable language most businesses never get to use, and it is exactly what a retrieval system can attach to your business.',
      },
      {
        demand: 'heavy-duty',
        title: 'Corridor and mountain-pass pages',
        what: 'Coverage stated by route — I-90 over Snoqualmie, I-5, I-82, I-84 — with equipment and response detail alongside.',
        why: 'Pass and commercial recovery callers search by route and capability, not by town. Chain rules apply to vehicles over 10,000 pounds regardless of posting, so this caller is often commercial.',
      },
      {
        service: 'local-organic',
        title: 'A page for each side of the Cascades you operate on',
        what: 'A location page for each yard you actually run, a Seattle-area base or a Spokane base, rather than a page per city, with one service-area statement for the rest of the ground each yard covers.',
        why: 'The Cascades split the state into two markets with different density, run lengths and work mix. A yard on each side has two different things to say; a single yard reaching across the mountains has one.',
      },
      {
        service: 'reviews-reputation',
        title: 'Credential visibility and review acquisition',
        what: 'Registration, classes and driver training surfaced on-site, plus the same post-tow review text to every customer, patrol calls included, and calm, factual replies to the negatives.',
        why: 'Patrol and accident work is a poor review source. Washington gives you provable credentials to carry the trust load that reviews cannot.',
      },
      {
        service: 'ai-answers',
        title: 'AI-search and entity visibility',
        what: 'Passages that tie the business to the truck classes it runs and the routes it covers, worded so an assistant can quote them, plus the directories and trade listings assistants draw on.',
        why: 'An assistant answering a Seattle or Spokane tow query can only name you for what it can find written about you, and being findable that way is separate work from ranking.',
      },
      {
        title: 'Call and lead measurement',
        what: 'Tap-to-call and form conversions tracked per page, per section and per location, then followed from impression to click to call, with booked tows from your dispatch records.',
        why: 'With multiple registered businesses, per-location attribution is the only way to see which one the work is actually moving.',
      },
    ],
  },
  faqs: [
    // The RTTO, truck-class, multiple-business and Snoqualmie chain FAQs were
    // cut: the buyer's guide, wa-credentials, wa-classes, wa-identity and
    // wa-passes already answer each of them on this page.
    {
      question: 'How can AI help a towing company in Washington?',
      answer:
        'Washington gives an operator more verifiable material than most states, so the useful AI work is turning it into something a machine can quote: the truck classes you run, the corridors you cover, and one accurate profile per registered business rather than a consolidated one. Alongside that we track calls per page and per location across Seattle, Tacoma and Spokane, so the visibility work can be judged in calls.',
    },
  ],
  sources: [
    {
      label: 'Washington State Department of Licensing - Registered tow truck operators (RTTO)',
      url: 'https://dol.wa.gov/professional-licenses/registered-tow-truck-operators-rtto',
      supports:
        'Washington licenses Registered Tow Truck Operators, and the licensing process and branch requirements are administered by the Department of Licensing.',
      checkedAt: '2026-08-28',
    },
    {
      label: 'WAC 204-91A-060 - Application and qualifications for letter of appointment',
      url: 'https://app.leg.wa.gov/WAC/default.aspx?cite=204-91A-060',
      supports:
        'Letter of appointment requires a signed letter of contractual agreement listing maximum tow rates and two years of towing industry experience within the previous five years; each business must operate independently, and businesses under common ownership must have a different identifiable name, address and telephone number answered at the business location during normal business hours.',
      checkedAt: '2026-08-28',
    },
    {
      label: 'Chapter 204-91A WAC - Registered tow truck operators',
      url: 'https://app.leg.wa.gov/wac/default.aspx?cite=204-91A&full=true',
      supports:
        'Washington State Patrol tow truck classes A, B, B-2, C, D, E, S and S-1 defined by size, equipment and capability; which classes count as recovery trucks for patrol requests; and the minimum four-hour driver training course every five years for drivers responding to patrol-initiated calls.',
      checkedAt: '2026-08-28',
    },
    {
      label: 'WSDOT - Chain requirements for vehicles over 10,000 pounds',
      url: 'https://wsdot.wa.gov/travel/commercial-vehicles/route-commercial-vehicle-restrictions/chain-requirements-vehicles-over-10000-pounds',
      supports:
        'Snoqualmie Pass on I-90 runs between North Bend and Ellensburg; vehicles over 10,000 pounds must carry at least two extra tire chains regardless of posted requirements; studded tires are legal November 1 to March 31 and do not substitute for chains.',
      checkedAt: '2026-08-28',
    },
    GOOGLE_LOCAL_RANKING,
    GOOGLE_REPRESENTING,
  ],
};

export const TOWING_STATES: TowingState[] = [
  california,
  florida,
  georgia,
  pennsylvania,
  indiana,
  michigan,
  washington,
];

export function getTowingState(slug: string): TowingState | undefined {
  return TOWING_STATES.find((s) => s.slug === slug);
}

/**
 * Claims deliberately NOT published, because they could not be confirmed from
 * a primary source at the time of writing.
 *
 * Kept here rather than dropped so the gap is visible and someone can close it
 * with a citation later. Do not move any of these into page copy without a
 * primary-source URL and a checkedAt date in the relevant `sources` array.
 */
export const CONTENT_GAPS: { state: string; topic: string }[] = [
  { state: 'Georgia', topic: 'Non-consensual towing rate regulation and permitting authority.' },
  { state: 'Georgia', topic: 'State or local rotation / wrecker call-list rules.' },
  {
    state: 'Georgia',
    topic:
      'Share of metro Atlanta tow volume that is private-property enforcement. The ga-reviews answer used to describe it as a large part of the Atlanta market without a source; that claim was cut on 2026-10-12.',
  },
  { state: 'Pennsylvania', topic: 'PennDOT or municipal towing rate and licensing requirements.' },
  { state: 'Pennsylvania', topic: 'Turnpike authorised-operator arrangements.' },
  { state: 'Indiana', topic: 'State towing licensing and non-consensual rate rules.' },
  { state: 'Indiana', topic: 'State police wrecker rotation requirements.' },
  {
    state: 'Indiana',
    topic:
      'Commercial private-property tow-away zone signage and authorisation rules (IC 24-14-4). The Indiana General Assembly PDF could not be read on 2026-09-17, so the private-property contracts page names Indiana as a gap rather than paraphrasing a secondary source.',
  },
  {
    state: 'Florida',
    topic:
      'RISC contractor requirements and incentive amounts. FDOT\'s program page returned 403 on 2026-09-17; the heavy-duty page cites only the Turnpike\'s own summary (bonuses for meeting quick-clearance goals against the 90-minute Open Roads goal) and publishes no dollar figure for Florida.',
  },
  { state: 'Florida', topic: 'Operator licensing requirements beyond the § 125.0103 rate framework.' },
  {
    state: 'Florida',
    topic:
      'Share of Florida towing calls from visitors and seasonal residents. fl-seasonal used to say Miami, Tampa, Orlando and Fort Lauderdale "carry a substantial share" of that caller; the sentence was cut on 2026-10-12 because nothing on the page sourced it.',
  },
  { state: 'California', topic: 'Local (non-CHP) municipal tow franchise and rate rules.' },
  {
    state: 'All',
    topic:
      'Any figure for how much towing demand is mediated by AI assistants. No measurement we would stand behind exists, so the pages make no volume claim.',
  },
  {
    state: 'All',
    topic:
      'Operator-count or market-density rankings by state or metro. No primary source counts tow operators this way, so comparative density claims were removed rather than sourced. The last of them (smaller metros described as less contested, profiles there described as mostly untouched, big metros described as denser than thin ones) came off the Indiana, Michigan, Washington, California and Georgia pages on 2026-10-12; what remains is geographic (a breakdown can be in reach of several yards), not a count.',
  },
  {
    state: 'All',
    topic:
      'What replaced the public Questions and Answers feature on Google Business Profiles. Google\'s own change log records that the My Business Questions and Answers API was discontinued on November 3, 2025 (developers.google.com/my-business/content/qanda/change-log). Reports that the consumer-side feature was replaced by a Gemini "Ask Maps" feature come only from secondary sources, so the pages give no advice about that feature at all until Google Business Profile Help confirms what operators should do instead.',
  },
  {
    state: 'Michigan',
    topic:
      'West-Michigan lake-effect snowfall. Citable from the National Weather Service, but Pennsylvania already carries the seasonality angle and reusing it would push the two pages together on exactly the metric the similarity gate measures.',
  },
  {
    state: 'Michigan',
    topic:
      'Michigan no-fault auto insurance. Distinctive to the state, but could not be tied to towing economics from a primary source, so it is not on the page.',
  },
  {
    state: 'Michigan',
    topic:
      'Gordie Howe International Bridge capacity and opening status, and whether commercial carriers shift between the Detroit and Port Huron crossings. Neither is in the BTS supports text recorded on 2026-08-28, and the BTS report returned 403 on 2026-10-12, so mi-border now states only that BTS describes Port Huron as Detroit\'s resiliency partner.',
  },
  {
    state: 'California',
    topic:
      'VC 22658 sign wording (the public-parking prohibition statement and the law-enforcement and towing-company telephone numbers). leginfo returned 403 on 2026-10-12, so those details were removed from /towing-jobs/private-property-towing-contracts until the section is re-read.',
  },
  {
    state: 'Florida',
    topic:
      'Section 715.07(2)(a) sign lettering and height (4-inch vs 2-inch letters, "tow-away zone", 3 to 6 feet). flsenate.gov was unreachable on 2026-10-12; the private-property guide keeps its 2026-09-17 wording until the statute is re-read.',
  },
];
