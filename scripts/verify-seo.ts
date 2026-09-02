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
import { existsSync } from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import * as cheerio from 'cheerio';
import {
  runChecks,
  parseRobots,
  overallScore,
  robotsAllows,
  type ScanContext,
} from '../server/audit/checks';
import { ROUTES, SITE_ORIGIN, TOWING_BASE, TOWING_JOBS_PATH, CONTACT_PHONE } from '../src/routes';
import { isReservedSlug } from '../server/proposals/slug';

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

  await checkSitemap();
  await checkRobots();
  await checkLlmsTxt();
  await checkTowing();

  if (failures > 0) {
    console.log(`\n${failures} FAILURES\n`);
    process.exit(1);
  }
  console.log('\nALL PASS\n');
}


/* -------------------------------------------------------------------------
   Sitemap

   dist/client/sitemap.xml is generated by scripts/prerender.ts from ROUTES.
   There used to be a second, hand-maintained public/sitemap.xml checked into
   the repo as a "fallback"; it was deleted because it had drifted to nine
   stale URLs with no <lastmod>, still listed /case-study/ecoclean-services
   (which 404s), and knew nothing about the towing pages. Vite copies public/
   into dist before the prerender step overwrites it, so the correct file did
   win every full build — but a `vite build` without the prerender step would
   have published a sitemap advertising a 404 to Google, silently.

   One generated file, and these assertions instead of a second copy.
------------------------------------------------------------------------- */

async function checkSitemap() {
  console.log('\n=== Sitemap ===\n');

  const xml = await fs.readFile(path.join(DIST, 'sitemap.xml'), 'utf-8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const expected = ROUTES.filter((r) => !r.noindex && r.priority != null).map(
    (r) => `${SITE_ORIGIN}${r.path}`,
  );

  for (const url of expected) {
    check(locs.includes(url), `sitemap is missing ${url}`);
  }
  for (const url of locs) {
    check(expected.includes(url), `sitemap lists ${url}, which is not an indexable route`);
  }

  // A URL in the sitemap that has no pre-rendered file would be submitted to
  // Google as a 404 — exactly what the deleted fallback file was doing.
  for (const url of locs) {
    const routePath = url.slice(SITE_ORIGIN.length) || '/';
    check(
      existsSync(fileFor(routePath)),
      `sitemap lists ${url} but no pre-rendered page exists for it`,
    );
  }

  // noindex routes must never appear.
  check(
    !locs.some((u) => u.endsWith('/404')),
    'sitemap contains the 404 route, which is noindex',
  );

  const withLastmod = (xml.match(/<lastmod>/g) || []).length;
  check(
    withLastmod === locs.length,
    `${locs.length - withLastmod} of ${locs.length} sitemap entries have no <lastmod>`,
  );

  console.log(`  ${locs.length} URLs, all pre-rendered, all with <lastmod>`);
}

/* -------------------------------------------------------------------------
   robots.txt

   Hand-maintained in public/, and it names paths. The failure mode that
   matters is subtle: robots.txt groups are not additive. A crawler obeys only
   the most specific group matching its name, so adding a named group for
   GPTBot that says `Allow: /` and nothing else silently grants GPTBot the
   admin app that the wildcard group denies. That is not visible by reading the
   file unless you already know the rule, which is exactly why it is asserted.
------------------------------------------------------------------------- */

const NAMED_CRAWLERS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'Bingbot',
  'Googlebot',
  'Google-Extended',
  'Applebot',
  'Applebot-Extended',
  'CCBot',
];

async function checkRobots() {
  console.log('\n=== robots.txt ===\n');

  const text = await fs.readFile(path.join(DIST, 'robots.txt'), 'utf-8');
  const robots = parseRobots(text, true);

  check(
    robots.sitemaps.includes(`${SITE_ORIGIN}/sitemap.xml`),
    `robots.txt does not point at ${SITE_ORIGIN}/sitemap.xml (found: ${robots.sitemaps.join(', ') || 'none'})`,
  );

  // Every indexable route must be crawlable by every agent we name, plus the
  // wildcard. A route that ships blocked is invisible however good it is.
  const indexable = ROUTES.filter((r) => !r.noindex && r.priority != null).map((r) => r.path);
  for (const agent of ['*', ...NAMED_CRAWLERS]) {
    for (const routePath of indexable) {
      check(
        robotsAllows(text, agent, routePath),
        `robots.txt disallows ${routePath} for ${agent}`,
      );
    }
    // And the admin app must stay closed for all of them.
    check(
      !robotsAllows(text, agent, '/admin'),
      `robots.txt allows /admin for ${agent} — a named group needs its own Disallow, groups are not additive`,
    );
  }

  console.log(
    `  sitemap referenced; ${indexable.length} routes crawlable and /admin blocked for * and ${NAMED_CRAWLERS.length} named crawlers`,
  );
}

