/**
 * Builds the per-route <head> contents.
 *
 * Used by the prerenderer to bake tags into static HTML, and by App.tsx to
 * keep them correct after client-side navigation. One implementation so the
 * two can't drift — the previous drift (a static title in index.html and a
 * different one set by JS) made the homepage title visibly change on hydrate.
 */

import {
  SITE_NAME,
  SITE_ORIGIN,
  SITEWIDE_JSONLD,
  canonicalFor,
  type RouteMeta,
} from '../routes';

const OG_IMAGE = `${SITE_ORIGIN}/logo.png`;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * JSON-LD is injected inside a <script> block, so `<` must be neutralised or a
 * value containing "</script>" would break out of it.
 */
function escapeJsonLd(json: string): string {
  return json.replace(/</g, '\\u003c');
}

export interface HeadTag {
  /** How the client finds the existing element to update. */
  selector: string;
  html: string;
}

/** Ordered tags for a route, as both selectors (client) and HTML (prerender). */
export function buildHeadTags(route: RouteMeta): HeadTag[] {
  const canonical = canonicalFor(route.path);
  const title = escapeAttr(route.title);
  const description = escapeAttr(route.description);

  const tags: HeadTag[] = [
    { selector: 'title', html: `<title>${title}</title>` },
    {
      selector: 'meta[name="description"]',
      html: `<meta name="description" content="${description}" />`,
    },
    {
      selector: 'link[rel="canonical"]',
      html: `<link rel="canonical" href="${canonical}" />`,
    },
    { selector: 'meta[property="og:type"]', html: `<meta property="og:type" content="website" />` },
    {
      selector: 'meta[property="og:site_name"]',
      html: `<meta property="og:site_name" content="${SITE_NAME}" />`,
    },
    {
      selector: 'meta[property="og:title"]',
      html: `<meta property="og:title" content="${title}" />`,
    },
    {
      selector: 'meta[property="og:description"]',
      html: `<meta property="og:description" content="${description}" />`,
    },
    { selector: 'meta[property="og:url"]', html: `<meta property="og:url" content="${canonical}" />` },
    {
      selector: 'meta[property="og:image"]',
      html: `<meta property="og:image" content="${OG_IMAGE}" />`,
    },
    {
      selector: 'meta[name="twitter:card"]',
      html: `<meta name="twitter:card" content="summary" />`,
    },
    {
      selector: 'meta[name="twitter:title"]',
      html: `<meta name="twitter:title" content="${title}" />`,
    },
    {
      selector: 'meta[name="twitter:description"]',
      html: `<meta name="twitter:description" content="${description}" />`,
    },
    {
      selector: 'meta[name="twitter:image"]',
      html: `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    },
  ];

  if (route.noindex) {
    tags.push({
      selector: 'meta[name="robots"]',
      html: `<meta name="robots" content="noindex, follow" />`,
    });
  }

  const graph = [...SITEWIDE_JSONLD, ...(route.jsonLd ?? [])];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  tags.push({
    selector: 'script[type="application/ld+json"]',
    html: `<script type="application/ld+json">${escapeJsonLd(json)}</script>`,
  });

  return tags;
}

/** Flattened HTML for the prerenderer to splice into <head>. */
export function renderHeadHtml(route: RouteMeta): string {
  return buildHeadTags(route)
    .map((t) => `    ${t.html}`)
    .join('\n');
}
