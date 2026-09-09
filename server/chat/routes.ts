/**
 * HTTP for the chat widget.
 *
 * Three routers: the public visitor API, the agent API behind a join link or an
 * admin session, and a small admin inbox. All mount under /api, which the
 * canonical-host middleware in server.ts skips — a POST that got 301'd to add a
 * trailing slash would arrive as a GET with no body.
 *
 * Transport is polling. The reasons are in the plan, but the short version is
 * that `compression()` buffers SSE and nginx has no proxy_buffering off, so a
 * stream would deliver nothing until the connection closed; and in-memory
 * WebSocket rooms would break silently the day anyone raises the PM2 instance
 * count. Polling reads an indexed table, so it survives both.
 */

import express from "express";
import type { ChatConversation, PrismaClient } from "@prisma/client";
import { SESSION_COOKIE, readCookie, verifySession } from "../auth";
import {
  CHAT_CAP_REACHED,
  CHAT_CLOSED_NOTICE,
  CHAT_GREETING,
  CHAT_HANDOFF_ACK,
  CHAT_HANDOFF_UNAVAILABLE,
  CHAT_OFFLINE_NOTICE,
  CHAT_SEND_FAILED,
  chatAgentJoinedNotice,
  chatAgentLeftNotice,
} from "../../src/content/chat";
import type {
  ChatAgentViewResponse,
  ChatPollResponse,
  ChatStartResponse,
} from "../../shared/chatTypes";
import { asksForHuman, runTurn } from "./engine";
import { hasApiKey } from "./openai";
import { checkChatRate } from "./ratelimit";
import {
  appendMessage,
  createConversation,
  cursorOf,
  fullTranscript,
  getConversation,
  messagesAfter,
  monthlyTokensUsed,
  toMessageDTO,
  MAX_MESSAGE_CHARS,
} from "./store";
import {
  buildLeadComments,
  emailTranscript,
  handoffFacts,
  handoffSubject,
  joinBlockHtml,
  joinBlockText,
  joinUrl,
} from "./handoff";
import {
  AGENT_TTL_MS,
  newAgentTokenId,
  signAgentToken,
  signVisitorToken,
  verifyAgentToken,
  visitorOwns,
} from "./tokens";
import type { PersistLead, ToolContext } from "./tools";

export const AGENT_COOKIE = "oi_chat_agent";

/** Agent cookie life. Shorter than the link, because a desk is not an inbox. */
const AGENT_COOKIE_MS = 12 * 60 * 60 * 1000;

/** One handoff email per conversation per this long, however often it fires. */
const HANDOFF_DEBOUNCE_MS = 15 * 60 * 1000;

const DEFAULT_TOKEN_CAP = 5_000_000;

export interface ChatDeps {
  persistLead: PersistLead;
  /** Returns false when nothing got out. Defined in server.ts beside the SMTP config. */
  sendMail: (msg: { subject: string; html: string; text: string; replyTo?: string }) => Promise<boolean>;
  smtpConfigured: boolean;
  /** Sets noindex + no-store. Chat carries a stranger's email address. */
  setPrivateHeaders: (res: express.Response) => void;
  clientIp: (req: express.Request) => string;
  clientCountry: (req: express.Request) => string | null;
}

const str = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);

function enabled(): boolean {
  return process.env.CHAT_ENABLED !== "false";
}

function agentLabel(): string {
  return process.env.CHAT_AGENT_LABEL || "Ali";
}

function tokenCap(): number {
  const raw = Number(process.env.CHAT_MONTHLY_TOKEN_CAP);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TOKEN_CAP;
}

/**
 * Whether the assistant can run at all.
 *
 * Every "no" here degrades the widget to a contact form rather than breaking
 * it. An outage should look like a plainer widget, not a broken one.
 */
async function assistantAvailable(prisma: PrismaClient): Promise<{ ok: boolean; notice?: string }> {
  if (!enabled()) return { ok: false, notice: CHAT_OFFLINE_NOTICE };
  if (!hasApiKey()) return { ok: false, notice: CHAT_OFFLINE_NOTICE };

  const used = await monthlyTokensUsed(prisma).catch(() => 0);
  if (used >= tokenCap()) {
    console.error(`[Chat] Monthly token cap reached (${used}/${tokenCap()}) — serving form mode`);
    return { ok: false, notice: CHAT_CAP_REACHED };
  }
  return { ok: true };
}

