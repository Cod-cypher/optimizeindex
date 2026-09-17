# OptimizeIndex — working notes

Conventions for this repo. Most of them exist because breaking them costs a build,
a ranking, or the site's credibility. Read this before adding a page.

## Do not run builds, tests or verification unless asked

Make the code changes and stop. Do **not** run `npm run build`, `npm run verify`,
`npm run lint`, the prerender, the sitemap generation, the form tests, or start a
server, unless the user has asked for it in that message.

When a change would normally need verifying, say so and offer — "this needs a
build and a `verify` run before it can ship; want me to run them?" — and wait.
The user runs them when it suits them.

State plainly what has and has not been checked, so nothing is presented as
verified when it was not.

## What this project is

Vite 6 + React 19 + React Router 7, **pre-rendered to static HTML at build time**
and served by an Express server (`server.ts`), with Prisma/Postgres behind it.
It is not Next.js — there is no `app/` directory, no `generateMetadata`, no
`app/sitemap.ts`.

| You want | It lives in |
|---|---|
| Route metadata, titles, canonicals, JSON-LD | `src/routes.ts` |
| Page content (never in components) | `src/content/` |
| Page layout | `src/pages/` |
| Static HTML + `sitemap.xml` generation | `scripts/prerender.ts` |
| The build gate | `scripts/verify-seo.ts` (`npm run verify`) |

---

## Technical gotchas

These have each cost real debugging time.

**`npm run dev` cannot be used to check SEO output.** When `NODE_ENV !== "production"`,
`server.ts:1048` runs Vite in middleware mode with an SPA fallback, so **every path
returns the raw shell** — same title, same canonical, and no 404s. `/services` and
`/` look identical. To check titles, canonicals, or that a bad URL 404s:

```bash
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
  NODE_ENV=production PORT=3002 node dist/server.cjs
```

**Marketing pages must be eagerly imported in `AppRouter.tsx`.** Admin and the
proposal portal are lazy; towing pages are not. `renderToString` emits the Suspense
fallback for a lazy component, so the pre-rendered file would contain an empty div
and crawlers would get nothing.

**The similarity gate fails the build at 85%.** `verify-seo.ts` compares every towing
page against every other pairwise (5-gram Jaccard); 70% warns, 85% fails. Never import
the shared copy factories (`GBP_FAQS`, `aiFaqs()`, `buyersGuideFor()`) from
`src/content/towing.ts` into a new page — that is the single fastest way to trip it.

**`SESSION_SECRET` (≥32 chars) is required to boot in production.** The server refuses
to start rather than issue sessions it cannot verify.

**`dotenv` reads `.env` once at process start.** A running server does not pick up
edits — restart it. A process started before `.env` was filled in will silently use
empty values.

**Lead mail goes over SMTP** (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/`MAIL_FROM`).
FormSubmit is a fallback only, and it refuses server-to-server requests that carry no
`Origin`/`Referer` — answering **HTTP 200 with `{"success":"false"}`**, which is why
checking `res.ok` alone once recorded refusals as delivered. The boot log states which
path is live; if it says `SMTP NOT configured`, the environment did not load.

---

## Content rules

**A page must earn its URL.** If analysis shows a proposed page has insufficiently
distinct intent, heavy overlap with an existing page, or little unique information —
**stop and report**. Recommend re-scoping, re-URLing, merging or deferring. Do not
manufacture content to justify a URL. This rule has already removed two pages from
the towing cluster.

**Length is a target, not a threshold.** The gate's 700-word floor is thin-page
detection, not a goal. A page that fully answers its intent in 1,200 words ships at
1,200. Never add a section to reach a number. Priority: completeness → original
information → intent match → readability.

**Content strings are plain text, with one exception.** `SectionBlock` renders
`detail[]` entries as text, so markdown written into a content file shows up as
literal characters on the page. The single supported convention is `**bold**`, handled
by `withBold()` in `src/pages/towingShared.tsx` for run-in labels. Italics, links,
lists and headings inside a content string do **not** work — a link has to live in the
page component instead.

**Entity coverage over keyword coverage.** Build real relationships between the things
an operator deals with (commercial account → fleet operator → service agreement →
insurance certificate → net terms → retention), not a list of related phrases.

**Validate the SERP before writing.** Check what actually ranks for the primary query,
what intent Google is resolving it to, and whether the proposed format matches. Record
the row in the table below. The literal meaning of a keyword is often not its intent —
see the towing-jobs cluster, where an employer-phrased query still returned job boards.

---

## Sourcing

