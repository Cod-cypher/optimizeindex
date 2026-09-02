# Deploying OptimizeIndex to the Ubuntu server

Target: Hetzner box at 167.233.120.70 (nginx + PM2 + Postgres already on it).
App lives in `/opt/optimizeindex` (next to sujoodmats).
Domain assumed: optimizeindex.com — swap it everywhere if different.

## 0. One-time prerequisites

- DNS: `A` records for `optimizeindex.com` and `www.optimizeindex.com` → 167.233.120.70
- Node 20+ on the server (`node -v`), PM2 (`npm i -g pm2` if missing)

## 1. Get the code (on the server)

First time:

```bash
cd /opt
git clone -b <your-branch> <your-repo-url> optimizeindex
cd optimizeindex
```

Updates later: `cd /opt/optimizeindex && git pull`

## 2. Install and configure

```bash
cd /opt/optimizeindex
npm ci || npm install
```

Create `/opt/optimizeindex/.env` — the DB is on this same machine, so use
localhost (faster, and lets you firewall port 5432 later):

```bash
cat > .env << 'EOF'
DATABASE_URL="postgresql://myappuser:strongpassword@localhost:5432/optimizeindex?schema=public"
SESSION_SECRET="paste-the-output-of-the-command-below"

# Outbound mail for lead notifications. See the note below.
SMTP_HOST="mail.optimizeindex.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="ali@optimizeindex.com"
SMTP_PASS="the-mailbox-password"
MAIL_FROM="leads@optimizeindex.com"
EOF
```

`SESSION_SECRET` signs the admin session cookies for the proposal portal. The
server **refuses to start in production without it** rather than issue sessions
it cannot verify. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Rotating this value signs every admin out — that is how you force a logout
everywhere.

### Lead notification mail

Leads are emailed through our own SMTP server. If `SMTP_HOST`, `SMTP_USER`,
`SMTP_PASS` and `MAIL_FROM` are not all set, the server falls back to
FormSubmit, which needs a one-time activation click per recipient address and
is easy to miss — so check the boot log after starting:

```
[Mail] SMTP active: ali@optimizeindex.com@mail.optimizeindex.com:465 from leads@... -> ali@..., contact@...
```

If it instead says `SMTP NOT configured`, the environment did not load. Note
that `.env` is gitignored, so these values do **not** arrive with `git pull` —
they have to exist on the server.

`SMTP_SECURE` is optional and defaults to true on port 465 (implicit TLS),
false on 587 (STARTTLS). `MAIL_FROM` must be a mailbox the server is permitted
to send as, or mail is rejected or filed as spam.

Verify credentials without submitting a form — this connects and
authenticates but sends nothing:

```bash
npm run mail:test
npm run mail:test -- --send   # also delivers one test message
```

Recipients are set in `server.ts` (`LEAD_NOTIFY_OVERRIDES`): the towing
assessment form goes to ali@ and contact@, everything else to the default
inbox.

Build and prepare the database client:

```bash
npx prisma generate
npx prisma migrate deploy   # applies any pending migrations; safe to re-run
npm run build
```

## 3. Run under PM2

Port 3002 is set in `ecosystem.config.cjs` (3001 is taken by sujoodmats on
this server). If 3002 is also taken (`ss -ltnp | grep 3002`), change the port
there AND in the nginx conf.

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # prints a command — run it once so PM2 survives reboots
curl -s http://127.0.0.1:3002/api/health   # expect {"status":"ok","db":"up",...}
```

## 4. nginx site

> **Only copy this file on a first install, before certbot has ever run.**
>
> `certbot --nginx` edits `/etc/nginx/sites-available/optimizeindex.conf` in
> place: it adds the `listen 443 ssl` block and the certificate paths. The copy
> below overwrites that file with the repo's port-80-only version, so HTTPS
> stops answering and the site goes down — the certificate is untouched on disk,
> but nginx no longer knows about it.
>
> Check first:
> ```bash
> ls /etc/letsencrypt/live/ 2>/dev/null
> ```
> If that lists `optimizeindex.com`, **do not run the copy.** Apply whatever
> changed in the repo file by hand instead. If you copy it by mistake, recover
> with `certbot --nginx -d optimizeindex.com -d www.optimizeindex.com` and
> choose **1 (reinstall)** — not 2, which burns a rate-limited reissue.

```bash
cp /opt/optimizeindex/deploy/nginx-optimizeindex.conf /etc/nginx/sites-available/optimizeindex.conf
ln -s /etc/nginx/sites-available/optimizeindex.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Check: http://optimizeindex.com should load the site.

The gzip directives live inside the `server` block rather than at the top of the
file. At the top they land in the http context, where `gzip on` collides with
the one Debian/Ubuntu already sets in `nginx.conf`, and nginx refuses to start
with `"gzip" directive is duplicate`.

