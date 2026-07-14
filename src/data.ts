/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Goal, Service, CaseStudy, ProcessStep, Testimonial } from './types';

export const GOALS: Goal[] = [
  {
    id: 'revenue',
    label: 'Get More Leads',
    ctaText: 'Get My Free Quote for More Leads',
    auditText: 'Get free quote',
    description: 'Direct bottom-line pipeline scale. Perfect for high-growth service businesses and enterprise tech.'
  },
  {
    id: 'profit',
    label: 'Increase Profit',
    ctaText: 'Get My Free Quote for Profit-First SEO',
    auditText: 'Get free quote',
    description: 'We ignore vanity traffic. We prioritize keywords that carry high transactional margins.'
  },
  {
    id: 'conversions',
    label: 'Get More Conversions',
    ctaText: 'Get My Free Quote for Max Conversions',
    auditText: 'Get free quote',
    description: 'Bridge the gap between traffic and revenue. Scale your form-fills, demos, and checkout completions.'
  },
  {
    id: 'cac',
    label: 'Lower Acquisition Cost',
    ctaText: 'Get My Free Quote for Lowering CAC',
    auditText: 'Get free quote',
    description: 'Cut waste. Reallocate budget to high-intent GEO citations and efficient paid search terms.'
  },
  {
    id: 'roi',
    label: 'Improve ROI',
    ctaText: 'Get My Free Quote for Peak Marketing ROI',
    auditText: 'Get free quote',
    description: 'Rigorous conversion tracking and channel attribution. Every dollar tracked directly in GA4 and CRM.'
  }
];

