/**
 * /towing-jobs — where towing work comes from, and how an operator gets more.
 *
 * Why this is a separate file from towing.ts
 * ------------------------------------------
 * towing.ts holds shared copy factories — GBP_FAQS, aiFaqs(), buyersGuideFor()
 * — that every state page spreads into itself. They are the largest source of
 * shared text in the vertical, and scripts/verify-seo.ts compares all towing
 * pages pairwise for 5-gram overlap. Keeping this page's content in its own
 * module means none of those factories is in scope by default, which is a
 * structural guard against this page drifting into a paraphrase of the pillar.
 *
 * Do not import them here. If a question is already answered on
 * /towing-companies, link to it rather than restating it.
 *
 * The organising axis
 * -------------------
 * The pillar and the state pages are built on DemandIntent (who is calling) and
 * ServiceIntent (what we do about it). This page is built on a third axis that
 * exists nowhere else in the codebase: JobSource, where the work originates.
 * That is what makes it a genuinely different page rather than the same page
 * with a different title.
 *
 * The commercial point falls out of the taxonomy honestly. Of six sources of
 * work, five are contracts, applications or relationships an agency has no hand
 * in. One — direct calls — is won on visibility. That is the only one we affect
 * and the page says so plainly.
 *
 * Sourcing rules are the same as towing.ts:19-41. Note that CONTENT_GAPS
 * already records that Georgia, Pennsylvania and Indiana rotation rules could
 * not be confirmed from a primary source. The rotation section below therefore
 * describes the mechanism and uses California as the one fully-cited worked
 * example, rather than implying a uniform national process that does not exist.
 *
 * There is deliberately no JobPosting structured data on this page. There are
 * no real openings behind it, and marking up jobs that do not exist is both a
 * Google policy violation and exactly the fabrication this vertical refuses.
 */

import type { Faq } from '../types';
import type { SourceRef, TowingSection } from './towing';

/**
 * Axis 3 — where the work originates.
 *
 * Ordered roughly by how much control the operator has over the price, which
 * is the argument the page is making.
 */
export type JobSource =
  | 'motor-club'
  | 'police-rotation'
  | 'private-property'
  | 'fleet-commercial'
  | 'dealer-transport'
  | 'direct-consumer';

export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  'motor-club': 'Motor club & roadside networks',
  'police-rotation': 'Police & agency rotation',
  'private-property': 'Private property & impound',
  'fleet-commercial': 'Commercial & fleet accounts',
  'dealer-transport': 'Dealer, auction & transport',
  'direct-consumer': 'Direct calls from the public',
};

/**
 * One row of the mix table.
 *
 * `whoSetsRate` is the field doing the work. Listing six channels without it
 * would be a glossary; naming who prices each one is what turns the list into
 * the page's actual argument.
 */
export interface JobSourceEntry {
  source: JobSource;
  what: string;
  whoSetsRate: string;
  /** How an operator actually gets into this channel. */
  howIn: string;
  /** Short form of howIn, for the comparison table. */
  entry: string;
}

/** One row of the "which problem do you actually have" block. */
export interface OperatorDecision {
  problem: string;
  consider: string;
}

/**
 * The measurement ladder.
 *
 * Ordered from what an agency can report most easily to what an operator
 * actually banks. The gap between the two ends is the entire argument for
 * reporting calls rather than impressions — and the honest caveat is that each
 * rung only *may* produce the next, which is why `caveat` exists.
 */
export interface MetricRung {
  metric: string;
  whatItIs: string;
  /** Why it is not the rung below it. */
  caveat: string;
}

/* -------------------------------------------------------------------------
   Primary sources

   Same URLs and checked dates as the state pages that already cite them, but
   `supports` is rewritten for what THIS page uses each one for — the field is
   defined as "what specifically this source is cited for", and reusing the
   state pages' wording would add shared text to the similarity pool for no
   reader benefit.
------------------------------------------------------------------------- */

const CHP_ROTATION: SourceRef = {
  label: 'California Highway Patrol — Rotation Tow Program',
  url: 'https://www.chp.ca.gov/programs-services/for-law-enforcement/rotation-tow-program/',
  supports:
    'That a state rotation program exists and is entered voluntarily, and that the CHP itself describes participation as not intended to be a main source of income.',
  checkedAt: '2026-08-27',
};