## 5. SSL certificate (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx   # skip if already installed
certbot --nginx -d optimizeindex.com -d www.optimizeindex.com
```

Choose the redirect option when asked. Certbot auto-renews via systemd timer
(`systemctl list-timers | grep certbot` to confirm).

## 6. After it's live

- UptimeRobot monitor → https://optimizeindex.com/api/health (alerts on DB
  failure too, since health returns 503 when degraded)
- Lock down Postgres now that the app uses localhost:
  ```bash
  ufw deny 5432/tcp
  ```
  NOTE: this cuts off local-dev access from your Windows machine. To keep dev
  access, allow only your home IP instead: `ufw allow from <your-ip> to any port 5432`
- Rotate the DB password (it leaked into chat/tooling):
  ```bash
  sudo -u postgres psql -c "ALTER USER myappuser WITH PASSWORD '<long-random>';"
  ```
  then update `.env` on the server (and locally) and `pm2 restart optimizeindex`.

## Updating the site later

```bash
cd /opt/optimizeindex
git pull
npm ci || npm install
npx prisma generate && npx prisma migrate deploy
npm run build
pm2 restart optimizeindex
```

## What `npm run build` does now

The site is **pre-rendered**, not a bare SPA. `npm run build` runs four steps:

1. `vite build` — client bundle
2. `vite build --ssr src/entry-server.tsx` — server bundle used only at build time
3. `tsx scripts/prerender.ts` — renders all 9 routes plus a 404 page to static
   HTML in `dist/`, and regenerates `dist/sitemap.xml`
4. `esbuild server.ts` — the Express server

Nothing extra to run on deploy — the existing `npm run build` covers it. But if
step 3 is skipped or fails, the site silently reverts to shipping an empty
`<div id="root">`, which is invisible to crawlers and to every AI assistant.
**After deploying, confirm the HTML actually has content:**

```bash
curl -s https://optimizeindex.com/ | grep -c "<h1"      # expect 1
curl -s https://optimizeindex.com/services | grep -o '<link rel="canonical"[^>]*>'
# expect .../services — NOT the homepage
curl -s -o /dev/null -w '%{http_code}\n' https://optimizeindex.com/no-such-page   # expect 404
```

Route metadata (titles, descriptions, canonicals, JSON-LD) lives in
`src/routes.ts`. Adding a page means adding it there — the prerenderer and the
sitemap both read from that list.

`npm run verify` scores the built output against the real audit checks in
`server/audit/checks.ts`. Run it before deploying; it fails the build on a
regression.

### Regenerating assets (rarely needed)

- `npm run fonts` — re-downloads the self-hosted fonts into `public/fonts/`
  and rewrites `src/fonts.css`. Only needed when the font list changes.
- `npm run images` — regenerates the derived logo sizes from `public/logo.png`.

Both outputs are committed, so normal builds never touch the network.

## Deploy gotcha: devDependencies

`npm run build` needs `tsx`, `esbuild`, `typescript` and `tailwindcss`, and all
four are devDependencies. If `NODE_ENV=production` is exported in the shell you
deploy from, npm sets `omit=dev` and skips them — the build then fails at the
prerender step. Your current shell doesn't set it (the old build already relied
on esbuild), but to be safe use:

```bash
npm ci --include=dev || npm install --include=dev
```

`sharp` is an optionalDependency — it's only used by `npm run images`, and a
failed native build there won't abort the install.

## Proposal portal

A private admin at `/admin` builds a personalized proposal for a prospect and
publishes it to a human-readable URL at the root — `optimizeindex.com/abc-logistics`.

**First-time setup on the server:**

```bash
npx prisma migrate deploy                       # creates the portal tables
npm run admin -- you@example.com "a long passphrase"
```

There is no sign-up page and no password-reset email; `npm run admin` is the
only way an account is created, and re-running it for an existing email resets
that password.

**Templates.** New proposals can start from a built-in vertical (flatbed,
towing, local delivery, dump truck), a fully filled-in worked example, or a
template you saved yourself from a proposal you had already built.

A saved template carries whatever you ticked when you saved it. That includes
the prospect-specific groups — contact details, call volumes, the projection and
its basis — because `Duplicate` has always copied an entire proposal anyway, so
withholding the same data here bought no safety and only made templates less
useful than the button beside them. The groups that describe one business rather
than how the agency works are flagged **About this company** in the save dialog
and in the picker: carrying them into a proposal for a different company means
checking them before it goes out. `validateForPublish` still refuses a
projection with no stated basis.

A template can also be applied to a draft that already exists — **Fill from a
template** in Step 5. By default it fills only empty fields; the overwrite
checkbox lets the template win everywhere.

The link (slug) is never carried by a template, in either direction.

**Two things that will bite you if missed:**

1. **`uploads/` must survive a deploy and must be backed up.** It holds every
   prospect logo and photo. It lives outside `dist/` deliberately, because
   `npm run build` empties `dist` — but a deploy that wipes the whole directory
   will still take the images with it. Nothing else in the repo references
   them, so a lost `uploads/` means broken images on every published proposal.

2. **The admin session cookie is `Secure`, so login requires HTTPS.** Until
   certbot has run (step 5), `/admin` will accept a password and then appear to
   do nothing — the browser refuses to store the cookie over plain HTTP. This
   is deliberate: a session cookie should not travel in the clear.

**nginx** needs `client_max_body_size 10m` (image uploads are sent as base64,
so the body is ~4/3 the file size) and a `/uploads/` location block. Both are
already in `deploy/nginx-optimizeindex.conf`.

**Privacy.** Proposal pages are served with `X-Robots-Tag: noindex, nofollow`,
`Cache-Control: private, no-store` and a matching meta tag, and never appear in
`sitemap.xml`. They are not secret — anyone with the link can read one — but
they will not be indexed. Google Analytics is deliberately stripped from these
pages so prospect names do not enter the marketing GA4 property.

## Search Console, Bing, and IndexNow

The towing pages are new URLs. Nothing below is required for the site to run,
but until it's done there is no way to tell whether the new pages are being
indexed at all.

**Verify the site in both.** There is currently no verification tag anywhere in
the repo, so this has to be done once:

- **Google Search Console** — verify by DNS TXT record (survives redeploys,
  unlike an HTML file), then submit `https://optimizeindex.com/sitemap.xml`.
