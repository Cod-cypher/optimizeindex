/**
 * Stage two: Google PageSpeed Insights.
 *
 * This is the slow half (10-30s), which is why it runs as its own request
 * after stage one has already put findings on screen.
 *
 * Two rules here. Field data (real Chrome users) and lab data (one simulated
 * run) are never conflated — we label which one a number came from. And when
 * PageSpeed is unavailable we say so and score around it, rather than
 * substituting a guess.
 */

import type {
  AuditCategory,
  AuditCheck,
  CoreWebVitals,
  LighthouseScores,
} from "../../shared/auditTypes";
import { CATEGORY_WEIGHTS } from "../../shared/auditTypes";
import { CATEGORY_META, scoreChecks } from "./checks";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PSI_TIMEOUT_MS = 45000;

export interface PsiOutcome {
  available: boolean;
  note?: string;
  category: AuditCategory;
  cwv: CoreWebVitals | null;
  lighthouse: LighthouseScores | null;
}

interface PsiMetric {
  percentile?: number;
  category?: string;
}

function unavailable(note: string): PsiOutcome {
  return {
    available: false,
    note,
    category: {
      id: "performance",
      label: CATEGORY_META.performance.label,
      blurb: CATEGORY_META.performance.blurb,
      weight: CATEGORY_WEIGHTS.performance,
      score: null,
      state: "unavailable",
      note,
      checks: [],
    },
    cwv: null,
    lighthouse: null,
  };
}

function scoreToStatus(score: number | null, good: number, ok: number): AuditCheck["status"] {
  if (score == null) return "unknown";
  if (score >= good) return "pass";
  if (score >= ok) return "warn";
  return "fail";
}

function metricStatus(value: number | null, good: number, poor: number): AuditCheck["status"] {
  if (value == null) return "unknown";
  if (value <= good) return "pass";
  if (value <= poor) return "warn";
  return "fail";
}

