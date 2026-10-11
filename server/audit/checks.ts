/**
 * The audit checks themselves.
 *
 * Every check reports what it actually observed. `detail` quotes real values
 * ("Title is 78 characters", "14 of 31 images have no alt text") because the
 * whole point of leading with this tool is that a prospect can open View
 * Source and confirm we're right. One invented finding costs more trust than
 * ten correct ones earn.
 */

import type { CheerioAPI } from "cheerio";
import { URL } from "node:url";
import type { AuditCheck, AuditCategory, AuditSource, CategoryId } from "../../shared/auditTypes";
import { CATEGORY_WEIGHTS } from "../../shared/auditTypes";

export interface RobotsInfo {
  found: boolean;
  text: string;
  sitemaps: string[];
  blocksRoot: boolean;
  /**
   * Crawler name -> allowed to read the homepage, for every crawler in
   * SEARCH_CRAWLERS and TRAINING_CRAWLERS below.
   */
  aiBots: Record<string, boolean>;
}

export interface SitemapInfo {
  found: boolean;
  url: string | null;
  urlCount: number | null;
}

export interface ScanContext {
  requestedUrl: URL;
  finalUrl: URL;
  domain: string;
  status: number;
  redirects: number;
  html: string;
  $: CheerioAPI;
  headers: Record<string, string | string[] | undefined>;
  /** Did https serve the page, or did we have to fall back to http? */
  servedOverHttps: boolean;
  /** null when the check couldn't be completed. */
  httpUpgradesToHttps: boolean | null;
  wwwConsolidated: boolean | null;
  robots: RobotsInfo;
  sitemap: SitemapInfo;
  llmsTxt: boolean;
}

type CheckDef = {
  id: string;
  category: CategoryId;
  label: string;
  weight: number;
  /** Default source for every outcome; an outcome may carry its own instead. */
  source?: AuditSource;
  run: (ctx: ScanContext) => Omit<AuditCheck, "id" | "label" | "weight">;
};

/* -------------------------------------------------------------------------
   Primary sources

   Every claim a `why` string makes about how Google or an AI crawler behaves
   rests on one of these, and the report links it. `checkedAt` is the day the
   page was read against the wording here; re-read it before changing a claim.
   Secondary write-ups do not go in this list.
------------------------------------------------------------------------- */

const CHECKED_AT = "2026-10-12";

const SOURCES = {
  aiGuide: {
    label: "Google Search Central: AI optimization guide",
    url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide",
    checkedAt: CHECKED_AT,
  },
  googleCrawlers: {
    label: "Google's common crawlers (Google-Extended)",
    url: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers",
    checkedAt: CHECKED_AT,
  },
  openaiBots: {
    label: "OpenAI crawler documentation",
    url: "https://developers.openai.com/api/docs/bots",
    checkedAt: CHECKED_AT,
  },
  robotsSpec: {
    label: "How Google interprets robots.txt",
    url: "https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt",
    checkedAt: CHECKED_AT,
  },
  sitemaps: {
    label: "Google: Learn about sitemaps",
    url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview",
    checkedAt: CHECKED_AT,
  },
  titleLinks: {
    label: "Google: Title links in search results",
    url: "https://developers.google.com/search/docs/appearance/title-link",
    checkedAt: CHECKED_AT,
  },
  snippets: {
    label: "Google: Snippets and meta descriptions",
    url: "https://developers.google.com/search/docs/appearance/snippet",
    checkedAt: CHECKED_AT,
  },
  helpfulContent: {
    label: "Google: Creating helpful, people-first content",
    url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    checkedAt: CHECKED_AT,
  },
  structuredData: {
    label: "Google: Introduction to structured data",
    url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
    checkedAt: CHECKED_AT,
  },
} satisfies Record<string, AuditSource>;

/* -------------------------------------------------------------------------
   Small helpers
------------------------------------------------------------------------- */

/**
 * Crawlers that build a search index, so blocking one removes the site from
 * that product's results. These are the only crawlers the score depends on.
 *
 * OpenAI documents OAI-SearchBot as its search crawler and says sites opted
 * out of it are not shown in ChatGPT search answers. Anthropic describes
 * Claude-SearchBot as improving search result quality, Perplexity describes
 * PerplexityBot as surfacing and linking sites in its search results, and
 * Apple describes Applebot as powering search in Spotlight, Siri and Safari.
 */
const SEARCH_CRAWLERS: { name: string; product: string }[] = [
  { name: "Googlebot", product: "Google Search" },
  { name: "Bingbot", product: "Bing" },
  { name: "OAI-SearchBot", product: "ChatGPT search" },
  { name: "Claude-SearchBot", product: "Claude's search results" },
  { name: "PerplexityBot", product: "Perplexity search" },
  { name: "Applebot", product: "Siri, Spotlight and Safari search" },
];

/**
 * Crawlers and tokens that govern model training (and, for Google-Extended,
 * Gemini grounding; for CCBot, Common Crawl's open web archive, which its own
 * page describes as research data rather than naming training). Blocking them
 * is a legitimate choice about how content is used and has no documented
 * effect on search, so they are reported, never scored. Google says Google-Extended "does not impact a site's inclusion in
 * Google Search nor is it used as a ranking signal"; Apple says pages that
 * disallow Applebot-Extended "can still be included in search results".
 *
 * User-triggered fetchers (ChatGPT-User, Claude-User, Perplexity-User) are not
 * listed at all: they fetch a page because a person asked, not to build an
 * index, and OpenAI says ChatGPT-User "is not used to determine whether
 * content may appear in Search".
 */