/* =========================================================================
   Visitor API
========================================================================= */

export function chatRoutes(prisma: PrismaClient, deps: ChatDeps): express.Router {
  const router = express.Router();

  /**
   * Triggers a handoff: mints a join link, stores its nonce, emails it.
   *
   * Debounced two ways — never twice inside the window, and never a second one
   * while a request is already outstanding. A visitor who says "I want a human"
   * three times should not put three emails in Ali's inbox.
   */
  async function triggerHandoff(
    conversationId: string,
    reason: string,
    summary: string,
  ): Promise<boolean> {
    const conversation = await getConversation(prisma, conversationId);
    if (!conversation) return false;
    if (conversation.status === "LIVE") return true; // already has a person

    const recentlySent =
      conversation.handoffEmailSentAt &&
      Date.now() - conversation.handoffEmailSentAt.getTime() < HANDOFF_DEBOUNCE_MS;
    if (recentlySent) return true;

    // A fresh nonce each time invalidates any previously emailed link, so the
    // most recent email is always the live one.
    const jti = newAgentTokenId();
    const expiresAt = new Date(Date.now() + AGENT_TTL_MS);

    const updated = await prisma.chatConversation
      .update({
        where: { id: conversationId },
        data: {
          status: conversation.status === "ACTIVE" ? "HANDOFF_PENDING" : conversation.status,
          handoffRequestedAt: conversation.handoffRequestedAt || new Date(),
          handoffReason: reason,
          agentTokenId: jti,
          agentTokenExpiresAt: expiresAt,
          agentLabel: agentLabel(),
        },
      })
      .catch(() => null);
    if (!updated) return false;

    if (!deps.smtpConfigured) {
      console.error("[Chat] SMTP not configured — handoff email dropped, conversation left pending");
      return false;
    }

    const url = joinUrl(signAgentToken(conversationId, jti));
    const transcript = await fullTranscript(prisma, conversationId);
    const audit = updated.auditId
      ? await prisma.siteAudit
          .findUnique({ where: { id: updated.auditId }, select: { domain: true, overallScore: true } })
          .catch(() => null)
      : null;

    const facts = handoffFacts(updated, audit ? { domain: audit.domain, score: audit.overallScore } : null);
    const sent = await deps.sendMail({
      subject: handoffSubject(updated),
      html: renderHandoffHtml(facts, url, summary, emailTranscript(transcript)),
      text: renderHandoffText(facts, url, summary, emailTranscript(transcript)),
      ...(updated.visitorEmail ? { replyTo: updated.visitorEmail } : {}),
    });

    if (sent) {
      await prisma.chatConversation
        .update({ where: { id: conversationId }, data: { handoffEmailSentAt: new Date() } })
        .catch(() => {});
      console.log(`[Chat] Handoff emailed for conversation ${conversationId} (${reason})`);
    }
    return sent;
  }

  /** Captures the lead once the model has confirmed it, with the transcript attached. */
  async function captureLead(conversation: ChatConversation): Promise<void> {
    const fresh = await getConversation(prisma, conversation.id);
    if (!fresh || !fresh.visitorEmail || !fresh.visitorWebsite || fresh.leadId) return;

    const messages = await fullTranscript(prisma, fresh.id);
    const audit = fresh.auditId
      ? await prisma.siteAudit
          .findUnique({ where: { id: fresh.auditId }, select: { domain: true, overallScore: true } })
          .catch(() => null)
      : null;

    const link = fresh.agentTokenId ? joinUrl(signAgentToken(fresh.id, fresh.agentTokenId)) : null;

    const { id } = await deps.persistLead({
      type: "chat_widget",
      name: fresh.visitorName || "",
      email: fresh.visitorEmail,
      phone: fresh.visitorPhone || "",
      company: fresh.visitorCompany || "",
      website: fresh.visitorWebsite,
      competitor: "",
      goal: "",
      service: "",
      budget: "",
      comments: buildLeadComments({
        summary: fresh.qualifiedReason || "Captured in the site chat.",
        startedOn: fresh.startedOn,
        joinLink: link,
        auditLine: audit ? `Audit: ${audit.domain} scored ${audit.overallScore ?? "n/a"}/100` : null,
        messages,
      }),
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      utmTerm: "",
      utmContent: "",
      referrer: fresh.referrer || "",
      landingPage: "",
      submittedFrom: fresh.startedOn || "",
      gaClientId: fresh.gaClientId || "",
      visitorId: fresh.visitorId || "",
      sessionId: fresh.sessionId || "",
      auditId: fresh.auditId || "",
      userAgent: fresh.userAgent || "",
      ipAddress: fresh.ipAddress || "",
    });

    if (id) {
      await prisma.chatConversation
        .update({ where: { id: fresh.id }, data: { leadId: id } })
        .catch(() => {});
    }
  }

  /* --- start ---------------------------------------------------------- */

  router.post("/start", async (req, res) => {
    deps.setPrivateHeaders(res);

    const ip = deps.clientIp(req) || "unknown";
    const gate = checkChatRate("start", ip);
    if (!gate.allowed) {
      res.status(429).json({ error: gate.message, retryAfterSec: gate.retryAfterSec });
      return;
    }

    const body = req.body || {};
    const availability = await assistantAvailable(prisma);

    try {
      const conversation = await createConversation(prisma, {
        visitorId: str(body.visitorId, 100),
        sessionId: str(body.sessionId, 100),
        gaClientId: str(body.gaClientId, 100),
        startedOn: str(body.path, 1000),
        referrer: str(body.referrer, 1000),
        userAgent: str(req.headers["user-agent"], 500),
        ipAddress: deps.clientIp(req).slice(0, 100),
        country: deps.clientCountry(req),
      });

      const greeting = await appendMessage(prisma, {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: CHAT_GREETING,
        authorLabel: "OptimizeIndex",
      });

      const messages = [toMessageDTO(greeting)];
      const payload: ChatStartResponse = {
        conversationId: conversation.id,
        visitorToken: signVisitorToken(conversation.id),
        mode: availability.ok ? "ai" : "form",
        status: "ACTIVE",
        messages,
        cursor: cursorOf(messages, 0),
        ...(availability.notice ? { notice: availability.notice } : {}),
      };
      res.json(payload);
    } catch (err) {
      // The database is the only hard dependency of opening a chat. Without it
      // there is nowhere to put the conversation, so fall back to the form —
      // which posts to /api/leads and has its own file-backup path.
      console.error("[Chat] Could not start conversation:", err);
      res.json({
        conversationId: "",
        visitorToken: "",
        mode: "form",
        status: "ACTIVE",
        messages: [],
        cursor: 0,
        notice: CHAT_OFFLINE_NOTICE,
      } satisfies ChatStartResponse);
    }
  });

  /* --- send ----------------------------------------------------------- */

  router.post("/:id/message", async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    const body = req.body || {};
    if (!visitorOwns(str(body.visitorToken, 500), id)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const text = String(body.text ?? "").trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text) {
      res.status(400).json({ error: "empty" });
      return;
    }

    const ip = deps.clientIp(req) || "unknown";
    for (const [kind, key] of [["message", ip], ["message", id]] as const) {
      const gate = checkChatRate(kind, key);
      if (!gate.allowed) {
        res.status(429).json({ refused: gate.message, retryAfterSec: gate.retryAfterSec });
        return;
      }
    }

    const conversation = await getConversation(prisma, id);
    if (!conversation) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (conversation.status === "CLOSED") {
      res.json({ messages: [], cursor: 0, status: "CLOSED", refused: CHAT_CLOSED_NOTICE });
      return;
    }

    const after = Number(body.cursor) || 0;

    try {
      await appendMessage(prisma, { conversationId: id, role: "VISITOR", content: text });

      // A human is in the room. The bot stays quiet — two voices answering one
      // question is worse than a pause.
      if (conversation.status === "LIVE") {
        const messages = await messagesAfter(prisma, id, after);
        res.json({ messages, cursor: cursorOf(messages, after), status: conversation.status, agentLabel: conversation.agentLabel || undefined } satisfies ChatPollResponse);
        return;
      }

      const availability = await assistantAvailable(prisma);
      if (!availability.ok) {
        await appendMessage(prisma, {
          conversationId: id,
          role: "ASSISTANT",
          content: availability.notice || CHAT_CAP_REACHED,
          authorLabel: "OptimizeIndex",
        });
        const messages = await messagesAfter(prisma, id, after);
        res.json({ messages, cursor: cursorOf(messages, after), status: conversation.status });
        return;
      }

      // Deterministic override: asking for a person must work whether or not
      // the model decides to call the tool.
      let forcedHandoff = false;
      if (asksForHuman(text)) {
        const notified = await triggerHandoff(id, "visitor_asked", text.slice(0, 500));
        await appendMessage(prisma, {
          conversationId: id,
          role: "ASSISTANT",
          content: notified ? CHAT_HANDOFF_ACK : CHAT_HANDOFF_UNAVAILABLE,
          authorLabel: "OptimizeIndex",
        });
        forcedHandoff = true;
      }

      const ctx: ToolContext = {
        prisma,
        conversationId: id,
        ipAddress: conversation.ipAddress || ip,
        userAgent: conversation.userAgent || "",
        visitorId: conversation.visitorId,
        sessionId: conversation.sessionId,
        gaClientId: conversation.gaClientId,
        startedOn: conversation.startedOn,
        persistLead: deps.persistLead,
        requestHuman: (reason, summary, _urgency) => triggerHandoff(id, reason, summary),
      };

      const turn = await runTurn(prisma, conversation, ctx);

      // When the regex already answered, a second "I'll get Ali" from the model
      // would be a duplicate. Only append if it said something else.
      if (!forcedHandoff || turn.text !== CHAT_HANDOFF_ACK) {
        await appendMessage(prisma, {
          conversationId: id,
          role: "ASSISTANT",
          content: turn.text,
          authorLabel: "OptimizeIndex",
        });
      }

      if (turn.leadCaptured) await captureLead(conversation).catch((err) => console.error("[Chat] Lead capture failed:", err));

      const messages = await messagesAfter(prisma, id, after);
      const fresh = await getConversation(prisma, id);
      res.json({
        messages,
        cursor: cursorOf(messages, after),
        status: (fresh?.status || conversation.status) as ChatPollResponse["status"],
        ...(fresh?.agentLabel ? { agentLabel: fresh.agentLabel } : {}),
      } satisfies ChatPollResponse);
    } catch (err) {
      console.error("[Chat] Message handling failed:", err);
      res.json({ messages: [], cursor: after, status: "ACTIVE", refused: CHAT_SEND_FAILED });
    }
  });

  /* --- poll ----------------------------------------------------------- */

  router.get("/:id/messages", async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    if (!visitorOwns(str(req.query.t, 500), id)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const gate = checkChatRate("poll", deps.clientIp(req) || "unknown");
    if (!gate.allowed) {
      res.status(429).json({ error: gate.message, retryAfterSec: gate.retryAfterSec });
      return;
    }

    const after = Number(req.query.after) || 0;
    const conversation = await getConversation(prisma, id);
    if (!conversation) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const messages = await messagesAfter(prisma, id, after);
    res.json({
      messages,
      cursor: cursorOf(messages, after),
      status: conversation.status as ChatPollResponse["status"],
      ...(conversation.agentLabel && conversation.agentJoinedAt
        ? { agentLabel: conversation.agentLabel }
        : {}),
    } satisfies ChatPollResponse);
  });

  /* --- close ---------------------------------------------------------- */

  router.post("/:id/close", async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    if (!visitorOwns(str((req.body || {}).visitorToken, 500), id)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    await prisma.chatConversation
      .update({
        where: { id },
        data: { status: "CLOSED", closedAt: new Date(), closedReason: "visitor_closed" },
      })
      .catch(() => {});

    res.json({ ok: true });
  });

  return router;
}

