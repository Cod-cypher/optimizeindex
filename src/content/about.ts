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
 * The facts below were confirmed by the owner on 2026-10-12. Anything that
 * contradicts them is wrong, here and on every other page:
 *
 *   - The AI voice agent that answers calls for client businesses is live.
 *     Its model provider is not named anywhere.
 *   - No AI model is trained in-house. The chat assistant on this site
 *     generates its replies with OpenAI's models (server/chat/openai.ts).
 *   - Towing and roadside operators are the current focus. That is a
 *     present-tense focus, not a promise about every other industry either
 *     way, and the case studies outside towing are real earlier work.
 *   - Towing operators are served in every US state; seven states have a page.
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
  'OptimizeIndex is the trade name of Idea Brothers LLC. We build AI solutions for towing and roadside operators that are missing revenue: the work that gets a company found when someone needs a truck, and an AI voice agent that answers the phone when they call.',
  'Towing and roadside operators are our focus, and everything described below is set up for the way their work actually behaves: demand that arrives without warning, jobs that are won or lost in the first ring, and a rate that depends entirely on who is asking. Our published case studies come from earlier work outside towing, and each one names the tool its figures came from.',
];

export const ABOUT_PILLARS: AboutBlock[] = [
  {
    title: 'We focus on towing and roadside work',
    answer:
      'Roadside demand moves by hour, by weather and by road network, and a job is worth very different amounts depending on whether the customer pays out of pocket or a motor club assigns it at its own rate. We set up the work around that, not around an average service business.',
    detail: [
      'A Tuesday ice storm on an interstate corridor produces a different kind of call than a Saturday night in a bar district, and an operator with three trucks has to choose between them. Which searches a company shows up for, what its pages say, and how its calls are answered all follow from that.',
      'Focus is also why so much of what we publish is written for operators: where towing work comes from, who sets the rate on each kind of job, and what a state\'s rules require. Where those guides rely on a rule or a program, they list the source, so you can judge them before you ever talk to us.',
    ],
  },
  {
    title: 'What is ours, and what we build on',
    answer:
      'We build and run the assistant on this site and the AI voice agent that answers calls for our clients. We do not train AI models of our own: the chat assistant\'s replies are generated with OpenAI\'s models, and we would rather say so than let it read as something it is not.',
    detail: [
      'What is ours is everything around the model: what the assistant is allowed to say, the site content it answers from, the checks it can run, how a conversation reaches a person, and how calls and enquiries are recorded and attributed. Messages typed into the chat are sent to OpenAI so it can write the reply.',
      'That is why the assistant in the corner of this page can run a real audit of your website inside the conversation and put a person into that same conversation when you want one. That is not a demo. It is the kind of work we do.',
    ],
  },
  {
    title: 'We integrate into your operation, not alongside it',
    answer:
      'Our job is not finished when a call or an enquiry exists. It is finished when it has reached the person who handles it, in the way your business already works, without anyone learning a new system.',
    detail: [
      'Most operators have been sold software before, and most of it is still sitting unused behind a login nobody remembers. The failure is almost never the technology — it is that adopting it required changing how the business already runs, in the middle of a working week.',
      'So we do the integration work. If the answer is that our system should feed what you already have rather than replace it, that is the answer.',
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
    title: 'Continuous improvement',
    body: 'The assistants, the voice agent\'s setup and the pages we build are updated as we learn more about how roadside demand behaves. Clients get that work as it lands, not as a paid upgrade.',
  },
  {
    title: 'Dedicated support',
    body: 'You get people who know your account, reachable by phone and by email. The assistant handles what it can and hands over the moment it cannot.',
  },
  {
    // Says what is true and no more. A visitor cannot open a client's
    // analytics, so this names where figures come from rather than promising
    // they can be checked; the guides' sources can be, and carry their dates.
    title: 'Where every figure comes from',
    body: 'Every client figure we publish names the tool it was measured in: Google Search Console or Google Analytics 4. Our guides are drafted and structured with help from AI, and the primary sources a guide relies on are listed at the end of it, each with the date the OptimizeIndex team checked it.',
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
 *
 * No "we do not answer calls" belongs in either list: the AI voice agent that
 * answers, qualifies and books calls and hands them to the client's own
 * dispatcher, and the chat assistant on client websites, are live for every
 * client (owner, 2026-10-12). Handing a call to the client's dispatcher is not
 * the dispatch roadmap item, which is us running dispatch. What stays denied, as
 * firmly as ever, is in ABOUT_DOES_NOT: guarantees, dispatch, rotation and
 * selling leads. Never soften that list to make room for a roadmap item.
 */
export const ABOUT_DOES = [
  'Answer your calls with an AI voice agent that qualifies the caller, books the job and hands it to your dispatcher, so someone who rings gets an answer rather than a voicemail.',
  'Run an AI chat assistant on your own website, so visitors get answers there too.',
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
