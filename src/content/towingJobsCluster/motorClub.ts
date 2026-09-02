/**
 * /towing-jobs/motor-club-towing
 *
 * SERP note (checked 2026-09-03): the ranking set is either the networks
 * themselves (Agero, AAA — not neutral) or thin best-practice posts, with
 * employment listings bleeding in. An operator-side evaluation with first-party
 * citations and no invented rates is genuinely absent.
 *
 * Sourcing discipline for this page specifically: every published figure about
 * motor-club economics that surfaces in search comes from a party selling
 * either the network or the comparison. None of it is verifiable, so none of it
 * is here. Agero and AAA are cited only for claims they make about themselves.
 *
 * A secondary source widely states that Agero's dispatch algorithm prioritises
 * providers by proximity, acceptance rate, ETA accuracy and customer
 * satisfaction. Agero's own provider page names no dispatch factors at all, so
 * that claim is not on this page. See CLAUDE.md.
 *
 * Boundary: this page evaluates one channel. The other five belong to the
 * pillar; the service offering belongs to /towing-companies.
 */

import type { TowingJobsChild } from './index';
import type { SourceRef } from '../towing';

const AGERO_PROVIDERS: SourceRef = {
  label: 'Agero — Service providers',
  url: 'https://www.agero.com/service-providers',
  supports:
    "Agero's own description of its network: that it offers more than 30,000 tow and road-only jobs a day, around 14 million jobs a year, and that there is no cost to join. Cited as the company's claims about itself, not as independent verification.",
  checkedAt: '2026-09-03',
};

const AAA_NETWORK: SourceRef = {
  label: 'AAA — Grow your towing business with AAA',
  url: 'https://mwg.aaa.com/towing-network',
  supports:
    'That AAA operates a contracted towing network which operators apply to join, and the benefits AAA itself advertises to prospective providers.',
  checkedAt: '2026-09-03',
};

