/**
 * Typed fetch wrappers for the admin API.
 *
 * Everything goes through `request`, so a 401 has one place to be handled: the
 * session expired while a tab was open, and the app needs to fall back to the
 * login screen rather than show an empty list.
 */

export interface ValidationProblem {
  field: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  problems: ValidationProblem[];

  constructor(status: number, message: string, problems: ValidationProblem[] = []) {
    super(message);
    this.status = status;
    this.problems = problems;
  }
}

/** Set by AdminApp so an expired session anywhere returns to the login screen. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });

  if (res.status === 401) {
    onUnauthorized?.();
    throw new ApiError(401, 'Your session expired. Sign in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    const problems = Array.isArray(body.problems) ? (body.problems as ValidationProblem[]) : [];

    /*
      Prefer the server's actual reason. It sends specifics in `problems` —
      "Give the template a name", "that slug is reserved" — and falling straight
      through to the generic status text threw all of that away, leaving
      "Some fields need attention" with no indication of which, or why.
    */
    const message =
      typeof body.message === 'string'
        ? body.message
        : problems.length === 1
          ? problems[0].message
          : problems.length > 1
            ? `${problems.length} fields need attention.`
            : describeStatus(res.status);

    throw new ApiError(res.status, message, problems);
  }

  return (await res.json()) as T;
}

function describeStatus(status: number): string {
  if (status === 400) return 'Some fields need attention before this can be saved.';
  if (status === 404) return 'That proposal no longer exists.';
  if (status === 413) return 'That file is too large.';
  if (status === 503) return 'Cannot reach the database right now.';
  return `Request failed (${status}).`;
}

/* ------------------------------------------------------------------------- */

export type ProposalStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/** The row shape the list view renders. */
export interface ProposalSummary {
  id: string;
  slug: string;
  status: ProposalStatus;
  companyName: string;
  contactName: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  expiresAt: string | null;
  currentCalls: number | null;
  projectedCalls: number | null;
  viewCount: number;
  lastViewedAt: string | null;
  ctaClicks: number;
}

/** The full record, as stored. Money fields are in cents. */
export interface ProposalRecord {
  id: string;
  slug: string;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  expiresAt: string | null;
  accessCode: string | null;

  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  city: string | null;
  state: string | null;
  serviceRadius: number | null;
  industry: string | null;
  fleetSize: number | null;
  truckTypes: string[] | null;
  heroImageUrl: string | null;
  logoImageUrl: string | null;

  currentCalls: number | null;
  callSources: { source: string; share?: number; calls?: number; note?: string }[] | null;
  currentNotes: string | null;

  projectedCalls: number | null;
  avgJobValue: number | null;
  timeframeMonths: number | null;
  projectionBasis: string | null;

  phases: { title: string; timeline?: string; items: string[] }[] | null;
  deliverables: string[] | null;
  monthlyPrice: number | null;
  setupFee: number | null;
  termMonths: number | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  customSections: { heading: string; body: string }[] | null;

  adminNotes: string | null;
}

/** One page of results, plus the pipeline-wide counters for the header. */
export interface ProposalListPage {
  proposals: ProposalSummary[];
  page: number;
  perPage: number;
  /** Rows matching the current filter — what the pager counts. */
  total: number;
  totalPages: number;
  /** Whole pipeline, ignoring the current filter. */
  stats: { total: number; live: number; opened: number };
}

export interface ActivityView {
  id: string;
  viewedAt: string;
  durationMs: number | null;
  maxScrollPct: number | null;
  viewerKey: string | null;
  referrer: string | null;
}

export interface ActivityEvent {
  id: string;
  name: string;
  label: string | null;
  createdAt: string;
}

export interface Activity {
  views: ActivityView[];
  events: ActivityEvent[];
  summary: {
    viewCount: number;
    uniqueViewers: number;
    lastViewedAt: string | null;
    ctaClicks: number;
    scannerHits: number;
  };
}

/** A template the admin saved from one of their own proposals. */
export interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------------- */

export const api = {
  list: (params: { status?: string; q?: string; page?: number; perPage?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params.q) qs.set('q', params.q);
    if (params.page && params.page > 1) qs.set('page', String(params.page));
    if (params.perPage) qs.set('perPage', String(params.perPage));
    const suffix = qs.toString() ? `?${qs}` : '';
    return request<ProposalListPage>(`/api/admin/proposals${suffix}`);
  },

  get: (id: string) => request<{ proposal: ProposalRecord }>(`/api/admin/proposals/${id}`),

  /**
   * `templateId` seeds whatever the template carries — for a built-in that is
   * the plan, deliverables and equipment wording; for one you saved it is
   * whatever you ticked, prospect figures included. Anything explicitly passed
   * in `data` still takes precedence over the template.
   *
   * Rejects with 404 if the template no longer exists, rather than quietly
   * creating an empty draft.
   */
  create: (data: Partial<ProposalRecord> & { templateId?: string }) =>
    request<{ proposal: ProposalRecord }>('/api/admin/proposals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Saves the supplied fields. Every field that can be written is written.
   *
   * `problems` names the ones that could not be — in practice only the slug,
   * which is reported rather than rejected so a half-typed URL cannot take the
   * rest of the patch down with it.
   */
  update: (id: string, data: Partial<ProposalRecord>) =>
    request<{ proposal: ProposalRecord; problems?: ValidationProblem[] }>(
      `/api/admin/proposals/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) },
    ),

  publish: (id: string) =>
    request<{ proposal: ProposalRecord }>(`/api/admin/proposals/${id}/publish`, { method: 'POST' }),

  unpublish: (id: string) =>
    request<{ proposal: ProposalRecord }>(`/api/admin/proposals/${id}/unpublish`, {
      method: 'POST',
    }),

  duplicate: (id: string) =>
    request<{ proposal: ProposalRecord }>(`/api/admin/proposals/${id}/duplicate`, {
      method: 'POST',
    }),

  archive: (id: string) => request<{ ok: true }>(`/api/admin/proposals/${id}`, { method: 'DELETE' }),

  activity: (id: string) => request<Activity>(`/api/admin/proposals/${id}/activity`),

  templates: () => request<{ templates: SavedTemplate[] }>('/api/admin/templates'),

  /** What each selectable group would contribute, or null if there is nothing. */
  templateGroups: (proposalId: string) =>
    request<{
      groups: Record<string, string | null>;
      specs: { id: string; label: string; prospectSpecific?: boolean }[];
    }>(`/api/admin/proposals/${proposalId}/template-groups`),

  saveTemplate: (data: {
    name: string;
    description?: string;
    fromProposalId: string;
    /** Which groups to include. Omit for all of them. */
    include?: string[];
  }) =>
    request<{ template: SavedTemplate }>('/api/admin/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteTemplate: (id: string) =>
    request<{ ok: true }>(`/api/admin/templates/${id}`, { method: 'DELETE' }),

  /**
   * Fills a draft that already exists from a template.
   *
   * By default only empty fields are filled, so nothing already typed is lost;
   * `overwrite` replaces everything the template carries. `applied` names the
   * columns that actually changed, so the editor can say what happened instead
   * of leaving you to hunt for it.
   */
  applyTemplate: (id: string, data: { templateId: string; overwrite?: boolean }) =>
    request<{ proposal: ProposalRecord; applied: string[] }>(
      `/api/admin/proposals/${id}/apply-template`,
      { method: 'POST', body: JSON.stringify(data) },
    ),

  upload: (dataUrl: string, filename: string) =>
    request<{ url: string; bytes: number }>('/api/admin/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, filename }),
    }),
};
