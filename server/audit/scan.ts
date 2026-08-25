/**
 * Stage one of the audit: fetch the homepage and everything around it, then
 * run every check that doesn't need Google. Targets 2-4 seconds so the hero
 * has something real on screen while PageSpeed is still running.
 */

import * as cheerio from "cheerio";
import { URL } from "node:url";
import {
  AuditError,
  normalizeInput,
  safeFetch,
  type FetchResult,
} from "./url";
import {
  parseRobots,
  runChecks,
  overallScore,
  performanceCategoryShell,
  type ScanContext,
  type RobotsInfo,
  type SitemapInfo,
} from "./checks";
import type { AuditResult } from "../../shared/auditTypes";

const HTML_TIMEOUT_MS = 10000;
const AUX_TIMEOUT_MS = 5000;
const HTML_MAX_BYTES = 2 * 1024 * 1024;
const AUX_MAX_BYTES = 512 * 1024;

/** A best-effort GET that resolves to null instead of throwing. */
async function tryFetch(
  url: string,
  accept: string,
  maxBytes = AUX_MAX_BYTES,
): Promise<FetchResult | null> {
  try {
    return await safeFetch(url, {
      timeoutMs: AUX_TIMEOUT_MS,
      maxBytes,
      maxRedirects: 2,
      accept,
    });
  } catch {
    return null;
  }
}

/**
 * Fetches the homepage over https, falling back to http. A site that only
 * answers on http is a real finding, not an error.
 */
async function fetchHomepage(url: URL): Promise<{ res: FetchResult; https: boolean }> {
  try {
    const res = await safeFetch(url, {
      timeoutMs: HTML_TIMEOUT_MS,
      maxBytes: HTML_MAX_BYTES,
    });
    if (res.status >= 200 && res.status < 400) {
      return { res, https: res.finalUrl.protocol === "https:" };
    }
    // A 4xx/5xx over https is still the site's real answer — report the status
    // rather than silently retrying over http and reporting something else.
    if (res.status !== 403 && res.status !== 503) {
      return { res, https: res.finalUrl.protocol === "https:" };
    }
    throw new AuditError(
      "BOT_BLOCKED",
      "The site blocked our request. Sites behind aggressive bot protection can't be scanned automatically.",
      res.status,
    );
  } catch (err) {
    if (err instanceof AuditError && err.code === "BLOCKED_HOST") throw err;
    if (url.protocol === "https:") {
      const httpUrl = new URL(url.toString());
      httpUrl.protocol = "http:";
      const res = await safeFetch(httpUrl, {
        timeoutMs: HTML_TIMEOUT_MS,
        maxBytes: HTML_MAX_BYTES,
      });
      return { res, https: res.finalUrl.protocol === "https:" };
    }
    throw err;
  }
}

function countSitemapUrls(xml: string): number | null {
  const locs = xml.match(/<loc>/gi);
  return locs ? locs.length : null;
}

async function resolveSitemap(origin: string, robots: RobotsInfo): Promise<SitemapInfo> {
  const candidates = [...robots.sitemaps];
  if (!candidates.length) candidates.push(`${origin}/sitemap.xml`);

  for (const candidate of candidates.slice(0, 3)) {
    let absolute: string;
    try {
      absolute = new URL(candidate, origin).toString();
    } catch {
      continue;
    }
    const res = await tryFetch(absolute, "application/xml,text/xml,*/*;q=0.8");
    if (res && res.ok && /<(urlset|sitemapindex)/i.test(res.body)) {
      return { found: true, url: absolute, urlCount: countSitemapUrls(res.body) };
    }
  }
  return { found: false, url: null, urlCount: null };
}

/** Does the http:// version force an upgrade to https? null if undeterminable. */
async function checkHttpUpgrade(origin: URL): Promise<boolean | null> {
  const httpUrl = new URL(origin.toString());
  httpUrl.protocol = "http:";
  httpUrl.port = "";
  try {
    const res = await safeFetch(httpUrl, {
      timeoutMs: AUX_TIMEOUT_MS,
      maxBytes: 64 * 1024,
      maxRedirects: 3,
    });
    return res.finalUrl.protocol === "https:";
  } catch {
    return null;
  }
}