Any externally verifiable numerical, regulatory, platform, insurance, pay or rate
claim needs a primary source with a `checkedAt` date. The full rules are in the header
of `src/content/towing.ts`. **Prefer the specific first-party document over a
homepage.** If a claim cannot be verified it does not go on the page — it goes to
`CONTENT_GAPS`, which exists so the gap stays visible and someone can close it later.

**Worked example of why this matters.** Secondary sources widely state that Agero's
dispatch algorithm prioritises providers by proximity, acceptance rate, ETA accuracy
and customer satisfaction. Fetching Agero's own service-provider page shows **it names
no dispatch factors at all**. The claim is unpublishable. What is citable is Agero's
own wording — "more than 30,000 tow and road-only jobs a day", "no risk and no cost to
join" — attributed as Agero's claims, not as independent fact.

**Do not publish:**

- Rate figures from the towing lead-vendor SERP ("$35–$55 motor club", "$125–$300 cash
  calls", "3–5x more per job"). They come from companies selling that comparison.
- Driver pay ranges from ZipRecruiter/Zippia, or "median cost to hire". Aggregator
  estimates. If a pay figure is ever needed, use **BLS Occupational Employment and
  Wage Statistics**.
- Any invented motor-club rate, towing revenue, lead price, conversion rate, traffic
  or call increase, industry percentage, or contract term.
- `JobPosting` schema anywhere. There are no real vacancies behind it.

---

## Positioning

**OptimizeIndex is an AI solutions company for businesses missing revenue.** SEO,
Google Business Profile, AEO and GEO are how the results are delivered, always
framed as done with AI, never as what the company is. Identity surfaces (every
H1, hero lede, homepage section heading, the entity description, footer blurb,
nav and footer labels, CTA headings) lead with AI and the revenue problem and
never carry "SEO" or "marketing" as the noun we are; they may name the
mechanisms in a trailing clause ("AI-driven SEO, Google Business Profile, AEO
and GEO"). Body copy, service names, process steps, case studies and FAQs keep
the mechanisms, sparingly: name SEO/AEO/GEO once where introduced, then say
"search", "visibility", "getting found". `<title>`, meta descriptions, JSON-LD
and `public/llms.txt` keep the search terms ("towing seo", "free seo quote"),
because that is what Google matches and shows. "Missing revenue" describes the
problem we solve; it is never a promised outcome (see "Never claim" below).
`verify-seo.ts` fails the build on either word in an `<h1>` and prints per-page
`seo=`/`mkt=` counts so drift stays visible.

State plainly what OptimizeIndex does and does not do. The pages are more credible for
it, and the honesty is the differentiator in a vertical full of vendors.

**Can influence:** search and local visibility, website discoverability, how AI
assistants describe the business, measurement and attribution.

**Cannot control:** whether a customer chooses the company, motor-club dispatch
decisions, police-rotation admission, commercial contract awards, whether a caller
books, actual revenue, third-party marketplace behaviour.

**Never claim** guaranteed jobs, calls, rankings or revenue. OptimizeIndex is not a
motor club, broker, or employment site.

**Lead generation and dispatch are on the roadmap, not on the price list.** Both
are being built and neither ships today. Until one does, it may be described only
as something we are building — `ABOUT_ROADMAP` in `src/content/about.ts` is the
one place that wording lives, and the tense there is load-bearing. Do not write
either as a current service anywhere else, and do not soften the "what we do not
do" list on `/about` to make room for them. The day one ships, move it out of
`ABOUT_ROADMAP` deliberately and update `ABOUT_DOES_NOT` and `public/llms.txt` in
the same change.

**The legal entity is Idea Brothers LLC**; OptimizeIndex is a trade name. It lives
in `LEGAL_NAME` (`src/content/about.ts`) and is consumed by the Organization
schema's `legalName`, the footer's copyright line, and `/about`. One constant, so
the three cannot drift.

---

## How to add a page

1. **Validate the SERP** for the primary query. Record a row in the table below.
2. **Confirm it earns its URL** against the existing pillar. Measure the overlap; if a
   pillar section already covers it, either go substantially deeper or do not build it.
3. **Pick the organising axis.** The towing-jobs cluster uses `JobSource` (where work
   originates). `DemandIntent` × `ServiceIntent` belongs to `/towing-companies` —
   reusing those axes produces a paraphrase and trips the similarity gate.
4. **Write content into `src/content/`**, never into the page component. Components are
   layout only; that split is what lets the gate compare pages for templated drift.
5. **Wire it up:** route in `src/routes.ts`, branch in `src/AppRouter.tsx` (eager
   import), bullet in `public/llms.txt` (the build fails without it), internal links in
   the pillar's page component — section `detail[]` renders as plain text and cannot
   carry a link.
6. **Verify:** `npm run lint` → `npm run build` → `npm run verify` (must say ALL PASS),
   then the production-mode route check above.

---

## Towing content clusters

```
/towing-companies                             services pillar — what we do
├── /towing-companies/{state}                 7 states, comparison-query pages
└── /proudly-serving                          service-area hub

/towing-jobs                                  operator pillar — where work comes from
├── /towing-jobs/commercial-towing-accounts    B2B acquisition
├── /towing-jobs/heavy-duty-towing-accounts    heavy recovery buyers + DOT quick-clearance programs
├── /towing-jobs/more-direct-towing-calls      cash-call playbook + measurement
├── /towing-jobs/motor-club-towing             evaluating network dispatch
├── /towing-jobs/private-property-towing-contracts  the contract, the statute, the manager
└── /towing-jobs/paid-towing-leads             buying leads vs owning demand
```

**State pages target "Best AI Towing Agency in <State>" on purpose.** Title and
H1 come from `stateHeadline()` in `src/content/towing.ts` and are that query.
The "towing seo" intent Search Console surfaces belongs to `/towing-companies`,
whose `<title>` carries it. Do not retitle the state pages toward it.

### Cannibalization boundaries

| URL | Owns | Must NOT restate |
|---|---|---|
| `/towing-companies` | The OptimizeIndex service offering | — |
| `/towing-jobs` | The six channels compared. Breadth, not depth. | — |
| `…/commercial-towing-accounts` | The B2B sales process | Local-search mechanics → link to `/towing-companies` |
| `…/more-direct-towing-calls` | The operational playbook + call-quality measurement | Service description → `/towing-companies`; channel comparison → pillar |
| `…/motor-club-towing` | Evaluating network work | The other five channels → pillar |
| `…/paid-towing-leads` | Bought leads, and owning demand instead | Organic/GBP how-to → `/towing-companies` |
| `…/heavy-duty-towing-accounts` | Who buys heavy recovery (carriers, adjusters, DOT programs) and what each qualifies on; TRIP / RISC / MIT from their own specs | The generic B2B sales process, COIs, net terms → `…/commercial-towing-accounts`; corridor-page mechanics → `/towing-companies` heavy-duty section |
| `…/private-property-towing-contracts` | Who awards property contracts, what the manager is buying, the posting / authorisation / notification / storage statutes, what the contract obliges | Impound one-star reviews → `/towing-companies` `impound-reviews`; the channel summary → pillar; selling on account → `…/commercial-towing-accounts` |

`more-direct-towing-calls` carries the highest risk — it sits between
`/towing-companies` (the service) and 649 words of pillar covering the same channel.
It survives only by being **procedural** where both others are explanatory. If a draft
section explains *why* reviews matter rather than *how* to run the cadence, it has
drifted; cut it and link instead.

### SERP validation record

Checked **2026-09-03**; the two 2026-09-17 rows were validated the day they were built. Re-validate before publishing new pages in this cluster.

| Page | Target query | SERP intent | Dominant result type | Why our page matches |
|---|---|---|---|---|
| commercial-towing-accounts | *how to get commercial towing accounts* | **Mixed** — B2B informational + local commercial | Operator guides (PR Risk Management, Fast Stop, Bizfluent) **plus towing companies' own "Commercial Accounts" service pages** (Dick's, Waldera's, Richmond, NYC Towing) | We answer the operator half only. Targeting the modifier form keeps us out of the local-service-page half we cannot and should not win. Ranking guides are thin on what buyers *evaluate* — insurance certificates, tonnage, net terms — which is where the page goes deep. |
| more-direct-towing-calls | *how to get more direct towing calls / towing cash calls* | Commercial-informational | Agency listicles ("Top 37 Towing Marketing Ideas", "20 Proven Strategies") + pay-per-call lead vendors (towingcashcalls.com, towingleads.com) | Everyone ranking writes idea-lists or sells calls. Nobody publishes the operational playbook — tracking setup, qualified-call definition, booked-tow logging. Procedural depth is the gap. |
| motor-club-towing | *are motor club towing jobs worth it* | Investigational | Network first-party pages (Agero, AAA), trade guidance (Tow Academy, RAPA), plus employment listings bleeding in (builtin, themuse) | Ranking pages are either the networks themselves (not neutral) or thin best-practice posts. An operator-side evaluation with first-party citations and no invented rates is genuinely absent. |
| paid-towing-leads | *are towing leads worth buying* | Investigational, heavily commercial | **100% lead vendors** — Contractor Webmasters, Top7Seven, RoadsideAndTowingLeads, WDLG, SixtyFourLeads, AllLocalPros. Only TowMarX is editorial | Nothing ranking is neutral; every result sells the thing being evaluated. An independent page that declines to sell leads is the differentiator, and the FTC lead-generation guidance is a citation none of them carry. |
| heavy-duty-towing-accounts | *how to get heavy duty towing accounts* (2026-09-17) | **Mixed** — thin operator informational + local commercial | Towing companies' own heavy-duty / fleet-account pages (Smith, Geyers, Mortons, TCTR), a payments vendor (RoadSync), start-a-business guides (UpFlip, Indeed), Tow Academy | Nothing ranking explains who buys heavy recovery or that state DOTs run certified quick-clearance programs with published equipment, training and response specs. TRIP, RISC and MIT cited from their own documents; no invented rates. |
| private-property-towing-contracts | *how to get private property towing contracts* (2026-09-17) | Informational, operator-side | Towing companies' own listicles (Freeway Towing, Chavez, B&D), an insurance broker's guide (Wexford), forums, a US Legal Forms template, one Texas admin rule | Intent matches. None of the ranking pages cite the statute that governs the tow, which is the first thing a property manager asks about. Page is organised by who awards / how won / what it obliges, with CA, FL, WA, PA and MI rules from primary sources and IN / GA named as gaps. |
| ~~hiring-tow-truck-drivers~~ | *how to hire tow truck drivers* | **Employment** — not employer | Indeed (#1), Indeed again, ZipRecruiter ×2, Towing.com Careers. Only 3 of 8 serve employers | **No match — deferred.** Google resolves even employer-phrased towing queries to job listings. Also topically off-axis: the cluster is about acquiring work, not staff. |

### Terminology

Operators say **"cash calls"** for direct-pay customer work, as distinct from motor-club
or account dispatch. It appears across the ranking set for this vertical. Use it
naturally alongside "direct calls".

### Deferred pages

Ranked by value against cannibalization risk. Do not build without re-validating the SERP.
Heavy-duty accounts and private-property contracts were built 2026-09-17 and are no
longer deferred.

1. **Police rotation by state** — high intent but **blocked**: `CONTENT_GAPS` records
   that Georgia, Pennsylvania and Indiana rotation rules could not be confirmed from a
   primary source. Cannot be written honestly until they can.
2. **Tow truck insurance** — high volume, weak commercial fit, reads as filler.
3. **Hiring tow truck drivers** — see the SERP row above. Revisit only if a narrower
   long-tail such as *tow truck driver retention* shows a non-employment SERP.

---

## The shared lead form

`src/components/towing/TowingJobsLeadForm.tsx` is one component used across the whole
towing-jobs cluster, and it is **identical on every page** — steps, fields, order,
validation, submit behaviour, styling, heading and supporting copy. Nothing about it
varies per article.

**It takes no props, deliberately.** An earlier version accepted `heading` and `intro`
so each page could frame it in its own words, which meant a visitor met a differently
worded form on every page of one cluster. Being prop-less is the structural guarantee
that it cannot drift. Do not reintroduce per-page copy, do not add per-page fields,
and do not fork the component.

Submission goes through `submitLead()` (`src/lib/leads.ts`), which already records
`submittedFrom` — the originating pathname — so per-page lead attribution needs no
extra code. Do not add per-page tracking events.

---

## The chat widget

An OpenAI-backed assistant in the bottom-right corner of every marketing page,
which answers from the site's own content, runs the real site audit inside the
conversation, and emails Ali a link that drops him into that same conversation
to talk to the visitor live.

**`ChatWidget` returns `null` on its first render. Never change that.** It is
what keeps the widget out of the 24 pre-rendered HTML files, and therefore out
of every assertion in `verify-seo.ts` — the single-`h1` rule, the heading-level
scan, the homepage's required 100/100, and the towing similarity gate. Rendering
the launcher server-side puts all four back in play for the sake of one button.

**It mounts in `AppRouter.tsx` as a sibling of the view**, never inside it. Both
`App.tsx` and `TowingLayout` wrap content in a `<main>`, and the towing word
count and 5-gram similarity are measured from `$('main').text()`.

**All copy lives in `src/content/chat.ts`.** The assistant's knowledge is
`public/llms.txt`, read at boot — **update llms.txt and you update the bot.**
There is no second corpus.

**The prompt rules are the whole control surface.** Current OpenAI models reject
the `temperature` parameter outright, so there is no sampling knob. Anything the
assistant must never do — invent a statistic, promise a ranking, quote a price,
claim to be human — has to be written into `CHAT_RULES` in words.

**Chat leads are leads.** `type: "chat_widget"` goes through the same
`persistLead()` as every form, so it inherits the email forward, the funnel
updates and the file backup.

**The join link is a bearer token in a URL path.** Four surfaces must never
capture it: nginx (`access_log off` for `/chat/join/`), application logs (log
`tokenFingerprint()`, never the token), `PageView.path` (the `isPortalPage`
check in `main.tsx`), and error pages. Rotating `SESSION_SECRET` revokes every
outstanding link; `POST /api/admin/chats/:id/revoke` kills one conversation's.

**Opening a join link must not announce the agent.** Mail clients prefetch
links; joining is an explicit POST behind a button. This is the same hazard
`ProposalView.confirmed` exists for.

**A conversation outlives the browser tab, on purpose.** `src/lib/chat.ts` keeps
it in `localStorage` for seven days, and `POST /api/chat/:id/resume` re-signs the
visitor token on every return so the window slides. `RESUME_WINDOW_MS` there and
`VISITOR_TTL_MS` in `server/chat/tokens.ts` **must stay equal** — a longer client
window sends a lapsed token, a shorter one discards conversations the server
would still have honoured. The shared-browser exposure this creates is covered by
the "Start a new chat" control in the panel header, which is the only thing
wiring up `closeChat()` and `POST /api/chat/:id/close`; do not remove it.

**`pagehide` is not proof anybody left.** It fires on a hard navigation and on a
bfcache suspend, not just on a closed window. So the leave beacon may move the
agent's presence pill immediately, but it must never send mail: every departure
goes through `takeDepartedVisitors()` in `server/chat/presence.ts`, which waits
out a grace period that any arriving heartbeat cancels. Emailing straight off the
beacon puts "they left before you got there" in Ali's inbox every time a visitor
follows a link that reloads the page.

**Visitor presence tolerates far more silence than agent presence** — 90s against
35s. A backgrounded visitor tab polls at 30s and browsers throttle hidden-tab
timers toward one a minute; the agent console polls at 2s. Using one constant for
both reports live visitors as gone.

**`presence.ts` and `ratelimit.ts` are per-process Maps.** Both already assumed a
single PM2 instance; visitor presence adds a third way that assumption bites —
a poll served by another process would see no heartbeat and mail that the visitor
walked out. See `ecosystem.config.cjs`.

Two more for **Technical gotchas**: `compression()` at `server.ts:267` buffers
SSE, so any future streaming endpoint needs both a compression exemption and
`proxy_buffering off` in nginx. And `server/auth.ts` sets cookies with
`res.setHeader`, which *replaces* — any second cookie on the same response must
use `res.append` (see `setAgentCookie`).

**This project does not enable `strict`.** Without `strictNullChecks`,
TypeScript will not narrow a union on a boolean discriminant: `if (!result.ok)`
compiles but leaves the type unnarrowed. Discriminate on a string instead — see
`CompletionResult` in `server/chat/openai.ts`.

---

## The text messaging (SMS) program

Registered with Twilio as an A2P 10DLC campaign under Idea Brothers LLC. Every
word the registry can hold us to lives in `src/content/sms.ts` and is rendered
by `/sms-program`, section 5 of the privacy policy and section 5 of the terms
(all in `App.tsx`). Change the frequency, the keywords or any of the three
messages there and the campaign has to be re-submitted, not just redeployed.

**Opt-in is verbal, on a call, and nowhere else.** A phone number typed into
the quote, audit or towing lead form, or given to the chat assistant, is a
number to call back — it is not consent to text. That is why no form carries
an SMS checkbox, and why none should be added: adding one would turn web-form
opt-in into a second opt-in method the campaign was not registered with.
`SMS_OPT_IN_SCRIPT` is read aloud in full before the first text, and
`SMS_CONSENT_RECORD` is what gets logged.

**`SMS_NO_SHARING` is quoted verbatim, not paraphrased.** Reviewers search
for that sentence.

`src/content/sms.ts` imports `CONTACT_EMAIL` from `routes.ts`, so `routes.ts`
must not import from it — the `/sms-program` path is a literal there for that
reason.
