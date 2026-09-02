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

State plainly what OptimizeIndex does and does not do. The pages are more credible for
it, and the honesty is the differentiator in a vertical full of vendors.

**Can influence:** search and local visibility, website discoverability, how AI
assistants describe the business, measurement and attribution.

**Cannot control:** whether a customer chooses the company, motor-club dispatch
decisions, police-rotation admission, commercial contract awards, whether a caller
books, actual revenue, third-party marketplace behaviour.

**Never claim** guaranteed jobs, calls, rankings or revenue. OptimizeIndex is not a
dispatcher, motor club, lead marketplace, broker, or employment site.

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
├── /towing-jobs/more-direct-towing-calls      cash-call playbook + measurement
├── /towing-jobs/motor-club-towing             evaluating network dispatch
└── /towing-jobs/paid-towing-leads             buying leads vs owning demand
```

### Cannibalization boundaries

| URL | Owns | Must NOT restate |
|---|---|---|
| `/towing-companies` | The OptimizeIndex service offering | — |
| `/towing-jobs` | The six channels compared. Breadth, not depth. | — |
| `…/commercial-towing-accounts` | The B2B sales process | Local-search mechanics → link to `/towing-companies` |
| `…/more-direct-towing-calls` | The operational playbook + call-quality measurement | Service description → `/towing-companies`; channel comparison → pillar |
| `…/motor-club-towing` | Evaluating network work | The other five channels → pillar |
| `…/paid-towing-leads` | Bought leads, and owning demand instead | Organic/GBP how-to → `/towing-companies` |

`more-direct-towing-calls` carries the highest risk — it sits between
`/towing-companies` (the service) and 649 words of pillar covering the same channel.
It survives only by being **procedural** where both others are explanatory. If a draft
section explains *why* reviews matter rather than *how* to run the cadence, it has
drifted; cut it and link instead.

### SERP validation record

Checked **2026-09-03**. Re-validate before publishing new pages in this cluster.

| Page | Target query | SERP intent | Dominant result type | Why our page matches |
|---|---|---|---|---|
| commercial-towing-accounts | *how to get commercial towing accounts* | **Mixed** — B2B informational + local commercial | Operator guides (PR Risk Management, Fast Stop, Bizfluent) **plus towing companies' own "Commercial Accounts" service pages** (Dick's, Waldera's, Richmond, NYC Towing) | We answer the operator half only. Targeting the modifier form keeps us out of the local-service-page half we cannot and should not win. Ranking guides are thin on what buyers *evaluate* — insurance certificates, tonnage, net terms — which is where the page goes deep. |
| more-direct-towing-calls | *how to get more direct towing calls / towing cash calls* | Commercial-informational | Agency listicles ("Top 37 Towing Marketing Ideas", "20 Proven Strategies") + pay-per-call lead vendors (towingcashcalls.com, towingleads.com) | Everyone ranking writes idea-lists or sells calls. Nobody publishes the operational playbook — tracking setup, qualified-call definition, booked-tow logging. Procedural depth is the gap. |
| motor-club-towing | *are motor club towing jobs worth it* | Investigational | Network first-party pages (Agero, AAA), trade guidance (Tow Academy, RAPA), plus employment listings bleeding in (builtin, themuse) | Ranking pages are either the networks themselves (not neutral) or thin best-practice posts. An operator-side evaluation with first-party citations and no invented rates is genuinely absent. |
| paid-towing-leads | *are towing leads worth buying* | Investigational, heavily commercial | **100% lead vendors** — Contractor Webmasters, Top7Seven, RoadsideAndTowingLeads, WDLG, SixtyFourLeads, AllLocalPros. Only TowMarX is editorial | Nothing ranking is neutral; every result sells the thing being evaluated. An independent page that declines to sell leads is the differentiator, and the FTC lead-generation guidance is a citation none of them carry. |
| ~~hiring-tow-truck-drivers~~ | *how to hire tow truck drivers* | **Employment** — not employer | Indeed (#1), Indeed again, ZipRecruiter ×2, Towing.com Careers. Only 3 of 8 serve employers | **No match — deferred.** Google resolves even employer-phrased towing queries to job listings. Also topically off-axis: the cluster is about acquiring work, not staff. |

### Terminology

Operators say **"cash calls"** for direct-pay customer work, as distinct from motor-club
or account dispatch. It appears across the ranking set for this vertical. Use it
naturally alongside "direct calls".

### Deferred pages

Ranked by value against cannibalization risk. Do not build without re-validating the SERP.

1. **Heavy-duty and recovery accounts** — high value, low risk. Strongest next candidate.
2. **Private-property and impound contracts** — the pillar's 272-word section has room.
3. **Police rotation by state** — high intent but **blocked**: `CONTENT_GAPS` records
   that Georgia, Pennsylvania and Indiana rotation rules could not be confirmed from a
   primary source. Cannot be written honestly until they can.
4. **Tow truck insurance** — high volume, weak commercial fit, reads as filler.
5. **Hiring tow truck drivers** — see the SERP row above. Revisit only if a narrower
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