export const motorClub: TowingJobsChild = {
  slug: 'motor-club-towing',
  h1: 'Are Motor Club Towing Jobs Worth It?',
  title: 'Are Motor Club Towing Jobs Worth It? | OptimizeIndex',
  description:
    'An operator-side look at motor club work: how dispatch works, what you give up on rate and customer ownership, and how to judge it on profit rather than volume.',
  lede:
    'Motor club work is dispatch from a roadside assistance network — AAA, Agero and similar — where a member calls the club and the club sends you. It fills a schedule reliably and at a rate you did not set. Whether that is worth it depends on something specific to your operation: what the truck would otherwise be doing at that hour.',

  sections: [
    {
      id: 'what-it-is',
      question: 'What is motor club towing work?',
      answer:
        'A network holds the relationship with the motorist — usually through a membership or a warranty programme — and contracts operators to perform the service. The member calls the club, the club dispatches you, and the club pays you under the agreement you signed. You provide the truck; they own the customer.',
      detail: [
        'The networks are large and they say so. Agero states on its own provider pages that it offers more than 30,000 tow and road-only jobs a day and around 14 million jobs a year, and that there is no cost to join. AAA runs a contracted network that operators apply to. Those are the companies describing themselves, which is worth reading as marketing rather than as an independent audit — but the scale is real and it is why this channel exists for most operators.',
        'The structure matters more than the scale. In a cash call the motorist is your customer: they found you, they chose you, and they pay you. In network dispatch the motorist is the club\'s customer and you are a supplier. Everything else about the trade-off follows from that one fact.',
        'It is also the channel with the lowest barrier. Applications are open, admission is largely procedural, and there is no waiting for a rotation seat or selling a fleet manager. That accessibility is why so many operators lean on it and why leaning on it too hard is a recognisable trap.',
      ],
    },
    {
      id: 'how-dispatch-works',
      question: 'How does network dispatch actually reach you?',
      answer:
        'Through the network\'s own system rather than your phone. A job is offered, you accept or decline, and you are held to an arrival window. Coverage territory, response expectations and the rate all come from the agreement rather than from the individual call.',
      detail: [
        'Be careful what you believe about the assignment logic. Plenty of published advice states confidently which factors a given network weighs when choosing between providers. We could not confirm any such list from the networks\' own documentation, so this page does not repeat one. If the specifics matter to your business, ask your network representative and get the answer in writing rather than trusting a blog.',
        'What is safe to say is structural. You are one of several providers in a territory, you are measured on whether you accept and whether you arrive when you said you would, and declining work is visible to the party handing it out. Those pressures are real whatever the underlying formula is.',
        'The practical consequence is that acceptance is not free. Taking a marginal job to protect standing is a decision with a cost, and it is worth making deliberately rather than reflexively.',
      ],
    },
    {
      id: 'what-you-give-up',
      question: 'What do you give up on a motor club job?',
      answer:
        'Three things: the rate, which the schedule sets; the customer, who belongs to the club and will call the club again next time; and a degree of control over your own dispatch, because accepting work on their terms means arranging your day around their calls.',
      detail: [
        'The rate is the obvious one and the least interesting, because it is knowable — you signed it. The question is not whether it is lower than a cash call but whether it beats the truck sitting still, and that answer changes by hour and by day.',
        'Customer ownership is the one operators underrate. A motorist you tow on a club job has no particular reason to remember your name; the experience they had was with the club. You performed the service and the club banked the relationship. Over years that is the difference between building a business with its own demand and running someone else\'s fleet capacity.',
        'The third is scheduling. A board that is largely network work is a board someone else shapes. That is fine when you have capacity to fill and expensive on the nights when your own callers are competing for the same trucks.',
      ],
    },
    {
      id: 'when-it-makes-sense',
      question: 'When does motor club work make sense?',
      answer:
        'When it fills capacity that would otherwise earn nothing. A truck and a driver already on shift on a slow afternoon is a different economic situation from the same truck on the busiest night of the winter, and the same job can be worth taking in one and worth declining in the other.',
      detail: [
        'That framing — capacity utilisation rather than rate comparison — is the useful one. Operators who track this by hour rather than by monthly average tend to make better decisions about which networks to stay on and which calls to decline.',
        'It is also genuinely useful early. A new operator with no reputation, no reviews and no direct demand has to keep trucks earning while the slower channels develop, and network work is available immediately in a way that rotation seats and fleet accounts are not.',
        'The failure mode is drift: a base that was meant to be a floor quietly becomes the whole business, and by the time margin is the problem there is no direct demand to fall back on because none was ever built. That is a mix problem rather than a volume problem, and it is the thing this page is really about.',
      ],
      callCta: 'Talk through your call mix',
    },
    {
      id: 'judging-it',
      question: 'How should you judge whether it is worth it?',
      answer:
        'On profit per hour of truck time, not on job count. A full board is not evidence of a healthy business if the full part is the part somebody else prices, and the monthly total hides the pattern that would tell you what to change.',
      detail: [
        'The arithmetic you need is your own. Take a representative month and split every job by source — network, rotation, property, commercial, transport, cash call — then attach the actual revenue and the actual time consumed, including drive time and waiting. Most operators have never seen this laid out and are surprised by it.',
        'Then look at when the network jobs landed. If a meaningful share fell during hours your own callers were also ringing, you were paying to serve someone else\'s customer with capacity you could have sold yourself.',
        'We are not going to publish figures for what network jobs pay against direct calls. Every number in circulation comes from a company selling either the network or the alternative, none of it is verifiable, and a made-up benchmark is worse than none. Your dispatch records are the only honest source for your market.',
        'For how this channel sits against rotation, property, commercial and transport work, that comparison is the pillar rather than this page.',
      ],
    },
    {
      id: 'shifting-the-mix',
      question: 'What actually changes the mix?',
      answer:
        'Building demand that arrives on your own number, which is a slow channel and the only one where the price is yours. Nothing about network work becomes better over time on its own; the ratio changes only if the other side grows.',
      detail: [
        'This is the honest limit of what marketing does here. We cannot change what a network pays, get you into one, or influence what it sends you. What can be worked on is whether a motorist searching in your area finds you and finds you credible, which is a different channel entirely.',
        'That work is slow and it does not replace network volume in a quarter. An operator who needs the board full next month needs the networks; an operator who wants a different business in two years needs the other side growing while the networks hold the floor.',
        'The detail of how that side is actually built — profile configuration, review cadence, call tracking, what counts as a qualified call — is the cash-call playbook rather than this page.',
      ],
    },
  ],

  sources: [AGERO_PROVIDERS, AAA_NETWORK],

  faqs: [
    {
      question: 'Do motor clubs pay less than direct customers?',
      answer:
        'The rate is set by the network schedule rather than by you, which is the structural difference. We will not publish a figure for the gap: every comparison in circulation comes from a company selling either the network or an alternative to it, and none of it is independently verifiable. Your own dispatch records, split by source and by hour, will answer it for your market.',
    },
    {
      question: 'Is it worth joining more than one motor club network?',
      answer:
        'It increases available volume and it also increases the number of parties with a claim on your capacity at the same moment. The question is whether you have trucks genuinely idle at the hours the extra network dispatches, rather than whether more offers is better in the abstract.',
    },
    {
      question: 'Do I keep the customer after a motor club tow?',
      answer:
        'Generally no in any practical sense. The motorist called the club, the club dispatched you, and next time they will call the club again. You performed the service; the relationship stayed with the network. That is the main long-term cost of the channel.',
    },
    {
      question: 'How do motor clubs decide which provider gets a job?',
      answer:
        'The networks do not publish this, and we could not confirm any specific list of factors from their own documentation — so this page does not repeat the ones commonly asserted elsewhere. What is structurally true is that you are one of several providers in a territory and that acceptance and arrival performance are visible to whoever assigns the work. Ask your network representative for the specifics in writing.',
    },
    {
      question: 'Should a new towing company start with motor club work?',
      answer:
        'It is often the only channel available immediately. Rotation seats take qualification, commercial accounts take a sales cycle, and direct calls take reputation you have not built yet. The risk is treating a starting floor as a permanent base and never developing demand of your own.',
    },
    {
      question: 'Can OptimizeIndex get me onto a motor club network?',
      answer:
        'No. Admission is between you and the network, and we have no part in it. We do not broker work, negotiate contracts or influence dispatch. What we work on is whether motorists searching in your area can find you directly, which is a separate channel with a separate economics.',
    },
  ],
};
