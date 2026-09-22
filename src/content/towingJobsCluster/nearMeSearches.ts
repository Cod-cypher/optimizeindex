/**
 * /towing-jobs/towing-near-me-searches
 *
 * The consumer queries — "towing near me", "emergency towing", "flatbed
 * towing" and the rest — are ones this site cannot rank for and should not
 * want to: they resolve to the map pack and to operators' own service pages,
 * and the searcher wants a truck. What an operator searches is how to win
 * them. That is this page.
 *
 * Organising axis: the query. Each search the public types is taken on its
 * own — what Google matches it against, what the operator controls, and
 * whether it deserves a page on the operator's site. That axis is what keeps
 * this page off more-direct-towing-calls (organised by the steps an operator
 * configures) and off /towing-companies (organised by what we do).
 *
 * Editing rule: the moment a section starts walking through profile fields —
 * category, hours, services, photos — it has drifted into the direct calls
 * guide. Cut it and refer across instead.
 *
 * SERP note (checked 2026-09-22): "how to rank for towing near me" returns
 * agency guides (BizIQ, TowMarX, Ranktracker, Townsquare, CinchLocal) that all
 * recommend a service page per service and a page per city. None quotes
 * Google's doorway policy or says when such a page is worth having. The
 * consumer forms of every service query return only operators, Yelp and
 * motor clubs.
 */

import type { TowingJobsChild } from './index';
import type { SourceRef } from '../towing';

const GOOGLE_LOCAL_RANKING: SourceRef = {
  label: 'Google Business Profile Help — How to improve your local ranking on Google',
  url: 'https://support.google.com/business/answer/7091?hl=en',
  supports:
    'Local results are based primarily on relevance, distance and prominence. "Relevance is how well a Business Profile matches what someone is searching for"; "Distance refers to how far each business is from the customer who\'s searching"; "Prominence means how well-known a business is." "More reviews and positive ratings can help your business\'s local ranking." "There\'s no way to request or pay for a better local ranking on Google."',
  checkedAt: '2026-09-22',
};

const GOOGLE_REPRESENTING: SourceRef = {
  label: 'Google Business Profile Help — Guidelines for representing your business on Google',
  url: 'https://support.google.com/business/answer/3038177?hl=en',
  supports:
    'A service-area business should hide its address and list the areas it serves; "the boundaries of your profile\'s overall service area shouldn\'t extend farther than about 2 hours of driving time from where your business is based." "Do not create more than one page for each location of your business, either in a single account or multiple accounts."',
  checkedAt: '2026-09-22',
};

const GOOGLE_SPAM_POLICIES: SourceRef = {
  label: 'Google Search Central — Spam policies for Google web search',
  url: 'https://developers.google.com/search/docs/essentials/spam-policies',
  supports:
    'Doorway abuse is "when sites or pages are created to rank for specific, similar search queries", including "multiple domain names or pages targeted at specific regions or cities that funnel users to one page" and "substantially similar pages that are closer to search results than a clearly defined, browseable hierarchy." Keyword stuffing includes "blocks of text that list cities and regions that a web page is trying to rank for."',
  checkedAt: '2026-09-22',
};

