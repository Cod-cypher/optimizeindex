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
assessment form, the chat widget and the towing setup form (/towing-onboarding) go to
ali@ and contact@, everything else to the default inbox.

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

In production the app listens on **127.0.0.1 only**, so port 3002 is not
reachable from outside the box and nginx is the single public entry point. Set
`HOST` in `.env` only if something genuinely needs another interface. The boot
log prints the address it bound to.

`dist/server.cjs` **refuses to start without `NODE_ENV=production`** (PM2's
`ecosystem.config.cjs` sets it). A bare `npm start` used to boot the dev
branch — Vite middleware with an SPA fallback, every path a 200 — so it now
exits with an error instead. For a one-off production run outside PM2:
`NODE_ENV=production PORT=3002 node dist/server.cjs`.

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

## 5a. One hop to https, nothing for unknown hosts

Two nginx changes, both applied **by hand** on a live box (see the warning on
step 4 — never copy `optimizeindex.conf` over the certbot-edited file):

1. **www block.** In `/etc/nginx/sites-available/optimizeindex.conf`, the
   `server_name www.optimizeindex.com` block's redirect must go straight to
   https:

   ```nginx
   return 301 https://optimizeindex.com$request_uri;
   ```

   It used to say `http://optimizeindex.com`, which made http://www a two-hop
   chain. If certbot added `listen 443 ssl` to that block, https://www gets
   the same single hop.

2. **Default server.** `deploy/nginx-default-server.conf` answers every
   request whose Host is not one of this box's sites — the bare IP, a stray
   domain — with no response on port 80 and a refused handshake on 443. It
   holds no certificate, so certbot never touches it and it can be copied:

   ```bash
   nginx -v                                                     # needs 1.19.4+ for ssl_reject_handshake
   grep -rn default_server /etc/nginx/sites-enabled/ /etc/nginx/conf.d/
   # If Ubuntu's stock site shows up (listen 80 default_server), remove it —
   # two default servers on one port fail nginx -t:
   rm /etc/nginx/sites-enabled/default
   cp /opt/optimizeindex/deploy/nginx-default-server.conf /etc/nginx/sites-available/00-default-server.conf
   ln -s /etc/nginx/sites-available/00-default-server.conf /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```

   It is server-wide, so it applies to sujoodmats too. If any site on this box
   is meant to answer on the bare IP, decide that before installing it.

The Node app backs both up: in production it 301s www to
`https://optimizeindex.com` directly, and 301s any Host other than the apex,
www and loopback to `https://optimizeindex.com`.

**Verify — each redirect is exactly one hop, straight to the https apex:**

```bash
c() { curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$@"; }
c http://www.optimizeindex.com/services     # 301 https://optimizeindex.com/services
c https://www.optimizeindex.com/services    # 301 https://optimizeindex.com/services
c http://optimizeindex.com/services         # 301 https://optimizeindex.com/services
# A foreign Host gets no site content:
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: example.com" http://167.233.120.70/   # 000 (empty reply)
curl -skI https://167.233.120.70/ ; echo "exit $?"                                       # handshake refused, non-zero exit
# Port 3002 is closed to the outside (run from another machine):
curl -s -m 5 -o /dev/null -w "%{http_code}\n" http://167.233.120.70:3002/api/health      # 000 (no connection)
```

If any of the first three prints a second redirect when followed
(`curl -sIL <url> | grep -i '^location'` shows two lines), a hop is still
chained.

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

## Chat widget

The assistant in the bottom-right corner. Three things it needs that a
`git pull` does not bring with it.

**`OPENAI_API_KEY` must be added to the server's `.env`.** Same trap as the SMTP
credentials above: `.env` is gitignored, so the key exists on your machine and
not on the server. Without it the widget still appears and still works — it
degrades to a contact form that posts to `/api/leads` — which means a missing
key looks like a design choice rather than a misconfiguration. The boot log is
how you tell:

```
[Chat] Assistant active: model=gpt-5.6-luna, handoff -> ali@optimizeindex.com
[Chat] OPENAI_API_KEY not set - widget runs in form mode
```