export const SERVICES: Service[] = [
  {
    id: 'gmb',
    index: '01',
    title: 'Google Business Profile (GMB) Optimization',
    description: 'Build a strong local presence by optimizing your Google Business Profile with accurate information, service categories, keywords, images, and regular updates to improve local visibility and attract more customers.',
    isDouble: true
  },
  {
    id: 'seo',
    index: '02',
    title: 'Search Engine Optimization (SEO)',
    description: "Improve your website's rankings with on-page optimization, technical SEO, keyword targeting, content improvements, and quality backlinks to generate consistent organic traffic.",
    isDouble: true
  },
  {
    id: 'aeo',
    index: '03',
    title: 'Answer Engine Optimization (AEO)',
    description: 'Position your business as the trusted answer by optimizing content for AI assistants, voice search, featured snippets, and FAQ-rich pages that provide direct, authoritative responses.',
  },
  {
    id: 'geo',
    index: '04',
    title: 'Generative Engine Optimization (GEO)',
    description: 'Prepare your brand for the future of search by optimizing your online presence so AI-powered platforms and generative search engines can discover, understand, and recommend your business.',
    isHot: true,
    isDouble: true
  },
  {
    id: 'paid-search',
    index: '05',
    title: 'Paid Search Ads',
    description: 'High-intent search capture with ruthless bidding logic. We buy the keywords that your competitors are overpaying for, then optimize them for direct margin.'
  },
  {
    id: 'paid-social',
    index: '06',
    title: 'Paid Social Ads',
    description: 'Thumb-stopping ad creatives coupled with hyper-segmented intent routing. We run paid funnels on Meta, LinkedIn, and YouTube that actually close deals.'
  },
  {
    id: 'programmatic',
    index: '07',
    title: 'Programmatic Advertising',
    description: 'Uncapped media reach utilizing dynamic creative optimization (DCO). Place your brand directly in front of enterprise decision-makers across premium networks.'
  },
  {
    id: 'content',
    index: '08',
    title: 'Content Marketing',
    description: 'Editorial-grade guides and interactive calculators designed to capture, educate, and convert high-intent buyers. Built for links, shared for authority.'
  },
  {
    id: 'cro',
    index: '09',
    title: 'Conversion Optimization',
    description: 'We run high-velocity A/B testing on your landing pages to remove checkout friction. Scale your conversion rate by 2x without adding a single dollar of traffic spend.'
  },
  {
    id: 'creative',
    index: '10',
    title: 'Brand & Creative Production',
    description: 'High-performance visual design assets, motion graphics, and landing page wireframes that command attention and reinforce deep authority.'
  },
  {
    id: 'web-design',
    index: '11',
    title: 'Custom Web Design & Dev',
    description: 'Sub-second page load times built with React, Tailwind, and static rendering. Engineered exclusively to maximize lead form interactions and search crawler health.'
  }
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'sujood-mats',
    client: 'Sujood Mats',
    stat: '+185%',
    metric: 'Search & Map Clicks',
    goal: 'conversions',
    outcome: 'A unified GBP, SEO, AEO & GEO campaign scaled visibility, traffic, and sales for premium prayer mats.',
    category: 'GMB + SEO + AEO + GEO',
    dataOrigin: 'verified in Google Search Console',
    fullContent: `# Case Study: How We Increased Sujood Mats' Visibility Through GMB, SEO, AEO & GEO

## Client
**Sujood Mats**  
*Website:* [sujoodmats.com](https://sujoodmats.com)

## The Challenge
Sujood Mats offered high-quality Islamic prayer mats but faced a common challenge many growing businesses encounter—limited online visibility in their target markets.

Although the website had a quality product range, it wasn't consistently appearing where potential customers were searching. Their Google Business Profile required optimization, search engine rankings needed improvement, and the business wasn't fully positioned to benefit from modern AI-powered search experiences.

The objective was clear:
* Increase online visibility.
* Reach customers in their target locations.
* Improve organic traffic.
* Generate more customer inquiries.
* Drive more online sales.

---

## Our Strategy
Instead of relying on a single marketing channel, we implemented a four-stage visibility strategy where each step strengthened the next.

### Step 1: Google Business Profile (GMB) Optimization
We began by optimizing the Google Business Profile to establish stronger local authority and improve visibility in Google's local search results.

Our work included:
* Complete profile optimization
* Service and product enhancements
* Keyword-focused business description
* Category optimization
* Location targeting
* Image optimization
* Regular Google Posts
* Review strategy
* Consistent business information across the web

This created a strong local foundation for future SEO efforts.

---

### Step 2: Search Engine Optimization (SEO)
Once the local presence was strengthened, we focused on improving the website itself.

Our SEO campaign included:
* Comprehensive keyword research
* On-page optimization
* Technical SEO improvements
* Metadata optimization
* Internal linking
* Content optimization
* Page speed improvements
* Schema markup implementation
* Targeted landing pages for priority search terms

The website gradually became more relevant to both users and search engines, allowing it to compete for valuable keywords related to prayer mats and Islamic products.

---

### Step 3: Answer Engine Optimization (AEO)
Modern customers increasingly search through AI assistants and conversational search platforms.

To help Sujood Mats appear in these experiences, we optimized content specifically for Answer Engine Optimization.

This included:
* Frequently Asked Questions (FAQs)
* Structured content formatting
* Featured snippet optimization
* Entity-based SEO
* Semantic keyword coverage
* Clear question-and-answer content
* Schema enhancements

This increased the chances of the business appearing in AI-generated responses and Google's featured answers.

---

### Step 4: Generative Engine Optimization (GEO)
The final stage focused on preparing the business for the future of search.

We optimized the website to improve visibility across AI-powered search platforms by:
* Strengthening topical authority
* Publishing high-quality informational content
* Building trust signals
* Improving content structure
* Expanding entity relationships
* Creating context-rich pages that AI systems can better understand

This positioned Sujood Mats for greater exposure as search continues shifting toward AI-generated recommendations.

---

## The Results
By combining GMB optimization, SEO, AEO, and GEO into one unified strategy, Sujood Mats experienced significant improvements in its online presence.

The business achieved:
* Increased visibility across Google Search and Google Maps.
* Improved rankings for important product and location-based searches.
* Higher organic website traffic.
* More inquiries from customers within their target service areas.
* Better engagement from qualified visitors.
* Increased online sales through improved search visibility.
* Stronger brand credibility across modern search platforms.`
  },
  {
    id: 'jade-title-services',
    client: 'Jade Title Services',
    stat: '+4,900%',
    metric: 'Organic Traffic Growth',
    goal: 'revenue',
    outcome: 'Scaled organic search volume from 5 to over 250+ highly targeted monthly visitors, transforming inbound B2B pipeline.',
    category: 'B2B SEO + CONTENT STRATEGY',
    dataOrigin: 'verified in Google Analytics 4',
    fullContent: `# Case Study: How Jade Title Services Increased Organic Traffic from 5 to 250+ Monthly Visitors and Started Generating Qualified Title Company Leads

## Client
**Jade Title Services**  
*Website:* [jadetitleservices.com](https://jadetitleservices.com)

## Industry
Title Examination & Real Estate Support Services

---

## The Challenge
Jade Title Services is a U.S.-focused title support company providing title examination, commitment preparation, policy production, and back-office services for title companies, settlement agents, and real estate professionals.

Despite having extensive industry experience, the company had very little online visibility. Their website attracted only *around five organic visitors per month*, making it nearly impossible for potential clients to discover their services through Google.

The goal was straightforward:
* Increase search visibility.
* Reach title companies actively searching for outsourcing partners.
* Generate qualified inbound leads.
* Build long-term organic traffic instead of relying solely on cold outreach.

---

## Our Strategy
Rather than focusing on one aspect of digital marketing, we implemented a complete search visibility strategy designed to position Jade Title Services as a trusted authority within the title industry.

### Phase 1: Website SEO Foundation
We began by strengthening the website's technical and on-page SEO.

This included:
* Comprehensive keyword research
* Service page optimization
* Meta title and description optimization
* Technical SEO improvements
* Internal linking
* Schema markup
* Mobile and page speed optimization
* Search engine indexing improvements

This provided search engines with a clear understanding of the company's services and expertise.

---

### Phase 2: Industry-Focused Content Strategy
Instead of publishing generic blog posts, we created content specifically designed to attract decision-makers within the title industry.

Our content focused on topics such as:
* Title Examination Services
* Title Search Outsourcing
* Commitment Preparation
* Final Policy Production
* Remote Title Support
* Real Estate Closing Services
* Workflow Solutions for Title Companies

Every page was optimized around search intent, helping the website rank for keywords used by potential clients looking for title support services.

---

### Phase 3: Authority & Trust Building
To improve search performance, we strengthened the site's credibility by:
* Implementing structured data
* Improving website architecture
* Optimizing service-specific landing pages
* Building topical authority around title services
* Enhancing content quality and relevance

These improvements helped establish Jade Title Services as a trustworthy resource within a highly competitive niche.

---

### Phase 4: Modern Search Optimization
As search continues evolving, we also optimized the website for AI-powered search experiences through:
* Answer-focused content
* Semantic keyword optimization
* Entity-based SEO
* Structured FAQs
* GEO (Generative Engine Optimization)
* AEO (Answer Engine Optimization)

This ensured the business could be discovered not only through traditional Google searches but also through emerging AI search platforms.

---

## The Results
Within months of implementing our strategy, Jade Title Services experienced a dramatic improvement in online visibility.

### Organic Traffic Growth
The website grew from *approximately 5 monthly organic visitors to over 250 organic visitors per month*, with traffic continuing to increase as additional pages ranked for industry-specific keywords.

More importantly, this wasn't just an increase in traffic—it was highly targeted traffic from businesses actively searching for title support services.

### Qualified Lead Generation
As visibility improved, Jade Title Services began receiving a consistent flow of inquiries from:
* Title companies
* Settlement agencies
* Closing companies
* Real estate professionals
* Businesses looking to outsource title examination and related services

Because these visitors were arriving through organic search, the leads were highly relevant and demonstrated clear intent, reducing the need for extensive outbound prospecting.

### Stronger Online Presence
The SEO campaign also resulted in:
* Improved rankings for high-intent industry keywords
* Increased website authority
* Better visibility across Google Search
* Higher engagement from prospective clients
* Sustainable long-term lead generation through organic search

---

## Why This Strategy Worked
Many B2B service providers rely heavily on cold outreach to win new business. Our approach focused on making Jade Title Services discoverable at the exact moment potential clients were searching for solutions.

By combining:
* Technical SEO
* Industry-specific content
* Authority building
* Answer Engine Optimization (AEO)
* Generative Engine Optimization (GEO)

we created a long-term marketing asset that continues to generate qualified traffic and business opportunities.

---

## Key Outcomes
* Increased organic traffic from *5 to 250+ monthly visitors*
* Continuous month-over-month organic growth
* Higher rankings for title industry search terms
* Increased inbound inquiries from title companies
* More qualified leads through organic search
* Improved online authority and brand credibility
* Sustainable lead generation without depending solely on paid advertising or cold outreach`
  },
  /* Hidden for now (July 2026) — pending client update. Ticker stats and hero
     card intentionally still reference these results. Uncomment to restore.
  {
    id: 'ecoclean-services',
    client: 'EcoClean Services',
    stat: '+280%',
    metric: 'Local Monthly Leads',
    goal: 'profit',
    outcome: 'GBP optimization and localized content scaled high-intent inquiries while reducing dependency on directories.',
    category: 'LOCAL SEO + AEO + GMB',
    dataOrigin: 'verified in ServiceTitan & GBP',
    fullContent: `# Case Study: How We Scaled EcoClean Services' Local Lead Volume by 280% Utilizing Google Business Profile & Answer Engine Optimization

## Client
**EcoClean Services**  
*Website:* [ecocleanservices.com](https://ecocleanservices.com)

## Industry
Commercial & Residential Eco-Friendly Cleaning Services

---

## The Challenge
EcoClean Services provided premium, eco-friendly cleaning solutions for offices and residential complexes. Despite stellar service and a certified green methodology, they had high dependency on local paid directory ads with rising customer acquisition costs (CAC). They had minimal local search presence and were entirely absent in AI-assistant queries like voice search or ChatGPT.

The objective was simple:
* Boost local organic lead generation in target geographic areas.
* Eliminate dependency on expensive paid business directories.
* Optimize for conversational search queries (e.g. "green eco-friendly commercial cleaner near me").
* Lower the customer acquisition cost (CAC).

---

## Our Strategy
We formulated a specialized local search blueprint that synchronized local authority signals with conversational optimization.

### Phase 1: Hyper-Local GBP (GMB) Mastery
We rebuilt their Google Business Profile to capture neighborhood-specific search volumes.
Our actions:
* Expanded specific sub-categories including "Green Cleaning Service" and "Commercial Janitorial Service".
* Implemented geotagged real-work image portfolios with rich descriptive alt text.
* Created an automated post schedule highlighting eco-friendly tips and customer reviews.
* Conducted structured review campaigns to systematically obtain localized sentiment reviews.

---

### Phase 2: Localized Service Architecture
We structured the website into deep local landing pages corresponding to high-value service areas.
* Designed neighborhood-specific service landing pages loaded with local schema markups.
* Optimized technical signals including local NAP (Name, Address, Phone) crawlability.
* Drafted high-utility content focused on green workspace health and commercial sustainability.

---

### Phase 3: Answer Engine Optimization for Voice Search
Most residential consumers use voice devices to seek cleaning services. We optimized the content for this intent:
* Created structured "service FAQ" widgets targeting direct conversational questions.
* Implemented Q&A schema markups across high-traffic landers.
* Targeted question-based keywords (e.g. "which cleaners do not use harsh chemicals?").

---

## The Results
The local campaign drove immediate and compounding dividends.

### Lead Generation Leap
* Local organic inbound leads grew by 280% within five months.
* The customer acquisition cost (CAC) dropped by 45% due to the organic nature of the traffic.

### Local Search Domain Domination
* Earned top-3 local "Map Pack" positions across all primary target service areas.
* Secured default conversational citations in voice assistants (Alexa, Siri, and Google Assistant).`
  }
  */
];