/* -------------------------------------------------------------------------
   llms.txt

   Also hand-maintained, also names URLs. Two ways it rots: a link to a page
   that no longer exists, and a new page nobody remembered to add. Both are
   cheap to assert and neither is visible by eye once the file is long.
------------------------------------------------------------------------- */

async function checkLlmsTxt() {
  console.log('\n=== llms.txt ===\n');

  const text = await fs.readFile(path.join(DIST, 'llms.txt'), 'utf-8');
  // Split rather than a regex built by interpolation. The first attempt used
  // new RegExp(`${SITE_ORIGIN}(/[^)\s]*)`), where the template literal ate the
  // backslash and left the class as [^)s] — every path silently truncated at
  // its first "s", and the check reported six real pages as missing. Splitting
  // on the origin has no escaping surface at all.
  const linked = new Set<string>();
  for (const chunk of text.split(SITE_ORIGIN).slice(1)) {
    const m = chunk.match(/^[A-Za-z0-9/_.-]*/);
    if (!m) continue;
    linked.add(m[0].replace(/\/+$/, '') || '/');
  }

  const indexable = ROUTES.filter((r) => !r.noindex && r.priority != null).map((r) => r.path);

  // Every URL it names must be a real, indexable route.
  for (const url of linked) {
    const routePath = url === '' ? '/' : url;
    check(
      indexable.includes(routePath),
      `llms.txt links ${SITE_ORIGIN}${url}, which is not an indexable route`,
    );
  }

  // Every route must be named. The homepage is exempt: llms.txt describes the
  // site itself at the top rather than linking to it.
  for (const routePath of indexable) {
    if (routePath === '/') continue;
    check(linked.has(routePath), `llms.txt does not mention ${routePath}`);
  }

  console.log(`  ${linked.size} linked URLs checked against ${indexable.length} indexable routes`);
}

/* -------------------------------------------------------------------------
   Towing vertical guardrails

   The towing pages are generated from one component over a list of states in
   src/content/towing.ts. That is efficient, and it is also exactly the shape
   that becomes a doorway-page problem if the content ever stops being written
   and starts being filled in. These checks make that visible at build time
   rather than in a manual review nobody schedules.
------------------------------------------------------------------------- */

/** Word shingles, for comparing two pages' main content. */
function shingles(text: string, n = 5): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(' '));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared += 1;
  return shared / (a.size + b.size - shared);
}