/* =========================================================================
   Agent API
========================================================================= */

/**
 * Authorises an agent for one conversation.
 *
 * Two ways in, deliberately. The cookie from an emailed join link is scoped to
 * a single conversation and nothing else — it is a bearer credential and is
 * treated as one. An admin session is the primary path and needs no email at
 * all: sign in, open the inbox, join anything.
 */
export function requireAgent(prisma: PrismaClient): express.RequestHandler {
  return async (req, res, next) => {
    const id = String(req.params.id || "");

    const claims = verifyAgentToken(readCookie(req, AGENT_COOKIE));
    if (claims && claims.cid === id) {
      const conversation = await getConversation(prisma, id).catch(() => null);
      if (
        conversation &&
        conversation.agentTokenId === claims.jti &&
        conversation.agentTokenExpiresAt &&
        conversation.agentTokenExpiresAt.getTime() > Date.now()
      ) {
        (req as AgentRequest).agentLabel = conversation.agentLabel || agentLabel();
        next();
        return;
      }
    }

    const uid = verifySession(readCookie(req, SESSION_COOKIE));
    if (uid) {
      const user = await prisma.adminUser
        .findUnique({ where: { id: uid }, select: { isActive: true, name: true } })
        .catch(() => null);
      if (user?.isActive) {
        (req as AgentRequest).agentLabel = user.name || agentLabel();
        next();
        return;
      }
    }

    res.status(403).json({ error: "forbidden" });
  };
}

