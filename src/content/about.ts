/**
 * Copy for /about.
 *
 * Content lives here rather than in the page component for the same reason the
 * towing copy does: components are layout, and a page whose sentences are
 * embedded in JSX cannot be read, reviewed or diffed without reading the markup
 * around them.
 *
 * Two rules govern what may be written in this file, and both are stricter here
 * than anywhere else on the site.
 *
 * 1. An About page is the one page where a reader has come specifically to find
 *    out who they would be dealing with. A claim that does not hold up here
 *    poisons every other page, because this is the page that vouches for them.
 *
 * 2. Nothing on this page may describe a capability as live before it is. Lead
 *    generation and dispatch are both being built and neither ships today, so
 *    they appear in ABOUT_ROADMAP — clearly labelled as what is coming — and
 *    nowhere else. Moving one into ABOUT_PILLARS is a content decision that has
 *    to be made deliberately, on the day it actually works.
 *
 * See the Positioning section of CLAUDE.md, which this file is bound by.
 */

/**
 * The legal entity behind the trade name.
 *
 * Stated plainly on the page and carried into the Organization schema as
 * legalName, because "who is this actually" is a question both a cautious
 * buyer and an AI assistant will ask, and the answer costs nothing to give.
 */
export const LEGAL_NAME = 'Idea Brothers LLC';

export interface AboutBlock {
  /** Rendered as the h2. A statement, not a label. */
  title: string;
  /** Stands alone if the rest of the page is stripped away by a retriever. */
  answer: string;
  detail: string[];
}

export const ABOUT_INTRO = [
  'OptimizeIndex is the trade name of Idea Brothers LLC. We build artificial intelligence for towing and roadside operators — the software that gets a company found when someone needs a truck, and answers the phone when they call.',
  'We are not a general marketing agency that took on a towing client. Towing and roadside is the only industry we build for, and everything described below was built for the way this work actually behaves: demand that arrives without warning, jobs that are won or lost in the first ring, and a rate that depends entirely on who is asking.',
];

export const ABOUT_PILLARS: AboutBlock[] = [
  {
    title: 'We build AI for one industry, not for everyone',
    answer:
      'Our models are trained on how roadside demand actually moves — by hour, by weather, by road network, and by the difference between a customer paying out of pocket and a motor club assigning a job at its own rate.',
    detail: [
      'A general-purpose model knows what a tow truck is. It does not know that a Tuesday ice storm on an interstate corridor produces a different kind of call than a Saturday night in a bar district, that those two calls are worth very different amounts, or that an operator with three trucks has to choose between them.',
      'Specialising costs us every other industry. What it buys is that we are not learning your business on your budget — the patterns are already in the system before we start.',
    ],
  },
  {
    title: 'We own the technology, end to end',
    answer:
      'The assistant on this page, the voice agent that handles calls, and the data capture behind both are ours. Nothing here is a white-labelled tool with our logo on it.',
    detail: [
      'That distinction matters on the day something breaks. When the stack is someone else\'s, a fault is a support ticket and a shrug; when it is ours, it is a fix. It also means your data stays inside infrastructure we control rather than being passed through a vendor whose terms can change without asking you.',
      'It is also why the assistant in the corner of this page can run a real audit of your website inside the conversation and put a person into that same conversation when you want one. That is not a demo. It is the product.',
    ],
  },
  {
    title: 'We integrate into your operation, not alongside it',
    answer:
      'Our job is not finished when a lead exists. It is finished when the work has reached the person who dispatches it, in the system they already use, without anyone learning a new one.',
    detail: [
      'Most operators have been sold software before, and most of it is still sitting unused behind a login nobody remembers. The failure is almost never the technology — it is that adopting it required changing how the business already runs, in the middle of a working week.',
      'So we do the integration work. If the answer is that our system should feed what you already have rather than replace it, that is the answer.',
    ],
  },
  {
    title: 'Built to absorb the days that break everything else',
    answer:
      'Our infrastructure is cloud-native and scales with demand rather than against it, which is what a pile-up on a freight corridor or the first freeze of the season actually requires.',
    detail: [
      'Roadside demand is not steady, and any system designed around an average will fail on the days that matter most — the days when a single hour produces a week of ordinary volume. Those are the hours that pay for the year, and they are the hours a phone line and a manual process cannot survive.',
      'The same architecture is what lets us support operators in different regions at once without one market\'s bad night degrading another\'s.',
    ],
  },
];

/**
 * The shorter cards under the pillars.
 *
 * Kept deliberately modest. "Positive client experiences" was in the brief and
 * is not written here as a claim about ratings or reviews, because there are no
 * published reviews behind it — the same reason src/routes.ts leaves
 * AggregateRating out of the schema graph. What is verifiable is the case
 * studies, and this points at those instead.
 */
export const ABOUT_VALUES: { title: string; body: string }[] = [
  {
    title: 'Continuous innovation',
    body: 'The models and the assistants are updated as we learn more about how roadside demand behaves. Clients get that work as it lands, not as a paid upgrade.',
  },
  {
    title: 'Dedicated support',
    body: 'You get people who know your account, reachable by phone and by email. The assistant handles what it can and hands over the moment it cannot.',
  },
  {
    title: 'Results you can check',
    body: 'Every figure we publish names the tool it came from — Google Search Console or Google Analytics 4 — so you can verify it yourself rather than take our word for it.',
  },
  {
    title: 'Commitment to doing it properly',
    body: 'No contracts, and a 15-day money-back guarantee. If the work is not worth what it costs, you should not be locked into it.',
  },
];

/**
 * The honesty section.
 *
 * This exists because the vertical is full of vendors who imply they can
 * guarantee work, and stating plainly what is outside our control is the
 * cheapest credibility available to us. It is also literally true, which the
 * alternative is not.
 */
export const ABOUT_DOES = [
  'Build and run the AI assistants that answer for your business — on your website and on the phone.',
  'Get you found in Google, Google Maps and the AI assistants people now ask instead of searching.',
  'Capture and attribute the calls and enquiries that result, so you can see what produced them.',
  'Integrate all of it into the way your operation already works.',
];

export const ABOUT_DOES_NOT = [
  'Guarantee a number of jobs, calls, rankings or dollars. Anyone who does is guessing or selling.',
  'Decide whether a customer chooses you once they have found you and spoken to you.',
  'Influence motor-club dispatch decisions, police rotation admission, or who wins a commercial contract.',
  'Sell shared leads, broker towing work, or place operators on rotation lists.',
];

/**
 * What is being built. Explicitly not a description of a current service.
 *
 * Written in the future tense throughout, and it must stay that way until the
 * day each one is real. The whole value of the section above is that a reader
 * can trust the boundary; a roadmap quietly written as a capability would spend
 * that trust to no purpose.
 */
export const ABOUT_ROADMAP = {
  answer:
    'Two things are in development and neither is available yet: lead generation as a service, and dispatch.',
  detail:
    'We are building both, and when they are ready they will be described here as things you can buy. Until then they are not part of what we sell, and we would rather say so than let a roadmap read like a product line. If either is what you are looking for, tell us and we will let you know when it exists.',
};
