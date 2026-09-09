/**
 * Getting a person into the conversation.
 *
 * Two jobs: compose the email that carries the join link, and fold a transcript
 * into the fixed-width fields the Lead table has.
 *
 * The email itself is sent by a closure passed in from server.ts, so every SMTP
 * credential read stays in the one file that already owns them. That file's
 * mail path is working production code handling every lead the business gets;
 * this feature does not refactor it.
 */

import type { ChatConversation, ChatMessage } from "@prisma/client";
import { SITE_ORIGIN } from "../../src/routes";

/** Lead.comments is clamped to 5000 by the pipeline. Leave headroom. */
const COMMENTS_BUDGET = 4900;

/** How many turns ride along in the notification email. */
const EMAIL_TRANSCRIPT_TURNS = 10;

export interface HandoffMail {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/**
 * Where a join link points.
 *
 * SITE_ORIGIN is a hardcoded https://optimizeindex.com, which is correct in
 * production and wrong everywhere else: a handoff triggered against a dev
 * server would email a link to the live site, where the conversation does not
 * exist and the route may not even be deployed yet. That produces a plain 404
 * and looks like the feature is broken when it is only pointed at the wrong
 * machine.
 *
 * PUBLIC_ORIGIN overrides it explicitly. Otherwise production uses SITE_ORIGIN
 * and anything else assumes the local server, so end-to-end testing of the
 * handoff works on a laptop without touching production.
 */
export function chatOrigin(): string {
  const explicit = process.env.PUBLIC_ORIGIN;
  if (explicit) return explicit.endsWith("/") ? explicit.slice(0, -1) : explicit;
  if (process.env.NODE_ENV === "production") return SITE_ORIGIN;
  return `http://localhost:${process.env.PORT || 3001}`;
}

export function joinUrl(token: string): string {
  return `${chatOrigin()}/chat/join/${token}`;
}

function speaker(row: ChatMessage): string {
  if (row.role === "VISITOR") return "Visitor";
  if (row.role === "AGENT") return row.authorLabel || "Agent";
  if (row.role === "SYSTEM") return "—";
  return "Assistant";
}

/** Plain-text transcript, oldest first. */
export function renderTranscript(rows: ChatMessage[]): string {
  return rows.map((row) => `${speaker(row)}: ${row.content}`).join("\n");
}

const REASON_LABELS: Record<string, string> = {
  visitor_asked: "asked for a person",
  qualified_lead: "looks like a lead",
  out_of_scope: "question we could not answer",
  complaint: "unhappy",
  pricing: "asking about price",
};

export function reasonLabel(reason: string | null): string {
  return REASON_LABELS[reason || ""] || "wants a person";
}

/* -------------------------------------------------------------------------
   The notification email
------------------------------------------------------------------------- */

/**
 * Builds the handoff email.
 *
 * The facts table is rendered by the caller using the existing leadHtml and
 * leadText helpers in server.ts, so this returns the pieces rather than the
 * finished HTML — reusing those two keeps the notification looking like every
 * other email the site sends.
 */
export function handoffFacts(
  conversation: ChatConversation,
  audit: { domain: string; score: number | null } | null,
): Record<string, string> {
  const started = conversation.createdAt.toISOString().replace("T", " ").slice(0, 16);
  const minutes = Math.max(
    1,
    Math.round((conversation.lastMessageAt.getTime() - conversation.createdAt.getTime()) / 60000),
  );

  return {
    Reason: reasonLabel(conversation.handoffReason),
    Name: conversation.visitorName || "",
    Email: conversation.visitorEmail || "",
    Phone: conversation.visitorPhone || "",
    Company: conversation.visitorCompany || "",
    Area: conversation.visitorArea || "",
    Website: conversation.visitorWebsite || "",
    Page: conversation.startedOn || "",
    Audit: audit ? `${audit.domain} scored ${audit.score ?? "n/a"}/100` : "",
    Started: `${started} UTC`,
    Duration: `${minutes} min, ${conversation.turnCount} assistant replies`,
  };
}

export function handoffSubject(conversation: ChatConversation): string {
  const who =
    conversation.visitorCompany ||
    conversation.visitorName ||
    conversation.visitorWebsite ||
    "A visitor";
  return `Live chat: ${who} — ${reasonLabel(conversation.handoffReason)}`;
}

/**
 * The call to action.
 *
 * States plainly that opening the link does not announce you. That is not
 * reassurance for its own sake — mail clients prefetch links, so the link has
 * to be safe to open, and the person clicking it needs to know that joining is
 * a separate, deliberate act.
 */
export function joinBlockText(url: string, summary: string | null): string {
  return [
    summary ? `What they want: ${summary}` : "",
    "",
    `Join the conversation: ${url}`,
    "",
    "The link expires in 48 hours. Opening it does not announce you — you join with a button once you are looking at the transcript.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function joinBlockHtml(url: string, summary: string | null): string {
  const escaped = url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const summaryHtml = summary
    ? `<p style="margin:0 0 16px;font:14px/1.5 -apple-system,Segoe UI,sans-serif">${escapeHtml(summary)}</p>`
    : "";

  return `${summaryHtml}<p style="margin:0 0 12px"><a href="${escaped}" style="display:inline-block;padding:12px 20px;background:#C9F31D;color:#141210;font:700 14px/1 -apple-system,Segoe UI,sans-serif;text-decoration:none;border:2px solid #141210;border-radius:999px">Join the conversation</a></p><p style="margin:0;font:12px/1.5 -apple-system,Segoe UI,sans-serif;color:#5F5C53">The link expires in 48 hours. Opening it does not announce you — you join with a button once you are looking at the transcript.</p>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The last N turns, for the body of the email. */
export function emailTranscript(rows: ChatMessage[]): string {
  return renderTranscript(rows.slice(-EMAIL_TRANSCRIPT_TURNS));
}

/* -------------------------------------------------------------------------
   Transcript into Lead.comments
------------------------------------------------------------------------- */

/**
 * Packs a conversation into the comments field.
 *
 * Lead.comments is clamped to 5000 characters by the pipeline, and a long chat
 * will exceed that. Naive truncation would cut the end — which is exactly the
 * part worth reading, since that is where the visitor said what they wanted.
 *
 * So the header is built first and always survives, and the transcript is then
 * added from the *most recent* turn backwards until the budget runs out. What
 * gets dropped is the oldest small talk, and the reader is told how many turns
 * are missing rather than being left to wonder.
 */
export function buildLeadComments(input: {
  summary: string;
  area?: string | null;
  phone?: string | null;
  startedOn: string | null;
  joinLink: string | null;
  auditLine: string | null;
  messages: ChatMessage[];
}): string {
  // Area and phone are repeated at the top even though they have their own
  // columns, because the notification email renders this field as the body and
  // whoever reads it on a phone should not have to scroll a transcript to find
  // out where the person is or how to ring them.
  const header = [
    input.summary,
    "",
    input.phone ? `Phone: ${input.phone}` : "",
    input.area ? `Area: ${input.area}` : "",
    input.joinLink ? `Live chat: ${input.joinLink}` : "",
    input.startedOn ? `Started on ${input.startedOn}` : "",
    input.auditLine || "",
    `${input.messages.length} messages`,
  ]
    .filter(Boolean)
    .join("\n");

  const lines = input.messages.map((row) => `${speaker(row)}: ${row.content}`);
  const separator = "\n\n--- transcript ---\n";

  const kept: string[] = [];
  let used = header.length + separator.length;

  for (let i = lines.length - 1; i >= 0; i--) {
    const cost = lines[i].length + 1;
    if (used + cost > COMMENTS_BUDGET) {
      const dropped = i + 1;
      kept.unshift(`[${dropped} earlier message${dropped === 1 ? "" : "s"} not shown]`);
      break;
    }
    kept.unshift(lines[i]);
    used += cost;
  }

  return header + separator + kept.join("\n");
}
