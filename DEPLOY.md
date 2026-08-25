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
EOF
```

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

```bash
cp /opt/optimizeindex/deploy/nginx-optimizeindex.conf /etc/nginx/sites-available/optimizeindex.conf
ln -s /etc/nginx/sites-available/optimizeindex.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Check: http://optimizeindex.com should load the site.

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

## Pending

- **`prisma migrate deploy`** still needs to run for the `SiteAudit` table and
  the `Lead.auditId` column (migration `20260825000000_site_audit`). Until then
  the homepage audit tool works but persists nothing.
- **`PAGESPEED_API_KEY`** is not set. Without it Google rate-limits the
  PageSpeed endpoint hard enough that most visitors get no speed data.
- **nginx config changed** — `deploy/nginx-optimizeindex.conf` now adds gzip
  types and a www → apex redirect block. Copy it to the server and
  `nginx -t && systemctl reload nginx` to apply. The app performs the same
  redirect itself, so this is an optimisation rather than a requirement.
