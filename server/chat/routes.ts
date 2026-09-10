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
  CHAT_SIDE_LABEL,
  CHAT_WELCOME_BACK,
} from "../../src/content/chat";
import type {
  ChatAgentPollResponse,
  ChatAgentViewResponse,
  ChatPollResponse,
  ChatResumeResponse,
  ChatStartResponse,
} from "../../shared/chatTypes";
import { asksForHuman, runTurn } from "./engine";
import {
  agentPresent,
  clearAgentSeen,
  markAgentSeen,
  markVisitorGone,
  markVisitorSeen,
  takeDepartedVisitors,
  visitorState,
} from "./presence";
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
  chatResumedSubject,
  chatStartedSubject,
  handoffFacts,
  handoffSubject,
  joinBlockHtml,
  joinBlockText,
  joinUrl,
  visitorLeftSubject,
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

/**
 * What counts as coming back rather than carrying on.
 *
 * A conversation survives the browser tab now, so the same thread can span a
 * lunch break or a week. Two hours is the line: below it the visitor is still
 * in the same sitting and Ali has already been emailed about it, above it this
 * is a new arrival at an old conversation and worth a fresh notification. It
 * doubles as the debounce on that email, so a visitor who reloads five times
 * does not send five.
 */
const RESUMED_GAP_MS = 2 * 60 * 60 * 1000;

/**
 * How quiet a conversation has to be before a resume greets the visitor.
 *
 * Much shorter than RESUMED_GAP_MS, and they are answering different questions.
 * Thirty minutes is "long enough that a greeting is welcome rather than
 * baffling"; two hours is "long enough to be worth an email". A refresh two
 * minutes after the last message gets neither.
 */
const WELCOME_BACK_AFTER_MS = 30 * 60 * 1000;

/** How often to look for visitors whose leave beacon never arrived. */
const VISITOR_SWEEP_MS = 30_000;

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

/** The conversation's join nonce, if it still has an unexpired one. */
function liveTokenId(conversation: ChatConversation): string | null {
  if (!conversation.agentTokenId) return null;
  if (!conversation.agentTokenExpiresAt) return null;
  if (conversation.agentTokenExpiresAt.getTime() <= Date.now()) return null;
  return conversation.agentTokenId;
}

