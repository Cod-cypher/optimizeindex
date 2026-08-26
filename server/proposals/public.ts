/**
 * Turning a Proposal row into something safe to put in front of a prospect.
 *
 * The row carries fields the prospect must never see (adminNotes, accessCode)
 * and the page is delivered by inlining JSON into the HTML, so both the field
 * allowlist and the escaping below are load-bearing.
 */

import type { Proposal } from "@prisma/client";
import type {
  CallSource,
  CustomSection,
  ProposalPhase,
  PublicProposal,
} from "../../shared/proposalTypes";

export type { PublicProposal };

/**
 * Narrows a Prisma Json column to the array shape the client expects.
 *
 * Prisma types every Json column as JsonValue, and these columns are written by
 * the admin API rather than by the database, so a row saved before a shape
 * change can hold anything. Returning null on a non-array keeps a bad row from
 * crashing the prospect's page — the section simply does not render.
 */
function jsonArray<T>(value: Proposal[keyof Proposal]): T[] | null {
  return Array.isArray(value) ? (value as T[]) : null;
}

/**
 * Builds the public payload with an explicit allowlist rather than a
 * `delete proposal.adminNotes` denylist: a field added to the schema later
 * should default to private, not default to published on the next deploy.
 */
export function toPublicProposal(p: Proposal): PublicProposal {
  return {
    slug: p.slug,
    companyName: p.companyName,
    contactName: p.contactName,
    email: p.email,
    phone: p.phone,
    websiteUrl: p.websiteUrl,
    city: p.city,
    state: p.state,
    serviceRadius: p.serviceRadius,
    industry: p.industry,
    fleetSize: p.fleetSize,
    truckTypes: jsonArray<string>(p.truckTypes),
    heroImageUrl: p.heroImageUrl,
    logoImageUrl: p.logoImageUrl,

    currentCalls: p.currentCalls,
    callSources: jsonArray<CallSource>(p.callSources),
    currentNotes: p.currentNotes,

    projectedCalls: p.projectedCalls,
    avgJobValue: p.avgJobValue,
    timeframeMonths: p.timeframeMonths,
    projectionBasis: p.projectionBasis,

    phases: jsonArray<ProposalPhase>(p.phases),
    deliverables: jsonArray<string>(p.deliverables),
    monthlyPrice: p.monthlyPrice,
    setupFee: p.setupFee,
    termMonths: p.termMonths,
    ctaLabel: p.ctaLabel,
    ctaUrl: p.ctaUrl,
    customSections: jsonArray<CustomSection>(p.customSections),

    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    preparedOn: (p.publishedAt ?? p.createdAt).toISOString(),
  };
}

/**
 * Serializes a value for embedding inside <script>...</script>.
 *
 * JSON.stringify alone is not enough. A company name containing "</script>"
 * would close the tag and everything after it becomes markup — the prospect's
 * own data is attacker-controlled input as far as this page is concerned, since
 * it is typed in by an admin who may be pasting from an email.
 *
 * U+2028 and U+2029 are valid in JSON strings but are line terminators in
 * JavaScript source, so they must be escaped too.
 */
export function serializeForScriptTag(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * User agents that fetch a link without a human looking at it.
 *
 * Gmail, Outlook and most security gateways prefetch every URL in a message.
 * Without this, the admin dashboard reports "viewed" seconds after the proposal
 * is sent, and you call a prospect who has not opened anything. Anything
 * matched here is recorded with isBot=true and excluded from view counts.
 *
 * This is a heuristic and is intentionally not the only defence — the real
 * signal is the 3-second beacon that sets `confirmed`. A scanner that lies
 * about its user agent still will not run the page's JavaScript.
 */
const BOT_UA =
  /bot|crawler|spider|crawl|slurp|preview|fetcher|monitor|scan|curl|wget|python-requests|okhttp|headless|lighthouse|facebookexternalhit|whatsapp|telegram|slackbot|discord|linkedinbot|twitterbot|bingpreview|google-?(?:safety|read-aloud|proxy)|via ggpht|outlook|office|microsoft|proofpoint|mimecast|barracuda|symantec|forcepoint/i;

export function isLikelyBot(userAgent: string | undefined): boolean {
  if (!userAgent || userAgent.trim() === "") return true; // no UA at all is not a browser
  return BOT_UA.test(userAgent);
}

/**
 * Whether a proposal should render for the public at all.
 *
 * Drafts and archived proposals 404 rather than 403 — a 403 confirms the slug
 * exists, which leaks that a named company is a prospect.
 */
export function isViewable(p: Pick<Proposal, "status" | "expiresAt">): boolean {
  if (p.status !== "PUBLISHED") return false;
  if (p.expiresAt && p.expiresAt.getTime() < Date.now()) return false;
  return true;
}
