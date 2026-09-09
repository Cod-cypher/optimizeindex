/**
 * The three things the assistant can actually do, beyond talking.
 *
 * Every handler here is written on the assumption that the model got the
 * arguments wrong: it may omit a required field, invent a URL, or call a tool
 * twice. Handlers return a structured refusal the model can act on rather than
 * throwing, because "ask them for their website first" is a better recovery
 * than a stack trace.
 *
 * Dependencies are injected rather than imported so this module stays testable
 * and so the lead path is provably the same function the forms call, not a
 * second implementation of it.
 */

import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { ToolDef } from "./openai";
import { AuditError, normalizeInput } from "../audit/url";
import { runScan } from "../audit/scan";
import { checkRateLimit } from "../audit/ratelimit";
import type { AuditCategory, AuditResult } from "../../shared/auditTypes";

/* -------------------------------------------------------------------------
   Schemas
------------------------------------------------------------------------- */

/**
 * `strict: true` with `additionalProperties: false` makes the model's arguments
 * conform to the schema rather than approximately conform, which removes most
 * of the defensive parsing this would otherwise need.
 *
 * Almost every field is nullable, because the model is expected to call
 * save_contact_details the moment it learns anything rather than waiting until
 * it has a full picture. Under strict mode a nullable field still has to be
 * listed in `required` — omitting it there is a 400 on every request, which is
 * invisible from the visitor's side.
 */
export const TOOLS: ToolDef[] = [
  {
    type: "function",
    name: "run_site_audit",
    description:
      "Run the free automated audit on a website and get its scores and worst findings. Ask the visitor's permission before calling this — it fetches their site. Only call it once per conversation unless they give a different address. This runs here and now and takes about fifteen seconds; do not describe it as taking 24 hours. The 24-hour turnaround mentioned on the site is the written fix plan a person sends afterwards, which is a separate thing.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["url"],
      properties: {
        url: {
          type: "string",
          description: "The website to check, as the visitor gave it. Do not invent or guess one.",
        },
      },
    },
  },
  {
    type: "function",
    name: "save_contact_details",
    description:
      "Record who you are talking to. Call this the MOMENT you learn any detail — a name, an email, a phone number, the area they operate in, a company or a website — including when it is mentioned in passing. Do not wait to collect them all. Call it again each time you learn something new; passing null for what you still do not know is expected and correct. As soon as an email address is recorded the team is notified that a lead came in, so getting the email is the single most valuable thing you do in a conversation.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["name", "email", "phone", "area", "company", "website", "summary"],
      properties: {
        name: { type: ["string", "null"], description: "What they said their name is." },
        email: {
          type: ["string", "null"],
          description: "Exactly as typed. Never guess, correct or complete it.",
        },
        phone: { type: ["string", "null"], description: "Exactly as typed." },
        area: {
          type: ["string", "null"],
          description:
            "Where they operate, in their words — a city, a region, a set of states, or nationwide.",
        },
        company: { type: ["string", "null"] },
        website: { type: ["string", "null"] },
        summary: {
          type: ["string", "null"],
          description:
            "One or two sentences on what they want, in their words, once you know. Null early on. Do not invent detail they did not give.",
        },
      },
    },
  },
  {
    type: "function",
    name: "request_human",
    description:
      "Ask a person to join this conversation. Call this whenever the visitor asks for a human, asks about price, is unhappy, or asks something the reference material does not cover.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["reason", "urgency", "summary"],
      properties: {
        reason: {
          type: "string",
          enum: ["visitor_asked", "qualified_lead", "out_of_scope", "complaint", "pricing"],
        },
        urgency: { type: ["string", "null"], enum: ["now", "today", "anytime", null] },
        summary: {
          type: "string",
          description: "One or two sentences telling the person what they are walking into.",
        },
      },
    },
  },
];

/* -------------------------------------------------------------------------
   Context and results
------------------------------------------------------------------------- */

export interface ToolContext {
  prisma: PrismaClient;
  conversationId: string;
  ipAddress: string;
  userAgent: string;
  /** Analytics ids, copied onto any lead so the funnel joins up as usual. */
  visitorId?: string | null;
  sessionId?: string | null;
  gaClientId?: string | null;
  startedOn?: string | null;
  /** The extracted /api/leads pipeline. Same function the forms use. */
  persistLead: PersistLead;
  /** Triggers the handoff email. Returns false when no notification got out. */
  requestHuman: (reason: string, summary: string, urgency: string) => Promise<boolean>;
}

export type PersistLead = (leadData: Record<string, string>) => Promise<{
  id: string | null;
  emailForwarded: boolean;
}>;

/** What the model receives back. Serialized to JSON as the tool output. */
export type ToolResult = Record<string, unknown>;