async function checkTowing() {
  // /towing-jobs and its cluster are included explicitly. They are part of this
  // vertical but sit at the root rather than under TOWING_BASE, so a single
  // path-prefix filter would let them escape every guardrail below — including
  // the similarity pool, which is the one that matters most for pages this
  // close in topic to each other and to the pillar.
  const towingRoutes = ROUTES.filter(
    (r) =>
      r.path === TOWING_BASE ||
      r.path.startsWith(`${TOWING_BASE}/`) ||
      r.path === TOWING_JOBS_PATH ||
      r.path.startsWith(`${TOWING_JOBS_PATH}/`),
  );
  if (towingRoutes.length === 0) return;

  console.log('\n=== Towing vertical ===\n');

  // A single-segment marketing route shadows the proposal portal's namespace:
  // server.ts resolves /<slug> against the Proposal table and pageFor() wins,
  // so a proposal slugged the same as a route would be permanently unreachable.
  // server/proposals/slug.ts builds its reserved set from ROUTES, so this
  // should hold automatically. Asserted anyway: if that derivation ever breaks,
  // a proposal could take /towing-companies and become permanently unreachable
  // behind the marketing page, which pageFor() serves first.
  const singleSegment = ROUTES.map((r) => r.path)
    .filter((p) => /^\/[a-z0-9][a-z0-9-]*$/.test(p))
    .map((p) => p.slice(1));
  for (const slug of singleSegment) {
    check(isReservedSlug(slug), `"${slug}" is a route but not a reserved proposal slug`);
  }
  console.log(`  ${singleSegment.length} single-segment routes, all reserved against proposal slugs`);

  const bodies = new Map<string, Set<string>>();

  for (const route of towingRoutes) {
    const html = await fs.readFile(fileFor(route.path), 'utf-8');
    const $ = cheerio.load(html);
    const label = route.path.padEnd(32);

    // Main content only. Nav and footer are identical on every page of the site
    // by design, so comparing whole documents would score legitimately distinct
    // pages as near-duplicates and make the check useless.
    const main = $('main').text().replace(/\s+/g, ' ').trim();
    const words = main.split(' ').filter(Boolean).length;

    // Higher floor than the 300 applied sitewide: a generated page carries a
    // heavier burden of proof that it deserved to exist at all.
    check(words >= 700, `${label} main content is ${words} words, expected >= 700`);

    // The entire funnel for this vertical is the phone call. A towing page with
    // no tap-to-call has no conversion path on it.
    const telLinks = $(`a[href="tel:${CONTACT_PHONE}"]`).length;
    check(telLinks > 0, `${label} has no tap-to-call link`);

    // Every state page targets a comparison query, so every state page owes
    // the reader an evaluation framework. A page that names the query and then
    // only sells is the thing this whole approach is trying not to be.
    // Was `route.path !== TOWING_BASE`, which meant "not the pillar, therefore
    // a state page". That stopped being true once /towing-jobs joined the pool,
    // so the two things it was standing in for are now named separately.
    const isState = route.path.startsWith(`${TOWING_BASE}/`);
    const hasGuide = /How to Choose an AI Agency for a Towing Company in /.test(html);
    if (isState) check(hasGuide, `${label} has no buyer's-guide section`);

    // Unsupported superlative self-claims. The pages are allowed to name the
    // "best" query as their topic; they are not allowed to answer it with
    // themselves. Anything here is a claim we cannot substantiate.
    const bodyText = $('main').text().replace(/\s+/g, ' ');
    for (const phrase of [
      '#1 ai',
      'officially the best',
      'no other agency',
      'we are the best',
      "we're the best",
      'guaranteed ranking',
      'guaranteed results',
      'number one ai',
    ]) {
      check(
        !bodyText.toLowerCase().includes(phrase),
        `${label} contains an unsupported self-claim: "${phrase}"`,
      );
    }

    // H1 must match the title's leading clause wherever a route sets one, or
    // the page promises the searcher one thing and delivers another.
    const h1 = $('h1').text().replace(/\s+/g, ' ').trim();
    const titleLead = (route.title || '').split('|')[0].trim();
    // Every page that targets its H1 as the query owes the searcher the same
    // words it promised in the SERP. The pillar is exempt because its H1 and
    // title are independent by design — see the comment in TowingPillarPage.
    const requiresH1Match =
      isState ||
      route.path === TOWING_JOBS_PATH ||
      route.path.startsWith(`${TOWING_JOBS_PATH}/`);
    if (requiresH1Match) {
      check(
        h1 === titleLead,
        `${label} h1 "${h1}" does not match title lead "${titleLead}"`,
      );
    }

    bodies.set(route.path, shingles(main));
    console.log(`  ${label} ${String(words).padStart(5)}w main  tel=${telLinks}  guide=${isState ? (hasGuide ? 'yes' : 'NO') : '-'}`);
  }

  // Pairwise similarity. Deliberately a review trigger rather than a hard SEO
  // truth: Google has never published a duplication threshold, and no fixed
  // percentage separates a good landing page from a doorway page. 70% means a
  // human should read both pages before shipping; 85% is near-duplication that
  // no legitimately distinct pair reaches.
  const paths = [...bodies.keys()];
  let worst = 0;
  console.log('');
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      const score = jaccard(bodies.get(paths[i])!, bodies.get(paths[j])!);
      worst = Math.max(worst, score);
      const pct = (score * 100).toFixed(1);
      if (score >= 0.85) {
        check(false, `${paths[i]} and ${paths[j]} are ${pct}% similar (>= 85%, near-duplicate)`);
      } else if (score >= 0.7) {
        console.log(`  WARN  ${paths[i]} vs ${paths[j]}: ${pct}% similar - read both before shipping`);
      }
    }
  }
  console.log(`  highest pairwise similarity: ${(worst * 100).toFixed(1)}%  (warn 70%, fail 85%)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
