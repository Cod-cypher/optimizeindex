/**
 * Build-time pre-rendering.
 *
 * Runs after `vite build` (client) and `vite build --ssr` (server), and turns
 * every route in src/routes.ts into a static HTML file with real content in
 * it. Before this, the site shipped an empty <div id="root"> — crawlers and
 * every AI assistant saw a blank page.
 *
 * Also emits sitemap.xml from the same route list, so the sitemap can't drift
 * out of sync with what actually exists.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
// Only dist/client is served to the public; the SSR bundle stays outside it.
const DIST = path.join(ROOT, 'dist', 'client');
const SSR_ENTRY = path.join(ROOT, 'dist', 'ssr', 'entry-server.js');

const HEAD_BLOCK = /<!--app-head-->[\s\S]*?<!--\/app-head-->/;
const APP_HTML = '<!--app-html-->';

/*
 * Note on inlining the stylesheet: tried and reverted.
 *
 * Removing the render-blocking <link> looks like a win on paper, but these
 * pages already ship 60-90 KB of pre-rendered HTML, and folding another 53 KB
 * of Tailwind into every one of them made the document itself the bottleneck —
 * measured FCP went from 3.8s to 4.1s. The separate stylesheet costs one round
 * trip and stays cached across navigations. Left as a <link> deliberately.
 */

async function main() {
  const template = await fs.readFile(path.join(DIST, 'index.html'), 'utf-8');

  if (!HEAD_BLOCK.test(template) || !template.includes(APP_HTML)) {
    throw new Error(
      'dist/index.html is missing the <!--app-head--> or <!--app-html--> markers. ' +
        'They must survive from index.html into the build.',
    );
  }

  const { render, ROUTES, NOT_FOUND_ROUTE, SITE_ORIGIN } = await import(
    pathToFileURL(SSR_ENTRY).href
  );

  const all = [...ROUTES, NOT_FOUND_ROUTE];
  let written = 0;

  for (const route of all) {
    const { html, head } = render(route.path);

    const page = template
      .replace(HEAD_BLOCK, head.trim())
      .replace(APP_HTML, html)
      // Tells src/main.tsx to hydrate rather than mount from scratch.
      .replace('data-prerendered="false"', 'data-prerendered="true"');

    // "/" -> dist/index.html, "/404" -> dist/404.html,
    // "/services" -> dist/services/index.html
    let outFile: string;
    if (route.path === '/') {
      outFile = path.join(DIST, 'index.html');
    } else if (route.path === '/404') {
      outFile = path.join(DIST, '404.html');
    } else {
      outFile = path.join(DIST, route.path.slice(1), 'index.html');
    }

    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await fs.writeFile(outFile, page, 'utf-8');
    written += 1;

    const words = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean).length;
    console.log(`  ${route.path.padEnd(34)} ${String(words).padStart(5)} words`);
  }

  await writeShell(template);
  await writeSitemap(ROUTES, SITE_ORIGIN);
  console.log(`[prerender] ${written} pages + app-shell.html + sitemap.xml written to dist/`);
}

/**
 * The empty app shell, for pages that cannot exist at build time.
 *
 * The proposal portal serves per-prospect pages at the root and a private admin
 * app at /admin. Neither has a build-time artifact, and neither can reuse
 * dist/index.html — that file now contains the pre-rendered marketing homepage,
 * so it would paint the homepage and then have React throw it away.
 *
 * This is the pre-render template with its fallback head intact and an empty
 * root, which is exactly what those routes need. server.ts injects the
 * per-proposal payload into it at request time.
 */
async function writeShell(template: string) {
  const shell = template
    // A neutral title so the tab is never blank in the moment before React
    // mounts. The real one is set by the page itself, and deliberately does not
    // name the prospect here — this file is served for every proposal.
    .replace(
      HEAD_BLOCK,
      '<!--app-head--><title>OptimizeIndex</title>' +
        '<meta name="robots" content="noindex, nofollow" /><!--/app-head-->',
    )
    .replace(APP_HTML, '')
    // Left as "false": there is no server-rendered markup to hydrate, so
    // src/main.tsx must mount from scratch.
    .replace('data-prerendered="true"', 'data-prerendered="false"')
    // Strip the GA4 snippet. These pages are private, one per prospect, and
    // sending them to the marketing property would both put prospect company
    // names into GA4 URLs and mix proposal traffic into the funnel reports the
    // site is measured on. The portal has its own first-party tracking.
    .replace(/<script>\s*window\.dataLayer[\s\S]*?<\/script>/, '');

  await fs.writeFile(path.join(DIST, 'app-shell.html'), shell, 'utf-8');
}

async function writeSitemap(
  routes: { path: string; priority?: number; noindex?: boolean }[],
  origin: string,
) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = routes
    .filter((r) => !r.noindex && r.priority != null)
    .map(
      (r) =>
        `  <url>\n` +
        `    <loc>${origin}${r.path}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <priority>${r.priority!.toFixed(1)}</priority>\n` +
        `  </url>`,
    )
    .join('\n');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  await fs.writeFile(path.join(DIST, 'sitemap.xml'), xml, 'utf-8');
}

main().catch((err) => {
  console.error('[prerender] failed:', err);
  process.exit(1);
});
