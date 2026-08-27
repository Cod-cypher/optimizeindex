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
 *   INDEXNOW_KEY=<key> npm run indexnow          # every indexable route
 *   INDEXNOW_KEY=<key> npm run indexnow -- /towing-companies /audit
 *
 * The key is any 8-128 character hex string you choose. It must also be served
 * as a text file at the site root containing exactly the key — this script
 * writes that file into public/ so the build publishes it. No key, no ping:
 * the script exits 0 without doing anything, so a deploy that has not set one
 * is not a failed deploy.
 */

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

  // The verification file has to be reachable at the root, or the endpoint
  // rejects every submission as unauthorised.
  const keyFile = path.join(process.cwd(), 'public', `${key}.txt`);
  await fs.writeFile(keyFile, key, 'utf-8');
  console.log(`[indexnow] wrote public/${key}.txt`);

  const explicit = process.argv.slice(2).filter((a) => a.startsWith('/'));
  const paths = explicit.length
    ? explicit
    : ROUTES.filter((r) => !r.noindex && r.priority != null).map((r) => r.path);

  const urlList = paths.map((p) => `${SITE_ORIGIN}${p}`);
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

main().catch((err) => {
  console.warn('[indexnow] failed, continuing anyway:', err?.message ?? err);
});
