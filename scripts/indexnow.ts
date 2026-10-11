/**
 * IndexNow ping.
 *
 * Tells Bing (and the other participating engines) that URLs changed, instead
 * of waiting to be re-crawled. This matters here more than it looks: ChatGPT
 * search and Copilot both lean on Bing's index, so Bing discovery latency is
 * AI-answer latency. Google does not participate in IndexNow — for Google, the
 * sitemap written by scripts/prerender.ts is the mechanism.
 *
 * Usage:
 *   INDEXNOW_KEY=<key> npm run indexnow -- --dry-run   # show what would be sent
 *   INDEXNOW_KEY=<key> npm run indexnow                # every indexable route
 *   INDEXNOW_KEY=<key> npm run indexnow -- /towing-companies /audit
 *
 * The key is any 8-128 character hex string you choose. It must also be served
 * as a text file at the site root containing exactly the key — this script
 * writes that file into public/ so the build publishes it. No key, no ping:
 * the script exits 0 without doing anything, so a deploy that has not set one
 * is not a failed deploy.
 *
 * Changed pages only: `npm run indexnow -- --since 2026-10-01` submits just the
 * routes whose `updated` date (RouteMeta.updated, set from git history) is on
 * or after that date. Paths passed alongside it are added to the list, which
 * is how a removed URL gets pinged. Combine with --dry-run to see the list.
 */

// Loads .env, so INDEXNOW_KEY can live there rather than being passed inline
// on every run. DEPLOY.md documents putting it in .env; without this the script
// silently reported "not set" and did nothing, which looked like success.
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROUTES, SITE_ORIGIN } from '../src/routes';

const HOST = new URL(SITE_ORIGIN).host;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

async function main() {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    console.log('[indexnow] INDEXNOW_KEY is not set — skipping. This is not an error.');
    return;
  }

  if (!/^[a-fA-F0-9-]{8,128}$/.test(key)) {
    throw new Error('[indexnow] INDEXNOW_KEY must be 8-128 hex characters (dashes allowed).');
  }

  const dryRun = process.argv.includes('--dry-run');
  const args = process.argv.slice(2);
  const since = readSince(args);
  const explicit = args.filter((a) => a.startsWith('/'));
  const indexable = ROUTES.filter((r) => !r.noindex && r.priority != null);

  // --since <date>: only the routes whose `updated` falls on or after that date,
  // plus any paths passed explicitly (a removed URL, which has no route left to
  // carry a date). Without it, explicit paths replace the list, and with
  // neither, every indexable route is sent.
  let paths: string[];
  if (since) {
    const changed = indexable.filter((r) => updatedOnOrAfter(r.updated, since)).map((r) => r.path);
    paths = [...new Set([...changed, ...explicit])];
    console.log(`[indexnow] --since ${since}: ${changed.length} route(s) updated on or after it, ${explicit.length} explicit path(s)`);
  } else {
    paths = explicit.length ? explicit : indexable.map((r) => r.path);
  }

  if (paths.length === 0) {
    console.log('[indexnow] nothing to submit.');
    return;
  }

  const urlList = paths.map((p) => `${SITE_ORIGIN}${p}`);

  if (dryRun) {
    console.log(`[indexnow] DRY RUN — nothing written, nothing submitted.`);
    console.log(`[indexnow] would write public/${key}.txt`);
    console.log(`[indexnow] would send ${urlList.length} URLs:`);
    for (const u of urlList) console.log(`  ${u}`);
    console.log(`[indexnow] host=${HOST} keyLocation=${SITE_ORIGIN}/${key}.txt`);
    return;
  }

  // The verification file has to be reachable at the site root, or the endpoint
  // rejects every submission as unauthorised. Written here rather than earlier
  // so --dry-run leaves no stray key file behind in public/.
  const keyFile = path.join(process.cwd(), 'public', `${key}.txt`);
  await fs.writeFile(keyFile, key, 'utf-8');
  console.log(`[indexnow] wrote public/${key}.txt`);

  console.log(`[indexnow] submitting ${urlList.length} URLs for ${HOST}`);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key,
      keyLocation: `${SITE_ORIGIN}/${key}.txt`,
      urlList,
    }),
  });

  // 200 accepted, 202 accepted but key still being validated. Anything else is
  // worth seeing, but a failed ping should never fail a deploy — the sitemap
  // still exists and normal crawling still happens.
  if (res.status === 200 || res.status === 202) {
    console.log(`[indexnow] accepted (HTTP ${res.status})`);
    return;
  }
  console.warn(`[indexnow] endpoint returned HTTP ${res.status}: ${await res.text()}`);
}

/**
 * Reads `--since 2026-10-01` or `--since=2026-10-01`. Accepts a date
 * (YYYY-MM-DD) or a full ISO 8601 date-time. Throws on anything else rather
 * than silently submitting every route.
 */
function readSince(args: string[]): string | null {
  let value: string | undefined;
  const idx = args.indexOf('--since');
  if (idx !== -1) value = args[idx + 1];
  const inline = args.find((a) => a.startsWith('--since='));
  if (inline) value = inline.slice('--since='.length);
  if (idx === -1 && !inline) return null;
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T.+)?$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error('[indexnow] --since needs a date, e.g. --since 2026-10-01 or --since 2026-10-01T00:00:00+05:00');
  }
  return value;
}

/**
 * A route counts as changed when its `updated` (RouteMeta.updated, from git
 * history) is on or after `since`. A bare date is compared against the date
 * part of `updated` as written, so "--since 2026-09-22" includes a page
 * updated at 2026-09-22T05:45:22+05:00. A full date-time is compared as an
 * instant. A route with no `updated` is never included by --since.
 */
function updatedOnOrAfter(updated: string | undefined, since: string): boolean {
  if (!updated) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(since)) return updated.slice(0, 10) >= since;
  return Date.parse(updated) >= Date.parse(since);
}

main().catch((err) => {
  console.warn('[indexnow] failed, continuing anyway:', err?.message ?? err);
});
