/**
 * Client half of the instant site audit.
 *
 * Follows the same shape as leads.ts: enrich with the visitor/session ids the
 * first-party tracker already maintains, POST, and throw on failure so the
 * caller can render a real state instead of a spinner that never resolves.
 */

import { getVisitorId, getSessionId } from './tracker';
import type {
  AuditCategory,
  AuditCheck,
  AuditResult,
  PsiResult,
} from '../../shared/auditTypes';

export type {
  AuditCategory,
  AuditCheck,
  AuditResult,
  CategoryId,
  CheckStatus,
  CoreWebVitals,
  LighthouseScores,
  PsiResult,
} from '../../shared/auditTypes';

/** Mirrors the server's AuditError codes so the UI can be specific. */
export type AuditFailureCode =
  | 'INVALID_URL'
  | 'BLOCKED_HOST'
  | 'DNS_FAILED'
  | 'UNREACHABLE'
  | 'TIMEOUT'
  | 'TOO_MANY_REDIRECTS'
  | 'TOO_LARGE'
  | 'BOT_BLOCKED'
  | 'BAD_STATUS'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'UNKNOWN';

export class AuditFailure extends Error {
  code: AuditFailureCode;
  status?: number;
  retryAfterSec?: number;
  constructor(code: AuditFailureCode, message: string, status?: number, retryAfterSec?: number) {
    super(message);
    this.name = 'AuditFailure';
    this.code = code;
    this.status = status;
    this.retryAfterSec = retryAfterSec;
  }
}

/**
 * Cheap client-side sanity check so an obvious typo doesn't cost a round trip.
 * The server re-validates everything — this is convenience, not security.
 */
export function looksLikeDomain(raw: string): boolean {
  const value = raw.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const host = value.split(/[/?#]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host) && host.length <= 253;
}

/** Strips scheme and trailing slash for display: "https://acme.com/" -> "acme.com" */
export function displayDomain(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuditFailure('NETWORK', "We couldn't reach our servers. Check your connection and try again.");
  }

  if (!res.ok) {
    let code: AuditFailureCode = 'UNKNOWN';
    let message = 'Something went wrong running that scan.';
    let status: number | undefined;
    let retryAfterSec: number | undefined;
    try {
      const body = await res.json();
      if (body?.error) {
        code = (body.error.code as AuditFailureCode) || 'UNKNOWN';
        message = body.error.message || message;
        status = body.error.status;
        retryAfterSec = body.error.retryAfterSec;
      }
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new AuditFailure(code, message, status, retryAfterSec);
  }

  return (await res.json()) as T;
}

export function runScan(url: string): Promise<AuditResult> {
  return postJson<AuditResult>('/api/audit/scan', {
    url,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
  });
}

export function runPsi(auditId: string, url: string): Promise<PsiResult> {
  return postJson<PsiResult>('/api/audit/psi', { auditId, url });
}

/** Weighted mean across categories that have a score. Mirrors the server. */
export function overallScore(categories: AuditCategory[]): number {
  let earned = 0;
  let weight = 0;
  for (const c of categories) {
    if (c.score == null) continue;
    earned += c.score * c.weight;
    weight += c.weight;
  }
  return weight === 0 ? 0 : Math.round(earned / weight);
}

/** Merges the PageSpeed stage into the stage-one result. */
export function mergePsi(base: AuditResult, psi: PsiResult): AuditResult {
  const categories = base.categories.map((c) =>
    c.id === 'performance' ? psi.category : c,
  );
  return {
    ...base,
    categories,
    overall: psi.overall ?? overallScore(categories),
    overallState: 'final',
    cwv: psi.cwv,
    lighthouse: psi.lighthouse,
    meta: { ...base.meta, psiPending: false },
  };
}

/** Marks the performance card unavailable when the PageSpeed call itself failed. */
export function markPsiUnavailable(base: AuditResult, note: string): AuditResult {
  const categories = base.categories.map((c) =>
    c.id === 'performance'
      ? { ...c, state: 'unavailable' as const, score: null, note }
      : c,
  );
  return {
    ...base,
    categories,
    overall: overallScore(categories),
    overallState: 'final',
    meta: { ...base.meta, psiPending: false },
  };
}

export interface IssueBuckets {
  critical: AuditCheck[];
  warnings: AuditCheck[];
  passed: number;
}

export function bucketIssues(result: AuditResult): IssueBuckets {
  const all = result.categories.flatMap((c) => c.checks);
  return {
    critical: all.filter((c) => c.status === 'fail'),
    warnings: all.filter((c) => c.status === 'warn'),
    passed: all.filter((c) => c.status === 'pass').length,
  };
}

/**
 * Plain-text summary attached to the lead, so the notification email says what
 * is actually wrong with the prospect's site rather than just their address.
 */
export function summarizeForLead(result: AuditResult): string {
  const { critical, warnings, passed } = bucketIssues(result);
  const lines: string[] = [
    `INSTANT AUDIT — ${result.domain}`,
    `Overall score: ${result.overall}/100 (${result.overallState})`,
    ...result.categories.map(
      (c) => `  ${c.label}: ${c.score != null ? `${c.score}/100` : c.state === 'unavailable' ? 'not measured' : 'pending'}`,
    ),
    '',
    `${passed} checks passed · ${warnings.length} warnings · ${critical.length} critical`,
  ];

  if (result.cwv) {
    const v = result.cwv;
    lines.push(
      '',
      `Core Web Vitals (${v.source === 'field' ? 'real user data' : 'lab'}): ` +
        `LCP ${v.lcpMs ?? '—'}ms · CLS ${v.cls ?? '—'} · INP/TBT ${v.inpMs ?? '—'}ms`,
    );
  }

  if (critical.length) {
    lines.push('', 'CRITICAL:');
    critical.forEach((c) => lines.push(`  - ${c.label}: ${c.detail}`));
  }
  if (warnings.length) {
    lines.push('', 'WARNINGS:');
    warnings.forEach((c) => lines.push(`  - ${c.label}: ${c.detail}`));
  }
  return lines.join('\n');
}
