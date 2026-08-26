# Proposal Portal — Implementation Plan

Admin creates a personalized growth proposal for a prospect → publishes it to a
human-readable URL → sends that URL → the prospect sees a polished, personal
sales page → admin sees whether they opened it.

---

## 0. Decisions this plan makes (change any of them before Phase 1)

| Decision | Choice | Why |
|---|---|---|
| URL shape | `optimizeindex.com/abc-logistics` (root) | What was asked for, and it reads best in an email. Cost: every unknown URL now hits one indexed DB query before 404ing, and slugs must be checked against a reserved list. |
| Indexing | `noindex, nofollow` header + meta on every proposal | These are private sales pages with a named prospect's data. They must never appear in Google or in `sitemap.xml`. |
| Privacy | Slug only by default; optional access code per proposal | A slug you don't publish is effectively private. The access-code toggle exists for prospects who care. |
| Admin accounts | Real `AdminUser` table + `scripts/create-admin.ts` CLI | "Admin account" implies changing a password without a redeploy, and adding a second seat later. |
| Sessions | HMAC-signed httpOnly cookie via `node:crypto` | No new auth dependency. The repo already hand-rolls rate limiting and URL normalization in this style. |
| Image upload | base64 JSON POST → `sharp` → `uploads/` on disk | `sharp` is already an optional dep. Avoids adding `multer`. |
| App.tsx | Not touched | It is a 2,577-line `if/else` monolith. New pages mount beside it, not inside it. |
| Projections | Always labeled as estimates, with the basis stated | Consistent with the codebase's existing no-fabricated-stats rule, and it closes better than an unsourced number. |

---

## Phase 1 — Data model

`prisma/schema.prisma`, one migration.

```prisma
enum ProposalStatus { DRAFT PUBLISHED ARCHIVED }

model AdminUser {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String?
  passwordHash String    // scrypt: <salt>:<derivedKey>, both hex
  createdAt    DateTime  @default(now())
  lastLoginAt  DateTime?
  isActive     Boolean   @default(true)
  proposals    Proposal[]
}

model Proposal {
  id          String         @id @default(cuid())
  slug        String         @unique   // "abc-logistics", "abc-logistics-2"
  status      ProposalStatus @default(DRAFT)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  publishedAt DateTime?
  expiresAt   DateTime?                // optional urgency / auto-archive
  accessCode  String?                  // optional gate; null = slug only
  authorId    String
  author      AdminUser @relation(fields: [authorId], references: [id])

  // --- Company ---
  companyName   String
  contactName   String?
  email         String?
  phone         String?
  websiteUrl    String?
  city          String?
  state         String?
  serviceRadius Int?      // miles
  industry      String?   // "towing", "flatbed", "heavy haul"...
  fleetSize     Int?
  truckTypes    Json?     // string[]
  heroImageUrl  String?   // uploaded, /uploads/<id>.webp
  logoImageUrl  String?

  // --- Current situation ---
  currentCalls Int?       // avg per month
  callSources  Json?      // [{ source, share|calls, note }]
  currentNotes String?

  // --- Opportunity (queryable scalars, because these get reported on) ---
  projectedCalls  Int?
  avgJobValue     Int?    // cents
  timeframeMonths Int?
  projectionBasis String? // REQUIRED to publish. "Based on 14 towing operators
                          // in comparable metros over 6 months." No basis, no number.

  // --- Plan / pricing / CTA ---
  phases         Json?    // [{ title, timeline, items[] }]
  deliverables   Json?    // string[]
  monthlyPrice   Int?     // cents, nullable — pricing section is optional
  setupFee       Int?
  termMonths     Int?
  ctaLabel       String?
  ctaUrl         String?  // booking link
  customSections Json?    // [{ heading, body }] escape hatch

  adminNotes String?      // PRIVATE. Never serialized to the public page.

  views  ProposalView[]
  events ProposalEvent[]

  @@index([status])
  @@index([createdAt])
  @@index([authorId])
}

model ProposalView {
  id           String   @id @default(cuid())
  proposalId   String
  proposal     Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  viewedAt     DateTime @default(now())
  viewerKey    String?  // per-proposal anon id in localStorage — distinguishes
                        // "opened it 4 times" from "4 different people"
  confirmed    Boolean  @default(false) // true only after the 3s JS beacon
  isBot        Boolean  @default(false) // Gmail/Outlook link scanners
  durationMs   Int?
  maxScrollPct Int?
  ipAddress    String?
  userAgent    String?
  referrer     String?

  @@index([proposalId, viewedAt])
  @@index([viewerKey])
}

model ProposalEvent {
  id         String   @id @default(cuid())
  proposalId String
  proposal   Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  name       String   // cta_click | section_view | phone_click | email_click | reply_submit
  label      String?
  viewerKey  String?
  metadata   Json?

  @@index([proposalId, createdAt])
  @@index([name])
}
```

