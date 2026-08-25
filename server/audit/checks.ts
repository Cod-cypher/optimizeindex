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
    run: (ctx) => {
      if (!ctx.robots.found) {
        return {
          status: "warn",
          detail: "No robots.txt found at /robots.txt.",
          why: "This file tells Google which pages to look at. Without it, Google is guessing.",
          fix: "Add this small file so Google knows which pages to read and where your page list is.",
        };
      }
      if (ctx.robots.blocksRoot) {
        return {
          status: "fail",
          detail: "robots.txt blocks Googlebot from crawling the site root.",
          why: "One line in this file is telling Google to ignore your entire site.",
          fix: "Remove the line blocking Google. This is urgent — it is hiding your whole site.",
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
    run: (ctx) => {
      if (!ctx.sitemap.found) {
        return {
          status: "fail",
          detail: "No XML sitemap found at /sitemap.xml or referenced in robots.txt.",
          why: "Without this list, new pages can take weeks to show up in Google, or never appear at all.",
          fix: "Have a page list generated automatically and submit it to Google Search Console.",
        };
      }
      const count = ctx.sitemap.urlCount;
      return {
        status: "pass",
        detail:
          count != null
            ? `Sitemap found at ${ctx.sitemap.url} listing ${count} URL${count === 1 ? "" : "s"}.`
            : `Sitemap found at ${ctx.sitemap.url}.`,
        why: "Google gets a direct list of every page you want found.",
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
    run: (ctx) => {
      const title = (ctx.$("head title").first().text() || "").trim();
      if (!title) {
        return {
          status: "fail",
          detail: "The page has no title tag.",
          why: "This is the blue clickable line customers see in Google. Right now there is nothing there.",
          fix: "Write a short headline with what you do and where, plus your business name.",
        };
      }
      const len = title.length;
      if (len < 30) {
        return {
          status: "warn",
          detail: `Title is ${len} characters: "${title}"`,
          why: "You get a fixed amount of space in Google's results and you are only using part of it.",
          fix: "Make it longer. Lead with what you do and the town you serve, then your name.",
        };
      }
      if (len > 60) {
        return {
          status: "warn",
          detail: `Title is ${len} characters: "${title}"`,
          why: "Google cuts your headline off partway, so customers never read the end of it.",
          fix: "Shorten it, and put the most important words first.",
        };
      }
      return {
        status: "pass",
        detail: `Title is ${len} characters: "${title}"`,
        why: "Your headline shows in full, so more people click it.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "meta-description",
    category: "content",
    label: "The description under your headline",
    weight: 3,
    run: (ctx) => {
      const desc = (ctx.$('meta[name="description"]').first().attr("content") || "").trim();
      if (!desc) {
        return {
          status: "fail",
          detail: "No meta description on the homepage.",
          why: "Google will write this line for you from whatever text it finds. It is rarely your best pitch.",
          fix: "Write a sentence or two saying what you do and why someone should call you.",
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
          fix: "Rewrite it to a sentence or two with a clear reason to call you.",
        };
      }
      return {
        status: "pass",
        detail: `Meta description is ${len} characters.`,
        why: "This is your sales line in Google's results, and it fits.",
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
    run: (ctx) => {
      const words = wordCount(ctx);
      if (words < 150) {
        return {
          status: "fail",
          detail: `Roughly ${words} words of text on the homepage.`,
          why: "There is not enough here for Google to work out what you do or who you serve.",
          fix: "Add a few paragraphs covering your services, your areas, and why people hire you.",
        };
      }
      if (words < 300) {
        return {
          status: "warn",
          detail: `Roughly ${words} words of text on the homepage.`,
          why: "With this little text you will struggle to rank for anything except your own business name.",
          fix: "Add sections answering the questions customers ask before they book.",
        };
      }
      return {
        status: "pass",
        detail: `Roughly ${words} words of text on the homepage.`,
        why: "Enough on the page for Google to match you to what customers actually search for.",
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
          why: "Your homepage is your strongest page. Links from it are how your service pages get found.",
          fix: "Link from your homepage to each service and each area you cover.",
        };
      }
      return {
        status: "pass",
        detail: `${internal} internal links and ${external} external links.`,
        why: "Your strongest page is helping your other pages rank.",
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

  /* --- AI search & GEO readiness ---------------------------------------- */
  {
    id: "server-rendered",
    category: "geo",
    label: "AI assistants can read your site",
    weight: 4,
    run: (ctx) => {
      const words = wordCount(ctx);
      const scripts = ctx.$("script[src]").length + ctx.$("script:not([src])").length;
      if (words < 100 && scripts >= 2) {
        return {
          status: "fail",
          detail: `Only ~${words} words are present in the raw HTML, with ${scripts} script tags — the content is rendered by JavaScript.`,
          why: "ChatGPT and similar assistants cannot run the code your site needs to display. To them it is blank.",
          fix: "Have your site send finished pages instead of building them in the browser.",
        };
      }
      if (words < 300 && scripts >= 2) {
        return {
          status: "warn",
          detail: `Only ~${words} words are present in the raw HTML before JavaScript runs.`,
          why: "AI assistants only see this much of your page. The rest never reaches them.",
          fix: "Have your main content sent with the page instead of loaded afterwards.",
        };
      }
      return {
        status: "pass",
        detail: `~${words} words are present in the raw HTML without JavaScript.`,
        why: "AI assistants can read your page directly.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "schema-org",
    category: "geo",
    label: "Your details in a format Google reads",
    weight: 3,
    run: (ctx) => {
      const types = schemaTypes(ctx);
      if (types.size === 0) {
        return {
          status: "fail",
          detail: "No Schema.org JSON-LD found on the page.",
          why: "This is how Google reads your hours, phone number and services as facts instead of guessing.",
          fix: "Add the hidden details block with your name, phone, hours and services.",
        };
      }
      return {
        status: "pass",
        detail: `Structured data found: ${[...types].slice(0, 6).join(", ")}${types.size > 6 ? `, +${types.size - 6} more` : ""}.`,
        why: "Google and AI assistants can read your business details as facts.",
        fix: "Nothing to do here.",
      };
    },
  },
  {
    id: "entity-schema",
    category: "geo",
    label: "Google knows you are a business",
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
          why: "Google recognises you as a real business it can name and recommend.",
          fix: "Nothing to do here.",
        };
      }
      return {
        status: "fail",
        detail: "No Organization or LocalBusiness markup found.",
        why: "Without this, an AI assistant cannot confidently name you, place you, or recommend you to someone nearby.",
        fix: "Add a business details block with your name, address, phone and social profiles.",
      };
    },
  },
  {
    id: "answer-schema",
    category: "geo",
    label: "Set up to answer customer questions",
    weight: 2,
    run: (ctx) => {
      const types = schemaTypes(ctx);
      const found = hasAnyType(types, ["FAQPage", "QAPage", "HowTo", "Article", "Product", "Service", "BreadcrumbList"]);
      if (found) {
        return {
          status: "pass",
          detail: `${found} markup is present.`,
          why: "This is the kind of content AI assistants quote when someone asks a question.",
          fix: "Nothing to do here.",
        };
      }
      return {
        status: "warn",
        detail: "No FAQ, HowTo, Article or Product markup found.",
        why: "Answering common customer questions on the page is what gets you quoted in AI answers.",
        fix: "Add a questions-and-answers section covering what customers actually ask.",
      };
    },
  },
  {
    id: "ai-crawlers",
    category: "geo",
    label: "AI assistants are allowed in",
    weight: 3,
    run: (ctx) => {
      if (!ctx.robots.found) {
        return {
          status: "pass",
          detail: "No robots.txt, so AI crawlers are allowed by default.",
          why: "ChatGPT, Claude and Perplexity can read your site.",
          fix: "Nothing to do here.",
        };
      }
      const blocked = Object.entries(ctx.robots.aiBots)
        .filter(([, allowed]) => !allowed)
        .map(([bot]) => bot);
      if (blocked.length === 0) {
        return {
          status: "pass",
          detail: `robots.txt allows ${AI_CRAWLERS.join(", ")}.`,
          why: "You can be recommended in AI answers.",
          fix: "Nothing to do here.",
        };
      }
      return {
        status: "fail",
        detail: `robots.txt blocks ${blocked.join(", ")}.`,
        why: "These assistants cannot read your site, so they will never suggest you. They will suggest a competitor.",
        fix: `Remove the disallow rules for ${blocked.join(", ")} in robots.txt, unless blocking them is deliberate.`,
      };
    },
  },
  {
    id: "llms-txt",
    category: "geo",
    label: "A summary written for AI",
    weight: 1,
    run: (ctx) =>
      ctx.llmsTxt
        ? {
            status: "pass",
            detail: "/llms.txt is published.",
            why: "Tells AI assistants what you do in your own words instead of leaving them to guess.",
            fix: "Nothing to do here.",
          }
        : {
            status: "warn",
            detail: "No /llms.txt file found.",
            why: "A new, simple file that tells AI assistants what your business does and which pages matter.",
            fix: "Publish a short summary file describing your business for AI assistants.",
          },
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
          why: "Being easy to contact is something Google measures when deciding whether to trust you.",
          fix: "Nothing to do here.",
        };
      }
      return {
        status: signals.length === 0 ? "fail" : "warn",
        detail: signals.length
          ? `Only found: ${signals.join(", ")}.`
          : "No phone link, email link, address markup or policy pages found.",
        why: "Customers cannot easily reach you, and Google has little reason to treat you as an established business.",
        fix: "Add a tap-to-call phone number, your address, and your policy links in the footer.",
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
    label: "Showing up in AI answers",
    blurb: "Whether ChatGPT and Google's AI answers can recommend you.",
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