const TRAINING_CRAWLERS: { name: string; product: string }[] = [
  { name: "GPTBot", product: "OpenAI model training" },
  { name: "ClaudeBot", product: "Anthropic model training" },
  { name: "CCBot", product: "Common Crawl's open web archive" },
  { name: "Applebot-Extended", product: "Apple model training" },
  {
    name: "Google-Extended",
    product: "Gemini Apps grounding and Gemini training; no effect on Google Search",
  },
];

const ALL_CRAWLERS = [...SEARCH_CRAWLERS, ...TRAINING_CRAWLERS].map((c) => c.name);

/** Titles that say nothing about the page. Compared lower-cased and trimmed. */
const GENERIC_TITLES = new Set([
  "home",
  "homepage",
  "home page",
  "index",
  "untitled",
  "untitled document",
  "untitled page",
  "new page",
  "welcome",
  "default",
  "document",
  "my site",
  "my website",
]);

/** Placeholder descriptions that site builders ship by default. */
const GENERIC_DESCRIPTIONS = new Set([
  "just another wordpress site",
  "description",
  "site description",
  "my website",
  "welcome",
]);

function textOf(ctx: ScanContext): string {
  const $ = ctx.$;
  const body = $("body").clone();
  body.find("script, style, noscript, template, svg").remove();
  return body.text().replace(/\s+/g, " ").trim();
}

function wordCount(ctx: ScanContext): number {
  const t = textOf(ctx);
  if (!t) return 0;
  return t.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
}

/** Collects every @type in a JSON-LD blob, including nested and @graph nodes. */
function collectTypes(node: unknown, out: Set<string>, depth = 0) {
  if (!node || depth > 8) return;
  if (Array.isArray(node)) {
    for (const n of node) collectTypes(n, out, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") out.add(t);
  else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && out.add(x));
  for (const [key, value] of Object.entries(obj)) {
    if (key === "@type") continue;
    if (value && typeof value === "object") collectTypes(value, out, depth + 1);
  }
}

function schemaTypes(ctx: ScanContext): Set<string> {
  const found = new Set<string>();
  ctx.$('script[type="application/ld+json"]').each((_, el) => {
    const raw = ctx.$(el).contents().text().trim();
    if (!raw) return;
    try {
      collectTypes(JSON.parse(raw), found);
    } catch {
      // Malformed JSON-LD is common; a broken block simply contributes nothing.
    }
  });
  return found;
}

function hasAnyType(types: Set<string>, wanted: string[]): string | null {
  for (const t of types) {
    if (wanted.some((w) => w.toLowerCase() === t.toLowerCase())) return t;
  }
  return null;
}

/**
 * Resolves whether a named crawler may fetch "/" per robots.txt.
 * Absence of any rule means allowed, which is the spec default.
 */
/**
 * Google's robots.txt path matching: "*" is any sequence of characters and a
 * trailing "$" anchors the end. Everything else is literal, and a rule matches
 * from the start of the path.
 *
 * Worth doing properly rather than by prefix comparison. Stripping at the
 * first "*" and prefix-matching looks equivalent but silently mishandles a
 * pattern with content after the wildcard: "Disallow: /*.pdf" would reduce to
 * the prefix "/", which matches every path on the site and blocks the whole
 * origin.
 */
function robotsPatternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split("*")
    .map((part) => part.replace(/[^A-Za-z0-9_/-]/g, (c) => "\\" + c))
    .join(".*");
  return new RegExp(`^${source}${anchored ? "$" : ""}`).test(path);
}

/**
 * Whether `userAgent` is allowed to fetch `path`.
 *
 * `path` was added when scripts/verify-seo.ts needed to assert that no
 * indexable route is disallowed and that /admin stays disallowed for every
 * named crawler group. It defaults to "/" so the two callers below — and the
 * live audit tool's behaviour — are unchanged.
 */
export function robotsAllows(text: string, userAgent: string, path = '/'): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;

  for (const line of lines) {
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === "allow" || field === "disallow") {
      if (!current) continue;
      lastWasAgent = false;
      current.rules.push({ allow: field === "allow", path: value });
    } else {
      lastWasAgent = false;
    }
  }

  const ua = userAgent.toLowerCase();
  const specific = groups.find((g) => g.agents.includes(ua));
  const wildcard = groups.find((g) => g.agents.includes("*"));
  const group = specific || wildcard;
  if (!group) return true;

  // Longest matching rule wins; Allow beats Disallow on a tie (Google's rule).
  let best: { allow: boolean; path: string } | null = null;
  for (const rule of group.rules) {
    if (rule.path === "") continue; // "Disallow:" with no value allows everything
    if (!rule.path.startsWith("/")) continue;
    if (!robotsPatternMatches(rule.path, path)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}

export function parseRobots(text: string, found: boolean): RobotsInfo {
  const sitemaps: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*sitemap\s*:\s*(\S+)/i);
    if (m) sitemaps.push(m[1]);
  }
  const aiBots: Record<string, boolean> = {};
  for (const bot of ALL_CRAWLERS) {
    aiBots[bot] = found ? robotsAllows(text, bot) : true;
  }
  return {
    found,
    text,
    sitemaps,
    blocksRoot: found ? !robotsAllows(text, "Googlebot") : false,
    aiBots,
  };
}

