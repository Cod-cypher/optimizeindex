/**
 * /towing-jobs/paid-towing-leads
 *
 * SERP note (checked 2026-09-03): the ranking set is essentially 100% lead
 * vendors — Contractor Webmasters, Top7Seven, RoadsideAndTowingLeads, WDLG,
 * SixtyFourLeads, AllLocalPros. Only TowMarX is editorial. Nothing ranking is
 * neutral: every result sells the thing the searcher is trying to evaluate.
 *
 * That is the whole differentiation. This page declines to sell leads and says
 * so, which is a position none of the incumbents can take.
 *
 * It is also why no pricing appears here. Every figure in that SERP — cost per
 * lead, cost per call, close rates, the multiple between club and cash work —
 * is published by a company with a commercial interest in the comparison.
 * Unverifiable, therefore absent. See CLAUDE.md.
 *
 * Boundary: this page covers bought leads and the alternative of owning demand.
 * The mechanics of building that demand are the cash-call playbook; the service
 * offering is /towing-companies.
 */

import type { TowingJobsChild } from './index';
import type { SourceRef } from '../towing';

const FTC_LEAD_GEN: SourceRef = {
  label: 'FTC — Staff Perspective: "Follow the Lead" workshop',
  url: 'https://www.ftc.gov/system/files/documents/reports/staff-perspective-follow-lead/staff_perspective_follow_the_lead_workshop.pdf',
  supports:
    'That consumer data collected by lead generators is frequently resold and passed through intermediaries, and that businesses buying leads have a responsibility for how those leads were generated rather than only for what they do with them.',
  checkedAt: '2026-09-03',
};

const FTC_MEDIAALPHA: SourceRef = {
  label: 'FTC — Enforcement action against lead generator MediaAlpha (August 2025)',
  url: 'https://www.ftc.gov/business-guidance/blog/2025/08/if-youre-deceiving-consumers-ftc-means-business-exploring-recent-settlement-mediaalpha',
  supports:
    'A concrete example of regulatory action against an online lead generation company over how consumer contact data was obtained and sold on to buyers.',
  checkedAt: '2026-09-03',
};