/**
 * Side effects the route needs to know about, collected rather than returned to
 * the model. The model gets told what happened; the route needs to act on it.
 */
export interface ToolEffects {
  handoffTriggered: boolean;
  leadCaptured: boolean;
  auditRan: boolean;
}

/* -------------------------------------------------------------------------
   Dispatch
------------------------------------------------------------------------- */

export async function runTool(
  name: string,
  rawArgs: string,
  ctx: ToolContext,
  effects: ToolEffects,
): Promise<ToolResult> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(rawArgs || "{}") as Record<string, unknown>;
  } catch {
    // A malformed arguments string must never take the request down. Telling
    // the model its own output was unreadable is enough for it to retry.
    return { ok: false, error: "arguments_not_json", hint: "Send valid JSON arguments." };
  }

  const str = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);

  switch (name) {
    case "run_site_audit":
      return runAuditTool(str(args.url, 2000), ctx, effects);

    case "save_contact_details":
      return saveContactTool(
        {
          name: str(args.name, 200),
          email: str(args.email, 320),
          phone: str(args.phone, 50),
          area: str(args.area, 200),
          company: str(args.company, 200),
          website: str(args.website, 500),
          summary: str(args.summary, 2000),
        },
        ctx,
        effects,
      );

    case "request_human":
      return requestHumanTool(
        str(args.reason, 50),
        str(args.summary, 1000),
        str(args.urgency, 20),
        ctx,
        effects,
      );

    default:
      return { ok: false, error: "unknown_tool" };
  }
}

/* -------------------------------------------------------------------------
   run_site_audit
------------------------------------------------------------------------- */

const AUDIT_CACHE_MS = 6 * 60 * 60 * 1000;

/**
 * Runs the real audit — the same engine behind the homepage hero, not a
 * description of one.
 *
 * Three reuses matter here. normalizeInput is the SSRF guard and is not
 * optional: the URL came from a language model relaying a stranger, and handing
 * that to a fetcher unchecked is how a server gets used to probe a private
 * network. The 6-hour SiteAudit cache stops a conversation re-scanning a domain
 * the hero already did. And the *audit* rate limiter is used deliberately
 * rather than the chat one, because the cost being metered is fetching someone
 * else's server, which is identical whichever entry point asked for it.
 */
async function runAuditTool(
  rawUrl: string,
  ctx: ToolContext,
  effects: ToolEffects,
): Promise<ToolResult> {
  if (!rawUrl) {
    return { ok: false, error: "no_url", hint: "Ask the visitor for their website address." };
  }

  let domain: string;
  try {
    domain = normalizeInput(rawUrl).domain;
  } catch (err) {
    return {
      ok: false,
      error: "invalid_url",
      detail: err instanceof AuditError ? err.message : "That does not look like a website address.",
      hint: "Ask them to confirm the address.",
    };
  }

  const cached = await ctx.prisma.siteAudit
    .findFirst({
      where: {
        domain,
        psiFetched: true,
        checks: { not: Prisma.DbNull },
        createdAt: { gt: new Date(Date.now() - AUDIT_CACHE_MS) },
      },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);

  if (cached?.checks) {
    effects.auditRan = true;
    await linkAudit(ctx, cached.id);
    return summarise(cached.checks as unknown as AuditResult, true);
  }

  const limit = checkRateLimit(ctx.ipAddress || "unknown");
  if (!limit.allowed) {
    return { ok: false, error: "rate_limited", detail: limit.message };
  }

  try {
    const { result } = await runScan(rawUrl);

    const saved = await ctx.prisma.siteAudit
      .create({
        data: {
          url: result.url,
          finalUrl: result.finalUrl,
          domain: result.domain,
          overallScore: result.overall,
          technicalScore: scoreOf(result.categories, "technical"),
          contentScore: scoreOf(result.categories, "content"),
          geoScore: scoreOf(result.categories, "geo"),
          durationMs: result.meta.durationMs,
          checks: result as unknown as Prisma.InputJsonValue,
          visitorId: ctx.visitorId || null,
          sessionId: ctx.sessionId || null,
          ipAddress: ctx.ipAddress.slice(0, 100),
          userAgent: ctx.userAgent.slice(0, 500),
        },
      })
      .catch((err) => {
        console.error("[Chat] Could not persist in-chat audit:", err);
        return null;
      });

    effects.auditRan = true;
    if (saved) await linkAudit(ctx, saved.id);

    console.log(`[Chat] Audited ${result.domain} — ${result.overall}/100 in conversation ${ctx.conversationId}`);
    return summarise(result as AuditResult, false);
  } catch (err) {
    console.error("[Chat] In-chat audit failed:", err);
    return {
      ok: false,
      error: "scan_failed",
      detail: err instanceof AuditError ? err.message : "The site could not be reached.",
    };
  }
}

async function linkAudit(ctx: ToolContext, auditId: string): Promise<void> {
  await ctx.prisma.chatConversation
    .update({ where: { id: ctx.conversationId }, data: { auditId } })
    .catch(() => {});
}

function scoreOf(categories: AuditCategory[], id: string): number | null {
  return categories.find((c) => c.id === id)?.score ?? null;
}

/**
 * A compact summary, not the whole report.
 *
 * The full AuditResult is a large object with every check that passed. Handing
 * it over would burn context on good news the visitor does not need to hear,
 * so this sends the scores and only what is actually wrong — which is also the
 * shape of the conversation we want the model to have.
 */
function summarise(result: AuditResult, fromCache: boolean): ToolResult {
  const problems = result.categories
    .flatMap((c) => c.checks.map((check) => ({ ...check, category: c.label })))
    .filter((c) => c.status === "fail" || c.status === "warn")
    .sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === "fail" ? -1 : 1))
    .slice(0, 5)
    .map((c) => ({ category: c.category, issue: c.label, observed: c.detail, fix: c.fix }));

  return {
    ok: true,
    domain: result.domain,
    overallScore: result.overall,
    scores: Object.fromEntries(result.categories.map((c) => [c.id, c.score])),
    topProblems: problems,
    fromCache,
    hint: "Summarise the two or three that matter most in plain language. Do not read out the whole list, and do not invent a fix that is not here.",
  };
}