Optional overrides, all with working defaults: `OPENAI_MODEL`,
`OPENAI_REASONING_EFFORT`, `CHAT_ENABLED` (set `false` as a kill switch),
`CHAT_HANDOFF_EMAIL`, `CHAT_AGENT_LABEL`, `CHAT_MONTHLY_TOKEN_CAP`,
`CHAT_MAX_TURNS`. See `.env.example`.

**The nginx change must be applied by hand — do NOT copy the file.** The repo's
`deploy/nginx-optimizeindex.conf` gained a `location /chat/join/` block, but
copying it over would wipe the `listen 443` block certbot wrote, exactly as
described in the warning on step 4. Back up first
(`cp /etc/nginx/sites-available/optimizeindex.conf ~/optimizeindex.conf.bak`),
then add this by hand anywhere inside the server block that has
`listen 443 ssl` — right after its `server_name` line is easiest.

Position within the block does not matter: nginx selects the **longest matching
prefix**, not the first one in the file, so `/chat/join/` wins over `/`
wherever it sits. What does matter is that it lands in the 443 block and not
the port-80 redirect block.

```nginx
location /chat/join/ {
    access_log off;
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Then test and reload:

```bash
nginx -t                 # must say "syntax is ok" and "test is successful"
systemctl reload nginx
```

If `nginx -t` fails, do **not** reload — the running config is untouched until
you do, so a syntax error is harmless until then. Restore the backup and retry.

`access_log off` is the point of the block, not an optimisation. The join link
that lets a person enter a live conversation carries a bearer token **in the URL
path**, and nginx's default log format writes the full path — so without this,
every join link sits in `/var/log/nginx/access.log` in plaintext, readable by
anyone with server access and swept up by any log shipper.

Verify it after reloading:

```bash
curl -s https://optimizeindex.com/chat/join/notarealtoken > /dev/null
tail -5 /var/log/nginx/access.log | grep -c notarealtoken   # expect 0
```

**Migrations.** `20260910000000_chat_area`, `20260910120000_chat_started_email`
and `20260910130000_chat_presence_resume` ship with this. All three only add
nullable columns and none touches an existing table, so they are safe to apply
while the site is serving. Until they are applied the widget stays in form mode,
because the generated Prisma client asks for columns the database does not have.

### Visitor presence and conversations that outlive the tab

Nothing to configure — no new environment variable and **no nginx change**. The
two new endpoints (`/api/chat/:id/resume` and `/api/chat/:id/away`) sit under
`/api`, which the existing `location /` block already proxies. Do not copy the
nginx conf for this deploy; see the warning on step 4.

Two things to know when reading the logs after this goes out:

- A conversation now survives the browser being closed, for seven days, and is
  resumed with a re-signed token on each return. So `[Chat] Chat-resumed email
  sent for conversation …` is a returning visitor, not a new one, and it is
  debounced to at most one per two hours per conversation.
- `[Chat] Visitor-left email sent for conversation …` fires at most once per
  conversation, and only when nobody had joined. It is deliberately delayed by a
  grace period rather than sent the instant the page closes, because `pagehide`
  also fires on an ordinary hard navigation.

Both notifications refresh the join link, so the most recent email always has a
working one.

**Presence is per-process state**, like the rate limiters — another reason
`instances` in `ecosystem.config.cjs` must stay at 1. At two instances a poll
served by the wrong process sees no heartbeat and mails that the visitor left
while they are still typing.

### Checking it works

```bash
pm2 logs optimizeindex --lines 30 | grep '\[Chat\]'
```

Then open the site, send one message, and confirm an email arrives at
`ali@optimizeindex.com` with a working join link. A chat-started notification
goes out on the **first message of every conversation**, so this is also the
thing to watch if the inbox starts feeling noisy — the guard is
`startedEmailSentAt`, one per conversation, never one per message.

## What `npm run build` does now

The site is **pre-rendered**, not a bare SPA. `npm run build` runs four steps:

1. `vite build` — client bundle
2. `vite build --ssr src/entry-server.tsx` — server bundle used only at build time
3. `tsx scripts/prerender.ts` — renders every route in `src/routes.ts` plus a
   404 page to static HTML in `dist/client/`, and regenerates
   `dist/client/sitemap.xml` (each `<lastmod>` from the route's own `updated`
   date; the step fails if an indexable route has none)
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

**One URL per page.** Every other form of a page's address must redirect to the
clean path in one hop, or answer 404 when it is not a page at all. Each line
prints the status and, for a redirect, where it goes:

```bash
c() { curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$@"; }
c https://optimizeindex.com/index.html            # 301 https://optimizeindex.com/
c https://optimizeindex.com/services/index.html   # 301 https://optimizeindex.com/services
c https://optimizeindex.com//services             # 301 https://optimizeindex.com/services
c https://optimizeindex.com/services/             # 301 https://optimizeindex.com/services
c https://optimizeindex.com/404.html              # 404
c https://optimizeindex.com/app-shell.html        # 404
c https://optimizeindex.com/sms-program.          # 301 https://optimizeindex.com/sms-program  (Twilio's consent check needs this)
```

Uploaded proposal images carry `X-Robots-Tag: noindex` (pick any file in
`uploads/`):

```bash
curl -sI https://optimizeindex.com/uploads/<file>.webp | grep -i '^x-robots-tag'   # x-robots-tag: noindex
```

Fonts are cached for a year as immutable:

```bash
curl -sI https://optimizeindex.com/fonts/bricolage-grotesque-200-800-normal-latin.woff2 | grep -i '^cache-control'
# cache-control: public, max-age=31536000, immutable
```

`sitemap.xml` carries each page's own `updated` date as `<lastmod>` (set by
hand from git history in `src/routes.ts` and the content files) and no
`<priority>`, which Google and Bing ignore:

```bash
curl -s https://optimizeindex.com/sitemap.xml | grep -c '<priority>'   # 0
curl -s https://optimizeindex.com/sitemap.xml | grep -m3 '<lastmod>'   # each page's own updated date, not the build date
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
- `npm run images` — regenerates the derived logo sizes, the favicons
  (`favicon-48.png`, `favicon-192.png`, `favicon.ico`) and the `og-card.png`
  share card from `public/logo.png`. Needs the optional `sharp` dependency.
- A changed font must ship under a **new filename**: `/fonts/` is cached for a
  year as immutable. `npm run fonts` refuses to overwrite a file whose bytes
  changed; bump `FONT_FILE_VERSION` in `scripts/fetch-fonts.ts` and update the
  preload href in `index.html`.

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
curl -s  https://optimizeindex.com/sitemap.xml | grep -c '<loc>'     # 16
curl -sI https://optimizeindex.com/about | head -1                   # 200
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
  PageSpeed endpoint hard enough that most visitors get no speed data. Set it
  in the server `.env` and `pm2 restart optimizeindex`; the audit FAQ already
  promises PageSpeed data.
- **nginx config changed** — `deploy/nginx-optimizeindex.conf` adds gzip types,
  a www → apex redirect block, `client_max_body_size 10m` and a `/uploads/`
  location. **Apply the differences by hand** — the live file carries certbot's
  `listen 443` block, and copying the repo file over it takes HTTPS down (see
  the warning on step 4). Then `nginx -t && systemctl reload nginx`.
  The gzip and redirect parts are optimisations (the app does the redirect
  itself), but **`client_max_body_size` is required** — without it every
  proposal image upload over ~750 KB fails with a 413 before reaching Node.
- **www redirect target and the default server** (step 5a) — the www block
  now redirects to `https://` in one hop, and
  `deploy/nginx-default-server.conf` is new. Neither is applied on the server
  yet, and the single-hop and foreign-Host curls in 5a have not been run.
- **The live post-certbot nginx config is not in the repo.** Copy
  `/etc/nginx/sites-available/optimizeindex.conf` from the server into
  `deploy/` under a different name (for example
  `deploy/nginx-optimizeindex.live.conf`) so the 443 block can be reviewed.
  Never copy in the other direction.
- **Field Core Web Vitals** — the tracker now sends LCP, INP and CLS as
  `web_vital` events, stored in the existing `Event` table (no migration).
  The 75th percentile per landing page and device over 28 days is at
  `/admin/vitals`. It shows nothing until visitors load pages on the live site.