/* -------------------------------------------------------------------------
   Checks
------------------------------------------------------------------------- */

const CHECKS: CheckDef[] = [
  /* --- Technical foundations ------------------------------------------- */
  {
    id: "https",
    category: "technical",
    label: "Secure padlock on your site",
    weight: 3,
    run: (ctx) => {
      if (ctx.servedOverHttps) {
        return {
          status: "pass",
          detail: `Served over HTTPS at ${ctx.finalUrl.origin}.`,
          why: "Customers trust the padlock. Without it, Chrome puts a warning next to your name.",
          fix: "Nothing to do here.",
        };
      }
      return {
        status: "fail",
        detail: "The site answered over plain HTTP — no valid HTTPS response.",
        why: "Customers see a 'Not secure' warning before they see your phone number. Most leave.",
        fix: "Get an SSL certificate installed. They are free, and most hosts do it in a couple of clicks.",
      };
    },
  },
  {
    id: "https-redirect",
    category: "technical",
    label: "Old insecure links still work",
    weight: 2,
    run: (ctx) => {
      if (ctx.httpUpgradesToHttps === null) {
        return {
          status: "unknown",
          detail: "Couldn't complete the HTTP-to-HTTPS check.",
          why: "Serving both protocols splits your ranking signals between two versions of every page.",
          fix: "Check that the insecure version of your address forwards to the secure one.",
        };
      }
      if (ctx.httpUpgradesToHttps) {
        return {
          status: "pass",
          detail: "http:// redirects to the HTTPS version.",
          why: "Everyone lands on the same secure version of your site.",
          fix: "Nothing to do here.",
        };
      }
      return {
        status: "fail",
        detail: "http:// serves content instead of redirecting to HTTPS.",
        why: "Google sees two copies of your site and splits the credit, so neither ranks as well.",
        fix: "Have your host forward every insecure link to the secure version automatically.",
      };
    },
  },
  {
    id: "www-consolidation",
    category: "technical",
    label: "One web address, not two",
    weight: 1,
    run: (ctx) => {
      if (ctx.wwwConsolidated === null) {
        return {
          status: "unknown",
          detail: "Couldn't complete the www / non-www check.",
          why: "Two web addresses means Google splits the credit instead of giving it all to one.",
          fix: "Pick one address as the main one and have the other forward to it.",
        };
      }
      return ctx.wwwConsolidated
        ? {
            status: "pass",
            detail: `Both www and non-www resolve to ${ctx.finalUrl.hostname}.`,
            why: "All your credit with Google goes to one address.",
            fix: "Nothing to do here.",
          }
        : {
            status: "warn",
            detail: "www and non-www both serve the site without redirecting to one another.",
            why: "Google may treat these as two different sites and give each one half the credit.",
            fix: "Pick one address as the main one and have the other forward to it.",
          };
    },
  },
  {
    id: "robots-txt",
    category: "technical",
    label: "Google is allowed in",
    weight: 2,
    source: SOURCES.robotsSpec,
    run: (ctx) => {
      // Google treats a missing robots.txt (any 4xx but 429) "as if a valid
      // robots.txt file didn't exist", meaning no crawl restrictions. Absence
      // is therefore a pass for "Google is allowed in", not a defect.
      if (!ctx.robots.found) {
        return {
          status: "pass",
          detail: "No robots.txt found at /robots.txt, so Google treats the site as having no crawl restrictions.",
          why: "Google reads a missing robots.txt as permission to crawl everything. You only need one to keep crawlers out of something, or to point them at your sitemap.",
          fix: "Nothing to do here.",
        };
      }
      if (ctx.robots.blocksRoot) {
        return {
          status: "fail",
          detail: "robots.txt blocks Googlebot from crawling the site root.",
          why: "One line in this file is telling Google not to read your homepage.",
          fix: "Remove the line blocking Google. This is urgent: it keeps Google from reading your site.",
        };
      }
      return {
        status: "pass",
        detail: `robots.txt found and Googlebot is allowed to crawl the site.`,
        why: "Google is able to read your pages.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "sitemap",
    category: "technical",
    label: "Google has a list of your pages",
    weight: 2,
    source: SOURCES.sitemaps,
    run: (ctx) => {
      if (!ctx.sitemap.found) {
        return {
          status: "warn",
          detail: "No XML sitemap found at /sitemap.xml or referenced in robots.txt.",
          why: "A sitemap helps Google find your pages, though it does not guarantee they are crawled. Google says a small site (about 500 pages or fewer) that links to every important page from the homepage may not need one.",
          fix: "Have a page list generated automatically and submit it in Google Search Console.",
        };
      }
      const count = ctx.sitemap.urlCount;
      return {
        status: "pass",
        detail:
          count != null
            ? `Sitemap found at ${ctx.sitemap.url} listing ${count} URL${count === 1 ? "" : "s"}.`
            : `Sitemap found at ${ctx.sitemap.url}.`,
        why: "Google gets a direct list of the pages you want found.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "indexable",
    category: "technical",
    label: "Your page can appear in results",
    weight: 3,
    run: (ctx) => {
      const metaRobots = ctx.$('meta[name="robots"], meta[name="googlebot"]')
        .map((_, el) => ctx.$(el).attr("content") || "")
        .get()
        .join(", ");
      const header = String(ctx.headers["x-robots-tag"] || "");
      const combined = `${metaRobots} ${header}`.toLowerCase();
      if (combined.includes("noindex")) {
        return {
          status: "fail",
          detail: `A noindex directive is present: "${(metaRobots || header).trim()}".`,
          why: "This tells Google to hide the page completely. It cannot rank for anything.",
          fix: "Remove the setting that is telling Google to hide this page.",
        };
      }
      return {
        status: "pass",
        detail: metaRobots
          ? `Robots directive is "${metaRobots.trim()}" — indexing allowed.`
          : "No noindex directive found.",
        why: "The page is allowed to show up in search results.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "canonical",
    category: "technical",
    label: "No duplicate versions of your page",
    weight: 2,
    run: (ctx) => {
      const href = ctx.$('link[rel="canonical"]').first().attr("href");
      if (!href) {
        return {
          status: "warn",
          detail: "No canonical tag on the homepage.",
          why: "Without this, small differences in a link can look like separate pages to Google.",
          fix: "Set a preferred address for each page so Google knows which version counts.",
        };
      }
      let resolved: string;
      try {
        resolved = new URL(href, ctx.finalUrl.toString()).toString();
      } catch {
        return {
          status: "fail",
          detail: `Canonical tag contains an invalid URL: "${href}".`,
          why: "This tag is broken, and may be pointing Google at a page that does not exist.",
          fix: "Fix the broken preferred-address tag so it points at a real page.",
        };
      }
      const same =
        resolved.replace(/\/$/, "") === ctx.finalUrl.toString().replace(/\/$/, "");
      return same
        ? {
            status: "pass",
            detail: `Canonical is self-referential: ${resolved}`,
            why: "All the credit for this page goes to one address.",
            fix: "Nothing to do here.",
          }
        : {
            status: "warn",
            detail: `Canonical points elsewhere: ${resolved}`,
            why: "Google will give the credit to a different page instead of this one.",
            fix: "Check this is intentional. If not, point it back at this page.",
          };
    },
  },
  {
    id: "lang",
    category: "technical",
    label: "Language is set",
    weight: 1,
    run: (ctx) => {
      const lang = ctx.$("html").attr("lang");
      return lang
        ? {
            status: "pass",
            detail: `<html lang="${lang}"> is set.`,
            why: "Tells Google and screen readers what language your site is in.",
            fix: "Nothing to do here.",
          }
        : {
            status: "warn",
            detail: "The <html> tag has no lang attribute.",
            why: "Helps Google serve your site to the right people, and helps screen readers read it aloud.",
            fix: 'Have your developer set the page language.',
          };
    },
  },
  {
    id: "viewport",
    category: "technical",
    label: "Built for phones",
    weight: 2,
    run: (ctx) => {
      const vp = ctx.$('meta[name="viewport"]').first().attr("content");
      return vp
        ? {
            status: "pass",
            detail: `Viewport is set: "${vp}".`,
            why: "Google ranks the phone version of your site first, and most of your customers are on a phone.",
            fix: "Nothing to do here.",
          }
        : {
            status: "fail",
            detail: "No viewport meta tag found.",
            why: "On a phone your site loads zoomed out and unreadable. That is the version Google judges you on.",
            fix: 'Have your developer add the setting that makes the site fit a phone screen.',
          };
    },
  },

  /* --- On-page & content ------------------------------------------------ */
  {
    id: "title",
    category: "content",
    label: "The headline Google shows",
    weight: 4,
    source: SOURCES.titleLinks,
    // Fails only when there is nothing useful to show. Google sets no length
    // limit on <title> and truncates "as needed, typically to fit the device
    // width", so length is reported as a display note, never as a defect.
    run: (ctx) => {
      const title = (ctx.$("head title").first().text() || "").replace(/\s+/g, " ").trim();
      if (!title) {
        return {
          status: "fail",
          detail: "The page has no title tag.",
          why: "Google asks for a title on every page. It is the main source for the clickable line customers see in results, and right now there is nothing there.",
          fix: "Write a short headline with what you do and where, plus your business name.",
        };
      }
      const len = title.length;
      const normalized = title.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
      if (GENERIC_TITLES.has(normalized)) {
        return {
          status: "fail",
          detail: `Title is "${title}", which says nothing about the business.`,
          why: "Google advises against vague titles such as \"Home\". A customer scanning results cannot tell what you do from it.",
          fix: "Write a short headline with what you do and where, plus your business name.",
        };
      }
      const note =
        len > 60
          ? " Google sets no length limit, but long titles are cut to fit the screen, so the first words matter most."
          : "";
      return {
        status: "pass",
        detail: `Title is ${len} characters: "${title}".${note}`,
        why: "The page has a specific title, which Google can use as the clickable headline in results.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "meta-description",
    category: "content",
    label: "The description under your headline",
    weight: 3,
    source: SOURCES.snippets,
    // Same rule as the title: missing or placeholder fails, length is a note.
    // Google says there is no limit on a meta description's length, builds
    // most snippets from page text, and uses the description when it
    // describes the page more accurately.
    run: (ctx) => {
      const desc = (ctx.$('meta[name="description"]').first().attr("content") || "").replace(/\s+/g, " ").trim();
      if (!desc) {
        return {
          status: "fail",
          detail: "No meta description on the homepage.",
          why: "Google builds most snippets from your page text, but it uses the meta description when that describes the page more accurately. Without one, you have no say in it.",
          fix: "Write a sentence or two saying what you do and why someone should call you.",
        };
      }
      const len = desc.length;
      const normalized = desc.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
      if (GENERIC_DESCRIPTIONS.has(normalized)) {
        return {
          status: "fail",
          detail: `Meta description is a placeholder: "${desc}".`,
          why: "This is the default text a site builder ships with. It tells a customer nothing about you.",
          fix: "Write a sentence or two saying what you do and why someone should call you.",
        };
      }
      return {
        status: "pass",
        detail: `Meta description is ${len} characters. Google sets no length limit and trims snippets to fit the screen.`,
        why: "You have given Google a summary of the page it can use under your headline.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "h1",
    category: "content",
    label: "A clear main heading",
    weight: 3,
    run: (ctx) => {
      const h1s = ctx.$("h1");
      const count = h1s.length;
      if (count === 0) {
        return {
          status: "fail",
          detail: "No H1 heading on the page.",
          why: "This is the biggest heading on the page. It is how Google decides what you do.",
          fix: "Add one clear main heading saying what you do and where.",
        };
      }
      const first = h1s.first().text().replace(/\s+/g, " ").trim();
      if (count > 1) {
        return {
          status: "warn",
          detail: `Found ${count} H1 headings. The first is "${first.slice(0, 80)}${first.length > 80 ? "…" : ""}".`,
          why: "Several competing main headings leave Google unsure what the page is about.",
          fix: "Keep one main heading and make the others smaller sub-headings.",
        };
      }
      return {
        status: "pass",
        detail: `One H1: "${first.slice(0, 80)}${first.length > 80 ? "…" : ""}"`,
        why: "One clear main heading tells Google exactly what you do.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "heading-structure",
    category: "content",
    label: "Sections a customer can scan",
    weight: 2,
    run: (ctx) => {
      const h2 = ctx.$("h2").length;
      const h3 = ctx.$("h3").length;
      if (h2 === 0) {
        return {
          status: "warn",
          detail: `No H2 headings found (${h3} H3${h3 === 1 ? "" : "s"}).`,
          why: "Section headings let customers skim, and let Google pull answers straight from your page.",
          fix: "Break the page into sections with headings that answer what customers ask you on the phone.",
        };
      }
      return {
        status: "pass",
        detail: `${h2} H2 heading${h2 === 1 ? "" : "s"} and ${h3} H3${h3 === 1 ? "" : "s"}.`,
        why: "Customers can skim it, and Google can pull answers from it.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "content-depth",
    category: "content",
    label: "Enough written on the page",
    weight: 3,
    source: SOURCES.helpfulContent,
    // The 150 / 300 thresholds are our own heuristic for a page that says
    // almost nothing. Google says it has no preferred word count, and the
    // wording below says so rather than implying a ranking rule.
    run: (ctx) => {
      const words = wordCount(ctx);
      if (words < 150) {
        return {
          status: "fail",
          detail: `Roughly ${words} words of text on the homepage.`,
          why: "There is not enough here to say what you do or who you serve. Google has no preferred word count; this threshold is our own rough check for a page that says almost nothing.",
          fix: "Add a few paragraphs covering your services, your areas, and why people hire you.",
        };
      }
      if (words < 300) {
        return {
          status: "warn",
          detail: `Roughly ${words} words of text on the homepage.`,
          why: "Google has no preferred word count. What matters is whether the page answers what customers ask before they book, and this little text probably does not yet.",
          fix: "Add sections answering the questions customers ask before they book.",
        };
      }
      return {
        status: "pass",
        detail: `Roughly ${words} words of text on the homepage.`,
        why: "There is enough on the page to describe what you do. Google has no preferred word count, so this is our own rough check, not a target.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "image-alt",
    category: "content",
    label: "Photos are described",
    weight: 2,
    run: (ctx) => {
      const imgs = ctx.$("img");
      const total = imgs.length;
      if (total === 0) {
        return {
          status: "unknown",
          detail: "No <img> elements found on the page.",
          why: "Alt text is how image search and screen readers understand your visuals.",
          fix: "Nothing to do here.",
        };
      }
      // alt="" is the correct way to mark a decorative image, so it counts as
      // handled. Only a missing alt attribute is a genuine defect — flagging
      // deliberate empty alts would be telling the prospect something false.
      let missing = 0;
      let decorative = 0;
      imgs.each((_, el) => {
        const $el = ctx.$(el);
        const alt = $el.attr("alt");
        if ($el.attr("aria-hidden") === "true" || $el.attr("role") === "presentation") {
          decorative += 1;
          return;
        }
        if (alt === undefined) missing += 1;
        else if (alt.trim() === "") decorative += 1;
      });

      const described = total - missing - decorative;
      if (missing === 0) {
        return {
          status: "pass",
          detail:
            decorative > 0
              ? `All ${total} images are handled — ${described} described, ${decorative} marked decorative.`
              : `All ${total} image${total === 1 ? "" : "s"} have alt text.`,
          why: "Google can tell what your photos show, so they can appear in image search.",
          fix: "Nothing to do here.",
        };
      }
      const pct = Math.round((missing / total) * 100);
      return {
        status: pct > 50 ? "fail" : "warn",
        detail: `${missing} of ${total} images have no alt attribute at all (${pct}%)${decorative > 0 ? `; ${decorative} are correctly marked decorative` : ""}.`,
        why: "Google cannot tell what is in these photos, so they never show up in image search.",
        fix: 'Add a short description to each photo, like "new boiler installed in a Leeds kitchen".',
      };
    },
  },
  {
    id: "internal-links",
    category: "content",
    label: "Links to your other pages",
    weight: 2,
    run: (ctx) => {
      let internal = 0;
      let external = 0;
      ctx.$("a[href]").each((_, el) => {
        const href = ctx.$(el).attr("href") || "";
        if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return;
        try {
          const u = new URL(href, ctx.finalUrl.toString());
          if (u.hostname.replace(/^www\./, "") === ctx.domain) internal += 1;
          else external += 1;
        } catch {
          // Unparseable href — skip rather than guess.
        }
      });
      if (internal < 5) {
        return {
          status: internal === 0 ? "fail" : "warn",
          detail: `${internal} internal link${internal === 1 ? "" : "s"} and ${external} external on the homepage.`,
          why: "Links from your homepage are how visitors and search crawlers find your service pages.",
          fix: "Link from your homepage to each service page.",
        };
      }
      return {
        status: "pass",
        detail: `${internal} internal links and ${external} external links.`,
        why: "Visitors and search crawlers can reach your other pages from here.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "social-tags",
    category: "content",
    label: "How your link looks when shared",
    weight: 1,
    run: (ctx) => {
      const get = (sel: string) => (ctx.$(sel).first().attr("content") || "").trim();
      const present: string[] = [];
      const missing: string[] = [];
      const map: [string, string][] = [
        ["og:title", 'meta[property="og:title"]'],
        ["og:description", 'meta[property="og:description"]'],
        ["og:image", 'meta[property="og:image"]'],
        ["twitter:card", 'meta[name="twitter:card"]'],
      ];
      for (const [name, sel] of map) (get(sel) ? present : missing).push(name);

      if (missing.length === 0) {
        return {
          status: "pass",
          detail: "og:title, og:description, og:image and twitter:card are all set.",
          why: "Shared links show a proper preview with a picture.",
          fix: "Nothing to do here.",
        };
      }
      return {
        status: missing.length >= 3 ? "fail" : "warn",
        detail: `Missing ${missing.join(", ")}. Present: ${present.length ? present.join(", ") : "none"}.`,
        why: "Shared on Facebook, your site shows as a bare link with no picture. Those get far fewer clicks.",
        fix: "Have your developer add a share picture and title so links look right when posted.",
      };
    },
  },

  /* --- AI search readiness -----------------------------------------------
     Rewritten against the providers' own documentation. Google says AI
     Overviews and AI Mode need no special files, markup or schema, and that
     Google Search ignores llms.txt; OpenAI documents GPTBot as a training
     crawler and OAI-SearchBot as the one behind ChatGPT search. So nothing
     here scores a file or a markup type that no search product requires, and
     nothing promises that an assistant will recommend anyone.
  ------------------------------------------------------------------------- */
  {
    id: "server-rendered",
    category: "geo",
    label: "AI tools can read your site without running code",
    weight: 4,
    // OpenAI's crawler documentation (the linked source) says nothing about
    // running JavaScript, and SEO-PLAN.md found the same for Anthropic's and
    // Perplexity's. That absence is the claim, so it is worded as an absence
    // ("may not"), never as a fact about what the crawlers cannot do. Google
    // does render JavaScript; this check is about the other crawlers.
    source: SOURCES.openaiBots,
    run: (ctx) => {
      const words = wordCount(ctx);
      const scripts = ctx.$("script[src]").length + ctx.$("script:not([src])").length;
      if (words < 100 && scripts >= 2) {
        return {
          status: "fail",
          detail: `Only ~${words} words are present in the raw HTML, with ${scripts} script tags — the content is rendered by JavaScript.`,
          why: "ChatGPT and similar assistants may not run JavaScript; their crawler documentation does not say they do. If they don't, this page is close to blank for them.",
          fix: "Have your site send finished pages instead of building them in the browser.",
        };
      }
      if (words < 300 && scripts >= 2) {
        return {
          status: "warn",
          detail: `Only ~${words} words are present in the raw HTML before JavaScript runs.`,
          why: "AI assistants may not run JavaScript; their crawler documentation does not say they do. If they don't, this is all of the page they see.",
          fix: "Have your main content sent with the page instead of loaded afterwards.",
        };
      }
      return {
        status: "pass",
        detail: `~${words} words are present in the raw HTML without JavaScript.`,
        why: "Your content is in the page itself, so reading it does not depend on a crawler running JavaScript.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "schema-org",
    category: "geo",
    label: "Your details in a format Google reads",
    weight: 3,
    source: SOURCES.structuredData,
    run: (ctx) => {
      const types = schemaTypes(ctx);
      if (types.size === 0) {
        return {
          status: "fail",
          detail: "No Schema.org JSON-LD found on the page.",
          why: "Structured data gives Google explicit clues about what a page means: who the business is, what it offers and how to reach it. Google also says no special markup is needed for its AI features, so this is about being understood, not about AI.",
          fix: "Add the hidden details block with your name, phone, hours and services.",
        };
      }
      return {
        status: "pass",
        detail: `Structured data found: ${[...types].slice(0, 6).join(", ")}${types.size > 6 ? `, +${types.size - 6} more` : ""}.`,
        why: "Google uses the structured data it finds to understand what the page is about.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "entity-schema",
    category: "geo",
    label: "Google knows you are a business",
    weight: 3,
    source: SOURCES.structuredData,
    run: (ctx) => {
      const types = schemaTypes(ctx);
      const entity = hasAnyType(types, [
        "Organization",
        "LocalBusiness",
        "ProfessionalService",
        "Corporation",
        "Store",
        "Restaurant",
        "MedicalBusiness",
      ]);
      if (entity) {
        return {
          status: "pass",
          detail: `${entity} markup is present.`,
          why: "The page states in a standard format which business is behind it.",
          fix: "Nothing to do here.",
        };
      }
      return {
        status: "fail",
        detail: "No Organization or LocalBusiness markup found.",
        why: "Nothing on the page states in a standard format which business is behind it: your name, logo, phone and website.",
        fix: "Add a business details block with your name, phone, website and logo, plus your address if customers visit you.",
      };
    },
  },
  {
    id: "answer-schema",
    category: "geo",
    label: "Page-type markup (optional)",
    weight: 2,
    // Reported, never scored. Google: "Structured data isn't required for
    // generative AI search, and there's no special schema.org markup you need
    // to add." Do not turn this into a test for a visible Q&A section, and do
    // not add a homepage FAQ to satisfy it (SEO-PLAN.md, GAP-03).
    source: SOURCES.aiGuide,
    run: (ctx) => {
      const types = schemaTypes(ctx);
      const found = hasAnyType(types, ["FAQPage", "QAPage", "HowTo", "Article", "Product", "Service", "BreadcrumbList"]);
      return {
        status: "info",
        detail: found
          ? `${found} markup is present.`
          : "No FAQ, Article, Product, Service or breadcrumb markup found.",
        why: "Optional. Google says there is no special schema markup needed to appear in its AI features. Markup like this can still describe the page and qualify it for some rich results.",
        fix: "",
      };
    },
  },
  {
    id: "ai-crawlers",
    category: "geo",
    label: "Search crawlers are allowed in",
    weight: 3,
    source: SOURCES.openaiBots,
    // Scores only the crawlers that build search indexes (SEARCH_CRAWLERS).
    // Training crawlers are reported by "ai-training" below and never scored.
    run: (ctx) => {
      const searchNames = SEARCH_CRAWLERS.map((c) => c.name).join(", ");
      if (!ctx.robots.found) {
        return {
          status: "pass",
          detail: `No robots.txt, so every crawler is allowed by default, including ${searchNames}.`,
          why: "The crawlers behind Google, Bing, ChatGPT search, Claude, Perplexity and Apple's search features can all read your site.",
          fix: "Nothing to do here.",
        };
      }
      const blocked = SEARCH_CRAWLERS.filter((c) => ctx.robots.aiBots[c.name] === false);
      if (blocked.length === 0) {
        return {
          status: "pass",
          detail: `robots.txt allows the search crawlers: ${searchNames}.`,
          why: "The crawlers behind Google, Bing, ChatGPT search, Claude, Perplexity and Apple's search features can all read your site.",
          fix: "Nothing to do here.",
        };
      }
      const names = blocked.map((c) => c.name).join(", ");
      const products = blocked.map((c) => c.product).join(", ");
      return {
        status: "fail",
        detail: `robots.txt blocks ${names} from your homepage.`,
        why: `Each of these crawlers feeds a search product (${products}), and blocked here it cannot read your homepage. OpenAI, for example, says sites that block OAI-SearchBot are not shown in ChatGPT search answers.`,
        fix: `Remove the Disallow rules for ${names} in robots.txt, unless keeping your site out of those results is deliberate.`,
      };
    },
  },
  {
    id: "ai-training",
    category: "geo",
    label: "AI training crawlers (your choice)",
    weight: 0,
    source: SOURCES.googleCrawlers,
    // Information only. Blocking a training crawler is a decision about how
    // content is used, with no documented effect on search, so it can never
    // cost or earn points.
    run: (ctx) => {
      const describe = (list: typeof TRAINING_CRAWLERS) =>
        list.map((c) => `${c.name} (${c.product})`).join("; ");
      if (!ctx.robots.found) {
        return {
          status: "info",
          detail: `No robots.txt, so training crawlers are allowed by default: ${describe(TRAINING_CRAWLERS)}.`,
          why: "None of these is a search crawler: they collect content for model training or, for CCBot, an open web archive. Google says Google-Extended does not affect inclusion or ranking in Google Search. Allowing or blocking them is your call.",
          fix: "",
        };
      }
      const blocked = TRAINING_CRAWLERS.filter((c) => ctx.robots.aiBots[c.name] === false);
      const allowed = TRAINING_CRAWLERS.filter((c) => ctx.robots.aiBots[c.name] !== false);
      const parts: string[] = [];
      if (allowed.length) parts.push(`Allowed: ${describe(allowed)}.`);
      if (blocked.length) parts.push(`Blocked: ${describe(blocked)}.`);
      return {
        status: "info",
        detail: parts.join(" "),
        why: "None of these is a search crawler: they collect content for model training or, for CCBot, an open web archive. Google says Google-Extended does not affect inclusion or ranking in Google Search. Allowing or blocking them is your call.",
        fix: "",
      };
    },
  },
  {
    id: "llms-txt",
    category: "geo",
    label: "An llms.txt file (optional)",
    weight: 1,
    // Reported, never scored. Google: llms.txt and similar files "will neither
    // harm nor help your site's visibility or rankings in Google Search, as
    // Google Search ignores them."
    source: SOURCES.aiGuide,
    run: (ctx) => ({
      status: "info",
      detail: ctx.llmsTxt ? "/llms.txt is published." : "No /llms.txt file found.",
      why: "Optional. Google Search does not use it; some other tools may read it.",
      fix: "",
    }),
  },
  {
    id: "author-signals",
    category: "geo",
    label: "Easy to contact and trust",
    weight: 2,
    run: (ctx) => {
      const types = schemaTypes(ctx);
      const signals: string[] = [];
      const body = ctx.$("body").text();
      if (ctx.$('a[href^="tel:"]').length > 0) signals.push("phone link");
      if (ctx.$('a[href^="mailto:"]').length > 0) signals.push("email link");
      if (hasAnyType(types, ["PostalAddress"])) signals.push("address markup");
      if (/\b(?:privacy policy|terms of service)\b/i.test(body)) signals.push("policy pages");
      if (hasAnyType(types, ["AggregateRating", "Review"])) signals.push("review markup");

      if (signals.length >= 3) {
        return {
          status: "pass",
          detail: `Found: ${signals.join(", ")}.`,
          why: "Customers can reach you without hunting, and the site shows who stands behind it.",
          fix: "Nothing to do here.",
        };
      }
      return {
        status: signals.length === 0 ? "fail" : "warn",
        detail: signals.length
          ? `Only found: ${signals.join(", ")}.`
          : "No phone link, email link, address markup or policy pages found.",
        why: "Customers cannot easily reach you or see who runs the site.",
        fix: "Add a tap-to-call phone number, your address if customers visit you, and your policy links in the footer.",
      };
    },
  },
];

/* -------------------------------------------------------------------------
   Scoring
------------------------------------------------------------------------- */

/**
 * Category names are written for the people who read them: owners of trades and
 * service businesses, not marketers. "Technical Foundations" and "GEO
 * Readiness" are industry words that tell a roofer nothing about whether
 * customers can find him.
 *
 * These are labels only — the checks, weights and thresholds behind them are
 * unchanged.
 *
 * The geo blurb promises nothing about recommendations. Nobody can make an AI
 * assistant recommend a business, and the audit is the lead magnet for a
 * company whose positioning rests on not claiming outcomes it cannot control.
 */
const CATEGORY_META: Record<CategoryId, { label: string; blurb: string }> = {
  technical: {
    label: "Can Google find you",
    blurb: "Whether Google can reach your site and list it at all.",
  },
  content: {
    label: "What your pages say",
    blurb: "Whether your pages tell Google what you do and who you do it for.",
  },
  performance: {
    label: "How fast your site loads",
    blurb: "How long a customer waits before your page shows up.",
  },
  geo: {
    label: "Ready for AI search",
    blurb: "Whether AI search tools can read your site. No check can make one recommend you.",
  },
};

const STATUS_VALUE: Record<string, number> = { pass: 1, warn: 0.5, fail: 0 };

/**
 * Weighted pass ratio, 0-100. "unknown" and "info" checks are excluded
 * entirely: one could not be measured, the other is not a requirement.
 */
export function scoreChecks(checks: AuditCheck[]): number | null {
  let earned = 0;
  let possible = 0;
  for (const c of checks) {
    if (c.status === "unknown" || c.status === "info") continue;
    possible += c.weight;
    earned += c.weight * STATUS_VALUE[c.status];
  }
  if (possible === 0) return null;
  return Math.round((earned / possible) * 100);
}

export function runChecks(ctx: ScanContext): AuditCategory[] {
  const byCategory: Record<string, AuditCheck[]> = {};
  for (const def of CHECKS) {
    let outcome: Omit<AuditCheck, "id" | "label" | "weight">;
    try {
      outcome = def.run(ctx);
    } catch {
      // A single broken check must never take down the whole audit.
      outcome = {
        status: "unknown",
        detail: "This check couldn't be completed.",
        why: "",
        fix: "",
      };
    }
    (byCategory[def.category] ||= []).push({
      id: def.id,
      label: def.label,
      weight: def.weight,
      ...(def.source ? { source: def.source } : {}),
      ...outcome,
    });
  }

  return (["technical", "content", "geo"] as CategoryId[]).map((id) => ({
    id,
    label: CATEGORY_META[id].label,
    blurb: CATEGORY_META[id].blurb,
    weight: CATEGORY_WEIGHTS[id],
    score: scoreChecks(byCategory[id] || []),
    state: "ready" as const,
    checks: byCategory[id] || [],
  }));
}

export function performanceCategoryShell(state: "pending" | "unavailable", note?: string): AuditCategory {
  return {
    id: "performance",
    label: CATEGORY_META.performance.label,
    blurb: CATEGORY_META.performance.blurb,
    weight: CATEGORY_WEIGHTS.performance,
    score: null,
    state,
    note,
    checks: [],
  };
}

export { CATEGORY_META };

/** Weighted mean across categories that actually have a score. */
export function overallScore(categories: AuditCategory[]): number {
  let earned = 0;
  let weight = 0;
  for (const c of categories) {
    if (c.score == null) continue;
    earned += c.score * c.weight;
    weight += c.weight;
  }
  if (weight === 0) return 0;
  return Math.round(earned / weight);
}