/* -------------------------------------------------------------------------
   save_contact_details
------------------------------------------------------------------------- */

interface ContactArgs {
  name: string;
  email: string;
  phone: string;
  area: string;
  company: string;
  website: string;
  summary: string;
}

/**
 * Records who we are talking to, and raises the lead the moment it is possible.
 *
 * This replaced a two-tool arrangement — one to note a detail, one to declare a
 * lead — which was the wrong shape twice over. It gave the model a judgement
 * call about when someone "counts" as a lead, and it required an email AND a
 * website before anything was sent, so a visitor who gave a name, a number and
 * their town and then closed the tab produced no notification at all.
 *
 * The rule now is blunt and matches how the forms behave: an email address is
 * what makes a stranger contactable, so the first time we have one the team is
 * notified exactly as if a form had been submitted. Details arriving afterwards
 * update the same lead rather than sending a second email — a notification per
 * message would train everyone to ignore them.
 *
 * Only ever fills blanks in, so a later call that omits a field cannot erase an
 * earlier one.
 */
async function saveContactTool(
  args: ContactArgs,
  ctx: ToolContext,
  effects: ToolEffects,
): Promise<ToolResult> {
  const data: Record<string, string> = {};
  if (args.name) data.visitorName = args.name;
  if (args.email) data.visitorEmail = args.email;
  if (args.phone) data.visitorPhone = args.phone;
  if (args.area) data.visitorArea = args.area;
  if (args.company) data.visitorCompany = args.company;
  if (args.website) data.visitorWebsite = args.website;
  if (args.summary) data.qualifiedReason = args.summary;

  if (Object.keys(data).length === 0) {
    return {
      ok: false,
      error: "nothing_given",
      hint: "Only call this once you actually have a detail.",
    };
  }

  const updated = await ctx.prisma.chatConversation
    .update({
      where: { id: ctx.conversationId },
      data,
      select: { visitorEmail: true, leadId: true },
    })
    .catch(() => null);

  // An email address is the threshold. The route raises the lead once this turn
  // ends, and no-ops if one already exists for this conversation.
  const notify = Boolean(updated?.visitorEmail);
  if (notify) effects.leadCaptured = true;

  return {
    ok: true,
    saved: Object.keys(data).map((k) => k.replace("visitor", "").toLowerCase()),
    haveEmail: notify,
    hint: notify
      ? "Recorded, and the team has it. Never mention that you saved anything or that anyone was notified — just carry on."
      : "Recorded. Do not mention it. An email address is still the most useful thing to get.",
  };
}

/* -------------------------------------------------------------------------
   request_human
------------------------------------------------------------------------- */

async function requestHumanTool(
  reason: string,
  summary: string,
  urgency: string,
  ctx: ToolContext,
  effects: ToolEffects,
): Promise<ToolResult> {
  const notified = await ctx.requestHuman(reason || "visitor_asked", summary, urgency);
  effects.handoffTriggered = true;

  return {
    ok: true,
    notified,
    hint: notified
      ? "Tell them someone has been asked to join. Do not promise how quickly."
      : "The message did not get through. Give them the email address and phone number instead.",
  };
}
