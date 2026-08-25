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
import type { AuditCheck, AuditCategory, CategoryId } from "../../shared/auditTypes";
import { CATEGORY_WEIGHTS } from "../../shared/auditTypes";

export interface RobotsInfo {
  found: boolean;
  text: string;
  sitemaps: string[];
  blocksRoot: boolean;
  /** AI/LLM crawler name -> allowed to read the homepage. */
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
  run: (ctx: ScanContext) => Omit<AuditCheck, "id" | "label" | "weight">;
};

/* -------------------------------------------------------------------------
   Small helpers
------------------------------------------------------------------------- */

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
];

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
export function robotsAllows(text: string, userAgent: string): boolean {
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
    if (!"/".startsWith(rule.path.replace(/\*.*$/, ""))) continue;
    if (rule.path !== "/" && !rule.path.startsWith("/")) continue;
    const matches = rule.path === "/" || rule.path === "/*";
    if (!matches) continue;
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
  for (const bot of AI_CRAWLERS) {
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
    label: "Secure connection (HTTPS)",
    weight: 3,
    run: (ctx) => {
      if (ctx.servedOverHttps) {
        return {
          status: "pass",
          detail: `Served over HTTPS at ${ctx.finalUrl.origin}.`,
          why: "Chrome flags non-HTTPS pages as 'Not secure', and Google uses HTTPS as a ranking signal.",
          fix: "No action needed.",
        };
      }
      return {
        status: "fail",
        detail: "The site answered over plain HTTP — no valid HTTPS response.",
        why: "Visitors see a 'Not secure' warning in the address bar, and it suppresses rankings.",
        fix: "Install a TLS certificate (Let's Encrypt is free) and redirect all HTTP traffic to HTTPS.",
      };
    },
  },
  {
    id: "https-redirect",
    category: "technical",
    label: "HTTP redirects to HTTPS",
    weight: 2,
    run: (ctx) => {
      if (ctx.httpUpgradesToHttps === null) {
        return {
          status: "unknown",
          detail: "Couldn't complete the HTTP-to-HTTPS check.",
          why: "Serving both protocols splits your ranking signals between two versions of every page.",
          fix: "Confirm http:// forces a 301 to https://.",
        };
      }
      if (ctx.httpUpgradesToHttps) {
        return {
          status: "pass",
          detail: "http:// redirects to the HTTPS version.",
          why: "Keeps every link and ranking signal pointing at one canonical protocol.",
          fix: "No action needed.",
        };
      }
      return {
        status: "fail",
        detail: "http:// serves content instead of redirecting to HTTPS.",
        why: "Google can index both versions, splitting your authority across duplicate URLs.",
        fix: "Add a server-level 301 from http:// to https:// for every path.",
      };
    },
  },
  {
    id: "www-consolidation",
    category: "technical",
    label: "www / non-www consolidated",
    weight: 1,
    run: (ctx) => {
      if (ctx.wwwConsolidated === null) {
        return {
          status: "unknown",
          detail: "Couldn't complete the www / non-www check.",
          why: "Two reachable hostnames means two copies of your site competing with each other.",
          fix: "Pick one hostname and 301 the other to it.",
        };
      }
      return ctx.wwwConsolidated
        ? {
            status: "pass",
            detail: `Both www and non-www resolve to ${ctx.finalUrl.hostname}.`,
            why: "One hostname means one set of ranking signals instead of two competing ones.",
            fix: "No action needed.",
          }
        : {
            status: "warn",
            detail: "www and non-www both serve the site without redirecting to one another.",
            why: "Google may treat them as two sites, halving the authority each one earns.",
            fix: "Choose a primary hostname and 301 the other to it.",
          };
    },
  },
  {
    id: "robots-txt",
    category: "technical",
    label: "robots.txt",
    weight: 2,
    run: (ctx) => {
      if (!ctx.robots.found) {
        return {
          status: "warn",
          detail: "No robots.txt found at /robots.txt.",
          why: "Without it you can't steer crawl budget away from pages that shouldn't be indexed.",
          fix: "Add a robots.txt that allows your public pages and points to your sitemap.",
        };
      }
      if (ctx.robots.blocksRoot) {
        return {
          status: "fail",
          detail: "robots.txt blocks Googlebot from crawling the site root.",
          why: "This single line can remove your entire site from Google.",
          fix: "Remove the 'Disallow: /' rule from the Googlebot or wildcard group immediately.",
        };
      }
      return {
        status: "pass",
        detail: `robots.txt found and Googlebot is allowed to crawl the site.`,
        why: "Crawlers can reach your pages.",
        fix: "No action needed.",
      };
    },
  },
  {
    id: "sitemap",
    category: "technical",
    label: "XML sitemap",
    weight: 2,
    run: (ctx) => {
      if (!ctx.sitemap.found) {
        return {
          status: "fail",
          detail: "No XML sitemap found at /sitemap.xml or referenced in robots.txt.",
          why: "Google has to discover every page by following links — new and deep pages get indexed slowly or not at all.",
          fix: "Generate an XML sitemap, reference it from robots.txt, and submit it in Search Console.",
        };
      }
      const count = ctx.sitemap.urlCount;
      return {
        status: "pass",
        detail:
          count != null
            ? `Sitemap found at ${ctx.sitemap.url} listing ${count} URL${count === 1 ? "" : "s"}.`
            : `Sitemap found at ${ctx.sitemap.url}.`,
        why: "Gives Google a direct list of every page you want indexed.",
        fix: "No action needed.",
      };
    },
  },
  {
    id: "indexable",
    category: "technical",
    label: "Page is indexable",
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
          why: "This tells Google to drop the page from search results entirely — no ranking is possible.",
          fix: "Remove the noindex directive from the meta robots tag or X-Robots-Tag header.",
        };
      }
      return {
        status: "pass",
        detail: metaRobots
          ? `Robots directive is "${metaRobots.trim()}" — indexing allowed.`
          : "No noindex directive found.",
        why: "The page is eligible to appear in search results.",
        fix: "No action needed.",
      };
    },
  },
  {
    id: "canonical",
    category: "technical",
    label: "Canonical URL",
    weight: 2,
    run: (ctx) => {
      const href = ctx.$('link[rel="canonical"]').first().attr("href");
      if (!href) {
        return {
          status: "warn",
          detail: "No canonical tag on the homepage.",
          why: "Without one, tracking parameters and trailing-slash variants can each be indexed as a separate page.",
          fix: "Add <link rel=\"canonical\"> pointing at the preferred URL of every page.",
        };
      }
      let resolved: string;
      try {
        resolved = new URL(href, ctx.finalUrl.toString()).toString();
      } catch {
        return {
          status: "fail",
          detail: `Canonical tag contains an invalid URL: "${href}".`,
          why: "A malformed canonical is ignored, or worse, points Google at a page that doesn't exist.",
          fix: "Use an absolute, valid URL in the canonical tag.",
        };
      }
      const same =
        resolved.replace(/\/$/, "") === ctx.finalUrl.toString().replace(/\/$/, "");
      return same
        ? {
            status: "pass",
            detail: `Canonical is self-referential: ${resolved}`,
            why: "Consolidates ranking signals onto one definitive URL.",
            fix: "No action needed.",
          }
        : {
            status: "warn",
            detail: `Canonical points elsewhere: ${resolved}`,
            why: "Google will credit that other URL instead of this one — intentional for duplicates, damaging otherwise.",
            fix: "Confirm this is deliberate; if not, point the canonical at this page.",
          };
    },
  },
  {
    id: "lang",
    category: "technical",
    label: "Language declared",
    weight: 1,
    run: (ctx) => {
      const lang = ctx.$("html").attr("lang");
      return lang
        ? {
            status: "pass",
            detail: `<html lang="${lang}"> is set.`,
            why: "Tells search engines and screen readers what language to expect.",
            fix: "No action needed.",
          }
        : {
            status: "warn",
            detail: "The <html> tag has no lang attribute.",
            why: "Weakens geo-targeting and makes the page harder for screen readers to voice correctly.",
            fix: 'Add lang="en" (or the correct language) to the <html> tag.',
          };
    },
  },
  {
    id: "viewport",
    category: "technical",
    label: "Mobile viewport",
    weight: 2,
    run: (ctx) => {
      const vp = ctx.$('meta[name="viewport"]').first().attr("content");
      return vp
        ? {
            status: "pass",
            detail: `Viewport is set: "${vp}".`,
            why: "Required for the mobile layout Google actually ranks you on.",
            fix: "No action needed.",
          }
        : {
            status: "fail",
            detail: "No viewport meta tag found.",
            why: "Mobile browsers render a zoomed-out desktop layout, and Google indexes the mobile version first.",
            fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
          };
    },
  },

  /* --- On-page & content ------------------------------------------------ */
  {
    id: "title",
    category: "content",
    label: "Title tag",
    weight: 4,
    run: (ctx) => {
      const title = (ctx.$("head title").first().text() || "").trim();
      if (!title) {
        return {
          status: "fail",
          detail: "The page has no title tag.",
          why: "The title is the clickable headline in Google — without one you're invisible in the results.",
          fix: "Write a 30-60 character title with your primary keyword and brand.",
        };
      }
      const len = title.length;
      if (len < 30) {
        return {
          status: "warn",
          detail: `Title is ${len} characters: "${title}"`,
          why: "Short titles waste the most valuable text real estate you own in search results.",
          fix: "Expand to 30-60 characters — lead with what you do, then the location or brand.",
        };
      }
      if (len > 60) {
        return {
          status: "warn",
          detail: `Title is ${len} characters: "${title}"`,
          why: "Google truncates past roughly 60 characters, so the end of your title never gets seen.",
          fix: "Trim to 60 characters or fewer, keeping the important words first.",
        };
      }
      return {
        status: "pass",
        detail: `Title is ${len} characters: "${title}"`,
        why: "Well-sized titles display in full and earn more clicks.",
        fix: "No action needed.",
      };
    },
  },
  {
    id: "meta-description",
    category: "content",
    label: "Meta description",
    weight: 3,
    run: (ctx) => {
      const desc = (ctx.$('meta[name="description"]').first().attr("content") || "").trim();
      if (!desc) {
        return {
          status: "fail",
          detail: "No meta description on the homepage.",
          why: "Google writes its own snippet from whatever text it finds — usually not your sales pitch.",
          fix: "Write a 70-160 character description that states the offer and gives a reason to click.",
        };
      }
      const len = desc.length;
      if (len < 70 || len > 160) {
        return {
          status: "warn",
          detail: `Meta description is ${len} characters (recommended 70-160): "${desc.slice(0, 120)}${desc.length > 120 ? "…" : ""}"`,
          why: len < 70
            ? "A thin description leaves the search snippet doing less selling than it could."
            : "Google truncates past about 160 characters, cutting off your call to action.",
          fix: "Rewrite to 70-160 characters with a clear benefit and a reason to click.",
        };
      }
      return {
        status: "pass",
        detail: `Meta description is ${len} characters.`,
        why: "A well-sized description improves click-through from the results page.",
        fix: "No action needed.",
      };
    },
  },
  {
    id: "h1",
    category: "content",
    label: "H1 heading",
    weight: 3,
    run: (ctx) => {
      const h1s = ctx.$("h1");
      const count = h1s.length;
      if (count === 0) {
        return {
          status: "fail",
          detail: "No H1 heading on the page.",
          why: "The H1 is the strongest on-page signal of what a page is about.",
          fix: "Add exactly one H1 that states the page's main topic in plain language.",
        };
      }
      const first = h1s.first().text().replace(/\s+/g, " ").trim();
      if (count > 1) {
        return {
          status: "warn",
          detail: `Found ${count} H1 headings. The first is "${first.slice(0, 80)}${first.length > 80 ? "…" : ""}".`,
          why: "Multiple H1s dilute the topical signal instead of concentrating it.",
          fix: "Keep one H1 and demote the rest to H2.",
        };
      }
      return {
        status: "pass",
        detail: `One H1: "${first.slice(0, 80)}${first.length > 80 ? "…" : ""}"`,
        why: "A single clear H1 concentrates the page's topical relevance.",
        fix: "No action needed.",
      };
    },
  },
  {
    id: "heading-structure",
    category: "content",
    label: "Heading structure",
    weight: 2,
    run: (ctx) => {
      const h2 = ctx.$("h2").length;
      const h3 = ctx.$("h3").length;
      if (h2 === 0) {
        return {
          status: "warn",
          detail: `No H2 headings found (${h3} H3${h3 === 1 ? "" : "s"}).`,
          why: "Flat pages are harder for Google to parse into sections and rarely win featured snippets.",
          fix: "Break the page into sections with descriptive H2s covering the questions buyers ask.",
        };
      }
      return {
        status: "pass",
        detail: `${h2} H2 heading${h2 === 1 ? "" : "s"} and ${h3} H3${h3 === 1 ? "" : "s"}.`,
        why: "Clear section headings help Google pull answers from your page.",
        fix: "No action needed.",
      };
    },
  },
  {
    id: "content-depth",
    category: "content",
    label: "Content depth",
    weight: 3,
    run: (ctx) => {
      const words = wordCount(ctx);
      if (words < 150) {
        return {
          status: "fail",
          detail: `Roughly ${words} words of text on the homepage.`,
          why: "There isn't enough on the page for Google to understand what you sell or who you serve.",
          fix: "Expand to at least 300-500 words covering your services, proof, and location.",
        };
      }
      if (words < 300) {
        return {
          status: "warn",
          detail: `Roughly ${words} words of text on the homepage.`,
          why: "Thin pages struggle to rank for anything beyond your brand name.",
          fix: "Add sections answering the questions buyers ask before they contact you.",
        };
      }
      return {
        status: "pass",
        detail: `Roughly ${words} words of text on the homepage.`,
        why: "Enough substance for Google to match the page to real queries.",
        fix: "No action needed.",
      };
    },
  },
  {
    id: "image-alt",
    category: "content",
    label: "Image alt text",
    weight: 2,
    run: (ctx) => {
      const imgs = ctx.$("img");
      const total = imgs.length;
      if (total === 0) {
        return {
          status: "unknown",
          detail: "No <img> elements found on the page.",
          why: "Alt text is how image search and screen readers understand your visuals.",
          fix: "Nothing to fix here.",
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
          why: "Alt text feeds image search and keeps the page accessible.",
          fix: "No action needed.",
        };
      }
      const pct = Math.round((missing / total) * 100);
      return {
        status: pct > 50 ? "fail" : "warn",
        detail: `${missing} of ${total} images have no alt attribute at all (${pct}%)${decorative > 0 ? `; ${decorative} are correctly marked decorative` : ""}.`,
        why: "Those images are invisible to image search and to screen-reader users.",
        fix: 'Describe what each image shows, or set alt="" if it is purely decorative.',
      };
    },
  },
  {
    id: "internal-links",
    category: "content",
    label: "Internal linking",
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
          why: "Your homepage carries the most authority; without internal links it can't pass any of it to the pages that convert.",
          fix: "Link from the homepage to your key service and location pages with descriptive anchor text.",
        };
      }
      return {
        status: "pass",
        detail: `${internal} internal links and ${external} external links.`,
        why: "Spreads homepage authority to the pages you want ranking.",
        fix: "No action needed.",
      };
    },
  },
  {
    id: "social-tags",
    category: "content",
    label: "Social share preview",
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
          why: "Shared links render as a proper card instead of a bare URL.",
          fix: "No action needed.",
        };
      }
      return {
        status: missing.length >= 3 ? "fail" : "warn",
        detail: `Missing ${missing.join(", ")}. Present: ${present.length ? present.join(", ") : "none"}.`,
        why: "Links shared on LinkedIn, Facebook or Slack show as plain text and get markedly fewer clicks.",
        fix: "Add the missing Open Graph tags plus a 1200x630 og:image.",
      };
    },
  },

  /* --- AI search & GEO readiness ---------------------------------------- */
  {
    id: "server-rendered",
    category: "geo",
    label: "Content visible without JavaScript",
    weight: 4,
    run: (ctx) => {
      const words = wordCount(ctx);
      const scripts = ctx.$("script[src]").length + ctx.$("script:not([src])").length;
      if (words < 100 && scripts >= 2) {
        return {
          status: "fail",
          detail: `Only ~${words} words are present in the raw HTML, with ${scripts} script tags — the content is rendered by JavaScript.`,
          why: "ChatGPT, Perplexity and Claude don't run JavaScript. To them your site is a blank page.",
          fix: "Server-render or pre-render your pages so the content ships in the initial HTML.",
        };
      }
      if (words < 300 && scripts >= 2) {
        return {
          status: "warn",
          detail: `Only ~${words} words are present in the raw HTML before JavaScript runs.`,
          why: "AI assistants and some crawlers only see this much — the rest of your pitch never reaches them.",
          fix: "Move key content into the server-rendered HTML rather than loading it client-side.",
        };
      }
      return {
        status: "pass",
        detail: `~${words} words are present in the raw HTML without JavaScript.`,
        why: "AI assistants and crawlers can read your content directly.",
        fix: "No action needed.",
      };
    },
  },
  {
    id: "schema-org",
    category: "geo",
    label: "Structured data (Schema.org)",
    weight: 3,
    run: (ctx) => {
      const types = schemaTypes(ctx);
      if (types.size === 0) {
        return {
          status: "fail",
          detail: "No Schema.org JSON-LD found on the page.",
          why: "Structured data is how Google and AI assistants read your business as facts rather than prose.",
          fix: "Add JSON-LD describing your organisation, services and contact details.",
        };
      }
      return {
        status: "pass",
        detail: `Structured data found: ${[...types].slice(0, 6).join(", ")}${types.size > 6 ? `, +${types.size - 6} more` : ""}.`,
        why: "Gives search engines and AI assistants machine-readable facts about you.",
        fix: "No action needed.",
      };
    },
  },
  {
    id: "entity-schema",
    category: "geo",
    label: "Business entity markup",
    weight: 3,
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
          why: "Establishes your business as a recognised entity that AI assistants can cite by name.",
          fix: "No action needed.",
        };
      }
      return {
        status: "fail",
        detail: "No Organization or LocalBusiness markup found.",
        why: "Without entity markup, AI assistants can't confidently name, locate or recommend your business.",
        fix: "Add Organization or LocalBusiness JSON-LD with your name, address, phone and sameAs profile links.",
      };
    },
  },
  {
    id: "answer-schema",
    category: "geo",
    label: "Answer-ready markup",
    weight: 2,
    run: (ctx) => {
      const types = schemaTypes(ctx);
      const found = hasAnyType(types, ["FAQPage", "QAPage", "HowTo", "Article", "Product", "Service", "BreadcrumbList"]);
      if (found) {
        return {
          status: "pass",
          detail: `${found} markup is present.`,
          why: "Content marked up this way is what AI assistants quote when answering questions.",
          fix: "No action needed.",
        };
      }
      return {
        status: "warn",
        detail: "No FAQ, HowTo, Article or Product markup found.",
        why: "AI assistants pull answers from structured Q&A far more readily than from prose.",
        fix: "Add FAQPage markup covering the questions your buyers actually ask.",
      };
    },
  },
  {
    id: "ai-crawlers",
    category: "geo",
    label: "AI crawler access",
    weight: 3,
    run: (ctx) => {
      if (!ctx.robots.found) {
        return {
          status: "pass",
          detail: "No robots.txt, so AI crawlers are allowed by default.",
          why: "GPTBot, ClaudeBot and PerplexityBot can read your site.",
          fix: "No action needed.",
        };
      }
      const blocked = Object.entries(ctx.robots.aiBots)
        .filter(([, allowed]) => !allowed)
        .map(([bot]) => bot);
      if (blocked.length === 0) {
        return {
          status: "pass",
          detail: `robots.txt allows ${AI_CRAWLERS.join(", ")}.`,
          why: "Your content is eligible to be cited in AI search answers.",
          fix: "No action needed.",
        };
      }
      return {
        status: "fail",
        detail: `robots.txt blocks ${blocked.join(", ")}.`,
        why: "Those assistants can't read your site, so they will never recommend you — they'll recommend a competitor.",
        fix: `Remove the disallow rules for ${blocked.join(", ")} in robots.txt, unless blocking them is deliberate.`,
      };
    },
  },
  {
    id: "llms-txt",
    category: "geo",
    label: "llms.txt",
    weight: 1,
    run: (ctx) =>
      ctx.llmsTxt
        ? {
            status: "pass",
            detail: "/llms.txt is published.",
            why: "Gives AI assistants a curated summary of your site instead of making them guess.",
            fix: "No action needed.",
          }
        : {
            status: "warn",
            detail: "No /llms.txt file found.",
            why: "An emerging standard for telling AI assistants what your business does and which pages matter.",
            fix: "Publish an llms.txt at your domain root summarising your offering and key URLs.",
          },
  },
  {
    id: "author-signals",
    category: "geo",
    label: "Trust and contact signals",
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
          why: "Contactability and policy pages are direct inputs to Google's trust assessment.",
          fix: "No action needed.",
        };
      }
      return {
        status: signals.length === 0 ? "fail" : "warn",
        detail: signals.length
          ? `Only found: ${signals.join(", ")}.`
          : "No phone link, email link, address markup or policy pages found.",
        why: "Thin trust signals hold you back in competitive results and make AI assistants less willing to recommend you.",
        fix: "Add a clickable phone number, a real address, and link your privacy and terms pages in the footer.",
      };
    },
  },
];

/* -------------------------------------------------------------------------
   Scoring
------------------------------------------------------------------------- */

const CATEGORY_META: Record<CategoryId, { label: string; blurb: string }> = {
  technical: {
    label: "Technical Foundations",
    blurb: "Can Google reach, crawl and index the site at all?",
  },
  content: {
    label: "On-Page & Content",
    blurb: "Does each page tell Google what it's for and earn the click?",
  },
  performance: {
    label: "Speed & Core Web Vitals",
    blurb: "Real-world loading experience, measured by Google.",
  },
  geo: {
    label: "AI Search & GEO Readiness",
    blurb: "Can ChatGPT, Perplexity and Google's AI answers cite you?",
  },
};

const STATUS_VALUE: Record<string, number> = { pass: 1, warn: 0.5, fail: 0 };

/** Weighted pass ratio, 0-100. "unknown" checks are excluded entirely. */
export function scoreChecks(checks: AuditCheck[]): number | null {
  let earned = 0;
  let possible = 0;
  for (const c of checks) {
    if (c.status === "unknown") continue;
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
