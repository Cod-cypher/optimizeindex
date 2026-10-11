# SEO improvement plan: OptimizeIndex (2026-10-10)

## Where the site stands

The technical base is sound, so leave it as it is. Every marketing route ships complete prerendered HTML, and unknown URLs get a real 404. Canonicals, sitemap entries and server 301s all use one URL form. robots.txt records a decision for each search and AI crawler, and `scripts/verify-seo.ts` checks titles, H1s, heading order, thin pages, llms.txt coverage and towing-page similarity on every build. The editorial habits are also right and should stay: towing claims cite primary sources with visible checked dates, unconfirmed claims sit in `CONTENT_GAPS`, the copy says what OptimizeIndex cannot do, the city × service doorway tree was rejected, dates are bumped by hand, and FAQ markup is generated from the visible FAQ arrays. The real problems are in what the pages claim. The homepage hero shows an invented "+312% revenue" forecast, and the free audit tool tells prospects things that Google's own documentation contradicts. The company's description of itself also conflicts between /about, llms.txt (the chat assistant's only corpus) and the towing pages, on whether it answers calls and whether it serves only towing. On top of that, the "Become a Tow Provider" button on every page reads like the dispatch network every towing page says OptimizeIndex is not. Several towing pages tell operators to ask only likely-happy customers for reviews, which Google and the FTC prohibit, and seven places still recommend the retired Business Profile Q&A. There is no Search Console, Bing or field Core Web Vitals data yet, so every impact rating here comes from reading source, which is why measurement is the first fix. Most changes are small edits to existing pages, and the plan adds no new URLs.

## Priorities at a glance

Phases group the work by dependency, and each one ships on its own. GAP-03 depends on nothing, so it can run alongside Phase 2. Send the owner the GAP-02 and MISS-02 questions during Phase 1 so that Phase 3 is not left waiting.

| ID | Change | Impact | Effort | Phase |
|---|---|---|---|---|
| GAP-13 | Verify Search Console and Bing, submit the sitemap, fix the IndexNow command | High | S | 1 |
| GAP-01 | Remove the invented revenue forecast; give every result figure its base and period | High | S | 1 |
| MISS-01 | Ask every towing customer for a review the same way | High | S | 1 |
| MISS-03 | Drop the retired Business Profile Q&A advice | Medium | S | 1 |
| GAP-12 | Share card without "marketing"; og:type article on Article pages | Low | S | 1 |
| GAP-15 | 16 px form inputs on phones; long cache for fonts | Low | S | 1 |
| GAP-21 | Favicon larger than 48 px, plus /favicon.ico | Low | S | 1 |
| MISS-05 | Remove literal backticks from the direct-calls page | Low | S | 1 |
| GAP-08 | Hand-set page dates drive sitemap lastmod, Article dates and the visible stamp | Medium | M | 2 |
| GAP-14 | Collect field Core Web Vitals | Medium | M | 2 |
| GAP-20 | One router-level effect for head tags and page views | Low | S | 2 |
| GAP-06 | Drop the address-less ProfessionalService node; fix the prerender `$` bug | Low | S | 2 |
| GAP-07 | Breadcrumb markup only where a trail is visible | Low | S | 2 |
| GAP-18 | 301 or 404 the duplicate and private URL forms | Low | S | 2 |
| GAP-19 | Single-hop https www redirect; reject unknown hosts | Low | S | 2 |
| GAP-02 | Settle what the company does, then say it once everywhere | High | M | 3 |
| MISS-02 | Decide what "Become a Tow Provider" is and label it that way | High | S | 3 |
| MISS-06 | Privacy policy names the chat's AI provider and the first-party analytics | Low | S | 3 |
| GAP-05 | Cite or cut unsupported towing claims; correct the sitewide sourcing sentences | Medium | M | 3 |
| GAP-04 | Strip shared template blocks and restated FAQs from the state pages | Medium | M | 3 |
| MISS-04 | Align the state pages' site-structure advice with the near-me guide | Medium | S | 3 |
| GAP-09 | Bylines and a methods line | Medium | M | 3 |
| GAP-10 | Contextual internal links with descriptive anchors | Medium | M | 3 |
| GAP-17 | One brand form in titles; core H1s match their titles | Low | S | 3 |
| GAP-03 | Rewrite the audit tool's AEO/GEO checks against primary sources | High | M | 4 |
| GAP-16 | Valid FAQ markup; the Starburst as a real button | Low | S | 4 |
| GAP-11 | alternateName, canonical WebSite URL, no empty sameAs | Low | S | 4 |

## Phase 1: Quick wins

None of these needs an owner decision beyond access to the accounts, and each one ships alone.

### GAP-13 · Verify Search Console and Bing; fix the IndexNow command
*Impact high · Effort S*

- **Why:** Several reports exist only for verified properties: Google's AI Overview and AI Mode data, its Generative AI report and branded-queries filter, and Bing's AI Performance citations. Until the site is verified, nothing else in this plan can be measured, or even confirmed as indexed. Sources: https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports · https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview
- **Where:** DNS, Search Console and Bing Webmaster Tools (outside the repo); `DEPLOY.md:407-451, 473-478`; `scripts/indexnow.ts:4-13, 34-48`; `public/35e957c2249ce2866c2c0a301ec8e470.txt`.
- **How:**
  1. Owner: add a Search Console domain property for optimizeindex.com using a DNS TXT record. Verify Bing Webmaster Tools by importing from Search Console or by DNS.
  2. Submit `https://optimizeindex.com/sitemap.xml` in both tools.
  3. In Search Console Settings, confirm that "Search generative AI" is set to Include, which is the default (https://support.google.com/webmasters/answer/16908024).
  4. Put `INDEXNOW_KEY=35e957c2249ce2866c2c0a301ec8e470` in the server `.env`; it matches the committed key file. In `DEPLOY.md:425-432`, drop the generate-a-key snippet and the `INDEXNOW_KEY=$key` prefix. Add a warning that an empty inline `INDEXNOW_KEY=` hides the `.env` value, because dotenv never overrides a variable that is already set.
  5. Change the expected `<loc>` count at `DEPLOY.md:447` from 16 to 28, and fix the "six new towing URLs" note at 473-476.
  6. Delete the unverified claim that ChatGPT search leans on Bing's index from `DEPLOY.md:418-420` and `scripts/indexnow.ts:5-7`. OpenAI's crawler documentation does not say this.
  7. Until GAP-08 lands, ping only the paths that changed (`npm run indexnow -- /path …`), never the full list on every deploy.
- **Done when:** both tools show the property as verified and the sitemap as read, with 28 URLs. `npm run indexnow -- --dry-run /audit` shows the committed key and one URL. DEPLOY.md expects 28 URLs.
- **Constraint:** IndexNow does not reach Google, so the sitemap stays Google's mechanism. The key file must be in `public/` before a build copies it (`DEPLOY.md:434-437`).

### GAP-01 · Remove the invented revenue forecast; give every figure its base and period
*Impact high · Effort S*

- **Why:** CLAUDE.md forbids publishing any invented revenue, traffic or call increase, and Google's "Do you need an SEO?" page says no one can guarantee rankings or traffic. The hero chart ("LIVE FORECAST: TARGET DOMAIN", "+312% REVENUE", "$184,000 (76% of total pipeline)", "LAST UPDATE: TODAY") is an unsourced forecast on the page that defines the company, and it contradicts `llms.txt:3` ("we never promise a figure"), which the chat assistant repeats. Source: https://developers.google.com/search/docs/fundamentals/do-i-need-seo
- **Where:** `src/components/InteractiveChart.tsx`; `src/App.tsx:65, 446-449, 451-467`; `src/data.ts:119-128, 328-331, 516-522`; `src/types.ts:25-35`; `src/routes.ts:173-204`; `src/components/Marquee.tsx`.
- **How:**
  1. Delete the chart panel (`App.tsx:446-449`), its import (`:65`) and `InteractiveChart.tsx`; nothing else imports it. Replace it only if the owner supplies a real client series with the client's consent (see Open questions).
  2. Add `period`, `datePublished` and `dateModified` to `CaseStudy`. Fill them from the owner's GA4 and Search Console date ranges, with no estimates.
  3. Render the two hero cards (`App.tsx:451-467`) and the two numeric ticker items from `CASE_STUDIES` (stat, metric, client, dataOrigin, period) instead of hand-typed strings, so the figure, base, period and tool have one source. Example: "5 → 250+ monthly organic visitors (+4,900%), <period>, GA4". The +185% card gets its period too.
  4. Replace "Within months" at `data.ts:328` with the measured period.
  5. Add `datePublished` and `dateModified` to both case-study Article nodes (`routes.ts:187-197`). GAP-08 later makes this the general mechanism.
- **Done when:**
  - A new verify-seo check fails if any built page's text contains `LIVE FORECAST`, `+312%`, `$184,000`, `Domain Stacking`, `Authority Stacking` or `LAST UPDATE: TODAY`.
  - The same check asserts that every `CASE_STUDIES` entry has a non-empty `period` and `datePublished`, and that the homepage text contains each study's period.
  - The homepage still scores 100 in all three audit categories.
- **Constraint:** Sourcing and "Do not publish". Positioning: "missing revenue" is never a promised outcome. By source reading, the homepage stays well above the content-depth thresholds, and author-signals still passes through the phone section (`App.tsx:2154-2191`); only a build and a verify run can confirm that.

### MISS-01 · Ask every towing customer for a review the same way
*Impact high · Effort S*

- **Why:** Google's Maps contribution policy bars businesses from selectively soliciting positive reviews or pressuring customers to review on the premises. The FTC says "Don't ask for reviews only from customers you think will leave positive ones." The pillar and four state pages tell operators to target consensual jobs because those customers rate better, and the pillar says to ask "while the driver is present". This also contradicts the direct-calls guide, which already texts every customer. Sources: https://support.google.com/contributionpolicy/answer/7400114 · https://www.ftc.gov/business-guidance/resources/soliciting-paying-online-reviews-guide-marketers
- **Where:** `src/content/towing.ts`: pillar 505 and 566; California 627, 669, 707-709, 739-742; Florida 793; Michigan 1499; Washington 1684-1686, 1722. Model wording: `src/content/towingJobsCluster/directCalls.ts:79-89`.
- **How:**
  1. Rewrite each passage to one rule: send every customer one text with a direct review link after the job closes, with one follow-up. Don't filter by job type or expected rating, offer no incentives, and never ask in person at a collision scene.
  2. Remove the five-star rationale and the "consensual" targeting from the engagement steps (627, 793, 1499, 1722), because those steps describe what OptimizeIndex itself would build.
  3. On the pillar, drop "while the driver is present" (566) and "building volume on the consensual side…" (505). Keep the honest point that impound work draws negative reviews, and that the answer is asking everyone and replying calmly.
  4. Keep each state's paragraph about its own job mix (CHP rotation in California, patrol calls in Washington) so the rewrites don't converge. Don't paste in one shared sentence.
  5. If GAP-04 is coming soon, delete the California FAQ at 739-742 (it restates the `ca-reviews` section) instead of rewriting it.
- **Done when:** verify-seo's towing loop fails if any towing page's main text contains `consensual side`, `on consensual jobs`, `at the consensual jobs`, `concentrating review requests` or `while the driver is present`. No new 70% similarity warnings appear.
- **Constraint:** The similarity gate. The FAQPage JSON-LD regenerates from the same arrays. Until this ships, "the review advice follows Google's policies" cannot be claimed as a strength of the state pages.

### MISS-03 · Drop the retired Business Profile Q&A advice
*Impact medium · Effort S*

- **Why:** Google discontinued the Business Profile Q&A API on November 3, 2025 ("You can no longer read or post questions and answers using the API"), and none of the sources on the pages supports the Q&A advice. Reports that public Q&A was replaced by a Gemini "Ask Maps" feature come only from secondary sources. Source: https://developers.google.com/my-business/content/qanda/change-log
- **Where:** `src/content/towingJobsCluster/directCalls.ts:74`; `src/content/towing.ts:480, 621, 782, 942, 1487, 1818-1858`; `src/content/services.ts:37` (also emitted as FAQPage JSON-LD).
- **How:**
  1. Delete the line "**Questions**: answer the Q&A section yourself…", and remove Q&A from the five lists in towing.ts and from `services.ts:37`.
  2. Where a list needs a replacement item, use advice the pages already source: a complete, accurate services list, hours and description (`GOOGLE_LOCAL_RANKING`).
  3. Add a `CONTENT_GAPS` entry for the reported consumer-side change, so it gets checked against Google Business Profile Help before anything is written about it.
  4. Keep the direct-calls page procedural; don't add a paragraph explaining the change.
- **Done when:** verify-seo asserts that no towing page and no /services text contains "Q&A", and `CONTENT_GAPS` has the new entry.
- **Constraint:** Sourcing (unverifiable claims go to `CONTENT_GAPS`); the direct-calls boundary in CLAUDE.md.

### GAP-12 · A share card without "marketing", and og:type article on Article pages
*Impact low · Effort S*

- **Why:** Google uses og:image and primaryImageOfPage to choose result thumbnails, and prefers a representative image to a logo or text card. The single card used on all 30 documents reads "Performance marketing measured in calls and revenue", which calls the company "marketing" on a brand surface. Source: https://developers.google.com/search/docs/appearance/google-images
- **Where:** `scripts/optimize-images.ts:73-81`; `public/og-card.png`; `src/lib/head.ts:69, 83-98`; `src/routes.ts:35-49`.
- **How:**
  1. Replace the line at `optimize-images.ts:78` with identity copy, for example "AI solutions for businesses missing revenue". Regenerate with `npm run images` and commit the PNG.
  2. In `buildHeadTags`, emit `og:type` `article` when the route's jsonLd contains an Article node (the seven guides and two case studies), and `website` otherwise.
  3. Later, and only for a page that gains a genuinely informative original image, add an `image` field (url, width, height, alt) to RouteMeta and feed og:image, og:image:alt and Article.image from it. An example would be a diagram of the six work channels the hub already describes in text.
  4. Don't use stock photos that suggest a fleet or an office. An analytics screenshot needs the client's consent and must match the published figure and period exactly.
- **Done when:** verify-seo asserts that og:type is `article` on exactly the routes with an Article node, and `grep -i marketing scripts/optimize-images.ts` finds nothing.
- **Constraint:** Positioning (identity surfaces never call the company "marketing"); Sourcing (no new numbers in images). Keep the og:image dimensions accurate.

### GAP-15 · 16 px inputs on phones; long cache for fonts
*Impact low · Effort S*

- **Why:** iOS Safari zooms in when a focused input's text is smaller than 16 px. `.field-mono` sets 15 px at every width, which overrides the 16 px rule on the hero audit input and the LeadModal fields. Separately, the font files, including the preloaded display face, are revalidated on every view. This is a usability and conversion fix, not a ranking factor. Source: https://developers.google.com/search/docs/appearance/page-experience
- **Where:** `src/index.css:193-194, 220-224, 242-245`; `server.ts:1451-1456`; `deploy/nginx-optimizeindex.conf:80-87`; `scripts/fetch-fonts.ts`; `index.html:17-23`.
- **How:**
  1. Give `.field-mono` `font-size: 1rem`, and keep `0.9375rem` only inside the existing `@media (min-width: 640px)` block, so desktop looks the same.
  2. In `setHeaders`, give paths under `/fonts/` `Cache-Control: public, max-age=31536000, immutable`.
  3. Font filenames carry no content hash, so require a new filename whenever a font file changes: say so in `fetch-fonts.ts` and in a comment in `src/fonts.css`, and update the preload href.
  4. Correct the nginx comment at lines 80-83 so it describes what the code actually does.
- **Done when:** at a 375 px viewport, the computed font size of `#hero-audit-input` is 16px and focusing it doesn't zoom on an iPhone. After deploy, `curl -sI https://optimizeindex.com/fonts/bricolage-grotesque-200-800-normal-latin.woff2` shows the long max-age.
- **Constraint:** This needs a check on a real device and a post-deploy curl; neither has been done.

### GAP-21 · A favicon larger than 48 px, plus /favicon.ico
*Impact low · Effort S*

- **Why:** Google recommends a square favicon larger than 48×48 in a listed format: PNG or ICO, not SVG or WebP. The site's only icon is exactly 48×48, and `/favicon.ico` does not exist. Source: https://developers.google.com/search/docs/appearance/favicon-in-search
- **Where:** `scripts/optimize-images.ts:36-40`; `index.html:7`; `public/`.
- **How:**
  1. Also write `favicon-192.png` (192×192) and `favicon.ico`. sharp cannot write ICO, so either wrap the 48 px PNG in a single-entry ICO container or add a small converter dependency.
  2. Keep the existing 48 px link so its URL stays stable, and add `<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />`.
  3. Regenerate with `npm run images` and commit the outputs.
- **Done when:** verify-seo asserts that `dist/client/favicon.ico` and `dist/client/favicon-192.png` exist, and that the homepage head has `link[rel="icon"][sizes="192x192"]`.
- **Constraint:** Keep favicon URLs stable once they are published.

### MISS-05 · Remove literal backticks from the direct-calls page
*Impact low · Effort S*

- **Why:** Under CLAUDE.md, content strings are plain text and `**bold**` is the only supported markup. As a result, `directCalls.ts:97` shows the word tel: wrapped in visible backtick characters. This is a project rule, not an external one.
- **Where:** `src/content/towingJobsCluster/directCalls.ts:97`; `src/pages/towingShared.tsx:85-97`.
- **How:**
  1. Rewrite the sentence as "Put a real tap-to-call (tel:) link in the header of every page…".
  2. While doing GAP-05, grep `src/content` for any other inline markdown: backticks, `](`, and single-asterisk or underscore emphasis.
- **Done when:** verify-seo fails if any towing page's main text contains a backtick, `**` or `](`.
- **Constraint:** The content-string rule.

## Phase 2: Technical foundations

### GAP-08 · Hand-set page dates drive sitemap lastmod, Article dates and the visible stamp
*Impact medium · Effort M*

- **Why:** Google and Bing use lastmod only when it is accurate, and both ignore priority. Every URL is currently stamped with the build date, and all 16 towing pages share one hard-coded date. As a result, the near-me guide shows "Last updated September 17, 2026" and dateModified 2026-09-17, although commit 3ed5277 created it on 2026-09-22. Sources: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap · https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search
- **Where:**
  - `scripts/prerender.ts:125-147`
  - `src/routes.ts:35-49, 263-276, 391-433`
  - `src/content/towing.ts:45-54, 171-240`; `src/content/towingJobsCluster/index.ts:36-60`; `src/content/towingJobs.ts`; `src/types.ts:25-35`
  - `src/pages/towingShared.tsx:192-205`, plus the stamps at `TowingPillarPage.tsx:70`, `TowingJobsPage.tsx:144`, `TowingJobsChildPage.tsx:94` and `TowingStatePage.tsx:94`
  - `scripts/indexnow.ts:44-48`; `scripts/verify-seo.ts:190-229`
- **How:**
  1. Add `published` and `updated` fields (ISO 8601 date-time with offset) to RouteMeta. Put the same fields on the towing content objects (TowingState, TowingPillar, TowingJobsChild and the hub's `TOWING_JOBS`) and on CaseStudy (added in GAP-01). routes.ts copies them into each route, and sets literal values for the App-rendered routes, /about and /proudly-serving.
  2. Fill the fields once from git history. `published` is the commit that created the page's content; `updated` is the commit of its last substantive change (`git log --format=%cI`, or `git log -L` on a single state's block). The near-me guide gets 2026-09-22T05:45:22+05:00 for both. Don't record any date the history doesn't support.
  3. Feed the visible stamp, Article datePublished/dateModified and the sitemap from these fields. Format the stamp from the first ten characters, so an offset never shows the previous day. Drop Service.dateModified (see GAP-06), delete `TOWING_UPDATED`, and move its "bump by hand" comment onto the new field.
  4. In `writeSitemap`, set `<lastmod>` to `route.updated` and stop writing `<priority>`. Keep the `priority` field itself, because it is the indexability filter in `prerender.ts:131`, `verify-seo.ts:195, 272, 316` and `indexnow.ts:48`; or replace it in all four places in one change.
  5. Add a `--since <date>` option to `indexnow.ts` that submits only routes whose `updated` falls on or after that date, plus any removals passed explicitly.
- **Done when:** verify-seo asserts, for every indexable route:
  - both fields match an ISO date-time pattern, and `published <= updated`;
  - the sitemap lastmod for its URL equals `updated`, and the sitemap has no `<priority>`;
  - Article dateModified equals `updated`;
  - on the 16 towing pages, the stamp's `time[datetime]` equals the date part of `updated`.

  The near-me page then shows September 22, 2026.
- **Constraint:** The hand-bump rule (`towing.ts:46-54`) and Google's warning against fake freshness: never derive a date from the build. All 28 sitemap entries need a lastmod (`verify-seo.ts:222-226`). The checkedAt dates on sources stay separate from page dates. No JobPosting.

### GAP-14 · Collect field Core Web Vitals
*Impact medium · Effort M*

- **Why:** Core Web Vitals are judged on real-user (field) data at the 75th percentile, with lab tools used for debugging. The site collects no field data and has no CrUX view yet. Its only recorded measurement is a lab first contentful paint of 3.8 s (`prerender.ts:28-32`), which means LCP was above Google's 2.5 s "good" threshold at the time. Source: https://web.dev/articles/vitals
- **Where:** `src/lib/tracker.ts:156-201, 277-290, 308-336`; `package.json`; `server.ts:407-470`; `src/admin/`; `DEPLOY.md:479-480`. Likely causes: `src/App.tsx:372-405`, `src/components/audit/HeroAudit.tsx:322-327`, `src/index.css:456-459`, `src/fonts.css:9-79`, `src/components/SiteNav.tsx:16`, `src/components/Starburst.tsx:40-46`.
- **How:**
  1. Add the `web-vitals` package. Inside `initTracker`, which never runs on admin, proposal or chat-join pages, register `onLCP`, `onINP` and `onCLS` from `web-vitals/attribution`. Register them before the hide listeners at `tracker.ts:328-336`, so the final values make it into the beacon.
  2. Report each metric with `trackEvent('web_vital', name, { value, rating, id, navigationType, landing, target })`. `landing` is the path of the hard page load, which is how CrUX attributes it. `target` is the LCP element, the largest layout-shift target or the interaction target. Device class is already stored on the session row.
  3. Add an admin view or query that shows the 75th percentile of each metric per landing path and device class over the last 28 days, with the sample size beside it.
  4. Owner: set `PAGESPEED_API_KEY` in the server `.env` and restart. The audit FAQ at `data.ts:541` already promises PageSpeed data.
  5. Once data arrives, fix whatever it points to. Candidates: reserve height for the audit results, add metric overrides for the fallback fonts, size the 700 px content-visibility placeholders to real section heights, and switch the Starburst rotation to CSS.
- **Done when:** `web_vital` Event rows arrive for LCP, INP and CLS with a landing path and a target, and the admin view shows the 75th percentile per landing page. Search Console's Core Web Vitals report also has data once GAP-13 is done.
- **Constraint:** ChatWidget keeps its null first render, and marketing pages stay eagerly imported. Never gate builds on lab scores. The tracker stays off portal pages (`src/main.tsx:17-25`).

### GAP-20 · One router-level effect for head tags and page views
*Impact low · Effort S*

- **Why:** After a client-side navigation, the head should match a fresh load of that URL. Today only App.tsx syncs the head, which causes three problems:
  - going from / to /towing-companies keeps the homepage's title, canonical and JSON-LD;
  - a noindex tag from /towing-onboarding carries over to the next page;
  - navigations into the towing, hub and about pages send no GA4 or first-party page view.

  Crawlers load each URL fresh, so this affects attribution and agents that read the DOM, not indexing. Source: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- **Where:** `src/App.tsx:260-287`; `src/AppRouter.tsx:175-198`; `src/lib/head.ts`; `src/lib/analytics.ts:13-20`; `src/lib/tracker.ts:185-200`; `index.html:26-28`.
- **How:**
  1. Add a `useRouteHead()` hook keyed on pathname, called unconditionally at the top of AppRouter, before the agent-console early return.
  2. Make the hook do nothing in these cases: paths under `/admin` or `/chat/`; when `window.__CHAT_AGENT__` is set; when `window.__PROPOSAL__` is set and the path is that proposal's slug. On those paths getRouteMeta returns the 404 metadata, which would retitle a private proposal "Page Not Found (404)" and weaken its `noindex, nofollow`.
  3. Otherwise, replace or append each head tag, and remove the tags the new route doesn't emit: the robots meta on indexable routes, and the canonical and og:url on the 404 once GAP-18 lands.
  4. Only after the head is updated, and never on the first run, call `trackPageView` and `trackPageViewStart`, so the recorded page_title is the new one.
  5. Delete App.tsx's page-view effect (260-271) and its head loop (275-287), keeping the query-parameter handling in that second effect. Update the comment at `index.html:26-28`.
- **Done when:** navigating client-side from / to /towing-companies, then /towing-onboarding, then /services leaves the title, canonical, robots tag and JSON-LD identical to a fresh load of each URL. GA4 DebugView shows one page_view per navigation, with the new title, and nothing is recorded for /chat/join/.
- **Constraint:** ChatWidget stays a sibling of the view and keeps its null first render; marketing pages stay eagerly imported; no per-page tracking events; the bearer-token rule for /chat/join/.

### GAP-06 · Drop the address-less ProfessionalService node; fix the prerender `$` bug
*Impact low · Effort S*

- **Why:** LocalBusiness markup is meant for a business with a real physical address. ProfessionalService is a LocalBusiness subtype, and schema.org marks it deprecated. This node has no address, by design, and carries an unsourced `priceRange: '$$'`. By code reading, the prerender's string replacement turns that into `$` in every built file. Sources: https://developers.google.com/search/docs/appearance/structured-data/local-business · https://schema.org/ProfessionalService
- **Where:** `src/routes.ts:115-136, 193, 274`; `scripts/prerender.ts:55-57`.
- **How:**
  1. Move `makesOffer` (Offer → Service, derived from `SERVICES`) onto the ORGANIZATION node. Delete PROFESSIONAL_SERVICE and its entry in `SITEWIDE_JSONLD`, and drop priceRange.
  2. Remove `dateModified` from `towingService()` (line 274).
  3. For the case-study Article, use `about: { '@type': 'Thing', name: study.category }`, or drop `about`.
  4. At `prerender.ts:55-57`, use function replacers so no `$` sequence can be reinterpreted: `.replace(HEAD_BLOCK, () => head.trim()).replace(APP_HTML, () => html)`.
- **Done when:** verify-seo parses each built page's JSON-LD and deep-compares it with `{ '@context': 'https://schema.org', '@graph': [...SITEWIDE_JSONLD, ...(route.jsonLd ?? [])] }`, which catches any `$` rewrite. It also asserts that no node is a ProfessionalService or has a priceRange. The homepage geo score stays at 100, because answer-schema still finds the nested Service until GAP-03 changes it.
- **Constraint:** The homepage gate (`verify-seo.ts:94`). Lead generation and dispatch stay out of makesOffer (ABOUT_ROADMAP). Never add PostalAddress or AggregateRating.

### GAP-07 · Breadcrumb markup only where a trail is visible
*Impact low · Effort S*

- **Why:** Structured data has to describe what is visible on the page, and nine routes emit BreadcrumbList with no visible trail. Google has shown breadcrumbs only on desktop since January 2025, so this fix is about accurate markup, not how results look. Source: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- **Where:** `src/routes.ts:198-202, 312-315, 342-345, 454, 465, 492, 502, 513`; the case-study view in `src/App.tsx`.
- **How:**
  1. Remove `breadcrumb(...)` from /services, /case-studies, /about, /audit, /quote, /proudly-serving and /towing-companies.
  2. The two case studies sit three levels deep, so a visible trail helps readers there. Export one `caseStudyTrail(study)` from routes.ts and render it as a small `<nav aria-label="Breadcrumb">` in the case-study view (static import, no heading element). If the owner prefers, drop the markup instead.
  3. Leave the guide and state trails as they are.
- **Done when:** verify-seo asserts that every page with a BreadcrumbList has a `nav[aria-label="Breadcrumb"]` with at least `itemListElement.length - 1` links, and that pages without that nav carry no BreadcrumbList.
- **Constraint:** Eager imports (`AppRouter.tsx:21-30`). Keep the trail out of the heading outline (`verify-seo.ts:137-147`).

### GAP-18 · 301 or 404 the duplicate and private URL forms
*Impact low · Effort S*

- **Why:** Each page should have one URL form, anything that isn't a page should return a real 404, and noindex should be readable by crawlers. By code reading, express.static still answers /index.html, /services/index.html, /404.html (the 404 page with status 200) and /app-shell.html, and `//services` serves the services page. Canonical tags already consolidate these duplicates, so this is housekeeping. Source: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- **Where:** `server.ts:350-390, 1028-1037, 1440-1476`; `package.json:10`; `src/lib/head.ts:55-68, 82`.
- **How:**
  1. In the production branch, before express.static, 301 `/index.html` and `/<route>/index.html` to the clean path. Answer `/404.html` and `/app-shell.html` with the 404 page and status 404. `readShell` reads the shell file from disk, so it is unaffected.
  2. In the canonical-URL middleware, 301 any path containing `//` to its collapsed form. Make the trailing-slash redirect fall back to `/`, so `//` no longer redirects to an empty Location.
  3. Stop `npm start` from serving dev mode: either set NODE_ENV in the script, or refuse to boot when the entry file is `dist/server.cjs` and NODE_ENV is not production.
  4. In head.ts, emit no canonical or og:url for `NOT_FOUND_ROUTE`. Ship this with GAP-20, so client-side navigation removes a stale canonical.
  5. On `/uploads`, add `X-Robots-Tag: noindex` through `setHeaders`.
  6. Keep `Disallow: /admin` and the trailing-punctuation rescue (`server.ts:377-387`) as they are.
- **Done when:** verify-seo asserts that `404.html` has no canonical. In CLAUDE.md's production-mode check:
  - `/index.html` → 301 `/`, and `/services/index.html` → 301 `/services`
  - `/404.html` and `/app-shell.html` → 404
  - `//services` → 301 `/services`
  - `/sms-program.` → still 301 `/sms-program`

  The same curls go into DEPLOY.md's post-deploy list.
- **Constraint:** Twilio's A2P consent check depends on the punctuation rescue. `verify-seo.ts:281-284` keeps /admin disallowed for every crawler.

### GAP-19 · Single-hop https www redirect; reject unknown hosts
*Impact low · Effort S*

- **Why:** Redirects should be permanent, server-side and unchained. The nginx www block sends http://www to http://optimizeindex.com, so reaching https takes a second hop that depends on certbot's config. Any other Host header (the bare IP, a stray domain) gets the site with a 200, because Node listens on 0.0.0.0 and only redirects hosts that start with `www.`. Source: https://developers.google.com/search/docs/crawling-indexing/301-redirects
- **Where:** `deploy/nginx-optimizeindex.conf:111-116`; `server.ts:350-362, 1555`; `DEPLOY.md:117-151, 442-451`.
- **How:**
  1. Change line 115 to `return 301 https://optimizeindex.com$request_uri;`.
  2. Copy the live post-certbot config into `deploy/` so it can be reviewed. Never copy the repo file over the live one; see DEPLOY.md's warning.
  3. Add `default_server` blocks: `return 444;` on port 80 and `ssl_reject_handshake on;` on port 443.
  4. Bind Node to 127.0.0.1 in production, with a HOST override, after checking that nothing calls port 3002 from outside. Otherwise, confirm that the firewall closes that port.
  5. In Node, 301 any Host other than the apex, www and loopback to `https://optimizeindex.com`. Loopback must stay allowed, or CLAUDE.md's route check on localhost:3002 breaks.
  6. Add single-hop curl checks to DEPLOY.md for `http://www…`, `https://www…` and `http://optimizeindex.com…`.
- **Done when:** each of the three curls shows exactly one 301, straight to `https://optimizeindex.com/<path>`, and a request with a foreign Host header gets no site content.
- **Constraint:** Keep the punctuation rescue, and keep Node's www rule as a fallback. Nothing here has been run.

## Phase 3: Content, authority and internal linking

GAP-02 and MISS-02 need owner answers first, and GAP-04, GAP-09, GAP-17 and MISS-06 build on those answers. GAP-05, GAP-10 and MISS-04 can start immediately.

### GAP-02 · Settle what the company does, then say it once everywhere
*Impact high · Effort M*

- **Why:** Google's helpful-content guidance asks whether facts are easy to verify and whether it is clear who is behind a site, and puts trust first. /about and `llms.txt:13` say a voice agent handles calls and in-house models are trained on roadside demand. The towing pages, the hub and `llms.txt:36` say "we do not answer calls", and the only AI the code calls is OpenAI. Visitors, Google and the chat assistant therefore get opposite answers. Source: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- **Where:**
  - `src/content/about.ts:42-84, 95-127`; `src/routes.ts:61-67, 309, 472-474`; `public/llms.txt:3, 13, 18, 23, 27, 36`
  - `src/content/services.ts:40-42`; `src/content/towing.ts:579-582, 1389`
  - `src/App.tsx:382, 425, 914, 2196-2199`; `src/pages/AboutPage.tsx:218`; `src/data.ts:115, 521, 589`; `src/components/towing/TowingJobsLeadForm.tsx:226-229`
  - `src/content/towingJobsCluster/heavyDutyAccounts.ts:168`; `src/content/towingJobsCluster/privatePropertyContracts.ts:173`
- **How:**
  1. Get written answers from the owner to five questions:
     - (a) Is any call-answering or voice product live?
     - (b) Is any model trained in-house?
     - (c) Which industries are served?
     - (d) Which states have current towing clients?
     - (e) What does "Become a Tow Provider" offer? (This is MISS-02.)
  2. Write the answers once, into `ENTITY_DESCRIPTION` and the about.ts constants. Copy `ENTITY_DESCRIPTION` into `llms.txt:3` by hand, and make `llms.txt:13` agree with `llms.txt:36`.
  3. Move anything that isn't live into `ABOUT_ROADMAP`, in the future tense, or delete it:
     - "answers the phone" (43)
     - the voice agent (60, 123)
     - "models are trained" (51)
     - "own the technology" and "infrastructure we control" (58-62). Replace these with an accurate statement that names OpenAI as the chat assistant's provider.
     - "cloud-native … across regions" (78-81); production is a single PM2 instance.
  4. Make `about.ts:44`, the pillar FAQ (`towing.ts:579-582`), `services.ts:40-42`, `App.tsx:382` and `App.tsx:914`, `AboutPage.tsx:218` and `llms.txt:23` tell the same story about scope. Drop "lead handling" and any unconfirmed client claim from the Michigan lede (`towing.ts:1389`). Make the /proudly-serving description (`routes.ts:309`) and `llms.txt:27` match answer (d).
  5. Replace "lead generation is something we are building" at `heavyDutyAccounts.ts:168` and `privatePropertyContracts.ts:173` with a plain "we do not sell leads". Any link to /about comes from the page component.
  6. Settle one reply-time promise, either 24 hours or one business day, across `App.tsx:425`, `data.ts:521`, `data.ts:589` and `TowingJobsLeadForm.tsx:226-229`. Keep the audit-turnaround promise at `data.ts:546`, `routes.ts:499` and `llms.txt:18` consistent with it.
  7. Remove the "FREE DECK" Starburst (`App.tsx:2196-2199`), and replace "Sub-second page load times" (`data.ts:115`) with a claim the site can back up.
  8. Rewrite the /about description (`routes.ts:474`, 70-160 characters) from the answers. Restart the server after editing llms.txt, because the assistant reads it only at boot.
- **Done when:**
  - verify-seo asserts that `llms.txt` contains `ENTITY_DESCRIPTION` verbatim.
  - verify-seo asserts that no built page except /about contains "we are building", "something we are building" or "in development".
  - Unless the owner confirms them as live, no built page and no line of llms.txt contains "voice agent", "answers the phone", "trained on how roadside" or "infrastructure we control".
  - Asked "do you answer calls?" and "do you only work with towing companies?", the chat assistant gives the confirmed answers.
- **Constraint:** Positioning: "being built" wording lives only in `ABOUT_ROADMAP`, and `ABOUT_DOES_NOT` is never softened. When a capability ships, update `ABOUT_DOES_NOT` and llms.txt in the same change. Identity surfaces never call the company SEO or marketing. llms.txt must keep linking every indexable route (`verify-seo.ts:300-335`). Don't loosen `CHAT_RULES`. Privacy section 5 stays verbatim.

### MISS-02 · Decide what "Become a Tow Provider" is and label it that way
*Impact high · Effort S*

- **Why:** Nav labels are identity surfaces under CLAUDE.md. The header button on every page invites tow providers to sign up for "the jobs you want", and the form asks which areas "you do not want jobs from" and how "new job calls" should be routed. That reads as a dispatch network, while `ABOUT_DOES_NOT`, `llms.txt:36` and every towing denial say OptimizeIndex does not broker or dispatch work. The relabel from "Client onboarding" landed in commit a066589 on 2026-10-08, so this is a recent, deliberate change to confirm with the owner, not a typo to revert. This is a project rule (CLAUDE.md Positioning).
- **Where:** `src/components/SiteNav.tsx:117-141, 193-204`; `src/routes.ts:247-254, 541-550`; `src/content/onboarding.ts:1-36, 229, 250, 273, 343-370`; `src/pages/TowingOnboardingPage.tsx`; `server/onboarding/email.ts:142, 159`.
- **How:**
  1. The owner picks one of three options: (a) the flow is client onboarding for the visibility service; (b) it recruits providers ahead of the dispatch roadmap item; (c) a provider network is live now.
  2. For (a): relabel the header button, the mobile drawer button and the page in client terms, for example "Client setup". Reword `routes.ts:546-548`, the questions at `onboarding.ts:229`, `250` and `273`, the eyebrow at `343`, the confirmation at `358` and the email subject, so nothing implies that OptimizeIndex sends, routes or dispatches jobs. The file header already did this for one question.
  3. For (b): keep the label, but say on the page, in the future tense, that the network is being built and nothing is dispatched today. Match the `ABOUT_ROADMAP` wording.
  4. For (c): follow CLAUDE.md's "the day one ships" procedure in one change. Move dispatch out of `ABOUT_ROADMAP`, and update `ABOUT_DOES_NOT`, llms.txt and every towing denial (`towing.ts:326, 434`; `towingJobs.ts:387, 439`).
- **Done when:** the header label, the page title and description, and the form questions describe the same thing as /about and llms.txt. Every mention of dispatch in `src/content` and llms.txt matches the chosen option. In every case the page stays noindex, keeps exactly one h1 and has 300+ words, and the per-route verify checks still pass.
- **Constraint:** Positioning (roadmap tense, `ABOUT_DOES_NOT`, nav labels). Rewording labels is safe, but field ids are database columns, so renaming one needs a migration (`onboarding.ts:27-32`). No SMS checkbox.

### MISS-06 · Privacy policy names the chat's AI provider and the first-party analytics
*Impact low · Effort S*

- **Why:** What a site says about itself should be accurate. The chat assistant sends messages to OpenAI, and `/api/track` stores IP address, device, UTM parameters and page views. Privacy sections 1-2 mention only form data, GA4 and an email service, and the assistant answers privacy questions from this page. This is not a ranking factor. Source: https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf
- **Where:** `src/App.tsx:1518-1531`; `src/content/about.ts:62`; `server/chat/openai.ts:51`; `server.ts:407-470`; `server/chat/prompt.ts:74`.
- **How:**
  1. Owner, with legal review: state in sections 1-2 that OpenAI processes chat messages to generate replies. Also state that the site runs its own analytics (page views, scroll depth, clicks, IP address, device, referrer and UTM) alongside GA4, with the retention period if known.
  2. Make `about.ts:62` consistent with this; that edit lands with GAP-02.
  3. Leave section 5 and every SMS string exactly as they are.
- **Done when:** the built /privacy-policy page names the chat provider and the first-party analytics. verify-seo asserts that `SMS_PROGRAM_SUMMARY`, `SMS_PRIVACY_REQUIRED_SENTENCE`, `SMS_TWILIO_STATEMENT` and `SMS_NO_SHARING` still appear verbatim (whitespace-normalised) on /privacy-policy.
- **Constraint:** The SMS program: section 5 is bound by the carrier registration, and changing its wording means re-submitting the campaign.

### GAP-05 · Cite or cut unsupported towing claims; correct the sitewide sourcing sentences
*Impact medium · Effort M*

- **Why:** Google asks whether content is "free from easily-verified factual errors". On pages about statutes and DOT programs, several sentences go beyond their recorded sources or contradict `CONTENT_GAPS`. The call-tracking advice also leaves out Google's rule that a profile's phone number must be under the business's direct control and must not redirect. Sources: https://developers.google.com/search/docs/fundamentals/creating-helpful-content · https://support.google.com/business/answer/3038177
- **Where:**
  - `src/content/towing.ts:1013, 1305, 1453, 1464, 1467, 1629, 1668, 1672, 1818-1858`
  - In `src/content/towingJobsCluster/`: `heavyDutyAccounts.ts:51-60, 102-103, 111, 114-115, 144`; `privatePropertyContracts.ts:127-134, 143, 189, 204`; `commercialAccounts.ts:94`; `nearMeSearches.ts:93`; `paidLeads.ts:89`; `directCalls.ts:34-40, 69, 106-114`
  - `src/content/services.ts:32`; `src/pages/towingShared.tsx:163-167`; `public/llms.txt:59-70`; `src/content/about.ts:105-106`
- **How:**
  1. For each listed sentence, re-read the primary source. Either cite it, using the specific document, `supports` text that covers the exact claim and a fresh checkedAt, or delete it and add a `CONTENT_GAPS` line. Advice that contains no verifiable claim can stay as advice.
  2. Delete the Atlanta private-property share at 1013 (already listed as unconfirmed at 1821). Delete the density comparisons at 1305, 1464, 1467, 1668 and 1672, which `CONTENT_GAPS` (1843-1847) says were already removed.
  3. Trim heavy-duty lines 102-103 and 114-115 to what the TRIP and MIT `supports` text covers (51-52, 59-60), or extend that text after re-reading the sources. Cut "increasingly ask" (102). Treat Michigan 1453 and Washington 1629 the same way.
  4. Rewrite `privatePropertyContracts.ts:134` and `:189` so they assert nothing about Indiana or Georgia, and so that 189 acknowledges Washington's residential exemption (131).
  5. Cut "the primary one carries the most weight for relevance" (`directCalls.ts:69`). It is a ranking claim that goes beyond Google's documented framework (rule 3 in the `towing.ts` header).
  6. For call tracking, extend the `supports` text of `GOOGLE_SERVICE_AREA` (`directCalls.ts:34-40`, which already cites 3038177) with the direct-control and no-redirect phone rules, and re-check it. Rewrite line 112, including the garbled "profile's website field", so tracking is presented as the operator's own choice within those rules; the guidelines don't mention tracking numbers.
  7. Rewrite the SourceList intro (`towingShared.tsx:163-167`), `llms.txt:59-70` and `about.ts:105-106` to say what is true: sources are listed at the end of each page with the date checked, and client figures name their tool. Merge the new SourceList sentence with GAP-09's methods line, so the shared text doesn't grow.
- **Done when:**
  - Each listed sentence is either backed by `supports` text that covers it or recorded in `CONTENT_GAPS`.
  - grep finds none of "substantial part of the metro Atlanta market", "fewer competing profiles have had the work done", "carries the most weight" or "increasingly ask".
  - verify-seo imports the towing content and asserts that every SourceRef has non-empty `supports` text and an ISO `checkedAt`.
- **Constraint:** The Sourcing rules (CLAUDE.md; `towing.ts:19-41`). Content strings are plain text, so per-claim links have to come from components. Every towing page stays at 700+ main words. Police rotation stays blocked. Editing llms.txt changes the chat assistant's answers.

### GAP-04 · Strip shared template blocks and restated FAQs from the state pages
*Impact medium · Effort M*

- **Why:** Google's scaled-content and doorway policies target sets of near-identical pages built for one query pattern with the place name swapped. Each state page carries three shared copy factories, opens with the same lede frame, and has FAQs that restate sections of the same page. FAQ rich results were deprecated in May 2026, so an FAQ now earns its place only by helping readers. This fix reduces doorway-pattern risk; nothing measured shows a penalty. Sources: https://developers.google.com/search/docs/essentials/spam-policies · https://developers.google.com/search/updates
- **Where:** `src/content/towing.ts`: `GBP_FAQS` (270-296), `aiFaqs` (307-339) and `buyersGuideFor` (382-445), plus the state blocks (603-1795). Within those blocks: ledes at 610, 771, 931, 1080, 1221, 1389 and 1607; FAQ spreads at 727/743, 889/910, 1048/1059, 1183/1194, 1339/1350, 1528/1554 and 1739/1760; `buyersGuideFor` calls at 663, 823, 984, 1133, 1274, 1394 and 1612. Also `src/pages/TowingStatePage.tsx:158-215, 284-289` and `src/routes.ts:431`.
- **How:**
  1. Start after GAP-02 has settled the wording of what OptimizeIndex does not do.
  2. Add that statement to the pillar as an FAQ. On each state page, render a one-line link to it from `TowingStatePage` (in the component, not the content). This replaces the only boundary statements the state pages have today: the after-hours FAQ in `aiFaqs` (324-333) and buyer's-guide criterion 7 (428-435).
  3. Remove `...GBP_FAQS` from all seven states; it stays on the pillar.
  4. Cut `aiFaqs` on the state pages down to the per-state "How can AI help a towing company in <State>?" answer, plus any question whose answer is specific to that state and sourced. Drop the fixed-answer questions.
  5. Under the required "How to Choose an AI Agency for a Towing Company in <State>" heading:
     - keep only criteria whose `ours` answer is written for that state;
     - rewrite or drop the shared "specialisation" frame (665, 825, 986, 1135, 1276, 1396, 1614);
     - derive the intro's question count from `criteria.length`, and drop "Two of ours are 'we do not do that'" unless it is still true;
     - keep a tiny helper only for the heading string, so the gate phrase can't drift, with no shared prose.
  6. Delete FAQs that restate a section on the same page, for example 729-736 against 677-680, 891-898 against 837-841, and 1540-1547 against 1423-1437. Rewrite each lede's shared opening and the repeated local-ranking frames; GAP-05 already cuts the density claims inside them.
  7. Re-read each state against "a page must earn its URL". If a page no longer stands up without padding, report it for merging or deferral instead of adding text. Don't retitle, and don't add a new shared block.
- **Done when:**
  - verify-seo asserts that the five `GBP_FAQS` questions (export the constant for the gate) appear only on /towing-companies, and that no state page contains `aiFaqs`' fixed answers.
  - A new warn-only check flags any FAQ answer whose 5-grams are 70% or more contained in another block on the same page, reusing the gate's existing warn level.
  - Every state page still has 700+ main words, a tel: link, the buyer's-guide heading, and an H1 equal to its title lead.
- **Constraint:** `verify-seo.ts:409, 413-414, 422-424, 453-461`. State titles and H1s are fixed by CLAUDE.md. The factory ban covers new pages, and this fix removes existing uses. Any merge goes through "a page must earn its URL" and SERP validation, and the city × service tree stays rejected. New state answers need sources. FAQPage JSON-LD is generated from the same arrays.

### MISS-04 · Align the state pages' site-structure advice with the near-me guide
*Impact medium · Effort S*

- **Why:** Google's doorway policy names pages "targeted at specific regions or cities that funnel users to one page". Three state scope steps prescribe a page per metro, while the near-me guide says to build a location page only for a real second base, so the site contradicts itself. Source: https://developers.google.com/search/docs/essentials/spam-policies
- **Where:** `src/content/towing.ts:630-635` (California, "Metro and service page architecture"), `805` (Florida) and `1515-1518` (Michigan, "Detroit and Grand Rapids metro pages"). Reference: `src/content/towingJobsCluster/nearMeSearches.ts:93-109`, and the rejected-tree note in CLAUDE.md.
- **How:**
  1. Ask the owner to clarify the CLAUDE.md sentence calling the service tree "the right structure for a client's towing site", which conflicts with the published guide, so the guidance has one source. Editing CLAUDE.md is the owner's call.
  2. Rewrite the three steps to follow the near-me test: a page for each service the operator actually runs, and a location page only where there is a real operation (a yard, trucks, distinct work). Otherwise, one service-area statement on the site.
  3. Keep each state's `why` tied to its own market: coverage spread in California, tourist and storm metros in Florida, Detroit and Grand Rapids in Michigan. Don't use a shared sentence.
- **Done when:** no state engagement step recommends per-metro pages, a grep for "metro pages" or "Pages for the metros" in towing.ts returns nothing, and pairwise similarity doesn't rise.
- **Constraint:** The rejected city × service tree; the similarity gate.

### GAP-09 · Say who wrote and reviewed each guide, and how
*Impact medium · Effort M*

- **Why:** Google asks whether it is self-evident who created a page, whether pages carry a byline where readers expect one, and whether the use of AI or automation is disclosed where a reader would wonder. No page names an author, a reviewer or a method, and the only named person is the chat agent, "Ali". Sources: https://developers.google.com/search/docs/fundamentals/creating-helpful-content · https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- **Where:** `src/routes.ts:187-197, 396-406`; `src/pages/towingShared.tsx:150-205`; the four towing page components; the case-study view in `src/App.tsx`; `src/pages/AboutPage.tsx`; `src/content/about.ts:32`; `src/content/chat.ts:19`.
- **How:**
  1. Owner decides between a real, consenting named person (with a short bio on /about) and an honest company byline, and says whether AI drafts or structures the pages.
  2. Add a `Byline` next to UpdatedStamp in the hero of the 16 towing pages and the two case studies. It reads either "By OptimizeIndex, a trade name of {LEGAL_NAME}" (import the constant) or "By <name>, reviewed <date>", and links to /about from the component. Give it a `data-byline` attribute for the gate.
  3. Together with GAP-05, replace SourceList's intro with one methods sentence: sources are primary documents, checked on the dates listed, reviewed by <named person>, with AI used for <drafting or structure> where that is true. Replacing the existing text instead of adding to it keeps shared 5-grams flat.
  4. For a named author, set Article `author` to `{ '@type': 'Person', name, url: 'https://optimizeindex.com/about#<id>' }`. Otherwise keep the Organization @id, which already resolves to a node with a url.
  5. If "Ali" stays the named chat agent, introduce him on /about.
- **Done when:** verify-seo asserts that every towing route and every route with an Article node renders `[data-byline]` with a link to /about, and that the Article `author` resolves to a node with `name` and `url`.
- **Constraint:** Never invent a persona or credentials. `LEGAL_NAME` stays one constant. Keep the byline and methods text short inside `<main>` because of the similarity gate. Links go in components. The methods note may name AI but must not promise outcomes. The SMS sections of the privacy and terms pages stay untouched.

### GAP-10 · Link related pages from where they are mentioned, with descriptive anchors
*Impact medium · Effort M*

- **Why:** Google asks for links from within content where they help readers, with anchor text that names the target page. The pillar links to one of the seven guides, the state pages link to none, "the pillar" appears as unlinked internal jargon, and /about has no contextual link pointing to it. Source: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- **Where:**
  - `src/pages/TowingPillarPage.tsx:100-162`; `src/pages/TowingJobsChildPage.tsx:106-113`; `src/pages/TowingStatePage.tsx:217-235, 291-336`
  - `src/pages/TowingJobsPage.tsx:39-76` (`CLUSTER_LINKS`, the pattern to copy)
  - "pillar" in visible copy, all in `src/content/`: `towingJobsCluster/directCalls.ts:60, 88, 133, 145`; `towingJobsCluster/motorClub.ts:106`; `towingJobsCluster/nearMeSearches.ts:131`; `towingJobsCluster/commercialAccounts.ts:50`; `towingJobsCluster/heavyDutyAccounts.ts:166`; `towingJobsCluster/privatePropertyContracts.ts:106`; `towingJobs.ts:333, 344, 367`
  - other unlinked cross-references: `nearMeSearches.ts:82, 119`; `heavyDutyAccounts.ts:132, 199`; `commercialAccounts.ts:109`
  - `src/components/SiteFooter.tsx:28, 35`; the /services and /case-studies views in `src/App.tsx`
- **How:**
  1. Generalise the `CLUSTER_LINKS` pattern into a per-section map of `{ lead, anchor, href }` that renders after the matching SectionBlock. Use it in `TowingPillarPage` (replacing the one-off heavy-duty bridge), in `TowingJobsChildPage` keyed by slug and then section id, and in `TowingStatePage` keyed by state and then section id.
  2. On the pillar, link each guide from the section that covers its channel:
     - direct-calls → the direct-calls guide and the motor-club guide
     - gbp → the near-me guide
     - impound-reviews → the private-property contracts guide
     - heavy-duty → the heavy-duty and commercial accounts guides
     - cost → the paid-leads guide
  3. On the state pages, link only the guides a section actually discusses (heavy-duty corridors, impound or private-property work, rotation versus motor club).
  4. Replace every visible "pillar" with the destination's plain name, with the link rendered by the component at that point. Examples: "our guide to where towing work comes from" for /towing-jobs, and "our towing services overview" for /towing-companies at `heavyDutyAccounts.ts:166`.
  5. Add a contextual /about link from /services, /case-studies and the pillar.
  6. Replace the sentence anchor at `TowingJobsPage.tsx:52` with "whether motor club towing jobs are worth it". Keep a single audit label in `SiteFooter` and drop the duplicate.
  7. Vary anchors by context, so the 16 pages don't gain identical shingles.
- **Done when:**
  - verify-seo asserts that the pillar's `<main>` links to all seven guide URLs, and each state's `<main>` links to at least one `/towing-jobs/` guide.
  - No built page's main text contains the word "pillar".
  - `main a[href="/about"]` exists on /services, /case-studies and /towing-companies.
  - No new 70% similarity warnings appear.
- **Constraint:** Content strings are plain text, so links go in components. The cannibalization boundaries ("link instead of restate"; the near-me guide must not walk through profile fields). Eager imports are unchanged.

### GAP-17 · One brand form in titles; core H1s match their titles
*Impact low · Effort S*

- **Why:** Google builds title links from the title element and on-page headings, and asks for the brand once, used consistently, at the start or the end. The site uses three brand forms, and four core pages have a title and H1 that describe different things, which makes Google more likely to rewrite the title. Source: https://developers.google.com/search/docs/appearance/title-link
- **Where:** `src/routes.ts:442, 449, 460, 472, 497, 508, 519, 526`; `src/App.tsx:390-402, 910-912, 1202-1204, 1881-1883`.
- **How:**
  1. Use `<topic> | OptimizeIndex` for every title except the homepage, which keeps the brand first. The legal titles become "Privacy Policy | OptimizeIndex" (30 characters) and "Terms of Service | OptimizeIndex" (32).
  2. After GAP-02, retitle /about from the confirmed scope, with the brand at the end.
  3. Only one of / and /services should lead with "AI Search Optimization". Keep it on /services, and choose the homepage wording once Search Console query data is available from GAP-13; one option is "OptimizeIndex | AI Search Solutions for Missing Revenue" (55 characters).
  4. Rewrite the four core H1s to state their title's topic, led by AI and the revenue problem, without "SEO" or "marketing". Examples: /case-studies "AI search case studies and client results"; /audit "Your free 15-point AI search audit"; /quote "A free AI search proposal for a business missing revenue". Align the homepage H1 with whichever homepage title is chosen.
  5. Leave the state, hub and guide titles and H1s as they are.
- **Done when:** verify-seo asserts that every title except the homepage's ends with " | OptimizeIndex", the homepage title starts with "OptimizeIndex |", no title contains "OptimizeIndex Agency", and the / and /services titles don't share a leading clause. The existing checks still pass: 30-60 characters, unique titles, one H1 per page.
- **Constraint:** Positioning: H1s lead with AI and the revenue problem, and `verify-seo.ts:124-127` fails "SEO" or "marketing" in an H1. Titles keep search terms such as "free seo quote". `verify-seo.ts:113, 131, 453-461`. State titles are fixed by CLAUDE.md.

## Phase 4: AI search (AEO / GEO)

### GAP-03 · Rewrite the audit tool's AEO/GEO checks against primary sources
*Impact high · Effort M*

- **Why:** Google says AI Overviews and AI Mode need no special files, markup or schema, that Google Search does not use llms.txt, and that Google-Extended has no effect on Search. OpenAI documents GPTBot as a training crawler and OAI-SearchBot as the crawler for ChatGPT search. Google's "Do you need an SEO?" page now tells businesses to check AEO/GEO advice against Google's own guide, and the free audit fails that test. That audit is the homepage lead magnet, the chat assistant runs it, and every state buyer's guide cites it. Sources: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide · https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers · https://platform.openai.com/docs/bots · https://developers.google.com/search/docs/fundamentals/third-party-seo
- **Where:** `server/audit/checks.ts:62-68, 203-219, 309-366, 484-557, 615-645, 699-733, 769-966, 981-998`; `shared/auditTypes.ts:11-26`; `src/components/audit/CategoryCard.tsx`, `palette.ts`, `ReportSummary.tsx`; `src/data.ts:541, 556`; `src/content/services.ts:27`; `public/robots.txt:22-24`; `scripts/verify-seo.ts:82-96`.
- **How:**
  1. Add an `info` status to `CheckStatus`. `scoreChecks` excludes it from scoring, as it already does `unknown`, and it gets its own palette entry and icon. Also add an optional `source: { label, url, checkedAt }` to `AuditCheck`, shown as a small link in CategoryCard.
  2. Make llms-txt an `info` check: "Optional. Google Search does not use it; some other tools may read it."
  3. Make answer-schema an `info` check. entity-schema and schema-org keep their status logic, but drop "what gets you quoted", "cannot confidently name you" and "a real business it can name and recommend". Cite Google's statement that no special schema is needed. Don't add an FAQ to the homepage.
  4. Change ai-crawlers as follows:
     - Score only search crawlers: Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot and Applebot.
     - Report training crawlers (GPTBot, ClaudeBot, CCBot, Applebot-Extended) as information only.
     - Describe Google-Extended as "Gemini Apps grounding and Gemini training; no effect on Google Search".
     - Don't score user-triggered fetchers (ChatGPT-User, Claude-User, Perplexity-User).
     - Remove "You can be recommended in AI answers" (901) and "they will never suggest you" (908).
  5. server-rendered (781): say these assistants "may not run JavaScript; their crawler documentation does not say they do".
  6. author-signals (952): remove "something Google measures".
  7. A missing robots.txt (315-321) becomes pass or info, because Google treats it as no restrictions. A missing sitemap (345-351) becomes a warn, with Google's caveat that small, well-linked sites may not need one.
  8. title and meta-description (484-557): fail only when missing or generic, and present length as a display note, with no fixed number for descriptions. content-depth (615-645): keep the thin-page thresholds as a heuristic, but drop "you will struggle to rank" and cite Google's "no preferred word count".
  9. internal-links fix (723): "Link from your homepage to each service page", dropping "each area you cover".
  10. Reword the GEO blurb (995-996) so it promises no recommendation, and label the overall score in the report UI as OptimizeIndex's own estimate.
  11. Give `data.ts:556` and `services.ts:27` the same JavaScript wording as step 5, since both feed FAQPage JSON-LD. Correct the comment at `robots.txt:22-24` that calls Google-Extended training-only; this is a comment change only, with no rule change.
- **Done when:**
  - verify-seo runs `runChecks` on the homepage HTML with synthetic inputs:
    - robots.txt blocking only GPTBot, ClaudeBot, CCBot and Google-Extended → ai-crawlers passes;
    - blocking OAI-SearchBot → ai-crawlers fails;
    - `llmsTxt: false` → the same geo score as `llmsTxt: true`;
    - `robots.found: false` → robots-txt is neither warn nor fail.
  - No check's detail, why or fix text in any of those runs contains "never suggest you", "You can be recommended", "something Google measures", "cannot run the code", "Google is guessing", "cannot confidently name you" or "struggle to rank".
  - The homepage still scores 100 in technical, content and geo.
- **Constraint:** The homepage gate (`verify-seo.ts:85-96`) runs these same checks, so every change here moves the gate. Don't turn answer-schema into a visible-Q&A test, and don't add a homepage section to pass a check. Keep llms.txt; it is the chat corpus and a gate artefact (`verify-seo.ts:300-335`). Sourcing applies to every why string (primary source plus checkedAt). Positioning: no outcome promises. The per-route length bands in `verify-seo.ts:113-114` stay as internal heuristics.

### GAP-16 · Valid FAQ markup; the Starburst as a real button
*Impact low · Effort S*

- **Why:** Microsoft advises keeping key answers in direct question-and-answer passages that are easy to parse, and agent-usability checks expect semantic buttons rather than clickable divs. FaqSection places `dt` inside `summary` and `dd` inside `details`, which is invalid HTML, and it serves 19 pages. Google indexes collapsed content, so this is a validity and usability fix, not an indexing one. Sources: https://about.ads.microsoft.com/en/blog/post/october-2025/optimizing-your-content-for-inclusion-in-ai-search-answers · https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring
- **Where:** `src/components/FaqSection.tsx:39-70`; `src/components/Starburst.tsx:34-39`; `src/App.tsx:436-444`.
- **How:**
  1. Replace `dl/dt/dd` with plain list items, each `<details data-faq-item><summary><h3>{question}</h3></summary><div>{answer}</div></details>`, or plain text inside the summary. Opening every item is optional.
  2. Keep the FAQPage JSON-LD generated from the same arrays (`routes.ts:143-152`).
  3. Starburst: render a `<button type="button" aria-label="Start your free audit">` when an `onClick` is passed, and mark it `aria-hidden` when it is purely decorative.
  4. Leave the guides' statement-style headings as they are.
- **Done when:** verify-seo asserts that no built page contains `summary dt` or `details dd`, that the count of `[data-faq-item]` elements equals the FAQPage `mainEntity` count on every route that has one, and that the heading-level check still passes (h3 under the FAQ's h2).
- **Constraint:** `verify-seo.ts:137-147` (no skipped heading levels). The direct-calls page stays procedural, and the near-me guide doesn't walk through profile fields.

### GAP-11 · Entity markup: alternate name, canonical home URL, no empty sameAs
*Impact low · Effort S*

- **Why:** Google's site-name documentation asks for WebSite markup on the home page with `name`, `alternateName` and the canonical home URL. Organization markup should list real profiles in `sameAs`, or none. "Optimize Index", the brand form registered with the mobile carriers, appears nowhere in the markup, and `sameAs` is an empty array. Source: https://developers.google.com/search/docs/appearance/site-names
- **Where:** `src/routes.ts:69-113`; `src/content/sms.ts:147`.
- **How:**
  1. Add `alternateName: 'Optimize Index'` to WEBSITE and ORGANIZATION as a literal, because routes.ts must not import sms.ts.
  2. Set `WEBSITE.url` to `https://optimizeindex.com/`.
  3. Remove `sameAs: []`, and add it back only when there are real profile URLs.
  4. Keep both nodes in every document. Article, Service and AboutPage reference the Organization by @id, and Google documents no merging of @id references across pages.
  5. Off the site, pursue genuine third-party references such as directories, trade associations and client mentions. Never seed mentions.
- **Done when:** verify-seo asserts that the homepage WebSite node's `alternateName` equals `SMS_BRAND_DISPLAY` (the gate can import both files, so the literal can't drift), that its `url` is `https://optimizeindex.com/`, and that no node has an empty `sameAs`.
- **Constraint:** routes.ts must not import sms.ts (CLAUDE.md). `SMS_BRAND_DISPLAY` stays verbatim on the privacy and terms pages. Never fabricate sameAs entries. `LEGAL_NAME` stays the single source for legalName. Changes to `ENTITY_DESCRIPTION` belong to GAP-02.

## Measurement

The plan sets no targets: each change is read against its own before and after windows. Record every ship date, in DEPLOY.md or a changelog, so those windows can be drawn.

- **Indexing (Search Console, after GAP-13):** use Page indexing and Sitemaps for the 28 sitemap URLs. Use URL Inspection on the 16 towing pages to confirm the rendered HTML matches the prerender. Manual actions and Security issues should stay empty.
- **Search demand (Search Console Performance, Web search type):** impressions, clicks and CTR by page and query, grouped into homepage and services, towing pillar, state pages and guides. AI Overview and AI Mode appearances are counted in these totals, and the Generative AI report breaks out AI Overviews, AI Mode and Discover AI. Use the branded-queries filter if the property qualifies; a young, low-volume domain may not.
- **Bing Webmaster Tools:** Search Performance, AI Performance (citations, cited pages and grounding queries), and IndexNow submission status.
- **Leads and calls (what the business actually counts):**
  - `Lead.submittedFrom` per page, including `chat_widget` leads
  - `phone_click` events by element id
  - GA4 `generate_lead` and call-click conversions by page; towing-page coverage is complete only after GAP-20
  - audits run from the homepage tool
- **Page experience (after GAP-14):** 75th-percentile LCP, INP and CLS per landing page and device over 28 days. Compare them with Google's published "good" thresholds (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, from https://web.dev/articles/vitals), and with the Search Console Core Web Vitals report once CrUX has data.
- **Drift (every build):** verify-seo's homepage category scores, the per-route `seo=` and `mkt=` counts, the highest pairwise similarity and any 70% warnings.
- **Confounders:**
  - Google ran a spam update from September 24 to about October 8, 2026, plus core and spam updates earlier in 2026 (https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history). Don't credit this plan with a change that overlaps one of them.
  - ChatGPT's referral tagging (utm_source=chatgpt.com) is unconfirmed, so treat chatgpt.com referrals in GA4 as a minimum, not a full count.
  - The share of crawler renders in the first-party PageView rows is unknown; check it before reading those numbers.

## Not doing, and why

The reviewer did not reject any gap outright. These parts of the original recommendations were cut, and they stay out:

- **Lifting `Disallow: /admin` so crawlers can read its noindex (GAP-18).** /admin is login-gated and noindex, and `verify-seo.ts:281-284` asserts that it stays disallowed.
- **Rewording the direct-calls and near-me headings into questions (GAP-16).** Only Microsoft gives that advice, Google says no special structure is needed, and the direct-calls page is procedural by design.
- **Removing the Organization and WebSite nodes from inner pages (GAP-11).** Article, Service and AboutPage reference them by @id, and Google documents no merging across pages.
- **A shared visible-breadcrumb component for single-level pages (GAP-07).** It is more than the problem needs.
- **Turning answer-schema into a visible-Q&A test, or adding a homepage FAQ to pass any check (GAP-03).** Either would fail the homepage gate, and adding a section just to satisfy a check is what CLAUDE.md rules out.

These ideas are tempting, but they conflict with CLAUDE.md or with primary sources:

- **Page structure:**
  - A city × service page tree, or per-metro pages without a real operation behind them (the rejected tree; Google's doorway policy; MISS-04).
  - Retitling the state pages toward "towing seo"; the pillar owns that intent. Whether "Best AI Towing Agency" reads as an unsupported superlative is a decision for the owner, not part of this plan.
  - Any new URL without SERP validation and "a page must earn its URL". Police rotation by state stays blocked by `CONTENT_GAPS`, tow truck insurance and driver hiring stay deferred, and roadside-assistance operators can only ever become a segment page after the SERP is checked again. This plan proposes no new pages.
  - Writing to a word count, or adding sections to reach the 700-word floor. Google has no preferred word count.
- **Markup and AI-visibility files:**
  - JobPosting; AggregateRating, Review or Google-review widgets; PostalAddress, or a LocalBusiness with an invented address; QAPage in place of FAQPage; HowTo or SearchAction markup aimed at rich results that no longer exist.
  - Deleting llms.txt, which is the chat corpus and a gate artefact, or publishing Markdown copies of pages for AI search. Google Search uses neither.
  - Blocking or unblocking Google-Extended or GPTBot to change AI Overviews. Neither affects Google Search.
- **Performance and tracking:**
  - A build gate on lab scores, chasing a perfect Lighthouse score, rendering ChatWidget on the server, or lazy-loading marketing pages for speed.
  - Per-page lead-form copy, a forked lead form, or per-page tracking events.
- **Shortcuts and fabrication:**
  - The Indexing API (it covers only JobPosting and BroadcastEvent pages), sitemap pings (retired in 2023), routine disavows, seeded mentions, bought links or fabricated sameAs entries.
  - Generating dates from the build.
  - Links or Markdown inside content strings.
  - An SMS consent checkbox on any form.
  - Vendor rate or lead figures, aggregator pay data, or any invented statistic.
  - Dynamic rendering.

## Open questions

**For the owner**

1. The five GAP-02 facts, and the MISS-02 choice: client onboarding, recruitment ahead of the roadmap, or a live provider network.
2. Who writes and reviews the pages, whether AI drafts them, and whether "Ali" should be introduced on /about (GAP-09).
3. The measurement periods behind +4,900% (Jade Title Services, GA4) and +185% (Sujood Mats, Search Console), and whether either client consents to a published data series or screenshot (GAP-01).
4. Do proposals forecast numbers? QUOTE_FAQS promises "the projected impact on your pipeline … what you should expect to see at 30, 60 and 90 days" (`data.ts:569`), and `llms.txt:19` says "projected impact". Numeric forecasts would fall under the same rule as GAP-01.
5. One reply-time promise: 24 hours or one business day.
6. The CLAUDE.md line that calls the service tree "the right structure for a client's towing site" (MISS-04).
7. The privacy wording for OpenAI and the first-party analytics (MISS-06, with legal review). Also, whether "NO CONTRACTS · CANCEL ANY TIME" matches the Terms; that was not checked.
8. Whether Search Console or Bing verification, a Business Profile, named staff or real sameAs profiles already exist outside the repo.

**Needs a build or a live-site check (none was run)**

9. Whether `npm run verify` passes on the current tree; there is no `dist/` in the working tree. Also unchecked: each page's rendered head and body, towing word counts and pairwise similarity.
10. Whether http redirects to https, whether HSTS and HTTP/2 are on, what the certbot 443 block contains, and what the real www redirect chain is. Also: whether port 3002 is reachable from outside, whether production runs under PM2 with NODE_ENV=production, and whether a CDN sits in front.
11. Whether /index.html, /services/index.html, /404.html, /app-shell.html, //services and a request with the bare IP as Host answer 200 in production, and whether /CHAT/JOIN/<token> ends up in access.log.
12. Whether the live robots.txt and sitemap.xml match HEAD; whether INDEXNOW_KEY and PAGESPEED_API_KEY are set; the Cache-Control on /fonts/; whether the built pages carry priceRange with a single `$`; whether iOS zooms on `.field-mono`; and how the current FAQ nesting parses.
13. What share of first-party PageView rows comes from crawler renders.

**Unconfirmed externally; don't build on them**

14. Whether GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot or PerplexityBot execute JavaScript. None of their crawler documentation says either way.
15. Bing's reported February 2026 rewrite of its Webmaster Guidelines; the OpenAI publisher FAQ claims (the page now redirects elsewhere); whether ChatGPT search relies on Bing.
16. Whether the public Business Profile Q&A was replaced by an "Ask Maps" feature; only secondary sources report this.

Every change in this plan still needs `npm run lint`, `npm run build`, `npm run verify` (ALL PASS) and the production-mode route check from CLAUDE.md before it ships. None of them have been run: this plan comes from reading the source, and nothing in it has been built, served or tested.