export const paidLeads: TowingJobsChild = {
  slug: 'paid-towing-leads',
  h1: 'Are Paid Towing Leads Worth Buying?',
  title: 'Are Paid Towing Leads Worth Buying? | OptimizeIndex',
  description:
    'Shared versus exclusive leads, pay-per-call, how to vet a vendor, and the difference between renting demand each month and owning it. No vendor pricing claims.',
  lede:
    'Buying towing leads means paying a third party for contact with a motorist who needs a tow — sometimes as a form submission passed to several operators at once, sometimes as a live call routed to your phone. It can fill a schedule quickly. What it does not do is build anything you keep, and almost every published comparison of the two is written by someone selling one of them.',

  sections: [
    {
      id: 'how-it-works',
      question: 'How does buying towing leads actually work?',
      answer:
        'A vendor generates demand — usually through ads and landing pages carrying their brand rather than yours — and sells you the resulting contact. Two models dominate: a lead sold as a form submission or contact record, and pay-per-call, where you are charged for a phone call that meets some agreed criteria.',
      detail: [
        'The distinction that matters most commercially is whether the lead is exclusive to you or shared with several operators. A shared lead means you are one of a handful of numbers the motorist has in front of them, and the person who answers first usually wins. An exclusive lead is sold once, and priced accordingly.',
        'Pay-per-call is generally the lower-risk of the two for an operator, because a call is closer to a customer than a form is. It is not a guarantee of a job: a call can be out of your area, a price shopper, a wrong number or someone who has already been picked up.',
        'The thing to hold onto throughout is whose asset this is. The ads, the landing page, the phone number and the ranking all belong to the vendor. You are renting access to demand they own, for as long as you keep paying.',
      ],
    },
    {
      id: 'shared-vs-exclusive',
      question: 'Shared or exclusive — which should you buy?',
      answer:
        'It depends entirely on whether you can answer immediately. A shared lead is a race, so it rewards an operation with someone always on the phone and punishes one that returns calls later. An exclusive lead removes the race and costs more for exactly that reason.',
      detail: [
        'Be honest about your own answering before choosing. An operator whose calls roll to voicemail after 6pm will lose most shared leads and pay for them anyway. That is not the vendor\'s failure; it is a mismatch between the product and the operation.',
        'Ask directly how many operators a shared lead goes to, and get the answer in writing. Vendors differ, some will not say, and a refusal to answer is itself informative.',
        'Speed-to-lead is the metric that decides shared-lead performance, and it is measured in seconds and minutes rather than hours. If you cannot commit to that, exclusive or pay-per-call is the more honest purchase even at a higher unit cost.',
      ],
    },
    {
      id: 'vetting',
      question: 'How do you vet a towing lead vendor?',
      answer:
        'Ask where the leads come from, how many buyers each one goes to, what happens when a lead is invalid, and whether you can stop without a term commitment. Then buy a small volume and measure it against your own records before scaling anything.',
      detail: [
        'There is a compliance dimension operators rarely consider. The FTC has examined how lead generation works and has taken enforcement action against lead generators over how consumer data was obtained and resold — including a 2025 settlement with MediaAlpha. Its guidance is that businesses buying leads carry responsibility for how those leads were generated, not only for what they do afterwards. In practice that means asking a vendor how a motorist came to be in their system is a reasonable question, not an awkward one.',
        'Get the credit policy in writing before the first invoice. Wrong numbers, out-of-area calls and duplicates are normal; what varies is whether the vendor credits them and how much friction the process carries.',
        'Avoid long commitments at the start. A vendor confident in the product will let you test a small volume. One that requires a term up front is asking you to take the risk their own data should have removed.',
        'Then run the numbers on jobs, not leads. Cost per lead is the vendor\'s metric. Cost per booked tow is yours, and it is the only one that tells you whether the channel works in your market.',
      ],
    },
    {
      id: 'no-pricing',
      question: 'What do towing leads cost?',
      answer:
        'We are not going to quote a figure, and you should be wary of pages that do. Every price, close rate and revenue comparison that surfaces in search for this topic is published by a company selling leads, selling marketing, or selling an alternative to both.',
      detail: [
        'This is not caution for its own sake. Lead pricing varies by market, by exclusivity, by call volume and by how a vendor defines a billable lead. A national average, even an accurate one, would not tell you what your county costs — and the ones in circulation are marketing rather than measurement.',
        'What you can do instead is generate your own number in a month. Buy a small, capped volume. Log every lead: was it in your area, was it a real job, did it book, what did it pay. Divide the spend by the jobs that resulted. That figure is worth more than any published benchmark because it is about your market and your answering.',
        'If a vendor will not let you test at a small volume, that tells you something about how confident they are in the answer.',
      ],
      callCta: 'Talk about where your work comes from',
    },
    {
      id: 'renting-vs-owning',
      question: 'Renting demand versus owning it',
      answer:
        'Bought leads stop the day you stop paying, because the asset generating them belongs to the vendor. Demand that arrives through your own profile and your own number continues, and it compounds — but it is slower to build and it will not fill next week.',
      detail: [
        'These are not competing philosophies so much as different timescales. Bought leads are a tap: turn it on, work arrives, turn it off, it stops. Owned demand is closer to a slow accumulation — a profile that is accurate, a review count that keeps growing, a business that a motorist searching nearby actually finds.',
        'The trap is spending years on the tap and never starting the accumulation, so that a decade in you still have nothing that produces work without a monthly invoice. The same trap exists with motor club dispatch, for the same reason: someone else owns the customer.',
        'The practical answer for most operators is both, weighted deliberately rather than by accident. Buy leads while the other side is too small to carry you, and know which one you are growing.',
        'For what building the owned side actually involves, that is the cash-call playbook rather than this page.',
      ],
    },
    {
      id: 'not-a-lead-seller',
      question: 'Where OptimizeIndex sits in this',
      answer:
        'We do not sell leads, calls or jobs. We are not a lead marketplace, a pay-per-call network or a broker, and we do not resell anyone else\'s. If you want leads by the job, we are the wrong vendor and would rather say so than sell you something adjacent.',
      detail: [
        'What we work on is the owned side: whether a motorist searching in your area finds your business, and whether what they see makes you a credible choice. You keep the profile, the reviews and the phone number, and they keep working if you stop paying us.',
        'We say this plainly because the search results for this topic are almost entirely vendors, and an operator arriving here could reasonably assume we are another one. We are not, and the distinction is the point of the page.',
        'What we cannot do is promise volume. Visibility changes whether you are considered; it does not decide whether someone calls, and no agency can honestly guarantee a call, a ranking or a figure.',
      ],
    },
  ],

  sources: [FTC_LEAD_GEN, FTC_MEDIAALPHA],

  faqs: [
    {
      question: 'What is the difference between shared and exclusive towing leads?',
      answer:
        'A shared lead is sold to several operators at once, so the motorist has multiple numbers and the fastest response usually wins. An exclusive lead is sold to one buyer and costs more for that reason. Which suits you depends on whether you can answer within seconds rather than hours.',
    },
    {
      question: 'Is pay-per-call better than buying towing leads?',
      answer:
        'It is generally lower risk, because you are paying for a phone call rather than a contact record and a call is closer to a customer. It is still not a booked job — calls can be out of area, price shoppers or wrong numbers — so agree in advance what counts as billable and what gets credited.',
    },
    {
      question: 'How much do towing leads cost?',
      answer:
        'We will not quote a figure, because every price in circulation for this comes from a company selling leads or an alternative to them, and none of it is independently verifiable. Cost also varies by market and by how a vendor defines a billable lead. Buy a small capped volume, log what each lead became, and calculate your own cost per booked tow.',
    },
    {
      question: 'Are towing lead companies a scam?',
      answer:
        'Not inherently — it is a real service and some operators use it well. The risks are specific and worth checking: how many buyers a shared lead goes to, whether invalid leads are credited, and where the contact data came from. The FTC has taken enforcement action against lead generators over how consumer data was obtained and resold, and its guidance is that buyers carry responsibility for how their leads were generated.',
    },
    {
      question: 'Should I buy leads or invest in my own visibility?',
      answer:
        'They work on different timescales. Bought leads produce work immediately and stop when you stop paying, because the vendor owns the asset. Your own profile and reviews build slowly and keep working. Most operators need both, and the mistake is doing only the first for years and never starting the second.',
    },
    {
      question: 'Does OptimizeIndex sell towing leads?',
      answer:
        'No. We are not a lead marketplace, a pay-per-call network or a broker, and we do not resell anyone else\'s leads. We work on whether motorists searching in your area find and trust your business, and you keep everything that produces.',
    },
  ],
};