/** Do www and non-www end up at the same hostname? null if undeterminable. */
async function checkWwwConsolidation(finalUrl: URL): Promise<boolean | null> {
  const host = finalUrl.hostname;
  const other = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  const alt = new URL(finalUrl.toString());
  alt.hostname = other;
  alt.pathname = "/";
  alt.search = "";
  try {
    const res = await safeFetch(alt, {
      timeoutMs: AUX_TIMEOUT_MS,
      maxBytes: 64 * 1024,
      maxRedirects: 3,
    });
    if (!res.ok && res.status >= 400) return true; // the other host isn't served at all
    return res.finalUrl.hostname === host;
  } catch {
    // Most commonly the alternate hostname simply doesn't resolve, which is
    // the consolidated outcome we want.
    return true;
  }
}

export interface ScanOutcome {
  result: Omit<AuditResult, "auditId">;
  context: ScanContext;
}

export async function runScan(rawInput: string): Promise<ScanOutcome> {
  const startedAt = Date.now();
  const { url, domain } = normalizeInput(rawInput);

  const { res, https } = await fetchHomepage(url);

  if (res.status === 403 || res.status === 429) {
    throw new AuditError(
      "BOT_BLOCKED",
      "The site blocked our request — it's behind bot protection that won't let an automated scan through.",
      res.status,
    );
  }
  if (res.status >= 400) {
    throw new AuditError(
      "BAD_STATUS",
      `The site responded with HTTP ${res.status} instead of serving a page.`,
      res.status,
    );
  }
  if (!res.body.trim()) {
    throw new AuditError("BAD_STATUS", "The site returned an empty response.", res.status);
  }

  const origin = res.finalUrl.origin;

  // Everything else is independent of the homepage parse — fetch in parallel.
  const [robotsRes, llmsRes, httpUpgradesToHttps, wwwConsolidated] = await Promise.all([
    tryFetch(`${origin}/robots.txt`, "text/plain,*/*;q=0.8"),
    tryFetch(`${origin}/llms.txt`, "text/plain,*/*;q=0.8"),
    checkHttpUpgrade(res.finalUrl),
    checkWwwConsolidation(res.finalUrl),
  ]);

  const robotsFound = Boolean(
    robotsRes &&
      robotsRes.ok &&
      /(user-agent|disallow|allow|sitemap)\s*:/i.test(robotsRes.body),
  );
  const robots = parseRobots(robotsFound ? robotsRes!.body : "", robotsFound);
  const sitemap = await resolveSitemap(origin, robots);

  const llmsTxt = Boolean(
    llmsRes && llmsRes.ok && llmsRes.body.trim().length > 0 &&
      !/<html/i.test(llmsRes.body.slice(0, 500)),
  );

  const context: ScanContext = {
    requestedUrl: url,
    finalUrl: res.finalUrl,
    domain,
    status: res.status,
    redirects: res.redirects,
    html: res.body,
    $: cheerio.load(res.body),
    headers: res.headers,
    servedOverHttps: https,
    httpUpgradesToHttps,
    wwwConsolidated,
    robots,
    sitemap,
    llmsTxt,
  };

  const categories = runChecks(context);
  categories.splice(2, 0, performanceCategoryShell("pending", "Measuring with Google PageSpeed…"));

  return {
    context,
    result: {
      url: url.toString(),
      finalUrl: res.finalUrl.toString(),
      domain,
      overall: overallScore(categories),
      overallState: "preliminary",
      categories,
      cwv: null,
      lighthouse: null,
      meta: {
        fetchedAt: new Date().toISOString(),
        statusCode: res.status,
        durationMs: Date.now() - startedAt,
        redirects: res.redirects,
        cached: false,
        psiPending: true,
      },
    },
  };
}
