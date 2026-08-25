/**
 * Verifies the built site against the real audit checks.
 *
 * This imports runChecks() from server/audit/checks.ts — the exact code the
 * public tool runs — rather than reimplementing the rules. If a check is
 * failing here it is failing for a visitor too.
 *
 * The scanner refuses to fetch localhost by design, so instead of going over
 * the network we load each pre-rendered HTML file directly and hand it to the
 * same check functions.
 *
 * Note on scope: the Technical category depends on live-origin facts (TLS,
 * redirects, the www host). Those are supplied here from the local artefacts
 * that will produce them in production and are labelled as asserted, not
 * measured. Content and GEO are graded purely off the HTML and are therefore
 * fully trustworthy from here. The live scan after deploy is the real proof.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import * as cheerio from 'cheerio';
import { runChecks, parseRobots, overallScore, type ScanContext } from '../server/audit/checks';
import { ROUTES, SITE_ORIGIN } from '../src/routes';

const DIST = path.join(process.cwd(), 'dist', 'client');

let failures = 0;
function check(ok: boolean, msg: string) {
  if (!ok) {
    console.log(`  FAIL  ${msg}`);
    failures += 1;
  }
}

function fileFor(routePath: string): string {
  if (routePath === '/') return path.join(DIST, 'index.html');
  return path.join(DIST, routePath.slice(1), 'index.html');
}

async function buildContext(routePath: string, html: string): Promise<ScanContext> {
  const robotsTxt = await fs.readFile(path.join(DIST, 'robots.txt'), 'utf-8');
  const sitemapXml = await fs.readFile(path.join(DIST, 'sitemap.xml'), 'utf-8');
  const llms = await fs
    .readFile(path.join(DIST, 'llms.txt'), 'utf-8')
    .then((t) => t.trim().length > 0)
    .catch(() => false);

  const finalUrl = new URL(`${SITE_ORIGIN}${routePath}`);

  return {
    requestedUrl: finalUrl,
    finalUrl,
    domain: finalUrl.hostname.replace(/^www\./, ''),
    status: 200,
    redirects: 0,
    html,
    $: cheerio.load(html),
    headers: {},
    // Asserted from production config, not measured locally — see header note.
    servedOverHttps: true,
    httpUpgradesToHttps: true,
    wwwConsolidated: true,
    robots: parseRobots(robotsTxt, true),
    sitemap: {
      found: true,
      url: `${SITE_ORIGIN}/sitemap.xml`,
      urlCount: (sitemapXml.match(/<loc>/g) || []).length,
    },
    llmsTxt: llms,
  };
}

async function main() {
  console.log('\n=== Audit categories, scored by the real checks ===\n');

  const homeHtml = await fs.readFile(fileFor('/'), 'utf-8');
  const categories = runChecks(await buildContext('/', homeHtml));

  for (const cat of categories) {
    console.log(`[${cat.label}] ${cat.score}/100`);
    for (const c of cat.checks) {
      const mark = { pass: 'PASS', warn: 'WARN', fail: 'FAIL', unknown: '----' }[c.status];
      if (c.status !== 'pass') console.log(`   ${mark}  ${c.label}: ${c.detail}`);
    }
    check(cat.score === 100, `${cat.label} is ${cat.score}/100, expected 100`);
  }
  console.log(`\nOverall (3 categories, no PageSpeed): ${overallScore(categories)}/100\n`);

  console.log('=== Per-route head and structure ===\n');
  const seenTitles = new Set<string>();
  const seenDescriptions = new Set<string>();

  for (const route of ROUTES) {
    const html = await fs.readFile(fileFor(route.path), 'utf-8');
    const $ = cheerio.load(html);
    const label = route.path.padEnd(32);

    const title = ($('head title').text() || '').trim();
    const desc = ($('meta[name="description"]').attr('content') || '').trim();
    const canonical = ($('link[rel="canonical"]').attr('href') || '').trim();
    const h1s = $('h1');
    const words = $('body').text().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;

    check(title.length >= 30 && title.length <= 60, `${label} title is ${title.length} chars: "${title}"`);
    check(desc.length >= 70 && desc.length <= 160, `${label} description is ${desc.length} chars`);
    check(canonical === `${SITE_ORIGIN}${route.path}`, `${label} canonical is "${canonical}", expected "${SITE_ORIGIN}${route.path}"`);
    check(h1s.length === 1, `${label} has ${h1s.length} h1 elements, expected exactly 1`);
    check(words >= 300, `${label} has only ${words} words of rendered text`);
    check(!seenTitles.has(title), `${label} title is a duplicate of another route`);
    check(!seenDescriptions.has(desc), `${label} description is a duplicate of another route`);
    check(html.includes('data-prerendered="true"'), `${label} is not marked pre-rendered`);
    seenTitles.add(title);
    seenDescriptions.add(desc);

    // Heading levels must not skip (h1 -> h3), or the outline is broken.
    const levels = $('h1,h2,h3,h4,h5,h6')
      .toArray()
      .map((el) => Number(('tagName' in el ? el.tagName : 'h1').slice(1)));
    let prev = levels[0] ?? 1;
    let skip: string | null = null;
    for (const lvl of levels) {
      if (lvl > prev + 1) skip = `h${prev} -> h${lvl}`;
      prev = lvl;
    }
    check(skip === null, `${label} skips a heading level (${skip})`);

    console.log(`  ${label} ${String(words).padStart(5)}w  h1=${h1s.length}  title=${title.length}  desc=${desc.length}`);
  }

  console.log('\n=== 404 page ===\n');
  const notFound = await fs.readFile(path.join(DIST, '404.html'), 'utf-8');
  const $nf = cheerio.load(notFound);
  check($nf('meta[name="robots"]').attr('content')?.includes('noindex') ?? false, '404 page is missing noindex');
  check($nf('h1').length === 1, `404 page has ${$nf('h1').length} h1 elements`);
  check(!notFound.includes('goal-pill-'), '404 page is rendering homepage content');
  console.log('  404.html: noindex set, distinct from homepage');

  if (failures > 0) {
    console.log(`\n${failures} FAILURES\n`);
    process.exit(1);
  }
  console.log('\nALL PASS\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