interface AgentRequest extends express.Request {
  agentLabel?: string;
}

export function chatAgentRoutes(prisma: PrismaClient, deps: ChatDeps): express.Router {
  const router = express.Router();
  const guard = requireAgent(prisma);

  router.get("/:id", guard, async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    const conversation = await getConversation(prisma, id);
    if (!conversation) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const rows = await fullTranscript(prisma, id);
    const messages = rows.map(toMessageDTO);
    const audit = conversation.auditId
      ? await prisma.siteAudit
          .findUnique({ where: { id: conversation.auditId }, select: { domain: true, overallScore: true } })
          .catch(() => null)
      : null;

    res.json({
      conversationId: id,
      status: conversation.status as ChatAgentViewResponse["status"],
      messages,
      cursor: cursorOf(messages, 0),
      joined: Boolean(conversation.agentJoinedAt),
      agentLabel: (req as AgentRequest).agentLabel || agentLabel(),
      visitorName: conversation.visitorName || undefined,
      visitorEmail: conversation.visitorEmail || undefined,
      visitorPhone: conversation.visitorPhone || undefined,
      visitorCompany: conversation.visitorCompany || undefined,
      visitorWebsite: conversation.visitorWebsite || undefined,
      startedOn: conversation.startedOn || undefined,
      handoffReason: conversation.handoffReason || undefined,
      auditScore: audit?.overallScore ?? null,
      auditDomain: audit?.domain || undefined,
    } satisfies ChatAgentViewResponse);
  });

  /**
   * Joining, as an explicit act.
   *
   * Deliberately a POST behind a button rather than something the join link
   * does on open. Mail clients prefetch and scan links — announcing "Ali
   * joined" from a GET would fire seconds after the email was sent, leaving the
   * visitor watching a conversation nobody is actually in. This codebase has
   * met that problem before; it is why ProposalView.confirmed exists.
   */
  router.post("/:id/join", guard, async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    const label = (req as AgentRequest).agentLabel || agentLabel();

    const conversation = await getConversation(prisma, id);
    if (!conversation) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    if (!conversation.agentJoinedAt) {
      await prisma.chatConversation
        .update({
          where: { id },
          data: { status: "LIVE", agentJoinedAt: new Date(), agentLabel: label },
        })
        .catch(() => {});
      await appendMessage(prisma, {
        conversationId: id,
        role: "SYSTEM",
        content: chatAgentJoinedNotice(label),
        kind: "notice",
      });
    }

    const messages = await messagesAfter(prisma, id, Number(req.query.after) || 0);
    res.json({ messages, cursor: cursorOf(messages, 0), status: "LIVE", agentLabel: label });
  });

  router.post("/:id/message", guard, async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    const label = (req as AgentRequest).agentLabel || agentLabel();
    const text = String((req.body || {}).text ?? "").trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text) {
      res.status(400).json({ error: "empty" });
      return;
    }

    const gate = checkChatRate("agent", id);
    if (!gate.allowed) {
      res.status(429).json({ error: gate.message, retryAfterSec: gate.retryAfterSec });
      return;
    }

    await appendMessage(prisma, {
      conversationId: id,
      role: "AGENT",
      content: text,
      authorLabel: label,
    });

    const messages = await messagesAfter(prisma, id, Number((req.body || {}).cursor) || 0);
    res.json({ messages, cursor: cursorOf(messages, 0), status: "LIVE", agentLabel: label });
  });

  router.get("/:id/messages", guard, async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    const after = Number(req.query.after) || 0;
    const conversation = await getConversation(prisma, id);
    if (!conversation) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const messages = await messagesAfter(prisma, id, after);
    res.json({
      messages,
      cursor: cursorOf(messages, after),
      status: conversation.status as ChatPollResponse["status"],
      agentLabel: conversation.agentLabel || undefined,
    } satisfies ChatPollResponse);
  });

  router.post("/:id/leave", guard, async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    const label = (req as AgentRequest).agentLabel || agentLabel();
    const resumeBot = Boolean((req.body || {}).resumeBot);

    await prisma.chatConversation
      .update({
        where: { id },
        data: resumeBot
          ? { status: "ACTIVE", agentJoinedAt: null }
          : { status: "CLOSED", closedAt: new Date(), closedReason: "agent_closed" },
      })
      .catch(() => {});

    await appendMessage(prisma, {
      conversationId: id,
      role: "SYSTEM",
      content: resumeBot ? chatAgentLeftNotice(label) : "This conversation has been closed.",
      kind: "notice",
    });

    res.json({ ok: true });
  });

  return router;
}