export const nearMeSearches: TowingJobsChild = {
  slug: 'towing-near-me-searches',
  h1: 'How to Rank for Towing Near Me Searches',
  title: 'How to Rank for Towing Near Me Searches | OptimizeIndex',
  description:
    'Which of "towing near me", "24 hour towing", "flatbed towing" and the other searches a tow operator can win, and when a city or service page earns its URL.',
  lede:
    '"Towing near me" is decided by where the searcher is standing, and no page on your website changes that. Google documents three inputs to a local result — relevance, distance and prominence — and the middle one is fixed the moment the search happens. What you control is whether your business is understood to do the thing being searched for, and how credible it looks in the few seconds it is on screen. This page takes the searches the public actually types, one at a time, and says which of them you can win, with what, and when a page of your own is worth having.',

  sections: [
    {
      id: 'what-near-me-means',
      question: 'What "near me" means to Google, and why a page cannot fake it',
      answer:
        'The phrase is not a keyword in the ordinary sense. Google reads it as an instruction to use the searcher\'s location, and returns the businesses it holds a profile for that are close to that point, understood to be relevant, and known well enough to trust. Writing "near me" into a heading does not put you near anyone.',
      detail: [
        'Google\'s own explanation of local results names three inputs. **Relevance** is how well a profile matches what someone is searching for. **Distance** is how far each business is from the customer who is searching. **Prominence** is how well-known a business is, and Google says more reviews and positive ratings can help it. It also states there is no way to request or pay for a better local ranking.',
        'Distance is the one you do not get a vote on. A yard in the south of a metro will be far from a breakdown in the north whatever the website says, and the searcher does not scroll past the map to find you. Relevance and prominence are the two you can work on, and they are worked on in the Business Profile first and the website second, because the profile is what the map result is built from.',
        'That has a consequence for the whole tree of pages most guides recommend. A "towing near me" page cannot rank for "towing near me": the query is resolved against profiles, not pages, and against the searcher\'s position, not yours. The site\'s job is narrower and still real — to confirm, when Google or a customer checks, that you are the kind of business the profile says you are, and to make the phone one tap away when they arrive.',
      ],
    },
    {
      id: 'query-by-query',
      question: 'The seven searches, one at a time',
      answer:
        'The service names a towing company lists are not all the same kind of search. Some are decided entirely inside the map. Some are qualified by equipment, and a customer will read a page to check you have it. One or two are considered purchases with a different buyer altogether. Treating them as seven versions of one query is how sites end up with seven versions of one page.',
      detail: [
        '**Emergency towing, 24 hour towing, towing near me.** These are the same person in the same situation, on a shoulder with a phone, and they are settled in the map pack. The searcher is choosing between the businesses shown to be close, and the things on screen are the name, the rating, whether you appear to be open, and a call button. A page on your site is rarely loaded before the call is made. What matches these searches is a profile that says what you do and when a human answers, and a rating that survives the glance; the direct calls guide on this site covers the configuration.',
        '**Flatbed towing, motorcycle towing.** These are qualified by equipment. The searcher has a lowered car, an all-wheel-drive, a wreck that cannot be dragged, or a bike, and is checking that you can move it without damage. The map still decides who is near, but here a customer will sometimes open the site to confirm, and the profile\'s services list has to name the capability so the search can be matched to it. One honest page on your site describing the equipment, with photographs of your own trucks, does the confirming; a second page per town does not.',
        '**Long distance towing.** The one search in the list that is usually not urgent. The vehicle is going across a state or across the country, the customer is comparing, and distance to the searcher matters much less than whether you do this kind of work at all. This is a page worth writing properly — what you carry, how far you go, how the price is arrived at, what the customer has to arrange — because it will actually be read.',
        '**Heavy duty towing.** Two searchers share this phrase. A stranded truck driver is in the map like everyone else. A fleet manager, an adjuster or a DOT contract officer is not searching in an emergency at all; they qualify operators in advance, on equipment class, response window and paperwork. The heavy-duty accounts guide on this site covers that second buyer. For the first, the same rule as emergency towing applies.',
        '**Roadside assistance.** A distinct segment more than a distinct query. Jump starts, lockouts, tyre changes and fuel are often run by businesses with no tow truck, and the customer searching for them is choosing on the same map, on the same three inputs, and often on whether the profile lists the specific service by name. If you run roadside alongside towing, it is one profile with those services listed, not a second profile and not a second site.',
      ],
    },
    {
      id: 'site-structure',
      question: 'What a towing company\'s website actually needs',
      answer:
        'A page for each service you genuinely run. A page for a place only where trucks genuinely go and something about the work there is different. No cross-product of the two. Most of the sitemaps sold to operators are the cross-product, and Google\'s spam policy describes that shape by name.',
      detail: [
        'Google defines doorway abuse as pages created to rank for specific, similar search queries that lead users to intermediate pages less useful than the destination, and its own examples include pages targeted at specific regions or cities that funnel users to one page, and substantially similar pages that are closer to search results than a clearly defined, browseable hierarchy. A block of text listing the cities and regions a page is trying to rank for is given as an example of keyword stuffing. "Flatbed towing in" followed by twelve suburbs, each pointing at the same phone number, is that shape exactly.',
        'The structure that holds up is small. **Service pages** for the work you do — not the work a template says towing companies do. If you have no flatbed, there is no flatbed page. **Location pages** only where a location means something operationally: a second yard with its own trucks and its own profile, a stretch of interstate you cover that a competitor does not, a response area that differs by time of day. Fleet and commercial buyers tend to think in routes rather than town names, and a page built around the corridor you actually run matches that better than one built around each exit.',
        'The **cross-product** — every service in every city — is the thing to refuse. It produces dozens of pages whose only difference is a place name, none of which is closer to the searcher than the profile already is, and all of which ask a reader to believe you have a distinct operation in a town where you have a phone number. When a customer does land on one, they have learnt nothing they could not get from the map, which is the definition Google is working from.',
        'A useful way to see the difference: the pages that hold up are written about something — a truck, a road, a yard, a procedure. The pages that do not are filled in from something — a template, a list of towns, a spreadsheet of service names.',
      ],
    },
    {
      id: 'earn-the-url',
      question: 'A test for whether a page earns its address',
      answer:
        'Before building a page for a search, answer four questions. Is there a searcher who would read it rather than call? Is there something on it a customer could not learn from the profile? Does it differ from the pages beside it by more than a proper noun? And would you be comfortable if a competitor read it as a description of your operation?',
      detail: [
        'The first question rules out most emergency queries — the searcher calls, and the page exists to be checked rather than read. The second rules out a "towing near me" page altogether. The third is the doorway test in plain words: swap the place name and see if anything else changes. The fourth catches the pages that describe an operation you do not have.',
        'Applied to the seven searches above, the honest answer for a typical light-duty operator is three or four service pages — towing generally, roadside if you run it, flatbed or motorcycle if you have the equipment, long distance if you do it — and a location page only for a second base. That is fewer pages than the templates recommend and it is the number that will still be defensible when someone at Google or a customer looks closely.',
        'It is also the test this site is written to. The state pages here exist because the rotation rules, the rate regulation and the recovery work differ by state; there is no page per city for the same reason there should not be one on yours.',
      ],
      callCta: 'Ask us to look at your site structure',
    },
    {
      id: 'one-profile',
      question: 'One profile, an honest service area, and no second listing per service',
      answer:
        'The profile is the thing the map result is built from, so the temptation is to have several — one per service, one per town. Google\'s guidelines say not to create more than one profile for each location of a business, and the shortcut puts the profile you already have at risk.',
      detail: [
        'A service-area business — which is what most towing operators are, since customers do not come to the yard — is asked to hide its address and list the areas it serves, and Google says the overall service area should not extend much beyond about two hours\' driving time from where the business is based. That is the ceiling, not a recommendation; how to set the area you actually dispatch to is in the direct calls guide.',
        'Two listings for one yard — "Smith Towing" and "Smith Flatbed Towing" at the same address — is the profile-level version of the doorway page, and it is the one Google\'s guidelines are most explicit about. Services belong inside one profile, named individually, so that a flatbed or motorcycle search can be matched to you without a second listing to match it to.',
        'If you genuinely operate from two bases with trucks at each, two profiles are correct and two location pages on the site are correct with them. The test is the same as for pages: is there an operation there, or only a phone number?',
      ],
    },
    {
      id: 'limits',
      question: 'What this cannot do',
      answer:
        'It cannot move your yard. Distance is one of the three inputs Google names and it is the one no configuration, page or agency touches, so for a searcher across the metro you will be outranked by someone nearer, correctly. Nobody can promise a map position, a call count or a figure, and Google says plainly that a better local ranking cannot be requested or paid for.',
      detail: [
        'What the work can do is make sure the searches you are near enough to win are matched to you rather than to a competitor whose profile happens to say what yours implies, and that the customer who sees you has no reason to tap the next one. That is relevance and prominence, the two inputs that are yours to work on.',
        'What it will not do is create demand in a market where the phone is quiet because there are few breakdowns, or fix a rating that a stranded customer will not look past, or substitute for the channels where the work is applied for or sold rather than found. Where the constraint is one of those, the pillar on where towing work comes from is the better place to start.',
      ],
    },
  ],

  sources: [GOOGLE_LOCAL_RANKING, GOOGLE_REPRESENTING, GOOGLE_SPAM_POLICIES],

  faqs: [
    {
      question: 'Can a towing website rank for "towing near me"?',
      answer:
        'Not the way the phrase suggests. Google resolves "near me" against the searcher\'s location and the Business Profiles close to it, using relevance, distance and prominence. A website page carrying the phrase is not near anyone. The profile is what appears; the website\'s job is to confirm what the profile claims and put the phone one tap away.',
    },
    {
      question: 'Should a towing company have a page for every city it serves?',
      answer:
        'Only where the city means something operationally — a second yard, a distinct service area, a corridor you cover that others do not. Google\'s spam policy gives pages targeted at specific cities that funnel users to one page as an example of doorway abuse. A page per town with the same phone number and a swapped place name is that pattern.',
    },
    {
      question: 'Should a towing company have a page for every service?',
      answer:
        'A page for every service it actually runs, and none for the ones a template lists. Flatbed, motorcycle and long-distance pages are worth writing because a customer checks equipment and terms before choosing; emergency and 24-hour towing are decided in the map before a page loads.',
    },
    {
      question: 'Is "emergency towing" a different search from "towing near me"?',
      answer:
        'Same person, same situation, same result. Both are answered from the map by businesses that are close, understood to do the work, and rated well enough to trust. Neither is won by a page.',
    },
    {
      question: 'Can I create a second Google Business Profile for flatbed or roadside work?',
      answer:
        'Google\'s guidelines say not to create more than one profile for each location of a business. Services go inside the one profile, listed individually. A second profile at the same address for a second service is the listing-level version of a doorway page and risks the profile you already have.',
    },
    {
      question: 'Can OptimizeIndex get my towing company into the map pack for "towing near me"?',
      answer:
        'We can work on the two inputs that are yours — whether your profile is understood to do what is being searched for, and how credible it looks — and we can tell you which of the seven searches your equipment and area make winnable. We cannot change your distance from the searcher, and no one can promise a map position, calls or revenue.',
    },
  ],
};
