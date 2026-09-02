/**
 * /towing-jobs/more-direct-towing-calls
 *
 * The highest cannibalization risk in the cluster. It sits between
 * /towing-companies (which owns the service offering) and 649 words of the
 * /towing-jobs pillar covering the same channel.
 *
 * It survives by being PROCEDURAL where both of those are explanatory. The
 * pillar says direct calls are the channel you price yourself and explains why;
 * /towing-companies says what we do about it. This page says what an operator
 * configures, on which screen, and what to count afterwards.
 *
 * Editing rule: if a section starts explaining *why* reviews matter rather than
 * *how* to run the cadence, it has drifted into /towing-companies. Cut it and
 * link instead.
 *
 * SERP note (checked 2026-09-03): the ranking set is agency listicles ("Top 37
 * Towing Marketing Ideas", "20 Proven Strategies") and pay-per-call lead
 * vendors. Nobody publishes the operational detail, which is the whole gap.
 * The trade calls this work "cash calls"; the copy uses the operator's term.
 */

import type { TowingJobsChild } from './index';
import type { SourceRef } from '../towing';

const GOOGLE_LOCAL_RANKING: SourceRef = {
  label: 'Google Business Profile Help — Tips to improve your local ranking on Google',
  url: 'https://support.google.com/business/answer/7091?hl=en',
  supports:
    'Local results are based on relevance, distance and prominence; complete and accurate business information makes a profile more likely to show in local results; more reviews and positive ratings can help local ranking.',
  checkedAt: '2026-08-27',
};

const GOOGLE_SERVICE_AREA: SourceRef = {
  label: 'Google Business Profile Help — Guidelines for representing your business on Google',
  url: 'https://support.google.com/business/answer/3038177?hl=en',
  supports:
    'Service-area businesses should list the areas they genuinely serve, and a business should not create more than one profile per location.',
  checkedAt: '2026-08-27',
};