function fmtMs(ms: number | null): string {
  if (ms == null) return "not measured";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export async function runPsi(url: string): Promise<PsiOutcome> {
  const key = process.env.PAGESPEED_API_KEY;
  const params = new URLSearchParams({ url, strategy: "mobile" });
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) {
    params.append("category", c);
  }
  if (key) params.set("key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  let data: Record<string, any>;
  try {
    const res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (res.status === 429) {
      return unavailable("Google's speed API is rate-limited right now. We'll measure this by hand in your full report.");
    }
    if (!res.ok) {
      return unavailable(`Google couldn't complete a speed test on this URL (HTTP ${res.status}). We'll measure it manually.`);
    }
    data = (await res.json()) as Record<string, any>;
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return unavailable(
      aborted
        ? "Google's speed test timed out on this site. We'll measure it by hand in your full report."
        : "Couldn't reach Google's speed API. We'll measure this manually in your full report.",
    );
  } finally {
    clearTimeout(timer);
  }

  const lhr = data.lighthouseResult;
  if (!lhr) {
    return unavailable("Google couldn't render this site for a speed test. We'll measure it manually.");
  }

  const cat = lhr.categories || {};
  const pct = (v: unknown) => (typeof v === "number" ? Math.round(v * 100) : null);
  const lighthouse: LighthouseScores = {
    performance: pct(cat.performance?.score),
    accessibility: pct(cat.accessibility?.score),
    bestPractices: pct(cat["best-practices"]?.score),
    seo: pct(cat.seo?.score),
  };

  // Prefer field data (real Chrome users over the last 28 days). Fall back to
  // the lab run, and label which one the visitor is looking at.
  const field = data.loadingExperience?.metrics as Record<string, PsiMetric> | undefined;
  const hasField = Boolean(
    field && (field.LARGEST_CONTENTFUL_PAINT_MS || field.CUMULATIVE_LAYOUT_SHIFT_SCORE),
  );
  const audits = lhr.audits || {};
  const labMs = (id: string) =>
    typeof audits[id]?.numericValue === "number" ? Math.round(audits[id].numericValue) : null;

  let cwv: CoreWebVitals;
  if (hasField && field) {
    cwv = {
      source: "field",
      lcpMs: field.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
      cls:
        field.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null
          ? field.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
          : null,
      inpMs: field.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
      ttfbMs: field.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile ?? null,
    };
  } else {
    cwv = {
      source: "lab",
      lcpMs: labMs("largest-contentful-paint"),
      cls:
        typeof audits["cumulative-layout-shift"]?.numericValue === "number"
          ? Number(audits["cumulative-layout-shift"].numericValue.toFixed(3))
          : null,
      inpMs: labMs("total-blocking-time"),
      ttfbMs: labMs("server-response-time"),
    };
  }

  const sourceLabel =
    cwv.source === "field"
      ? "real Chrome user data, last 28 days"
      : "lab test — not enough real user traffic for field data";

  const checks: AuditCheck[] = [
    {
      id: "lighthouse-performance",
      label: "Performance score",
      weight: 4,
      status: scoreToStatus(lighthouse.performance, 90, 50),
      detail:
        lighthouse.performance != null
          ? `Google scores this site ${lighthouse.performance}/100 on mobile.`
          : "Google couldn't produce a performance score.",
      why: "Mobile speed is a confirmed ranking factor, and every second of load time costs conversions.",
      fix: "Compress and lazy-load images, defer non-critical JavaScript, and enable server-side caching.",
    },
    {
      id: "lcp",
      label: "Largest Contentful Paint",
      weight: 3,
      status: metricStatus(cwv.lcpMs, 2500, 4000),
      detail: `LCP is ${fmtMs(cwv.lcpMs)} (${sourceLabel}). Google's threshold for "good" is 2.5s.`,
      why: "LCP is how long until the main content appears — the number visitors experience as 'is this site slow?'",
      fix: "Optimise the hero image, preload it, and cut server response time.",
    },
    {
      id: "cls",
      label: "Cumulative Layout Shift",
      weight: 2,
      status: metricStatus(cwv.cls, 0.1, 0.25),
      detail:
        cwv.cls != null
          ? `CLS is ${cwv.cls} (${sourceLabel}). Google's threshold for "good" is 0.1.`
          : "CLS was not measured.",
      why: "Content jumping around while the page loads makes visitors mis-tap and abandon.",
      fix: "Set explicit width and height on images and reserve space for ads and embeds.",
    },
    {
      id: "inp",
      label:
        cwv.source === "field" ? "Interaction to Next Paint" : "Total Blocking Time",
      weight: 2,
      status:
        cwv.source === "field"
          ? metricStatus(cwv.inpMs, 200, 500)
          : metricStatus(cwv.inpMs, 200, 600),
      detail:
        cwv.source === "field"
          ? `INP is ${fmtMs(cwv.inpMs)} (real Chrome user data). Google's threshold for "good" is 200ms.`
          : `Total Blocking Time is ${fmtMs(cwv.inpMs)} (lab test). Under 200ms is good.`,
      why: "This is how long the page feels frozen after a tap — the difference between a form completed and abandoned.",
      fix: "Break up long JavaScript tasks and remove render-blocking third-party scripts.",
    },
    {
      id: "lighthouse-seo",
      label: "Google's own SEO checks",
      weight: 2,
      status: scoreToStatus(lighthouse.seo, 90, 70),
      detail:
        lighthouse.seo != null
          ? `Lighthouse SEO score is ${lighthouse.seo}/100.`
          : "Google couldn't produce an SEO score.",
      why: "Google's own automated checks for crawlability and mobile-friendliness basics.",
      fix: "Work through the failing items in the PageSpeed Insights SEO section.",
    },
    {
      id: "lighthouse-accessibility",
      label: "Accessibility",
      weight: 2,
      status: scoreToStatus(lighthouse.accessibility, 90, 70),
      detail:
        lighthouse.accessibility != null
          ? `Lighthouse accessibility score is ${lighthouse.accessibility}/100.`
          : "Google couldn't produce an accessibility score.",
      why: "Beyond the legal exposure, accessibility problems are usually usability problems costing you conversions.",
      fix: "Fix colour contrast, form labels and focus order first — they carry the most weight.",
    },
    {
      id: "lighthouse-best-practices",
      label: "Best practices",
      weight: 1,
      status: scoreToStatus(lighthouse.bestPractices, 90, 70),
      detail:
        lighthouse.bestPractices != null
          ? `Lighthouse best-practices score is ${lighthouse.bestPractices}/100.`
          : "Google couldn't produce a best-practices score.",
      why: "Flags insecure requests, deprecated APIs and console errors that erode trust signals.",
      fix: "Clear the issues listed in the PageSpeed Insights best-practices section.",
    },
  ];

  return {
    available: true,
    cwv,
    lighthouse,
    category: {
      id: "performance",
      label: CATEGORY_META.performance.label,
      blurb: CATEGORY_META.performance.blurb,
      weight: CATEGORY_WEIGHTS.performance,
      score: scoreChecks(checks),
      state: "ready",
      note:
        cwv.source === "field"
          ? "Core Web Vitals from real Chrome users over the last 28 days."
          : "This site doesn't have enough traffic for Google's real-user dataset, so these are lab measurements.",
      checks,
    },
  };
}
