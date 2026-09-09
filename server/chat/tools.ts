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
 * capture_lead requires both email and website because /api/leads requires
 * both — see the validation at the top of that handler. Encoding the existing
 * contract in the schema is cheaper than prompting for it and impossible to
 * drift from.
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
    name: "capture_lead",
    description:
      "Record the visitor as a lead and notify the team. Requires a real email address AND their website — ask for whichever is missing before calling. Call this once, when they have agreed to be contacted.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      // Strict mode requires EVERY key in properties to appear in required.
      // Genuinely optional fields are expressed as nullable instead, and the
      // handler coerces null to an empty string. Listing a field here but not
      // in required is a 400 on every request, which is silent from the
      // visitor's side — they just get the fallback message every time.
      required: ["email", "website", "name", "phone", "company", "service", "summary"],
      properties: {
        email: { type: "string", description: "As they typed it. Do not guess or correct it." },
        website: { type: "string", description: "Their website. Ask if not offered." },
        name: { type: ["string", "null"], description: "Null if not given." },
        phone: { type: ["string", "null"], description: "Null if not given." },
        company: { type: ["string", "null"], description: "Null if not given." },
        service: {
          type: ["string", "null"],
          description: "The service they are asking about, or null.",
          enum: [
            "gmb",
            "seo",
            "aeo",
            "geo",
            "paid-search",
            "paid-social",
            "content",
            "cro",
            "web-design",
            "other",
            null,
          ],
        },
        summary: {
          type: "string",
          description:
            "Two or three sentences: what they want and why now, in their words. Do not add detail they did not give.",
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

    case "capture_lead":
      return captureLeadTool(
        {
          email: str(args.email, 320),
          website: str(args.website, 500),
          name: str(args.name, 200),
          phone: str(args.phone, 50),
          company: str(args.company, 200),
          service: str(args.service, 50),
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
   capture_lead
------------------------------------------------------------------------- */

interface LeadArgs {
  email: string;
  website: string;
  name: string;
  phone: string;
  company: string;
  service: string;
  summary: string;
}

/**
 * Records a lead through the same pipeline every form uses.
 *
 * The transcript is attached by the caller, not here — see buildLeadComments in
 * routes.ts, which has to fit the conversation into a 5000-character column and
 * needs the whole message list to do it.
 */
async function captureLeadTool(
  args: LeadArgs,
  ctx: ToolContext,
  effects: ToolEffects,
): Promise<ToolResult> {
  // The pipeline rejects a lead without both of these, so catch it here where
  // the model can still do something about it.
  if (!args.email || !args.email.includes("@")) {
    return { ok: false, error: "need_email", hint: "Ask for their email address first." };
  }
  if (!args.website) {
    return { ok: false, error: "need_website", hint: "Ask for their website address first." };
  }

  await ctx.prisma.chatConversation
    .update({
      where: { id: ctx.conversationId },
      data: {
        visitorEmail: args.email,
        visitorName: args.name || null,
        visitorPhone: args.phone || null,
        visitorCompany: args.company || null,
        visitorWebsite: args.website,
        qualified: true,
        qualifiedReason: args.summary || null,
      },
    })
    .catch(() => {});

  effects.leadCaptured = true;

  return {
    ok: true,
    recorded: true,
    hint: "Confirm briefly that you have passed it on. Do not promise a response time.",
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