- **Bing Webmaster Tools** — same, and it is not optional if AI visibility
  matters: ChatGPT search and Copilot both lean on Bing's index. Google Search
  Console tells you nothing about either.

**IndexNow** (optional, ~2 minutes) tells Bing about changed URLs immediately
rather than waiting for a re-crawl:

```bash
# Any 8-128 hex characters. Generate once, keep it.
INDEXNOW_KEY=$(openssl rand -hex 16)

# Writes public/<key>.txt (required for verification) and submits every
# indexable route from src/routes.ts.
INDEXNOW_KEY=$key npm run indexnow
```

Add `INDEXNOW_KEY` to the server `.env` and run `npm run indexnow` after
`npm run build` on deploys that change page content. The key file has to be
published at the site root, so the run that writes it must happen **before**
`npm run build` copies `public/` into `dist/`, or be followed by another build.
Without the variable set the script exits 0 and does nothing, so it is safe to
leave in a deploy script unconditionally. Google does not participate in
IndexNow — for Google, the sitemap is the mechanism.

**Verify after deploying:**

```bash
curl -sI https://optimizeindex.com/towing-companies | head -1        # 200
curl -sI https://optimizeindex.com/towing-companies/nevada | head -1 # 404, not 200
curl -s  https://optimizeindex.com/sitemap.xml | grep -c '<loc>'     # 15
# The AI crawlers must get the full pre-rendered page, not a shell:
curl -s -A "OAI-SearchBot" https://optimizeindex.com/towing-companies/california | grep -c "Rotation Tow"
```

## Pending

- ~~SSL / certbot has still not been run~~ — **done.** A certificate for
  `optimizeindex.com` and `www.optimizeindex.com` exists and renews on the
  systemd timer. This note was stale and cost an outage: it said certbot had not
  run, so step 4's `cp` was treated as safe, and it overwrote the `listen 443`
  block certbot had written. `certbot --nginx` → option **1 (reinstall)** put it
  back. See the warning on step 4 — that copy is a first-install-only step now.
- **`SESSION_SECRET`** must be added to the server's `.env` before deploying
  this build — without it the app will not start in production.
- ~~`prisma migrate deploy` for the proposal portal tables~~ — **done**.
  Migrations `20260826000000_proposal_portal` and `20260827000000_saved_templates`
  are both applied, and an admin account exists. Both were additive only: five
  new tables and one enum, with no change to `Lead`, `SiteAudit` or the
  analytics tables.
- **`uploads/` is not in git.** Proposal images live there and are referenced by
  rows in the database, so a deploy that does not carry the directory across
  leaves broken images on published proposals. Copy it to the server the first
  time (`scp uploads/*.webp …:/opt/optimizeindex/uploads/`), keep it out of any
  clean-checkout deploy step, and put it in your backups.
- **Search Console / Bing verification is not set up**, and no verification tag
  exists in the repo. See the section above. Until this is done the six new
  towing URLs cannot be monitored, and there is no way to see whether they are
  indexed.
- **`INDEXNOW_KEY`** is not set. Optional — see above. Without it `npm run
  indexnow` exits 0 and does nothing.
- **`PAGESPEED_API_KEY`** is not set. Without it Google rate-limits the
  PageSpeed endpoint hard enough that most visitors get no speed data.
- **nginx config changed** — `deploy/nginx-optimizeindex.conf` adds gzip types,
  a www → apex redirect block, `client_max_body_size 10m` and a `/uploads/`
  location. Copy it to the server and `nginx -t && systemctl reload nginx`.
  The gzip and redirect parts are optimisations (the app does the redirect
  itself), but **`client_max_body_size` is required** — without it every
  proposal image upload over ~750 KB fails with a 413 before reaching Node.