export function chatRoutes(prisma: PrismaClient, deps: ChatDeps): express.Router {
  const router = express.Router();

  /**
   * Tells the team a conversation has started, on the visitor's first message.
   *
   * Separate from triggerHandoff in every way that matters. It does not change
   * the conversation status, so the assistant carries on exactly as before and
   * the admin inbox's "wants a person" filter keeps meaning what it says. It is
   * not debounced on a timer, because it can only ever fire once per
   * conversation — startedEmailSentAt is the guard, and it is set before the
   * mail is attempted so a slow SMTP call cannot let a second message through
   * behind it.
   *
   * It carries the same join link as a real handoff would, so Ali can drop into
   * any conversation from his inbox without waiting to be asked. The point is
   * that he sees them all, not that every visitor gets escalated.
   *
   * The cost of this is one email per conversation, including one-word ones
   * that go nowhere. That is the deliberate trade: a missed live visitor is
   * worth more than an inbox that stays tidy.
   */
  async function notifyChatStarted(conversationId: string, firstMessage: string): Promise<void> {
    const conversation = await getConversation(prisma, conversationId);
    if (!conversation || conversation.startedEmailSentAt) return;
    if (!deps.smtpConfigured) return;

    const jti = liveTokenId(conversation) || newAgentTokenId();

    // Claim it first. Two messages sent in quick succession would otherwise
    // both pass the check above while the first was still talking to SMTP.
    const claimed = await prisma.chatConversation
      .update({
        where: { id: conversationId, startedEmailSentAt: null },
        data: {
          startedEmailSentAt: new Date(),
          agentTokenId: jti,
          agentTokenExpiresAt: new Date(Date.now() + AGENT_TTL_MS),
          agentLabel: agentLabel(),
        },
      })
      .catch(() => null);
    if (!claimed) return;

    const url = joinUrl(signAgentToken(conversationId, jti));
    const facts = handoffFacts(claimed, null);

    // No summary line: the transcript below it is the first message, and
    // printing the same sentence twice in a short email looks like a bug.
    const sent = await deps.sendMail({
      subject: chatStartedSubject(claimed),
      html: renderHandoffHtml(facts, url, "", `Visitor: ${firstMessage}`),
      text: renderHandoffText(facts, url, "", `Visitor: ${firstMessage}`),
    });

    if (!sent) {
      // Let a later message try again rather than losing the notification to a
      // transient SMTP failure.
      await prisma.chatConversation
        .update({ where: { id: conversationId }, data: { startedEmailSentAt: null } })
        .catch(() => {});
      return;
    }
    console.log(`[Chat] Chat-started email sent for conversation ${conversationId}`);
  }

  /**
   * Tells the team a visitor has come back to an old conversation.
   *
   * The gap notifyChatStarted cannot cover. That one is guarded by
   * startedEmailSentAt and so fires exactly once in the life of a conversation
   * — which was right when a conversation died with the browser tab, and is
   * wrong now that one can be picked up on Thursday having started on Monday.
   * Without this, a return visit reaches nobody: the visitor is typing into a
   * thread Ali was emailed about days ago and has no reason to be looking at.
   *
   * Debounced on its own column rather than sharing handoffEmailSentAt, for the
   * same reason startedEmailSentAt is separate: a returning visitor who then
   * asks for a person must not have that request swallowed because a "they're
   * back" note went out ninety seconds earlier.
   *
   * `quietFor` is measured before the incoming message is stored, because
   * appendMessage touches lastMessageAt and would otherwise erase the very gap
   * being measured.
   */
  async function notifyChatResumed(conversationId: string, text: string, quietFor: number): Promise<void> {
    if (quietFor < RESUMED_GAP_MS) return;
    if (!deps.smtpConfigured) return;

    const conversation = await getConversation(prisma, conversationId);
    if (!conversation) return;

    /*
      Never told about it in the first place: notifyChatStarted is the right
      email for this conversation and has not fired yet. Let it.

      The age check is not redundant with the null check, and the case it exists
      for is real: someone opens the widget, wanders off for three hours, comes
      back and sends their first message. quietFor is measured from the last
      message — which is the greeting, three hours ago — so this passes, while
      notifyChatStarted is firing for the very same message alongside it. Both
      would land in Ali's inbox describing one event. Requiring the opening
      notification to be older than the gap means a conversation cannot be
      started and resumed in the same breath.
    */
    if (!conversation.startedEmailSentAt) return;
    if (Date.now() - conversation.startedEmailSentAt.getTime() < RESUMED_GAP_MS) return;

    // Somebody is already in the room. They can see the message arrive.
    if (conversation.status === "LIVE") return;

    const sentRecently =
      conversation.resumedEmailSentAt &&
      Date.now() - conversation.resumedEmailSentAt.getTime() < RESUMED_GAP_MS;
    if (sentRecently) return;

    // Same reuse-don't-rotate rule as triggerHandoff. If the old nonce is still
    // live the link in the earlier email keeps working; if it has lapsed, a
    // fresh one replaces a link that was already dead.
    const jti = liveTokenId(conversation) || newAgentTokenId();

    // Claim before sending, so two messages typed in quick succession cannot
    // both pass the debounce while the first is still talking to SMTP. The
    // condition repeats the check above rather than trusting it: the read and
    // this write are not one transaction, and the whole point of the guard is
    // the window between them.
    const claimed = await prisma.chatConversation
      .update({
        where: {
          id: conversationId,
          OR: [
            { resumedEmailSentAt: null },
            { resumedEmailSentAt: { lt: new Date(Date.now() - RESUMED_GAP_MS) } },
          ],
        },
        data: {
          resumedEmailSentAt: new Date(),
          agentTokenId: jti,
          agentTokenExpiresAt: new Date(Date.now() + AGENT_TTL_MS),
          agentLabel: conversation.agentLabel || agentLabel(),
        },
      })
      .catch(() => null);
    if (!claimed) return;

    const url = joinUrl(signAgentToken(conversationId, jti));
    const transcript = await fullTranscript(prisma, conversationId);
    const facts = handoffFacts(claimed, null);
    const hours = Math.round(quietFor / (60 * 60 * 1000));
    const summary = `Back after ${hours > 47 ? `${Math.round(hours / 24)} days` : `${hours} hours`} away. They said: ${text.slice(0, 200)}`;

    const sent = await deps.sendMail({
      subject: chatResumedSubject(claimed),
      html: renderHandoffHtml(facts, url, summary, emailTranscript(transcript)),
      text: renderHandoffText(facts, url, summary, emailTranscript(transcript)),
      ...(claimed.visitorEmail ? { replyTo: claimed.visitorEmail } : {}),
    });

    if (!sent) {
      await prisma.chatConversation
        .update({ where: { id: conversationId }, data: { resumedEmailSentAt: null } })
        .catch(() => {});
      return;
    }
    console.log(`[Chat] Chat-resumed email sent for conversation ${conversationId}`);
  }

  /**
   * Tells the team a visitor closed the page before anyone reached them.
   *
   * Narrow on purpose. It fires only when nobody had joined — if Ali was in the
   * conversation he is looking at the console, which shows him they left. And
   * it fires only for conversations he has already been emailed about, because
   * startedEmailSentAt is set on the first visitor message: without that gate
   * this would be a notification about a chat he never knew existed, which is
   * how notifications stop being read.
   *
   * Once per conversation, and the guard is claimed before the send in the same
   * pattern as notifyChatStarted.
   */
  async function notifyVisitorLeft(conversationId: string): Promise<void> {
    if (!deps.smtpConfigured) return;

    const conversation = await getConversation(prisma, conversationId);
    if (!conversation) return;
    if (conversation.visitorLeftEmailSentAt) return;
    if (conversation.agentJoinedAt) return;
    if (!conversation.startedEmailSentAt) return;
    if (conversation.status === "CLOSED") return;

    const jti = liveTokenId(conversation) || newAgentTokenId();

    const claimed = await prisma.chatConversation
      .update({
        where: { id: conversationId, visitorLeftEmailSentAt: null },
        data: {
          visitorLeftEmailSentAt: new Date(),
          agentTokenId: jti,
          agentTokenExpiresAt: new Date(Date.now() + AGENT_TTL_MS),
          agentLabel: conversation.agentLabel || agentLabel(),
        },
      })
      .catch(() => null);
    if (!claimed) return;

    const url = joinUrl(signAgentToken(conversationId, jti));
    const transcript = await fullTranscript(prisma, conversationId);
    const facts = handoffFacts(claimed, null);

    // The link is still worth sending. A reply left in the conversation now is
    // waiting for them the next time they open the site, which is the whole
    // point of conversations outliving the tab.
    const summary =
      "They closed the page before anyone joined. The conversation is kept — a reply left here is waiting for them if they come back.";

    const sent = await deps.sendMail({
      subject: visitorLeftSubject(claimed),
      html: renderHandoffHtml(facts, url, summary, emailTranscript(transcript)),
      text: renderHandoffText(facts, url, summary, emailTranscript(transcript)),
      ...(claimed.visitorEmail ? { replyTo: claimed.visitorEmail } : {}),
    });

    if (!sent) {
      await prisma.chatConversation
        .update({ where: { id: conversationId }, data: { visitorLeftEmailSentAt: null } })
        .catch(() => {});
      return;
    }
    console.log(`[Chat] Visitor-left email sent for conversation ${conversationId}`);
  }

  /*
    The only thing that sends a visitor-left email.

    Deliberately not the beacon, even though the beacon is what knows first.
    pagehide fires on a hard navigation as well as on a real close — any link
    that escapes the client-side router — so emailing from it directly would
    tell Ali somebody walked out every time they followed a link that reloaded
    the page. Routing every departure through here means a heartbeat arriving
    inside the grace period cancels it silently, which is the common case.

    It also covers what no beacon can: a crash, a killed tab, a phone that lost
    signal. Nobody is coming back to send one of those later.

    unref'd, like pruneOldChats in server.ts: a timer that keeps the process
    alive at shutdown is a deploy that hangs.
  */
  const sweeper = setInterval(() => {
    for (const conversationId of takeDepartedVisitors()) {
      void notifyVisitorLeft(conversationId).catch((err) =>
        console.error("[Chat] Visitor-left notification failed:", err),
      );
    }
  }, VISITOR_SWEEP_MS);
  sweeper.unref();

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

    // Reuse a live nonce rather than minting a fresh one.
    //
    // This used to rotate every time, on the reasoning that the newest email
    // should be the only working link. That stopped being right once a
    // conversation could produce two emails — an opening "someone started a
    // chat" and a later "they want a person". Rotating would quietly break the
    // link in the first email the moment the second was sent, and both go to
    // the same inbox, so the only thing it achieved was Ali tapping a dead
    // link. Revocation is still available and still instant, through the admin
    // inbox.
    const jti = liveTokenId(conversation) || newAgentTokenId();
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

  /**
   * Raises the lead, with the transcript attached.
   *
   * Fires as soon as there is an email address — the same threshold a form has,
   * because an email is what makes a stranger contactable and everything else
   * is enrichment. Waiting for a website meant a visitor who gave their name,
   * number and town and then closed the tab produced no notification at all.
   *
   * Runs at most once per conversation, guarded by leadId. Details that arrive
   * later update the existing Lead row instead, so nobody gets a second email
   * for the same person — a notification per message is how notifications stop
   * being read.
   */
  async function captureLead(conversation: ChatConversation): Promise<void> {
    const fresh = await getConversation(prisma, conversation.id);
    if (!fresh || !fresh.visitorEmail) return;

    // Already raised. Top the row up with anything learned since and stop.
    if (fresh.leadId) {
      await prisma.lead
        .update({
          where: { id: fresh.leadId },
          data: {
            ...(fresh.visitorName ? { name: fresh.visitorName } : {}),
            ...(fresh.visitorPhone ? { phone: fresh.visitorPhone } : {}),
            ...(fresh.visitorCompany ? { company: fresh.visitorCompany } : {}),
            ...(fresh.visitorWebsite ? { website: fresh.visitorWebsite } : {}),
            ...(fresh.auditId ? { auditId: fresh.auditId } : {}),
          },
        })
        .catch(() => {});
      return;
    }

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
      // /api/leads rejects a lead with no website, and a chat lead often has
      // not given one yet. Same approach the towing assessment form takes: say
      // plainly that it was not collected rather than invent a value or lose
      // the lead over a field the visitor was never asked for.
      website: fresh.visitorWebsite || "Not collected — site chat",
      competitor: "",
      goal: "",
      service: "",
      // No budget field in a chat, so this carries the service area instead —
      // the fact that most often decides whether we can help at all.
      budget: fresh.visitorArea ? `Area: ${fresh.visitorArea}` : "",
      comments: buildLeadComments({
        summary: fresh.qualifiedReason || "Captured in the site chat.",
        area: fresh.visitorArea,
        phone: fresh.visitorPhone,
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
        authorLabel: CHAT_SIDE_LABEL,
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

    // Sending is the strongest possible evidence of presence.
    markVisitorSeen(id, true);

    // Measured before the message is stored. appendMessage touches
    // lastMessageAt, so reading the gap afterwards would always find zero.
    const quietFor = Date.now() - conversation.lastMessageAt.getTime();

    try {
      await appendMessage(prisma, { conversationId: id, role: "VISITOR", content: text });

      // Deliberately not awaited. The notification must not sit between the
      // visitor pressing send and the assistant answering — a slow SMTP server
      // would otherwise show up as the widget hanging. It guards itself against
      // running twice, so letting it finish on its own is safe.
      void notifyChatStarted(id, text).catch((err) =>
        console.error("[Chat] Chat-started notification failed:", err),
      );

      // The same, for a conversation being picked up after a long gap. The two
      // are mutually exclusive in practice — notifyChatResumed requires the
      // started email to have gone out already — so at most one sends.
      void notifyChatResumed(id, text, quietFor).catch((err) =>
        console.error("[Chat] Chat-resumed notification failed:", err),
      );

      /*
        A human is in the room. The bot stays quiet — two voices answering one
        question is worse than a pause.

        Unless they are not, in fact, in the room. Nothing tells the server that
        a browser tab closed, so if the console has stopped sending heartbeats
        the conversation is handed back to the assistant rather than leaving the
        visitor typing into silence.
      */
      if (conversation.status === "LIVE" && !agentPresent(id)) {
        console.log(`[Chat] Agent gone from conversation ${id} - assistant resuming`);
        clearAgentSeen(id);

        // Clearing handoffEmailSentAt is what lets the notification below
        // through: triggerHandoff suppresses a second email inside a 15-minute
        // window, and the agent almost certainly joined inside that window. The
        // visitor is still here and still waiting, so this is exactly the case
        // that debounce must not swallow.
        await prisma.chatConversation
          .update({
            where: { id },
            data: { status: "ACTIVE", agentJoinedAt: null, handoffEmailSentAt: null },
          })
          .catch(() => {});
        conversation.status = "ACTIVE";

        // No notice in the transcript. The visitor is not told a person
        // arrived, so telling them one left would be announcing half a fact.
        void triggerHandoff(id, "visitor_asked", `Still waiting — they sent: ${text.slice(0, 200)}`);
      }

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
          authorLabel: CHAT_SIDE_LABEL,
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
          authorLabel: CHAT_SIDE_LABEL,
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
          authorLabel: CHAT_SIDE_LABEL,
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

    // This poll is the visitor's heartbeat, the mirror of the agent console's.
    // It costs one map write on a request that was already happening, and it is
    // what puts "they are still reading" — or are not — on the agent's screen.
    // `v` is panel-open-and-tab-visible; anything else is a loaded page nobody
    // is looking at, which is worth telling apart from both of the others.
    markVisitorSeen(id, str(req.query.v, 1) === "1");

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

  /* --- resume --------------------------------------------------------- */

  /**
   * Picks a conversation back up on a later visit.
   *
   * The widget used to resume by polling from cursor 0 and assuming the mode
   * was "ai", which had two problems. The small one: a refresh during a model
   * outage silently re-entered AI mode against an assistant that was not there.
   * The large one: nothing renewed the visitor token, so a conversation could
   * only ever be resumed inside the token's own lifetime, whatever the widget
   * believed its window to be.
   *
   * So resuming is a start rather than a poll. It re-reads availability, and it
   * re-signs the token — which is what makes the seven-day window slide from
   * this visit rather than counting down from the first one.
   */
  router.post("/:id/resume", async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    if (!visitorOwns(str((req.body || {}).visitorToken, 500), id)) {
      // Not an error worth a 403 body the client has to special-case. An
      // expired token and a pruned conversation mean the same thing to the
      // widget: there is nothing here, start fresh.
      res.json({ resumed: "expired" } satisfies ChatResumeResponse);
      return;
    }

    const gate = checkChatRate("poll", deps.clientIp(req) || "unknown");
    if (!gate.allowed) {
      res.status(429).json({ error: gate.message, retryAfterSec: gate.retryAfterSec });
      return;
    }

    const conversation = await getConversation(prisma, id).catch(() => null);
    if (!conversation || conversation.status === "CLOSED") {
      res.json({ resumed: "expired" } satisfies ChatResumeResponse);
      return;
    }

    // The client says whether the panel is actually going to be open, rather
    // than this assuming it. A resume happens on every full page load, most of
    // which are somebody browsing with the widget shut — reporting all of them
    // as "reading right now" would make the pill meaningless.
    markVisitorSeen(id, Boolean((req.body || {}).active));

    /*
      The welcome-back line.

      Only when the conversation has actually been quiet — a hard refresh two
      minutes into a conversation should not be greeted like a returning
      customer — and never while a person is in the room, where a canned
      greeting would land in the middle of somebody's sentence.

      No separate "already greeted" guard is needed: appendMessage touches
      lastMessageAt, so the second of two refreshes finds a conversation whose
      last message was a moment ago and says nothing.
    */
    const quietFor = Date.now() - conversation.lastMessageAt.getTime();
    const shouldGreet =
      quietFor > WELCOME_BACK_AFTER_MS &&
      (conversation.status === "ACTIVE" || conversation.status === "HANDOFF_PENDING");

    if (shouldGreet) {
      await appendMessage(prisma, {
        conversationId: id,
        role: "ASSISTANT",
        content: CHAT_WELCOME_BACK,
        authorLabel: CHAT_SIDE_LABEL,
      }).catch(() => {});
    }

    const availability = await assistantAvailable(prisma);
    const messages = await messagesAfter(prisma, id, 0);

    res.json({
      resumed: "ok",
      conversationId: id,
      // Re-signed on every resume. This is the sliding window.
      visitorToken: signVisitorToken(id),
      mode: availability.ok ? "ai" : "form",
      status: conversation.status as ChatStartResponse["status"],
      messages,
      cursor: cursorOf(messages, 0),
      welcomedBack: shouldGreet,
      ...(availability.notice ? { notice: availability.notice } : {}),
    } satisfies ChatResumeResponse);
  });

  /* --- leaving -------------------------------------------------------- */

  /**
   * The visitor closed the page.
   *
   * Sent by a pagehide beacon, so it is best-effort and cannot be relied on:
   * beacons do not fire for a crash, a killed tab, or a phone losing signal.
   * This is what makes the ordinary case — closing the window — show on the
   * agent's screen in about a second rather than in ninety.
   *
   * Two things it deliberately does NOT do.
   *
   * It does not email. pagehide also fires on a hard navigation, and a beacon
   * is not evidence that anyone actually left; the sweeper above waits out a
   * grace period, and a heartbeat arriving inside it cancels the departure
   * silently.
   *
   * It does not close the conversation. The visitor may well be back tomorrow,
   * and the transcript is kept for them. Closing is the "Start a new chat"
   * control's job, and the agent's.
   */
  router.post("/:id/away", async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    if (!visitorOwns(str((req.body || {}).visitorToken, 500), id)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    markVisitorGone(id);

    // The browser discards this response — the page is already unloading.
    res.json({ ok: true });
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
    markAgentSeen(id);
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

    const presence = visitorState(id);

    res.json({
      conversationId: id,
      status: conversation.status as ChatAgentViewResponse["status"],
      messages,
      cursor: cursorOf(messages, 0),
      joined: Boolean(conversation.agentJoinedAt),
      agentLabel: (req as AgentRequest).agentLabel || agentLabel(),
      visitor: presence.state,
      ...(presence.lastSeenAt
        ? { visitorLastSeenAt: new Date(presence.lastSeenAt).toISOString() }
        : {}),
      visitorName: conversation.visitorName || undefined,
      visitorEmail: conversation.visitorEmail || undefined,
      visitorPhone: conversation.visitorPhone || undefined,
      visitorCompany: conversation.visitorCompany || undefined,
      visitorWebsite: conversation.visitorWebsite || undefined,
      visitorArea: conversation.visitorArea || undefined,
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
    markAgentSeen(id);

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
      // Deliberately silent. Announcing "Ali joined" tells the visitor the
      // thing answering has changed, which is not information they can act on
      // and mostly reads as "you were being fobbed off until now".
    }

    const messages = await messagesAfter(prisma, id, Number(req.query.after) || 0);
    res.json({ messages, cursor: cursorOf(messages, 0), status: "LIVE", agentLabel: label });
  });

  router.post("/:id/message", guard, async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    const label = (req as AgentRequest).agentLabel || agentLabel();
    markAgentSeen(id);
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
      // The agency, not the person. The role stays AGENT so the transcript,
      // the admin inbox and the link-rendering rules can still tell who wrote
      // it — only the visitor-facing label is unified.
      content: text,
      authorLabel: CHAT_SIDE_LABEL,
    });

    const messages = await messagesAfter(prisma, id, Number((req.body || {}).cursor) || 0);
    res.json({ messages, cursor: cursorOf(messages, 0), status: "LIVE", agentLabel: label });
  });

  router.get("/:id/messages", guard, async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    // The console's poll loop is the heartbeat. This one line is what keeps the
    // assistant muted while somebody is actually there.
    markAgentSeen(id);
    const after = Number(req.query.after) || 0;
    const conversation = await getConversation(prisma, id);
    if (!conversation) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const messages = await messagesAfter(prisma, id, after);
    const presence = visitorState(id);
    res.json({
      messages,
      cursor: cursorOf(messages, after),
      status: conversation.status as ChatPollResponse["status"],
      agentLabel: conversation.agentLabel || undefined,
      // Rides the poll the console is already making, so the presence pill
      // updates on the same 2s beat as the transcript.
      visitor: presence.state,
      ...(presence.lastSeenAt
        ? { visitorLastSeenAt: new Date(presence.lastSeenAt).toISOString() }
        : {}),
    } satisfies ChatAgentPollResponse);
  });

  router.post("/:id/leave", guard, async (req, res) => {
    deps.setPrivateHeaders(res);

    const id = str(req.params.id, 40);
    const label = (req as AgentRequest).agentLabel || agentLabel();
    const resumeBot = Boolean((req.body || {}).resumeBot);
    clearAgentSeen(id);

    await prisma.chatConversation
      .update({
        where: { id },
        data: resumeBot
          ? { status: "ACTIVE", agentJoinedAt: null }
          : { status: "CLOSED", closedAt: new Date(), closedReason: "agent_closed" },
      })
      .catch(() => {});

    // Handing back to the assistant is silent, for the same reason joining is.
    // Closing the conversation is not — that one the visitor needs to know,
    // because it changes whether typing anything else will reach us.
    if (!resumeBot) {
      await appendMessage(prisma, {
        conversationId: id,
        role: "SYSTEM",
        content: CHAT_CLOSED_NOTICE,
        kind: "notice",
      });
    }

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