export const directCalls: TowingJobsChild = {
  slug: 'more-direct-towing-calls',
  h1: 'How to Get More Direct Towing Calls',
  title: 'How to Get More Direct Towing Calls | OptimizeIndex',
  description:
    'A practical setup for winning more cash calls: service area, hours, tap-to-call, review cadence, call tracking, and how to tell a real job from a wrong number.',
  lede:
    'Direct calls — what most operators call cash calls — are the ones that reach you without a motor club, a rotation list or a broker in between. They are won at the moment someone searches, and almost everything that decides them is configuration rather than persuasion: whether you appear, whether the profile is accurate, whether the phone is one tap away, and whether you can tell afterwards which of those changed anything.',

  sections: [
    {
      id: 'the-chain',
      question: 'What actually has to happen before a cash call reaches you?',
      answer:
        'Six links, and each is a separate job. Someone has a problem, they search, they see a small set of businesses, they judge that set in seconds, they call one, and you book the tow. Configuration decides links two to four. Nothing you do to a website affects the first or the last.',
      detail: [
        'The reason to spell this out is that most of the work below targets exactly one link, and it is easy to spend months on the wrong one. An operator who never appears in the local results has a link-two problem and no amount of website copy fixes it. An operator who appears constantly but is rarely called has a link-four problem — usually the rating, the hours, or a profile that does not say they do the thing the customer needs.',
        'So the diagnostic question is not "how do we get more calls" but "at which link are we losing them". The rest of this page is organised that way: appear, be chosen, be reachable, then measure which link moved.',
        'For the broader question of how this channel compares to motor club, rotation, property and commercial work, that is the pillar rather than this page.',
      ],
    },
    {
      id: 'appear',
      question: 'Getting the profile configured so you appear at all',
      answer:
        'Google documents that local results are based on relevance, distance and prominence, and that complete, accurate information makes a profile more likely to appear. Most operators lose here on accuracy rather than effort — a category, a service area or a set of hours that does not match how the business actually runs.',
      detail: [
        'Work through these in order. **Primary category**: choose the one that matches your main service rather than the widest one available. Secondary categories cover the rest; the primary one carries the most weight for relevance.',
        '**Service area**: list the areas you genuinely dispatch to, not an aspirational radius. Google asks service-area businesses to list the areas they actually serve, and an inflated area produces calls you cannot reach inside a workable window — which costs you the review as well as the job.',
        '**Hours**: these should say whether a human answers, not whether the business exists. If you list 24/7 and calls roll to voicemail at 3am, you are buying one-star reviews with your own configuration. Either staff it or say what you actually cover.',
        '**Services**: list them individually rather than assuming a category implies them. Heavy-duty recovery, motorcycle transport, lockouts, jump starts and winch-outs are distinct searches, and a profile that names them can be matched to them.',
        '**Photos**: real ones, of your actual trucks, with the name visible. This is what a customer scans while deciding, and stock imagery reads as a business that might not exist.',
        '**Questions**: answer the Q&A section yourself before somebody else answers it wrong on your behalf.',
        'One thing not to do: do not create a second profile for a second service. Google asks businesses not to create more than one profile per location, and it puts the profile you already have at risk.',
      ],
    },
    {
      id: 'be-chosen',
      question: 'Running a review cadence that survives contact with dispatch',
      answer:
        'Ask at the moment the job closes, by text, with a direct link, from the person who did the work. Google names review count and rating among the signals feeding prominence and says more reviews and positive ratings can help local ranking — but the reason to run this properly is that the rating is on screen while the customer chooses.',
      detail: [
        'The system that actually works is short enough to survive a busy night. When the driver clears the job, dispatch sends one text with a direct review link. One follow-up if there is no response after a day. Nothing else. It works because of timing rather than persuasion — relief is highest immediately after the tow, and it decays fast.',
        'Make the link direct rather than an instruction to search. Every extra step loses people, and a customer who has to find your profile themselves usually does not.',
        'Decide who owns it, because "everyone" means nobody. In most operations the honest answer is dispatch, not the driver, because the driver is already on the next call.',
        'Recency matters alongside count. A profile whose newest review is two years old reads as a business that may have stopped, regardless of the average. A steady trickle beats an occasional push.',
        'On negative reviews: reply publicly, quickly, without arguing the facts, and move specifics to a phone call. The reply is written for the next reader rather than the reviewer. Impound and private-property work generates these structurally — the pillar covers why and what can be done about it.',
      ],
    },
    {
      id: 'be-reachable',
      question: 'Removing the friction between deciding and dialling',
      answer:
        'The customer is on a phone, often outdoors, frequently stressed, sometimes in the dark. Every step between deciding to call you and the phone ringing loses some of them. Most towing websites add several without noticing.',
      detail: [
        'Put a real `tel:` link in the header of every page so a tap dials rather than selects text. A phone number rendered as plain text, or worse as an image, asks someone standing on a shoulder to memorise ten digits.',
        'Keep the number identical everywhere — site, profile, directories. Inconsistent numbers split your call data and make attribution guesswork.',
        'Do not gate an emergency behind a contact form. A form is right for a fleet enquiry and wrong for a breakdown; if you offer both, the call has to be the obvious one.',
        'Test the pages on an actual phone on mobile data rather than in a desktop browser window resized narrow. Check that the number is reachable without scrolling, that nothing overlays it, and that the page is usable one-handed.',
        'State your service area in text on the site as well as in the profile, in the words customers use — the towns and the highways, not just a county name. It is the question they are trying to answer before calling.',
      ],
      callCta: 'Get your setup reviewed',
    },
    {
      id: 'call-tracking',
      question: 'Setting up call tracking without breaking your profile',
      answer:
        'Use a tracking number with dynamic insertion on the website, and keep your real number as the primary on the Google profile. That way the profile stays consistent while website-driven calls become attributable — and only set this up when call volume is high enough to justify the added complexity.',
      detail: [
        'The reason to bother is that without it you cannot tell which calls came from which source, so every decision about where to spend is a guess. The reason not to rush it is that a badly configured tracking number creates inconsistency across your listings, which is a real cost for a speculative benefit.',
        'The safer arrangement most operators land on: real number stays primary on the Google profile; the tracking number can go in the profile\'s website field or as a secondary; dynamic insertion swaps the number on the site for visitors from search. Confirm the current guidance before implementing, since platform rules change.',
        'Whatever you do, record the calls or at least the outcomes. A count of calls with no idea what they were is only marginally better than no count at all.',
      ],
    },
    {
      id: 'qualified-calls',
      question: 'Telling a real job from a wrong number',
      answer:
        'A call is not a customer. Sorting them is work only your staff can do, because nobody outside the business can hear what was said. The minimum useful split: real job in your area, real job outside your area, price shopper, wrong number, and existing customer.',
      detail: [
        'Do this on paper for two weeks before buying anything to automate it. Whoever answers marks each call against those five buckets. It takes seconds per call and it usually reveals something the operator did not expect — a large share of out-of-area calls means the service area is set too wide, and a large share of price shoppers usually means the profile is attracting the wrong intent.',
        'That distinction matters more than the headline number. Fifty calls of which fifteen are jobs is a different business from thirty calls of which twenty-two are, and a report that only counts calls treats them as the same.',
        'This is also the boundary of what any agency can see. We can count taps and sessions; we cannot hear a call or know whether it became a tow. Anyone reporting your booked jobs without your dispatch records is inferring them.',
      ],
    },
    {
      id: 'what-to-count',
      question: 'What to count, and what each number does not prove',
      answer:
        'Count calls arriving on your own number, then what those calls became. Impressions, rankings and sessions all sit above the thing you actually bank, and each rung only may produce the next one.',
      detail: [
        'The gap between "we appeared in a search" and "we got paid" is where most reporting quietly does its persuading. The pillar sets out the full ladder rung by rung; the practical point here is which end you steer by.',
        'Two distinctions worth holding onto. A tap on a phone number is not an answered call — it is an intent to call, and the two diverge whenever the line is busy or nobody picks up. And an answered call is not a booked tow; only your dispatch record knows that.',
        'The honest monthly question is narrow: did qualified calls on our own number go up, and did booked tows follow? If traffic rose and the phone did not, the mix did not change, and a report built on impressions will not show you that.',
      ],
    },
    {
      id: 'limits',
      question: 'What this work cannot do',
      answer:
        'It cannot make someone choose you, and it cannot create demand that is not there. Visibility changes whether you are considered; it does not decide the outcome, and no agency including this one can promise a call, a ranking or a figure.',
      detail: [
        'The realistic claim is narrower and still worth something: an operator who never appears is never evaluated, and an operator whose profile is inaccurate loses calls to details they control. Fixing those changes the size of the pool you are chosen from.',
        'What it will not do is fill a schedule in a market with no volume, or outrun a rating problem, or replace the channels the pillar covers. If your board is full and thin on margin, the constraint is mix rather than visibility, and that is a different piece of work.',
      ],
    },
  ],

  sources: [GOOGLE_LOCAL_RANKING, GOOGLE_SERVICE_AREA],

  faqs: [
    {
      question: 'What is a cash call in towing?',
      answer:
        'A job that comes directly from the customer with no motor club, rotation list or broker in between, paid at the time of service. Operators use the term to distinguish it from network dispatch, where the rate is set by the network rather than by you.',
    },
    {
      question: 'Should my towing hours say 24/7 on Google?',
      answer:
        'Only if a human actually answers at 3am. Hours should describe when someone picks up, not when the business exists. Listing round-the-clock availability and sending overnight callers to voicemail produces exactly the negative reviews that then make you harder to find.',
    },
    {
      question: 'How wide should my Google service area be?',
      answer:
        'The area you genuinely dispatch to inside a workable response time. Google asks service-area businesses to list the areas they actually serve, and an inflated radius generates calls you arrive at late — costing you the job and the review. If a large share of your calls are out of area, the setting is too wide.',
    },
    {
      question: 'Will call tracking hurt my Google Business Profile?',
      answer:
        'It can if it makes your number inconsistent across listings. The usual arrangement keeps your real number as the primary on the profile and uses dynamic number insertion on the website only, so profile-driven calls stay on the real number while site-driven calls become attributable. Confirm current platform guidance before implementing.',
    },
    {
      question: 'How many reviews does a towing company need to rank?',
      answer:
        'There is no number, and anyone quoting one is guessing. Google says review count feeds prominence and that more reviews and positive ratings can help local ranking, which is as specific as its own guidance gets. What can be said is that reviews are one of the few prominence inputs you can influence directly, and that the rating is visible to the customer at the moment of choosing.',
    },
    {
      question: 'Is a phone-number tap the same as a call?',
      answer:
        'No. A tap is an intent to call. Whether it connected depends on whether the line was free and someone answered, and the two numbers diverge most on exactly the busy nights you care about. We report taps as taps.',
    },
    {
      question: 'Can OptimizeIndex guarantee more towing calls?',
      answer:
        'No, and we would not take on anyone who was told otherwise. What we work on is whether you appear and whether what a customer sees makes you a credible choice. Whether they call you, and whether that call becomes a tow, depends on your market, your rating and your phone being answered.',
    },
  ],
};