Repeating structures are `Json` and numbers are real columns — the same split
`SiteAudit.checks` already uses.

**Bot filtering matters here.** Gmail and Outlook prefetch links in email. Without
filtering, the dashboard says "Viewed 3 times" thirty seconds after you hit send
and you call a prospect who never opened it. So: the server logs the HTML render
as an *unconfirmed* view, and a client-side beacon at 3 seconds flips
`confirmed = true`. The dashboard counts confirmed views only, and shows
unconfirmed separately as "link checked (likely email scanner)".

---

## Phase 2 — Auth (no new dependencies)

New file `server/auth.ts`:

- `hashPassword` / `verifyPassword` — `crypto.scryptSync`, `timingSafeEqual`, stored `salt:key`.
- `signSession` / `verifySession` — `base64url(payload).hmacSHA256` keyed on a new
  `SESSION_SECRET` env var. Payload `{ uid, exp }`, 7-day expiry.
- `readCookie(req, name)` — ~5 lines parsing `req.headers.cookie`. No `cookie-parser`.
- `requireAdmin` middleware → 401 JSON for `/api/admin/*`, redirect to `/admin/login` for pages.

Endpoints:

- `POST /api/admin/login` — rate-limited through the **existing** `checkRateLimit`
  in `server/audit/ratelimit.ts`, keyed by IP. Sets
  `Set-Cookie: oi_admin=…; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`.
- `POST /api/admin/logout`
- `GET /api/admin/me`

New env vars in `.env.example`: `SESSION_SECRET` (required; the server refuses to
start without it in production), plus notes on `create-admin`.

CLI: `scripts/create-admin.ts` → `npx tsx scripts/create-admin.ts <email> <password>`,
wired into package.json as `"admin": "tsx scripts/create-admin.ts"`.

`Secure` on the cookie means **login only works over HTTPS in production** — the
site is currently HTTP-only in `deploy/nginx-optimizeindex.conf` (the certbot block
was never added). Handled in Phase 8.

---

## Phase 3 — Serving dynamic pages from a pre-rendered site

This is the part the current architecture actively fights, so it gets its own phase.

Today `scripts/prerender.ts` writes one HTML file per route in `src/routes.ts`, and
`app.get("*")` 404s anything without a file. Proposals are per-record and admin is
private, so neither can be pre-rendered.

**Fix, in two small pieces:**

1. `scripts/prerender.ts` additionally writes `dist/client/app-shell.html` — the raw
   template with an empty `<div id="root">` and `data-prerendered="false"`. One
   extra `fs.writeFile`.

2. `server.ts` resolution order becomes: static asset → pre-rendered page →
   **proposal slug lookup** → 404. The proposal branch serves `app-shell.html` with
   the proposal JSON injected as `<script>window.__PROPOSAL__ = {…}</script>`
   (HTML-escaped, with `adminNotes` and `accessCode` stripped), plus
   `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private, no-store`.
   `/admin/*` serves the same shell with no injection.

