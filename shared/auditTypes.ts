/**
 * Shapes shared between the audit API (server/audit/*) and the hero UI
 * (src/components/audit/*). Kept outside both so neither owns the contract.
 *
 * Rule that governs every field here: `detail` and every number reports
 * something actually observed on the visitor's site or returned by Google.
 * When we can't measure something the status is "unknown" and we say so —
 * we never fill a gap with an estimate.
 */

export type CheckStatus = "pass" | "warn" | "fail" | "unknown";

export type CategoryId = "technical" | "content" | "performance" | "geo";

export interface AuditCheck {
  id: string;
  label: string;
  status: CheckStatus;
  /** The observed value, verbatim — "Title is 78 characters". */
  detail: string;
  /** One line on why it costs them money. */
  why: string;
  /** The action that fixes it. */
  fix: string;
  weight: number;
}

export type CategoryState = "ready" | "pending" | "unavailable";

export interface AuditCategory {
  id: CategoryId;
  label: string;
  blurb: string;
  /** 0-100, or null when the category hasn't been measured. */
  score: number | null;
  weight: number;
  state: CategoryState;
  /** Explains a pending or unavailable state. */
  note?: string;
  checks: AuditCheck[];
}

export interface CoreWebVitals {
  /** "field" is real Chrome user data; "lab" is a single simulated run. */
  source: "field" | "lab";
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  ttfbMs: number | null;
}

export interface LighthouseScores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

export interface AuditMeta {
  fetchedAt: string;
  statusCode: number;
  durationMs: number;
  redirects: number;
  cached: boolean;
  /** True while the PageSpeed stage is still outstanding. */
  psiPending: boolean;
}

export interface AuditResult {
  auditId: string;
  url: string;
  finalUrl: string;
  domain: string;
  overall: number;
  /** "preliminary" until the PageSpeed category lands. */
  overallState: "preliminary" | "final";
  categories: AuditCategory[];
  cwv: CoreWebVitals | null;
  lighthouse: LighthouseScores | null;
  meta: AuditMeta;
}

/** Response of the second stage; merged into the AuditResult client-side. */
export interface PsiResult {
  auditId: string;
  available: boolean;
  /** Null when the server had no stored scan; the client recomputes locally. */
  overall: number | null;
  category: AuditCategory;
  cwv: CoreWebVitals | null;
  lighthouse: LighthouseScores | null;
  note?: string;
}

export interface AuditErrorResponse {
  error: {
    code: string;
    message: string;
    status?: number;
    retryAfterSec?: number;
  };
}

export const CATEGORY_WEIGHTS: Record<CategoryId, number> = {
  technical: 25,
  content: 30,
  performance: 25,
  geo: 20,
};
