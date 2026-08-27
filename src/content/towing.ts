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
 * Last substantive review of the towing content, shown on the pages and used
 * as `dateModified` in the JSON-LD.
 *
 * Bumped by hand when the copy actually changes rather than generated from the
 * build date — an automatic date would claim a fresh review on every deploy,
 * which is exactly the kind of unearned freshness signal the rest of this
 * codebase refuses to fabricate.
 */
export const TOWING_UPDATED = '2026-08-27';

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

export interface TowingState {
  slug: string;
  state: string;
  /** Named in copy so the page earns metro long-tail without a page each. */
  metros: string[];
  /** One paragraph on what actually makes this market different. */
  landscape: string;
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
  faqs: Faq[];
  sources?: SourceRef[];
}

export interface TowingPillar {
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

const GOOGLE_REPRESENTING: SourceRef = {
  label: 'Google Business Profile Help — Guidelines for representing your business on Google',
  url: 'https://support.google.com/business/answer/3038177?hl=en',
  supports:
    'Do not create more than one profile per business location; where a business offers different services, list them on the one profile rather than creating a profile per service. Separate profiles apply to genuinely distinct locations, departments or types of operation.',
  checkedAt: '2026-08-27',
};

/* -------------------------------------------------------------------------
   Shared FAQ answers

   Reused only where the question and the answer are genuinely national. Every
   state also carries its own FAQs, and the reviews section is written per
   state rather than shared — see the per-state review blocks below.
------------------------------------------------------------------------- */

const GBP_FAQS: Faq[] = [
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
   Pillar
------------------------------------------------------------------------- */

export const TOWING_PILLAR: TowingPillar = {
  metros: [],
  intro:
    'OptimizeIndex is a performance marketing agency that helps towing companies get found on Google, Google Maps and AI assistants, and turns that visibility into direct calls. We report on calls and booked jobs rather than rankings, because a tow operator gets paid for tows and not for impressions.',
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
        'And increasingly the first answer a customer sees is not a list of links at all. When someone asks an assistant for a recommendation, they get named businesses. Being one of the businesses an assistant can describe is a different piece of work from ranking in blue links, and it is a piece most agencies serving this trade have not started on.',
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
        'The work itself is unglamorous and mostly one-time: correct primary category, service area matching real dispatch range, hours that reflect whether a human genuinely answers overnight, real photographs of real trucks, services listed individually rather than implied, and the Q&A section answered before someone else answers it for you. Google describes complete and accurate information as making a profile more likely to show in local results, which is about as direct as its guidance gets.',
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
        'The practical system is simple and few operators run it: fire a review request from dispatch when the job closes, by SMS, with a direct link, while the customer is still relieved. One follow-up if unanswered. Nothing else. The reason it tends to work is timing rather than persuasion.',
      ],
    },
    {
      id: 'impound-reviews',
      service: 'reviews-reputation',
      demand: 'private-property',
      question: 'What can a towing company do about impound and private-property one-stars?',
      answer:
        'Non-consensual tows generate negative reviews that service quality does not prevent — the customer is upset before the call begins. There is no removal mechanism for an accurate negative review. What is available is steady volume from consensual work, and public replies written for the next reader.',
      detail: [
        'Towing is unusual among trades here. A plumber earns a one-star for doing bad work; a towing company can earn one for doing exactly what a property owner contracted it to do. Operators running impound or private-property work carry a reputational headwind their consensual-only competitors do not.',
        'Because Google names review count and rating among prominence signals, a rating weighed down by impound complaints may also affect how the profile performs for the emergency roadside searches that are usually more valuable. We would not claim to know the size of that effect — but it is a reasonable concern rather than a hypothetical one, and it argues for building volume on the consensual side rather than accepting the rating you happen to have.',
        'A note on a common piece of bad advice: spinning up a second Google Business Profile for the impound side is not a general fix. Google asks businesses not to create more than one profile per location, and says that where a business offers different services those should be listed on the one profile rather than split across several. A genuinely separate, separately staffed storage facility is a separate location and is a different case — but "we would rather those reviews landed somewhere else" is not, and treating it as one risks both profiles.',
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
        'Almost every operator we speak to describes a similar shape: a dependable base of low-margin dispatch work, and a thinner layer of direct calls carrying more of the profit. The useful question is rarely "how do we get more tows" — it is "how do we change the mix".',
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
    ...GBP_FAQS,
    {
      question: 'How do towing companies get more Google reviews?',
      answer:
        'Ask at the moment the tow ends, while the driver is present and relief is highest. A short SMS with a direct review link sent from dispatch within the hour tends to convert better than an email the next day. Google names review count among prominence signals and says more reviews and positive ratings can help local ranking.',
    },
    {
      question: 'How should a towing company respond to a negative review?',
      answer:
        'Reply publicly, quickly and without arguing the facts. Acknowledge the frustration, state the policy plainly, and move specifics to a phone call. The reply is not really written for the reviewer — it is written for the next person reading it while deciding who to call.',
    },
    {
      question: 'Can a towing company set up a second Google profile for its impound business?',
      answer:
        'Generally no. Google asks businesses not to create more than one profile per location, and says different services offered at a business should be listed on the one profile rather than split into separate profiles. A genuinely separate, separately staffed facility is a distinct location and a different question — check the current guidelines before acting.',
    },
    {
      question: 'Do you only work with towing companies?',
      answer:
        'No. OptimizeIndex works across local and B2B service businesses, and our published case studies span e-commerce and B2B services. Towing is a vertical we build for specifically because its search behaviour — emergency intent, Maps-led discovery, review pressure — is unusual enough to need its own approach.',
    },
    {
      question: 'How long before a towing company sees more calls?',
      answer:
        'Profile corrections are the fastest lever because eligibility and accuracy are prerequisites for appearing at all. Review volume builds over months. Organic and AI visibility are slower again. Anyone promising a fixed timeline for a specific ranking is guessing — Google does not publish one and neither should we.',
    },
  ],
  sources: [GOOGLE_LOCAL_RANKING, GOOGLE_REPRESENTING],
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
  metros: ['Los Angeles', 'San Diego', 'San Jose', 'Sacramento', 'Fresno', 'the Inland Empire'],
  landscape:
    'California pairs large, crowded metro tow markets with a formal, state-run route into accident work. Los Angeles, San Diego, San Jose, Sacramento, Fresno and the Inland Empire each hold enough operators that being nearby is rarely what separates competitors, and the California Highway Patrol runs a Rotation Tow Program that the CHP itself describes as voluntary and not intended to be a main source of income.',
  searchProblem:
    "The commercial consequence for a California towing company is that its two channels pull in opposite directions. Rotation fills the schedule, but the CHP says it was never meant to be the income. Direct calls carry the margin, but have to be won in metro map results where several operators sit a similar distance from the same breakdown. Towing SEO in California is therefore less about being nearby and more about being complete, credible and quotable.",
  engagement: {
    heading: "How we would build a California towing company's search presence",
    intro:
      'Scope varies with what you already have, but for a California operator this is the order we would work in, and why each piece is weighted this way here. The short version: we fix the Google Business Profile, build a review system that survives a rotation-heavy job mix, make the business legible to Google and to AI assistants, and report the result in calls rather than impressions.',
    steps: [
      {
        service: 'google-business-profile',
        title: 'Google Business Profile optimization (GMB)',
        what: 'Primary category, individually listed services, service area, hours, real fleet photos and the Q&A section, plus a check that nothing on the profile puts it at risk of suspension.',
        why: 'In Los Angeles, San Diego and San Jose, distance separates operators less than it would in a thin market, so relevance is the factor with the most slack in it. Google says complete, accurate profiles are more likely to appear in local results.',
      },
      {
        service: 'reviews-reputation',
        title: 'A review system built for a rotation-heavy job mix',
        what: 'Post-tow SMS requests fired from dispatch, aimed at the consensual jobs rather than every job equally, with reply templates for the negatives that arrive anyway.',
        why: 'Rotation and accident tows are a poor review source, because the customer did not choose you and has just had a collision. California operators are the ones most likely to be genuinely busy and still look quiet on Google.',
      },
      {
        service: 'local-organic',
        title: 'Metro and service page architecture',
        what: 'Pages for the metros you genuinely dispatch to and the services you actually run, instead of one page trying to rank a towing company for everything at once.',
        why: 'Your coverage across Los Angeles, Sacramento, Fresno and the Inland Empire is not equal, and a single statewide page cannot say so credibly to either a customer or a crawler.',
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
        what: 'Content written so an extracted passage still names the business, the service and the metro, plus presence in the third-party sources assistants draw on.',
        why: 'Assistants return named businesses assembled from what they can retrieve. Being retrievable is separate work from ranking, and it is early enough in this trade to be worth starting.',
      },
      {
        title: 'Call and lead measurement',
        what: 'Tap-to-call and form conversions tracked per page and per section, reported as impressions to clicks to calls, with booked tows from your dispatch records.',
        why: 'A campaign that lifts sessions without moving phone volume has not changed your call mix, and a report built on impressions will not show you that.',
      },
    ],
  },
  demand: ['emergency-roadside', 'accident-recovery', 'private-property', 'heavy-duty'],
  services: ['google-business-profile', 'reviews-reputation', 'local-organic', 'ai-answers'],
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
        'None of that is an argument against rotation. It is an argument for treating it as one channel among several, and for putting deliberate effort into the direct calls you price yourself — which in California means competing for attention in metros where many operators are a similar distance from any given breakdown.',
      ],
      callCta: 'Talk about your California call mix',
    },
    {
      id: 'ca-density',
      service: 'google-business-profile',
      demand: 'emergency-roadside',
      question: 'How do you compete on Google Maps in a crowded California metro?',
      answer:
        'Google bases local results on relevance, distance and prominence. In Los Angeles, San Diego or San Jose, distance often separates operators less than it would in a thin market, because several are similarly close. That leaves relevance and prominence as the parts worth working on.',
      detail: [
        'Relevance is the cheaper half and the more controllable. Google says businesses with complete and accurate information are more likely to show up in local results, and in practice that means the primary category, individually listed services, a service area matching genuine dispatch range, truthful hours and real photographs of the fleet. Much of it is an afternoon of work that many operators have never done.',
        'Prominence is slower. Google describes it as how well known a business is, drawing on signals including how many websites link to you and how many reviews you have, and says more reviews and positive ratings can help local ranking. It does not publish weightings, so nobody can tell you what a given number of reviews is worth — but it is one of the few prominence inputs an operator can influence directly.',
        'What we would not tell a California operator is that doing these things produces a particular position. Distance still matters, the competitive set is large, and Google changes how it weighs things. What we would say is that an incomplete profile in a crowded metro is competing with one hand tied, and that is a fixable problem.',
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
        'This is the review problem specific to California, and it follows directly from the CHP rotation structure described above. The tows that fill the calendar are frequently the ones least likely to end in a five-star review, while the consensual calls that would convert well are the thinner part of the mix. The result is a profile that understates how busy the business actually is.',
        'The practical response is to stop treating review requests as something you do after every job equally, and start treating the consensual side as where the effort belongs. Roadside assists, lockouts, jump starts, scheduled transports and private tows all end with a customer who chose you and is in a position to say so. Those are the jobs worth building a request into.',
        'For rotation and accident work, the realistic goal is different — a calm, professional interaction that occasionally produces a review, and a driver who does not ask for one at the roadside of a collision. Timing that badly is worse than not asking.',
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
        'California operators face a large competitive set, which means more competing text about towing in the same places. The work is to be specific in a way that is easy to extract: naming the metro, the equipment, and the kind of job, rather than writing copy that would fit any operator in any state.',
        'We do not have a defensible figure for how much California towing demand currently runs through assistants, so we are not going to quote one. The argument for doing the work is that it is inexpensive, it overlaps with writing clearly for customers, and the sources assistants draw on take time to accumulate.',
      ],
    },
  ],
  faqs: [
    {
      question: 'What does the CHP require of rotation tow drivers in California?',
      answer:
        'The California Highway Patrol requires rotation tow drivers to have completed a tow truck driver training program approved by the Tow Service Agreement Advisory Committee within the previous five years, requires applicants to submit fingerprints to the Department of Justice, and requires a certificate of insurance providing not less than 30 days written notice if the policy is cancelled or due to expire. Confirm current requirements in the CHP Tow Service Agreement.',
    },
    {
      question: "Is CHP rotation work meant to be a towing company's main income?",
      answer:
        'No. The California Highway Patrol states that participation in the Rotation Tow Program is voluntary and is not intended to be a main source of income. It is best treated as one channel alongside direct consumer calls, private-property contracts and commercial work.',
    },
    {
      question: 'Why does my California towing company have so few reviews despite being busy?',
      answer:
        'If your volume skews toward rotation and accident-scene work, most of your jobs involve customers who did not choose you and are dealing with a collision. Those tows rarely produce reviews. Operators in this position usually do better by concentrating review requests on the consensual side of the business — roadside assists, lockouts, scheduled transports and private tows.',
    },
    ...GBP_FAQS,
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
  metros: ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'Fort Lauderdale', 'St. Petersburg'],
  landscape:
    "Florida is unusual in that a towing company's non-consensual pricing is set by local government and published openly. Under Florida Statutes section 125.0103, counties must establish maximum rates for towing from private property and for removal and storage from accident scenes, and a municipality that enacts its own rate ordinance displaces the county's within its limits. Layered on top is a demand pattern shaped by tourism, seasonal residents and storm season across Miami, Tampa, Orlando and Jacksonville.",
  searchProblem:
    'What that means commercially is that a Florida towing company competes on almost everything except price. Where the county or municipality sets and publishes the maximum for non-consensual work, the differentiators left are being found first, being trusted quickly, and having a profile that was ready before the season rather than during it. Towing SEO in Florida is mostly a visibility and reputation problem.',
  engagement: {
    heading: "How we would build a Florida towing company's search presence",
    intro:
      'Scope depends on your mix of impound, roadside and transport work, but for a Florida operator this is the order we would work in. The short version: we get the Google Business Profile ready ahead of the season, take the impound reputation problem seriously rather than pretending it away, build the transport pages that capture the planned side of your demand, and measure it in calls.',
    steps: [
      {
        service: 'google-business-profile',
        title: 'Google Business Profile optimization (GMB)',
        what: 'Category, individually listed services, service area, truthful overnight hours, real photos and Q&A, plus a suspension-risk check.',
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
        what: 'Reply templates citing the published local rate framework and the statutory complaint process, plus a review request system running on the consensual side of the business.',
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
        title: 'Local market pages',
        what: 'Pages for the metros you genuinely serve across Miami, Tampa, Orlando, Jacksonville and Fort Lauderdale, rather than one statewide page.',
        why: 'Rate ceilings, competition and demand pattern differ across the state, and a municipal ordinance can change the rate framework inside a single service area.',
      },
      {
        service: 'ai-answers',
        title: 'AI-search and entity visibility',
        what: 'Quotable, entity-rich content plus presence in the third-party sources assistants retrieve from.',
        why: 'A visitor asking an assistant for a tow in an unfamiliar city is the same caller as your tourist demand, arriving through a different door.',
      },
      {
        title: 'Call and lead measurement',
        what: 'Per-page call tracking reported as impressions to clicks to calls, with booked tows and revenue from your own records.',
        why: 'A seasonal business needs to know which months and which pages produced calls, not which produced traffic.',
      },
    ],
  },
  demand: ['private-property', 'emergency-roadside', 'long-distance', 'roadside-services'],
  services: ['reviews-reputation', 'google-business-profile', 'local-organic', 'ai-answers'],
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
        'The second half of the Florida strategy is volume from the other side of the business. Tourist and seasonal-resident roadside calls, lockouts and scheduled transports involve customers who chose the operator and are usually glad to have been helped. Building the request into those jobs is what keeps the impound complaints from being the loudest thing on the profile.',
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
        'A visitor whose rental breaks down on the way to Orlando has no operator saved in their phone. Their decision happens in Maps, quickly, on what is visible. Markets like Miami, Tampa, Orlando and Fort Lauderdale carry a substantial share of exactly this caller.',
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
    {
      question: 'Who sets maximum towing rates in Florida?',
      answer:
        'Under Florida Statutes section 125.0103, counties must establish maximum rates for towing vehicles from private property and for removal and storage from accident scenes. If a municipality enacts its own ordinance establishing those maximum rates, the county ordinance does not apply within that municipality.',
    },
    {
      question: 'Where are Florida towing rates published?',
      answer:
        'Florida Statutes section 125.0103 requires a county or municipality that has established maximum rates to publish those rates on its website, and to establish a process for investigating and resolving complaints regarding fees charged.',
    },
    {
      question: 'Can a Florida towing company charge a storage fee for a short hold?',
      answer:
        'Florida Statutes section 125.0103 provides that a storage fee may not be charged if the vehicle is stored for fewer than six hours. Confirm current requirements against the statute and your local ordinance.',
    },
    {
      question: 'How should a Florida towing company reply to a review complaining about fees?',
      answer:
        'Factually. Maximum rates for non-consensual tows are set and published by the county or municipality, so note where they are published, mention that the local government is required to run a complaint process, and offer to walk through the invoice by phone. Avoid arguing about fairness in public — that reply is read by future customers, not just the reviewer.',
    },
    ...GBP_FAQS,
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
  metros: ['Atlanta', 'Savannah', 'Augusta', 'Columbus', 'Macon'],
  landscape:
    'Georgia towing demand concentrates heavily around Atlanta, where I-75, I-85 and I-20 converge inside the I-285 perimeter and produce sustained breakdown and accident volume in a compact area. At the other end of the state the Port of Savannah — which the Georgia Ports Authority describes as the third-busiest container gateway in the United States — anchors commercial traffic on the corridors feeding it. The result is one intensely contested metro market and a set of freight routes that behave quite differently.',
  searchProblem:
    'Commercially that splits a Georgia operator in two. The Atlanta side is a Google Maps problem: many operators sit a similar drive from the same perimeter breakdown, so relevance and prominence carry more of the weight than distance does. The corridor side is a website problem, because a dispatcher routing a recovery to the port evaluates equipment before they ever look at a map. Towing SEO in Georgia therefore means building for two buyers rather than one, and most Georgia towing websites try to do both jobs with a single page and do neither well.',
  engagement: {
    heading: "How we would build a Georgia towing company's search presence",
    intro:
      'Scope depends on how much of your work is metro consumer versus corridor commercial, but this is the order we would work in for a Georgia operator. The short version: we separate the two sides of the business so each can be found the way its buyer actually searches, deal with the property-contract review problem at source, and report the result in calls and accounts.',
    steps: [
      {
        service: 'google-business-profile',
        title: 'Google Business Profile optimization for the metro',
        what: 'Category, individually listed services, a service area matching genuine dispatch range across the perimeter suburbs, truthful hours, real fleet photos and Q&A.',
        why: 'Around I-285 many operators are a similar drive from the same breakdown, so distance separates them less. Overclaiming a service area produces calls you decline, and declined calls produce the reviews you least want.',
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
        what: 'Tonnage, rotator and wrecker capability, loaded-trailer handling, and which stretches of I-16, I-75, I-85 and I-95 you actually cover.',
        why: 'Traffic serving the Port of Savannah supports heavy-duty demand on the corridors feeding it, and that buyer searches by route and capability rather than by town.',
      },
      {
        service: 'local-organic',
        title: 'Metro service pages',
        what: 'Separate pages for Atlanta and the perimeter suburbs you genuinely serve, plus Savannah, Augusta, Columbus and Macon where you operate.',
        why: 'Atlanta towing marketing and Savannah towing marketing are different problems, and a single statewide page cannot address either buyer specifically enough to rank or to be quoted.',
      },
      {
        service: 'reviews-reputation',
        title: 'Consumer review acquisition',
        what: 'Post-tow SMS requests on the roadside and accident work where the customer chose you.',
        why: 'This is the counterweight to the property disputes. Without it, one contested complex can crowd out everything else a customer sees.',
      },
      {
        service: 'ai-answers',
        title: 'AI-search and entity visibility',
        what: 'Content naming the perimeter, the corridors, the equipment and the kind of recovery, plus presence in third-party sources assistants retrieve from.',
        why: 'Specificity is what makes a passage quotable. Copy that would fit any operator anywhere gives an assistant nothing to attach to your business.',
      },
      {
        title: 'Call and account measurement',
        what: 'Per-page call tracking for the consumer side, and dispatcher account tracking for the corridor side, since the two convert nothing alike.',
        why: 'Reporting both halves of a Georgia business on one number hides which half the work moved.',
      },
    ],
  },
  demand: ['emergency-roadside', 'heavy-duty', 'accident-recovery', 'private-property'],
  services: ['google-business-profile', 'reviews-reputation', 'local-organic', 'ai-answers'],
  sections: [
    {
      id: 'ga-atlanta',
      service: 'google-business-profile',
      demand: 'emergency-roadside',
      question: 'What makes the Atlanta towing market hard to compete in?',
      answer:
        'Atlanta concentrates breakdown volume into a compact area where I-75, I-85 and I-20 meet inside the I-285 perimeter. With many operators positioned around the perimeter, distance — one of Google\'s three documented local ranking factors — tends to separate them less than it would elsewhere.',
      detail: [
        'The perimeter shapes the market in a way worth planning around. A breakdown on I-285 could plausibly be served by operators based in a number of different suburbs at a similar drive, so the map pack for that search is contested rather than settled by proximity. Where distance separates less, the other two documented factors — relevance and prominence — carry more of the weight.',
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
        'Private-property towing from apartment and mixed-use parking is a substantial part of the metro Atlanta market, and it produces a specific review pattern: bursts of angry reviews tied to one property, often from residents rather than one-off visitors.',
      detail: [
        'This is the Georgia-specific version of the reputation problem, and it differs from a general impound complaint in an important way. A resident whose car was towed from their own building lives there, talks to neighbours, and may return to the review months later. One contested property can generate a cluster of one-stars in a fortnight, and it is usually traceable to a single address and a single policy dispute.',
        'That traceability is the opening. Because the complaints cluster, they can be addressed at the source: agreeing signage and grace periods with the property manager, having dispatch log the specific enforcement request behind each tow, and being able to state in a reply exactly what was authorised and by whom. Operators who cannot reconstruct that end up replying vaguely, which reads badly.',
        'It also changes what the account is worth. A property contract that reliably generates disputes is buying revenue with reputation, and that trade is worth pricing consciously rather than discovering later. Some Atlanta operators we would advise to keep such a contract; some to renegotiate the enforcement terms; some to let it go.',
        'On the consumer side, the counterweight is the roadside and accident work around the perimeter, where customers chose the operator. Building a request into those jobs is what keeps a property dispute from dominating the profile.',
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
        'Georgia gives operators a genuinely two-sided business: a dense consumer market around Atlanta and a freight corridor economy running to the coast. They need different marketing, and conflating them is a common mistake on Georgia towing websites.',
        'Fleet and dispatcher buyers tend to search by capability and route. Pages stating tonnage capacity, recovery equipment, and which stretches of I-16, I-75, I-85 and I-95 you actually cover generally match that better than pages built around town names.',
        'Ticket sizes justify the effort. Heavy recovery work is typically worth many consumer tows, and dispatcher relationships recur once established.',
      ],
    },
    {
      id: 'ga-ai',
      service: 'ai-answers',
      question: 'How do Georgia towing companies get named by AI assistants?',
      answer:
        'Assistants answer requests for a tow recommendation with specific businesses, drawn from sources they can retrieve. Being named depends on clear, quotable information about your service and coverage area existing somewhere a model can reach it.',
      detail: [
        'For a Georgia operator the useful specificity is geographic and operational: naming the perimeter, the corridors, the equipment and the kind of recovery, rather than copy that would fit any operator anywhere.',
        'The other half is presence in third-party sources — directories, trade publications, community discussion — since a meaningful share of what assistants cite is not on the operator\'s own site.',
      ],
    },
  ],
  faqs: [
    {
      question: 'Why does my Atlanta towing company get review clusters from one apartment complex?',
      answer:
        'Private-property enforcement produces complaints from residents rather than one-off visitors, and residents talk to each other. A single disputed policy at one property can generate several one-star reviews in a short period. Because they cluster around one address, they can usually be addressed at the source — signage, grace periods and clear enforcement authorisation logged per tow.',
    },
    {
      question: 'How busy is the Port of Savannah?',
      answer:
        'The Georgia Ports Authority describes the Port of Savannah as the third-busiest container gateway in the United States, with Garden City Terminal among the largest single container facilities in the country. That commercial traffic supports heavy-duty and recovery demand on the corridors serving the port.',
    },
    ...GBP_FAQS,
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
  metros: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Harrisburg', 'Scranton'],
  landscape:
    'Pennsylvania towing demand is shaped by weather and by two large metros with very different geography. Philadelphia and Pittsburgh anchor opposite ends of the state across terrain that produces genuine winter recovery work, and the northwest corner sees lake-effect snow — the National Weather Service attributes between 45 and 53 percent of seasonal snowfall along the eastern shores of Lakes Erie and Ontario to lake-effect events, with totals highest in January. The result is a market with a pronounced seasonal peak and a steady base of private-property work in dense, older city neighbourhoods.',
  searchProblem:
    'Commercially, Pennsylvania punishes late work more than most markets. A large share of the year\'s tow revenue arrives in a handful of weather weeks, every operator in the county is busy on the same days, and the operator a stranded driver finds first is usually the one whose profile and reviews were already in order months earlier. Towing SEO in Pennsylvania is consequently a calendar problem as much as a content one: a Pennsylvania towing company can do everything right in January and still have missed the season.',
  engagement: {
    heading: "How we would build a Pennsylvania towing company's search presence",
    intro:
      'Scope depends on which metro you serve and how weather-weighted your volume is, but this is the order we would work in for a Pennsylvania operator, and the timing matters as much as the list. The short version: we get you ready before the season rather than during it, fix the review pattern that makes seasonal businesses look dormant, and keep a paid lever for the days conditions turn.',
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
        what: 'Requests running on the small warm-weather jobs, not only during the winter peak, plus reply templates for wait-time complaints.',
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
        title: 'Philadelphia and Pittsburgh page architecture',
        what: 'Separate positioning per metro rather than one Pennsylvania page: parking and private-property work in Philadelphia, winch and recovery capability in Pittsburgh.',
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
  services: ['google-business-profile', 'reviews-reputation', 'local-organic', 'paid-search'],
  sections: [
    {
      id: 'pa-winter',
      demand: 'emergency-roadside',
      service: 'google-business-profile',
      question: 'How should a Pennsylvania towing company prepare for winter demand?',
      answer:
        'Winter concentrates a large share of Pennsylvania towing work into a few months of ditch recoveries, jump starts and weather accidents. Search visibility is best established before the first storm — a profile corrected in January has already missed the calls January produced.',
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
        'The strategy that addresses both is deliberately unglamorous: request reviews year-round on the small summer jobs that feel too minor to bother with — lockouts, jump starts, flat tyres, scheduled transports. They spread the arrival pattern across the calendar and dilute the storm-day complaints, and they are the easiest reviews the business will ever get.',
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
    {
      question: 'How much of Erie\'s snowfall comes from lake-effect events?',
      answer:
        'The National Weather Service attributes between 45 and 53 percent of seasonal snowfall along the eastern shores of Lakes Erie and Ontario to lake-effect synoptic types, with totals highest in January. Erie\'s snowiest winter on record stands at 149.1 inches, and a late-2024 event produced storm totals between 42.2 and 50.0 inches.',
    },
    {
      question: 'How should a seasonal towing business handle review timing?',
      answer:
        'Request reviews year-round rather than only during the winter peak. A profile showing a cluster of January reviews and then nothing until the following winter reads as inactive to a customer checking in summer. The small warm-weather jobs — lockouts, jump starts, flat tyres — are the easiest way to spread the pattern across the calendar.',
    },
    ...GBP_FAQS,
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
  metros: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Gary'],
  landscape:
    'Indiana calls itself the Crossroads of America, and the freight numbers support the name: INDOT reports that 724 million tons of freight travel through Indiana each year, making it the fifth busiest state for commercial freight traffic, and that Indiana has more pass-through highways than any other state. I-65, I-70, I-69, I-74 and I-80/94 cross the state. That mix makes heavy-duty and commercial recovery a larger part of Indiana towing demand than consumer roadside work alone would suggest.',
  searchProblem:
    'Commercially that inverts the usual advice. A large share of Indiana towing demand comes from freight moving through the state, and a fleet dispatcher choosing a heavy-duty operator is checking equipment, corridor coverage and insurance rather than reading Google reviews. An Indiana operator can spend a year building consumer review volume and move very little of the work that actually pays, while the corridor pages that would reach the fleet buyer never get written. Towing SEO in Indiana usually means starting with the website rather than the profile.',
  engagement: {
    heading: "How we would build an Indiana towing company's search presence",
    intro:
      'Scope depends on how heavily you lean toward fleet versus consumer work, but for most Indiana operators this is the order we would work in, and it deliberately leads with the website rather than the profile. The short version: we build the corridor pages that reach dispatchers, keep the consumer profile in proportion rather than neglected, and measure the two halves separately because they convert nothing alike.',
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
        what: 'Category, individually listed services, honest service area, truthful hours and real fleet photography across Indianapolis, Fort Wayne, Evansville and South Bend.',
        why: 'Prerequisites rather than tactics: Google says complete, accurate profiles are more likely to appear. Many profiles in these markets have never had this pass done at all.',
      },
      {
        service: 'reviews-reputation',
        title: 'Proportional consumer review acquisition',
        what: 'A post-tow request on the consumer jobs, run steadily but without the effort a consumer-only operator would put in.',
        why: 'Proportionality rather than neglect. A dispatcher who does look you up should not find a neglected listing, and the consumer half is subject to the same ranking factors as anyone else.',
      },
      {
        service: 'local-organic',
        title: 'Northwest Indiana positioning',
        what: 'Separate positioning for the Gary and Hammond corridor, written around I-80/94 and the surrounding freight geography.',
        why: 'That corner competes for work generated by the Chicago metropolitan economy. Copy written for the rest of Indiana will not describe it accurately.',
      },
      {
        service: 'ai-answers',
        title: 'AI-search and entity visibility',
        what: 'Content naming the corridors, equipment and recovery types in extractable form, plus presence in trade and directory sources.',
        why: 'A dispatcher asking an assistant for heavy recovery on a named interstate is a realistic query, and the answer comes from what a model can retrieve.',
      },
      {
        title: 'Split call and account measurement',
        what: 'Per-page call tracking for consumer work, and account plus repeat-dispatch tracking for fleet work, which has to come from you rather than from analytics.',
        why: 'Consumer work is judged on calls; fleet work is judged on accounts. Reporting both on one number hides which half moved.',
      },
    ],
  },
  demand: ['heavy-duty', 'accident-recovery', 'emergency-roadside', 'long-distance'],
  services: ['local-organic', 'google-business-profile', 'reviews-reputation', 'ai-answers'],
  sections: [
    {
      id: 'in-corridors',
      demand: 'heavy-duty',
      service: 'local-organic',
      question: 'How should an Indiana towing company market heavy-duty recovery?',
      answer:
        'Build around corridors rather than towns. INDOT reports Indiana as the fifth busiest state for commercial freight traffic, with more pass-through highways than any other state. Fleet dispatchers needing recovery on I-65, I-70, I-69 or I-80/94 search by route and capability.',
      detail: [
        'Indiana\'s interstate density is the defining commercial fact of its towing market. INDOT also notes that as much as one-third of the freight on Indiana\'s transportation network passes through the state without stopping, which means a large share of the vehicles an operator recovers belong to carriers with no local presence at all.',
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
        'The fundamentals, because they are frequently untouched. Google says businesses with complete and accurate information are more likely to appear in local results — correct primary category, individually listed services, an honest service area, truthful hours and real fleet photography.',
      detail: [
        'These are prerequisites rather than tactics. Distance is fixed, prominence takes time, and relevance is the factor most directly under an operator\'s control. Many profiles in markets like Indianapolis, Fort Wayne, Evansville and South Bend have never had this pass done at all.',
        'We would not promise a position from it. What we would say is that an incomplete profile is competing against complete ones on a factor Google explicitly documents, and that fixing it costs an afternoon.',
        'Review volume is the slower companion. Google names review count among the signals feeding prominence and says more reviews and positive ratings can help local ranking, without publishing how much.',
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
        'That said, an operator running both sides still needs the consumer profile in order — a dispatcher who does look you up should not find a neglected listing, and the consumer half of the business is subject to the same ranking factors as anyone else. The advice is proportionality rather than neglect: run a review request on the consumer jobs, and put the reputational effort for the fleet side into references and response records.',
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
    {
      question: 'How much freight moves through Indiana?',
      answer:
        'INDOT reports that 724 million tons of freight travel through Indiana each year, making it the fifth busiest state for commercial freight traffic, and that Indiana has more pass-through highways than any other state. As much as one-third of that freight passes through without stopping.',
    },
    {
      question: 'Should a heavy-duty Indiana operator invest in Google reviews?',
      answer:
        'Proportionally. Fleet dispatchers generally choose on equipment, corridor coverage, insurance and past response rather than star ratings, so the reputational effort for that side is better spent on references, response records and association membership. Keep the consumer profile in good order, and run review requests on the consumer jobs.',
    },
    ...GBP_FAQS,
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

export const TOWING_STATES: TowingState[] = [
  california,
  florida,
  georgia,
  pennsylvania,
  indiana,
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
  { state: 'Georgia', topic: 'Share of metro Atlanta tow volume that is private-property enforcement.' },
  { state: 'Pennsylvania', topic: 'PennDOT or municipal towing rate and licensing requirements.' },
  { state: 'Pennsylvania', topic: 'Turnpike authorised-operator arrangements.' },
  { state: 'Indiana', topic: 'State towing licensing and non-consensual rate rules.' },
  { state: 'Indiana', topic: 'State police wrecker rotation requirements.' },
  { state: 'Florida', topic: 'Operator licensing requirements beyond the § 125.0103 rate framework.' },
  { state: 'California', topic: 'Local (non-CHP) municipal tow franchise and rate rules.' },
  {
    state: 'All',
    topic:
      'Any figure for how much towing demand is mediated by AI assistants. No measurement we would stand behind exists, so the pages make no volume claim.',
  },
  {
    state: 'All',
    topic:
      'Operator-count or market-density rankings by state or metro. No primary source counts tow operators this way, so comparative density claims were removed rather than sourced.',
  },
];