Injecting the data server-side means no loading flash and no second round trip —
the prospect clicks the link and the page is simply there.

**Reserved slugs** — `server/proposals/slug.ts` exports a blocklist built from
`ROUTES`, `REDIRECTS`, `/admin`, `/api`, `/assets`, `/fonts`, `/uploads`,
`robots.txt`, `sitemap.xml`, `llms.txt`, `favicon*`, `logo*`, `404`. Slugify →
check reserved → check `Proposal.slug` unique → append `-2`, `-3`.

---

## Phase 4 — Client routing without touching App.tsx

New `src/AppRouter.tsx`, mounted by `main.tsx` and `entry-server.tsx` in place of
`<App/>`:

```
if (path.startsWith('/admin'))   → <AdminApp/>      (React.lazy)
else if (window.__PROPOSAL__)    → <ProposalPage/>  (React.lazy)
else                             → <App/>           (unchanged)
```

Checking for the injected global rather than a slug list means the client never
needs to know which slugs exist. `App.tsx`'s `not-found` logic is untouched and
still correct for genuinely unknown paths.

`React.lazy` keeps the admin bundle out of the marketing site's JS entirely —
prospects and Google download none of it.

---

## Phase 5 — Admin API + image upload

`server/proposals/routes.ts`, all behind `requireAdmin`:

```
GET    /api/admin/proposals                list + filters + view counts
POST   /api/admin/proposals                create (slug auto-generated)
GET    /api/admin/proposals/:id            full record incl. adminNotes
PATCH  /api/admin/proposals/:id            update
POST   /api/admin/proposals/:id/publish    validates, sets publishedAt
POST   /api/admin/proposals/:id/unpublish
POST   /api/admin/proposals/:id/duplicate  clone as draft — the real time-saver
DELETE /api/admin/proposals/:id            soft → ARCHIVED
GET    /api/admin/proposals/:id/activity   view + event timeline
POST   /api/admin/upload                   image
```

Publish validation rejects: missing `companyName`; a `projectedCalls` with no
`projectionBasis`; `projectedCalls <= currentCalls`; a reserved or duplicate slug.

**Upload:** JSON `{ filename, dataUrl }` on a route-scoped
`express.json({ limit: '8mb' })` — the global one is 100 KB and would reject the
body. The server validates magic bytes for JPEG/PNG/WebP (not the extension, not
the declared MIME), caps at 5 MB decoded, runs `sharp` to resize to max 1600px and
convert to WebP, and writes `uploads/<cuid>.webp`. Served by a dedicated
`express.static('uploads')` mount at `/uploads` with a 1-year immutable cache.

`uploads/` goes in `.gitignore` and, critically, **outside `dist/`** — `npm run build`
runs with `emptyOutDir`, so anything inside `dist` is deleted on every deploy.

If `sharp` is unavailable (it is an *optional* dependency and does fail to install
on some hosts), the route stores the validated bytes unmodified rather than 500ing.

---

## Phase 6 — Admin UI (`/admin`)

`src/admin/` — all lazy-loaded, styled with the site's existing Tailwind tokens.

- `AdminApp.tsx` — auth gate + sub-routing
- `LoginPage.tsx`
- `ProposalList.tsx` — table: company, slug, status, created, **last viewed**, view
  count, CTA clicks. Filter by status, search by company. Row → editor.
- `ProposalEditor.tsx` — sectioned form matching the schema groups (Company →
  Current Situation → Opportunity → Plan → Pricing → CTA); autosave-as-draft on a
  debounce; live-computed "+60 calls/mo, +60%" readout as numbers are typed;
  drag-to-reorder phases; image drop zone with preview.
- `PreviewPane.tsx` — renders the real `<ProposalPage/>` in an iframe from draft
  state, so preview and published output can never diverge.
- `ActivityPanel.tsx` — timeline: created / published / each confirmed view / CTA
  clicks, with unconfirmed scanner hits visually separated.