/* =========================================================================
   Admin inbox
========================================================================= */

export function chatAdminRoutes(prisma: PrismaClient): express.Router {
  const router = express.Router();

  router.get("/chats", async (req, res) => {
    const status = String(req.query.status || "");
    const take = Math.min(100, Math.max(5, Number(req.query.perPage) || 30));

    const conversations = await prisma.chatConversation.findMany({
      where: status && status !== "ALL" ? { status: status as never } : {},
      orderBy: { lastMessageAt: "desc" },
      take,
      select: {
        id: true,
        createdAt: true,
        lastMessageAt: true,
        status: true,
        startedOn: true,
        visitorName: true,
        visitorEmail: true,
        visitorCompany: true,
        handoffReason: true,
        qualified: true,
        leadId: true,
        turnCount: true,
      },
    });

    res.json({ conversations });
  });

  router.get("/chats/:id", async (req, res) => {
    const id = String(req.params.id || "");
    const conversation = await getConversation(prisma, id);
    if (!conversation) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const rows = await fullTranscript(prisma, id);
    res.json({ conversation, messages: rows.map(toMessageDTO) });
  });

  /**
   * Kills every outstanding join link for one conversation.
   *
   * Clearing the nonce is enough: the signature still verifies, but the jti no
   * longer matches the row, so requireAgent refuses it. This is the lever to
   * pull if a link is forwarded somewhere it should not have gone.
   */
  router.post("/chats/:id/revoke", async (req, res) => {
    const id = String(req.params.id || "");
    await prisma.chatConversation
      .update({ where: { id }, data: { agentTokenId: null, agentTokenExpiresAt: null } })
      .catch(() => {});
    console.log(`[Chat] Join links revoked for conversation ${id}`);
    res.json({ ok: true });
  });

  return router;
}

