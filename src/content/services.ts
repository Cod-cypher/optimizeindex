/**
 * Content for /services that is not the service list itself.
 *
 * The list lives in src/data.ts (SERVICES) because the homepage, the services
 * page and the Organization schema's makesOffer all read it. This file holds
 * the FAQ, which only /services renders and which routes.ts mirrors into
 * FAQPage schema from this same constant so the visible copy and the markup
 * cannot drift apart.
 *
 * Every answer restates a commitment already made somewhere on the site: the
 * 15-point audit, the 24-hour reply, no contracts, the 15-day guarantee, the
 * refusal to guarantee rankings. Nothing here introduces a number, a price or
 * a promise that does not already exist elsewhere.
 */

import type { Faq } from '../types';

export const SERVICES_FAQS: Faq[] = [
  {
    question: 'What is AI search optimization?',
    answer:
      'Making a business findable and accurately described wherever people now look for it: Google search, Google Maps, and AI assistants such as ChatGPT, Gemini, Claude and Perplexity. In practice it is three connected disciplines, each delivered with AI. Search engine optimization (SEO) covers the website and its rankings. Google Business Profile work covers the map listing that most local searches actually resolve to. Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) cover whether an AI assistant can read your content, trust it and cite you by name when someone asks it for a recommendation.',
  },
  {
    question: 'What is the difference between SEO, AEO and GEO?',
    answer:
      'SEO is about ranking pages in a list of results, so it concentrates on crawlability, page content, technical health and links. AEO is about being the direct answer rather than a link: featured snippets, voice results and the FAQ-style passages assistants lift when a question has a short answer. GEO is about how generative systems build a longer answer: whether your site is retrievable at all (these assistants may not run JavaScript; their crawler documentation does not say they do), whether your claims carry a source they can verify, and whether the entity behind the site is described consistently enough to be named. Most of the work overlaps, which is why we sell them together rather than as three products.',
  },
  {
    question: 'Do you still do traditional SEO?',
    answer:
      'Yes, and for a local service business it is still the core of the work. Technical fixes, page structure, local content, reviews and the Google Business Profile are where most engagements start, because they decide whether you are found on Google search and Google Maps at all. The AI work is layered on that foundation, not sold instead of it.',
  },
  {
    question: 'What does Google Business Profile optimization involve?',
    answer:
      'Getting the listing complete and accurate first: categories, service area, hours, services, photos and the phone number people will actually tap. Then a steady cadence of reviews, responses and posts, a services list, hours and description kept current as the business changes, and the connections between the profile and the website that let Google confirm they describe the same business. For phone-first trades such as towing, the profile is usually the single most valuable asset the business owns online.',
  },
  {
    question: 'Do you only work with towing companies?',
    answer:
      'Towing and roadside operators are our current focus, and most of what we publish is written for them. Both published case studies come from earlier work with service businesses outside towing. Within towing, we work with operators in every US state, not only the seven our state pages cover.',
  },
  {
    question: 'Do you guarantee rankings or a number of leads?',
    answer:
      'No. Nobody controls Google, an AI assistant, or whether a caller decides to book, and an agency that guarantees a ranking is either guessing or selling. What we do commit to is measurement: every figure we report is pulled from a named tool such as Google Search Console, Google Analytics 4 or call tracking, so you can check it yourself. There are no contracts, and every engagement carries a 15-day money-back guarantee.',
  },
  {
    question: 'How do the free audit and the free quote differ?',
    answer:
      'The audit is a 15-point check of an existing website: whether Google can crawl and index it, what its pages say, how fast it loads, and whether AI assistants can read it. It comes back within 24 hours with the findings ranked by impact and a fix for each. The quote is a written proposal for working with us: which services, in what order, on what timeline, and what we would measure and report. It contains no forecast figures. Most people start with the audit; you can ask for either without obligation.',
  },
];