- **Copy Link** button, plus a pre-written send-message template with the URL in it.

---

## Phase 7 — The prospect page (`/abc-logistics`)

`src/proposal/ProposalPage.tsx` — this is the page that has to close, so it is built
as a narrative, not a field dump. Sections render only when their data exists, so a
thin proposal still looks deliberate.

1. **Hero** — their logo/photo, `Growth Opportunity for ABC Logistics`, prepared-for
   line and date. Personal from the first second.
2. **What we looked at** — radius, fleet, truck types, service area. Proves homework.
3. **Where you are now** — current calls, source breakdown as a bar.
4. **What's available** — the number. `~100/mo → ~160/mo`, an animated counter and a
   curve, with `projectionBasis` printed directly beneath it as body text, not a
   footnote. Optional revenue line when `avgJobValue` is set.
5. **Where the extra calls come from** — per-source contribution.
6. **The plan** — phases as a vertical timeline with deliverables.
7. **Investment** — only if `monthlyPrice` is set; otherwise skipped entirely.
8. **CTA** — booking link, tap-to-call, email. Sticky on mobile.

Reuses `Logo`, `Starburst`, `FaqSection`, the site's motion patterns, and the SVG
charting approach already proven in `src/components/InteractiveChart.tsx`.

Also: `<meta name="robots" content="noindex, nofollow">`, no canonical, absent from
`sitemap.xml` (automatic — it is generated from `ROUTES`), and `Disallow: /admin`
added to `public/robots.txt`.

**Optional reply box** — "Send a question to the OptimizeIndex team" writes into the
existing `Lead` table with `type: "proposal_reply"`, so it flows through the
`formsubmit.co` email path already wired up in `emailLead`.

---

## Phase 8 — Tracking, deploy, verification

- `POST /api/p/:slug/view` (3s beacon → `confirmed`), `POST /api/p/:slug/event`, and
  `sendBeacon` on unload for duration + scroll. Public, IP-rate-limited, and they
  accept only a known event-name enum.
- `nginx`: add `client_max_body_size 10m;` for uploads and a `location /uploads/`
  block. Also **run certbot** — the admin session cookie is `Secure` and the site is
  currently HTTP-only.
- `DEPLOY.md`: `SESSION_SECRET`, `npm run admin`, and the fact that `uploads/` must
  survive deploys and get backed up.
- Verify: `npm run lint` (`tsc --noEmit`), `npm run build`, then confirm by hand that
  `/services` still pre-renders, an unknown URL still 404s, `/admin` 401s when logged
  out, and a published slug renders with its data already in the HTML source.

---

## Order and rough sizing

All eight phases are implemented. Status as built:

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Schema + migration | Done — applied to production |
| 2 | Auth + create-admin CLI | Done |
| 3 | Dynamic serving from a pre-rendered site | Done |
| 4 | AppRouter split | Done |
| 5 | Admin API + upload | Done |
| 6 | Admin UI | Done |
| 7 | Prospect page | Done |
| 8 | Tracking + deploy config | Done — certbot still outstanding |

**One planned section was deliberately not built.** Section 5 of the prospect
page, "where the extra calls come from", called for a per-source breakdown of the
projected increase. The schema captures current call sources but nothing about
how the *projected* calls split across channels, so rendering that section would
have meant deriving a breakdown from data that does not exist — the same
fabrication the `projectionBasis` rule exists to prevent. Use a custom section to
write it per prospect where it is actually known.

Phases 1–4 are load-bearing; nothing in 5–7 works until 3 is right. A useful
checkpoint after Phase 5: create a proposal via `curl` and load its URL in a
browser. If that renders, the rest is UI.

## Deliberately out of scope

Multi-tenant/team roles, e-signature, Stripe, PDF export, sending email from the app
(`formsubmit.co` stays the path), and a WYSIWYG editor.