const CHP_TSA: SourceRef = {
  label: 'California Highway Patrol — Tow Service Agreement (2025–2026)',
  url: 'https://www.chp.ca.gov/siteassets/exams/examination-study-guides/061-2025-02008---2025-2026-tsa--final.pdf',
  supports:
    'The kind of qualification a rotation agreement actually imposes: approved driver training within five years, Department of Justice fingerprint submission, and a 30-day insurance notice requirement.',
  checkedAt: '2026-08-27',
};

const MI_POSTED_NOTICE: SourceRef = {
  label: 'Michigan Attorney General — Consumer Alert on Michigan Towing Laws (July 2025)',
  url: 'https://www.michigan.gov/ag/news/press-releases/2025/07/03/attorney-general-nessel-reissues-consumer-alert-on-michigan-towing-laws',
  supports:
    'That private-property towing carries statutory posted-notice obligations, and that a motorist has named public complaint routes — evidence that property work is a compliance relationship, not only a commercial one.',
  checkedAt: '2026-08-28',
};

const WA_RTTO: SourceRef = {
  label: 'Washington State Department of Licensing — Registered tow truck operators (RTTO)',
  url: 'https://dol.wa.gov/professional-licenses/registered-tow-truck-operators-rtto',
  supports:
    'That some states license tow operators directly, so eligibility for certain work is a licensing question decided by a state agency before it is a sales question.',
  checkedAt: '2026-08-28',
};

/* -------------------------------------------------------------------------
   The mix

   direct-consumer leads the table deliberately: it is the row the page is
   really about, and the one an operator is most able to act on.
------------------------------------------------------------------------- */

const MIX: JobSourceEntry[] = [
  {
    source: 'direct-consumer',
    what: 'Someone with a problem searches, finds you, and calls you — no network, no rotation, no broker between you and the customer.',
    whoSetsRate: 'You do.',
    howIn: 'Be findable and credible at the moment of the breakdown. This is the one that is a visibility problem.',
    entry: 'Be found and chosen',
  },
  {
    source: 'motor-club',
    what: 'Calls dispatched to you by a roadside assistance network or motor club — AAA, Agero, Quest, Honk, Urgently and similar — after a member contacts them rather than you.',
    whoSetsRate: 'The network, through the schedule you accept to join it.',
    howIn: 'Apply to each network and meet its coverage, response-time and insurance terms.',
    entry: 'Apply and qualify',
  },
  {
    source: 'police-rotation',
    what: 'Non-consensual calls handed out by whichever agency has jurisdiction — a state patrol, a sheriff, a city police department — usually on a turn-by-turn rotation within a defined zone.',
    whoSetsRate: 'The agency, typically through a published schedule or agreement.',
    howIn: 'Apply to the agency, then hold the equipment, storage, insurance and background standards it requires.',
    entry: 'Apply and meet agency requirements',
  },
  {
    source: 'private-property',
    what: 'Removals you perform under a standing agreement with a property owner or manager — apartment complexes, retail lots, HOAs — rather than for the vehicle owner.',
    whoSetsRate: 'Often capped or constrained by state or local rules; otherwise agreed with the property.',
    howIn: 'Sign the property, then carry the signage, notice and record-keeping your state requires.',
    entry: 'Contract with the property',
  },
  {
    source: 'fleet-commercial',
    what: 'Recovery and transport for businesses that own vehicles — carriers, dealerships, municipalities, equipment owners. Often heavier work, and often recurring.',
    whoSetsRate: 'Negotiated between you and the account.',
    howIn: 'Sold. A dispatcher or fleet manager evaluates you before the first call.',
    entry: 'Sell capability and coverage',
  },
  {
    source: 'dealer-transport',
    what: 'Vehicle movement that is not an emergency at all: auction runs, dealer trades, repossession transport, long-distance moves booked ahead.',
    whoSetsRate: 'The poster or broker, bid on an open marketplace.',
    howIn: 'Join the load boards the segment uses and bid, or build direct dealer relationships.',
    entry: 'Relationships and/or marketplaces',
  },
];

/**
 * Routes an operator to the channel that fits the problem they actually have.
 *
 * Deliberately not a ranking. An operator with idle trucks and an operator with
 * a margin problem need opposite advice, and a page that says "direct calls are
 * best" to both is selling rather than helping.
 */