/* =========================================================================
   Join link cookie
========================================================================= */

/**
 * Uses append rather than setHeader.
 *
 * setSessionCookie in server/auth.ts sets Set-Cookie with setHeader, which
 * replaces. If an admin ever lands on a join route, one of the two cookies
 * would be dropped silently. append is the only safe way to add a second.
 */
export function setAgentCookie(res: express.Response, token: string): void {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  res.append(
    "Set-Cookie",
    `${AGENT_COOKIE}=${token}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${Math.floor(
      AGENT_COOKIE_MS / 1000,
    )}`,
  );
}

/* =========================================================================
   Email rendering
========================================================================= */

function renderHandoffText(
  facts: Record<string, string>,
  url: string,
  summary: string,
  transcript: string,
): string {
  const lines = Object.entries(facts)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return [lines, "", joinBlockText(url, summary || null), "", "--- recent messages ---", transcript].join("\n");
}

function renderHandoffHtml(
  facts: Record<string, string>,
  url: string,
  summary: string,
  transcript: string,
): string {
  const rows = Object.entries(facts)
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#5F5C53;font:13px/1.4 -apple-system,Segoe UI,sans-serif;vertical-align:top">${k}</td><td style="padding:6px 0;font:13px/1.4 -apple-system,Segoe UI,sans-serif;color:#141210">${escapeHtml(v)}</td></tr>`,
    )
    .join("");

  return [
    `<table style="border-collapse:collapse;margin-bottom:24px">${rows}</table>`,
    joinBlockHtml(url, summary || null),
    `<h3 style="font:600 13px/1.4 -apple-system,Segoe UI,sans-serif;color:#5F5C53;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.04em">Recent messages</h3>`,
    `<pre style="font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#141210;white-space:pre-wrap;margin:0;padding:12px;background:#F6F1E6;border:1px solid #E5DFD2">${escapeHtml(transcript)}</pre>`,
  ].join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
