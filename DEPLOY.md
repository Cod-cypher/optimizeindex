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

Port 3001 is set in `ecosystem.config.cjs`. If something already listens on
3001 (`ss -ltnp | grep 3001`), change the port there AND in the nginx conf.

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # prints a command — run it once so PM2 survives reboots
curl -s http://127.0.0.1:3001/api/health   # expect {"status":"ok","db":"up",...}
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