const DECISIONS: OperatorDecision[] = [
  {
    problem: 'Trucks and drivers are sitting idle',
    consider:
      'Volume is the constraint, so the channels that admit you on application are the fastest to open: roadside networks, and load-board work if you run a flatbed with spare capacity. You are accepting somebody else\'s rate to fill time that is currently earning nothing.',
  },
  {
    problem: 'Busy all week, but the margin is thin',
    consider:
      'Volume is not your problem — the mix is. Look at what share of your board arrives on your own number versus through a network or rotation, and work on the direct share rather than on total jobs.',
  },
  {
    problem: 'You want recurring, predictable work',
    consider:
      'That is the B2B side: fleet and commercial accounts, property contracts, dealer relationships. These are sold rather than searched, they take longer to win, and they tend to persist once won.',
  },
  {
    problem: 'You want rotation work',
    consider:
      'Identify every agency that dispatches in the territory you actually cover and work the gap between its published requirements and your roster. It is a compliance project, not a marketing one — and worth reading what the agency itself says the program is for.',
  },
  {
    problem: 'You want more control over what the work pays',
    consider:
      'Direct consumer work is the channel where the operator generally has the most control over pricing, subject to applicable law and market conditions. Increasing that share is the one item on this list where visibility is the lever, and it is the part we work on.',
  },
];

/**
 * What each rung actually tells you, and what it does not.
 *
 * The caveats are the point. An agency that reports the top of this ladder and
 * lets the operator assume the bottom is the failure mode this page exists to
 * argue against, so each rung names the gap to the next one explicitly.
 */
const METRIC_LADDER: MetricRung[] = [
  {
    metric: 'Impressions',
    whatItIs: 'How often you appeared. From Google Search Console.',
    caveat: 'Appearing is not being seen, and being seen is not being chosen.',
  },
  {
    metric: 'Rankings',
    whatItIs: 'Where a page sits for a query.',
    caveat: 'Varies by the searcher\'s location and device, so a single "position" for a local business is an average of many different results.',
  },
  {
    metric: 'Sessions',
    whatItIs: 'People who reached the website.',
    caveat: 'Much emergency towing is decided in Maps without a website loading at all, so this can move without the phone moving.',
  },
  {
    metric: 'Calls',
    whatItIs: 'Taps on a phone number, from click tracking.',
    caveat: 'A tap is not an answered call. Connecting the two properly needs call tracking, and we do not report taps as conversations.',
  },
  {
    metric: 'Qualified calls',
    whatItIs: 'Calls that were real jobs in your service area, not wrong numbers or price-shoppers outside it.',
    caveat: 'Only your phone system and your staff can classify these. We cannot see them from the outside.',
  },
  {
    metric: 'Booked tows',
    whatItIs: 'Jobs that were actually dispatched. From your records.',
    caveat: 'Comes from your dispatch system, not from ours. We will say so rather than present your numbers as ours.',
  },
  {
    metric: 'Revenue',
    whatItIs: 'What the work paid.',
    caveat: 'Depends on your rates, your mix and your collections — none of which a marketing agency sets. This is the number that matters and the one we can least claim credit for.',
  },
];

/* -------------------------------------------------------------------------
   Page
------------------------------------------------------------------------- */