export const PROCESS_STEPS: ProcessStep[] = [
  {
    number: '01',
    title: 'Step 1: Optimize Your Google Business Profile',
    description: 'We begin by strengthening your local presence with a fully optimized Google Business Profile. This helps your business appear in local searches, Google Maps, and attracts nearby customers.',
    isOffer: true
  },
  {
    number: '02',
    title: 'Step 2: Expand with SEO',
    description: 'Once your local foundation is in place, we optimize your website using proven SEO strategies. This improves your rankings on Google, increases organic traffic, and brings in more qualified leads.',
    isOffer: false
  },
  {
    number: '03',
    title: 'Step 3: Scale with AEO',
    description: 'After building search visibility, we optimize your content for Answer Engines. This helps your business appear in featured snippets, voice searches, and AI-generated answers, making it easier for customers to find trusted information.',
    isOffer: false
  },
  {
    number: '04',
    title: 'Step 4: Future-Proof with GEO',
    description: 'Finally, we prepare your business for the next generation of search. Through Generative Engine Optimization, we ensure AI platforms like ChatGPT, Gemini, and other AI search tools can understand, reference, and recommend your business.',
    isOffer: false
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "More traffic is nice. More revenue is the point. OptimizeIndex did exactly what they promised: cut our customer acquisition costs by 42% in ninety days without dropping volume.",
    author: "Manufacturing Executive",
    role: "VP of Supply Chain Growth",
    company: "Automotive Parts Manufacturer",
    avatarUrl: ""
  },
  {
    quote: "They don't sell blobs or beautiful slides. They sell math. Our organic search pipeline is now our #1 highest profit driver, verified directly in sales channels.",
    author: "E-commerce Founder",
    role: "Chief Executive Officer",
    company: "D2C Apparel Brand",
    avatarUrl: ""
  },
  {
    quote: "While other agencies were debating what GEO meant, OptimizeIndex got us cited as the top answer for 400+ high-value queries. Our conversions skyrocketed.",
    author: "Industrial Tech Director",
    role: "Director of Digital Systems",
    company: "Heavy Machinery & Equipment",
    avatarUrl: ""
  }
];

export const TICKER_ITEMS = [
  { stat: "ORGANIC TRAFFIC · JADE TITLE SERVICES", value: "+4,900%" },
  { stat: "LOCAL LEADS · ECOCLEAN SERVICES", value: "+280%" },
  { stat: "SEARCH & MAP CLICKS · SUJOOD MATS", value: "+185%" },
  { stat: "ACQUISITION COST · ECOCLEAN SERVICES", value: "-45%" },
  { stat: "MAP PACK RANKINGS · ECOCLEAN SERVICES", value: "TOP 3" }
];