export const TOWING_JOBS = {
  lede:
    'Search "towing jobs" and you get employment listings. Operators mean something else by it: the calls that fill the board. Tow work reaches a truck through six channels — you apply for some, you sell your way into others, and exactly one is won by being found. This page covers where each one comes from, what it takes to get in, who ends up setting the rate, and which part of the mix is actually a visibility problem.',

  mix: MIX,
  decisions: DECISIONS,
  metricLadder: METRIC_LADDER,

  sections: [
    {
      id: 'where-from',
      question: 'Where do towing jobs actually come from?',
      answer:
        'Six channels: motor club and roadside networks, police or agency rotation, private property contracts, commercial and fleet accounts, dealer and transport moves, and direct calls from the public. You get into them three ways — you apply and qualify, you sell somebody, or you get found. Most operators run several at once.',
      detail: [
        'That three-way split is the whole framework, and it is worth holding onto before the detail. Roadside networks and agency rotation are applications: you meet a published standard and you are admitted. Property, fleet and dealer work is sold: a person evaluates you and signs. Direct consumer calls are the only ones won by being findable and credible at the moment somebody needs a truck.',
        'Almost every conversation about growing a towing company starts as "we need more jobs" and turns out to be about something narrower. An operator running mostly network dispatch and rotation calls is often not short of volume at all — the trucks are moving. What is short is margin, because those are the channels where somebody else publishes the rate.',
        'So the useful frame is frequently a ratio rather than a total. Two operators doing the same number of tows a month can be running very different businesses depending on how many of those calls arrived through a channel that set the price before the phone rang.',
        'One consequence is worth stating at the top rather than four sections in: of the six, only the last is a visibility problem, and only the last is one we have any hand in. The other five are compliance, contracts and sales. If you are here because you want more work, the honest first question is which of those three things is actually in your way.',
      ],
    },
    {
      id: 'rotation',
      question: 'How do you get on a police or state tow rotation list?',
      answer:
        'You apply to whichever agency has jurisdiction and meet its published standard. There is no national rotation list and no single process — a state patrol, a county sheriff and a city police department can each run their own, with different equipment, storage, insurance and background requirements, for different zones.',
      detail: [
        'California is the clearest documented example, because the Highway Patrol publishes both the program and the agreement behind it. Its Rotation Tow Program is entered voluntarily, and a Tow Service Agreement carries requirements of a kind most operators underestimate: approved driver training completed within the previous five years, Department of Justice fingerprint submission, and notice to the agency within 30 days on insurance changes. That is a compliance posture you hold continuously, not a form you file once.',
        'One line in the CHP\'s own material is worth more than any advice we could add: the department describes rotation participation as not intended to be a main source of income. That is the agency that runs the program telling operators not to build the business on it. If you are pursuing rotation work to replace revenue rather than to supplement it, the program\'s own operator says you are using it for something it was not designed for.',
        'Beyond California, be careful with anything you read — including here. We could not confirm rotation or wrecker call-list rules for Georgia, Pennsylvania or Indiana from a primary government source, so this page does not describe them. Several states regulate a step earlier than rotation: Washington licenses Registered Tow Truck Operators through its Department of Licensing, which makes eligibility for some work a licensing question decided by a state agency before it is a commercial one.',
        'The practical move is unglamorous. Identify every agency that dispatches in the territory you actually cover, find its current published requirements, and work the gap between those requirements and your roster. Nobody sells you onto a rotation list, and any agency that offers to is describing something it cannot do.',
      ],
    },
    {
      id: 'motor-club',
      question: 'Are motor club towing jobs worth taking?',
      answer:
        'It depends what you are using them for. Network dispatch fills gaps in the schedule at a rate you did not set — which can be genuinely useful when trucks would otherwise be idle, and harder to justify when it becomes the base the whole business rests on.',
      detail: [
        'The honest version is that this is a capacity decision rather than a marketing one. A call that keeps a truck and a driver earning during a slow Tuesday afternoon is worth taking on terms you would refuse at 2am on the busiest night of the winter. Operators who track this by time of day rather than by average tend to make better calls about which networks to stay on.',
        'We are not going to publish rate comparisons or margin figures for specific networks. We have not verified any, the terms differ by operator and territory, and a number invented to make a point is worth less than no number. Your own dispatch records already hold the answer for your market, and that is the comparison that matters.',
        'What is worth saying is what network volume conceals. A board that looks full is a poor signal of business health if the full part is the part somebody else prices. If you want to know whether your mix is moving, the number to watch is not total jobs — it is the share arriving on your own phone number.',
      ],
    },
    {
      id: 'private-property',
      question: 'How do you get private property and impound work?',
      answer:
        'You sign the property, not the driver. Apartment complexes, retail lots, HOAs and management companies hold the contracts, and the work can become recurring once you have the contract. It also carries compliance obligations that are stricter than most operators expect, and a reputational cost that is real.',
      detail: [
        'Michigan illustrates the compliance half plainly: its Attorney General publishes a consumer alert setting out the posted-notice obligations around private-property towing, along with the routes a motorist can use to complain — the Department of Attorney General, local police, or the state police commercial vehicle division. Rules differ by state, but the shape is common. Property work is a regulated relationship with a vehicle owner you never contracted with, as much as a commercial one with the property.',
        'The reputational side is worth pricing in before you sign. Private-property towing can attract negative reviews even when the tow is performed correctly, because the vehicle owner may object to the removal itself rather than to how it was carried out. How much of that you see depends on the properties, the volume and the local rules. The pillar covers what to do about it in depth — including why a second Google profile for the impound side is usually not the fix operators hope it is — so this page does not repeat it.',
        'The sales motion itself is ordinary B2B. You are selling property managers rather than consumers, responsiveness, paperwork and operational reliability can all matter when they evaluate vendors. Very little about it is a search problem, which is why this section is short.',
      ],
    },
    {
      id: 'commercial',
      question: 'How do you get commercial and fleet towing accounts?',
      answer:
        'You get evaluated. A carrier, dealership or municipality choosing a recovery vendor is doing something a stranded motorist never does — comparing capability before there is an emergency. Tonnage, equipment, corridor coverage and response time decide it, and the decision usually happens on a website.',
      detail: [
        'This is the one channel where the ordinary rules of B2B marketing apply to towing, and the only one where a website earns its keep for reasons unconnected to Google Maps. A fleet dispatcher wants to know what you can lift, where you can reach, and how fast — and wants to know it before an incident, so your equipment roster and corridor coverage are the pages that matter.',
        'Fleet buyers think in routes rather than towns, which is why pages built around the interstates you actually cover tend to match how they search better than pages built around city names. That approach and the heavy-duty side generally are covered on the pillar.',
        'Worth being clear about the ticket: this work tends to be larger and tends to recur, so a handful of accounts can outweigh a good deal of consumer volume. It also tends to be slow to win and slow to lose, which cuts both ways.',
      ],
    },
    {
      id: 'load-boards',
      question: 'What about towing job boards and load boards?',
      answer:
        'Two different things share the name. A towing job board lists employment — driver and operator vacancies. A vehicle-transport load board lists freight: dealer trades, auction runs, repossession moves and long-distance transport that operators bid on. Only the second one puts work on your truck.',
      detail: [
        'Load-board work behaves nothing like emergency towing. It is scheduled rather than urgent, bid rather than dispatched, and priced on an open marketplace where the visible competition is every other carrier looking at the same listing. Operators running a flatbed with spare capacity often use it to fill planned routes rather than to replace roadside work.',
        'Because it is a marketplace, it is not a visibility channel in any sense we could help with. You do not get found on a load board — you log in and bid. It is on this page because "towing jobs" genuinely returns it and an operator searching the term deserves to know which of the two things they found.',
      ],
    },
    {
      id: 'direct-calls',
      question: 'How do you get more direct towing jobs?',
      answer:
        'Direct calls are the only channel won by being findable rather than by applying or selling. The sequence is short: someone needs a truck, searches, sees a handful of businesses, judges them in seconds, and calls one. Visibility decides whether you are in that handful at all; everything the customer can see about you decides whether you are the one called.',
      detail: [
        'It is worth walking that chain slowly, because each link is a different job. The customer has a problem. They search — usually on a phone, often in Maps. They see a small set of businesses. They evaluate that set on whatever is on screen. They call one. Then you book the tow.',
        'Marketing cannot do anything about the first link or the last. What it can affect is the middle: whether you appear in the set, and whether what the customer sees there makes you a credible choice. Being invisible is decisive in a way that being imperfect is not — an operator who never appears is never evaluated, no matter how good the service is.',
        'What sits in the middle is mostly unglamorous. An accurate, complete Google Business Profile in the right categories, with a service area matching real dispatch range and hours that reflect whether a human actually answers overnight. Review volume and recency, which the customer reads before deciding. A website that loads on a phone and answers the questions the map does not. And increasingly, how your business information is represented across the sources AI systems use when answering local-business questions.',
        'The towing pillar covers each of those properly, and this page will not restate them. What this section is for is the connection: those are not a marketing checklist for its own sake, they are the mechanism by which a stranger with a dead car ends up dialling your number instead of somebody else\'s.',
        'Two honest limits. First, none of it guarantees a call — it changes whether you are considered, not whether you are chosen, and no agency including this one can promise the second. Second, what the market looks like differs by state: who caps your rates, where the freight runs, whether winter or storm season drives your peak. We cover that state by state rather than pretending the answer is national.',
      ],
      callCta: 'Talk about shifting your call mix',
    },
    {
      id: 'measurement',
      question: 'How do you know whether the mix is actually shifting?',
      answer:
        'By counting calls arriving on your own number, and then what those calls became. Impressions, rankings and sessions all sit above the thing you actually bank, and a month that lifted traffic without lifting phone volume did not change the ratio this page is about.',
      detail: [
        'There is a ladder between "we appeared in a search" and "we got paid", and each rung only may produce the next one. An agency that reports the top of it and lets you assume the bottom is not lying exactly, but it is letting a gap do the persuading. The rungs are worth naming so the gap is visible.',
        'The practical split is who can see what. Impressions and rankings come from Google Search Console. Sessions come from analytics. Call taps come from click tracking. But qualified calls — the ones that were real jobs in your area rather than wrong numbers or price-shoppers three counties away — can only be classified by your phone system and your staff. Booked tows and revenue come from your dispatch records. We will name which side of that line every number came from rather than presenting yours as ours.',
        'One distinction that gets blurred constantly: a tap on a phone number is not an answered call. We do not report it as one. Connecting the two properly needs call tracking with dynamic number insertion, which is worth setting up when the volume justifies it and not before.',
      ],
    },
    {
      id: 'not-our-job',
      question: 'What we do not do',
      answer:
        'OptimizeIndex does not find or dispatch towing jobs. We do not broker work, place operators on rotation lists, negotiate motor club contracts, answer your phone, or run dispatch. If that is what you are looking for, we are the wrong vendor and would rather say so now.',
      detail: [
        'We also do not guarantee calls, rankings or revenue. Nobody outside Google can promise a position, and no agency can promise that a stranger with a dead car will dial your number. What can honestly be offered is work on the reasons you are found and the reasons you are chosen, and honest reporting on what followed.',
        'What we do is one part of one channel: making an operator findable and credible at the moment someone searches, so more of the board can arrive as direct calls you priced yourself. That is a real lever on the mix and it is a narrow one.',
        'We spell this out because "towing jobs" is exactly the search where an operator could reasonably arrive expecting a lead-generation service that sells calls by the job. We do not sell calls. We work on visibility and credibility, and we report on calls and booked tows rather than impressions.',
      ],
    },
    {
      id: 'job-seekers',
      question: 'Looking for work as a tow truck driver?',
      answer:
        'This page is written for people who own or run towing companies, not for drivers looking for a job. We are a marketing agency and we do not list vacancies or place drivers.',
      detail: [
        'If you are looking for driver or operator work, the general job boards carry the listings, and applying directly to operators in your area is usually faster than any of them. We would rather tell you that in one paragraph than keep you reading a page that was never going to help.',
      ],
    },
  ] as TowingSection[],

  faqs: [
    {
      question: 'How do towing companies get more jobs?',
      answer:
        'Through six channels: motor club and roadside networks, police or agency rotation, private property contracts, commercial and fleet accounts, dealer and transport load boards, and direct calls from the public. Three are applications, two are sales, and one is won by being findable. Which one you need more of depends on whether you are short of volume or short of margin.',
    },
    {
      question: 'How do I get on the police tow rotation list?',
      answer:
        'Apply to the agency with jurisdiction over the territory you cover — a state patrol, sheriff or city police department — and meet its published equipment, storage, insurance and background requirements. There is no national list and no single standard. In California the Highway Patrol publishes both its Rotation Tow Program and the Tow Service Agreement behind it, and describes participation as not intended to be a main source of income.',
    },
    {
      question: 'Are motor club towing jobs profitable?',
      answer:
        'They are priced by the network rather than by you, which makes them a capacity decision. Network dispatch is worth taking when a truck would otherwise sit idle and costly when it becomes the base the business rests on. Your own dispatch records, broken out by time of day rather than averaged, will answer this for your market better than any published comparison.',
    },
    {
      question: 'How do I get towing contracts with apartment complexes?',
      answer:
        'You sell the property manager or management company, not the vehicle owner. It is ordinary B2B — responsiveness and paperwork tend to win it. Before signing, price in two things: private-property towing carries posted-notice and record-keeping obligations that vary by state, and it can attract negative reviews even when the tow is performed correctly, because the vehicle owner may object to the removal itself.',
    },
    {
      question: 'How do I get more tow calls directly from customers?',
      answer:
        'Direct calls go to whoever the customer can find and is willing to trust in the moment. In practice that means an accurate and complete Google Business Profile, a service area and hours that match how you really dispatch, steady and recent reviews, a website that works on a phone, and information about your business that AI assistants can retrieve. None of it guarantees a call — it changes whether you are considered at all, which is the part you can influence.',
    },
    {
      question: 'What is the difference between a towing job board and a load board?',
      answer:
        'A towing job board lists employment — driver and operator vacancies. A vehicle-transport load board lists freight to move: dealer trades, auction runs, repossession and long-distance transport, bid on by carriers. Only the load board puts work on your truck, and it is scheduled bid work rather than emergency dispatch.',
    },
    {
      question: 'Do you find towing jobs for operators?',
      answer:
        'No. OptimizeIndex does not broker or dispatch work, place operators on rotation lists, negotiate motor club contracts, or answer calls. We make a towing company findable and credible in Google, Maps and AI assistants so more of the work arrives as direct calls you price yourself, and we report on calls and booked tows.',
    },
  ] as Faq[],

  sources: [CHP_ROTATION, CHP_TSA, MI_POSTED_NOTICE, WA_RTTO] as SourceRef[],
};
