/**
 * Every database read and write the chat feature makes.
 *
 * Kept in one module so the routes stay about HTTP and the tools stay about the
 * model, and so the polling query — the one thing in this feature that runs
 * thousands of times a day — sits in a single place where its index can be
 * checked against the schema.
 */

import type { PrismaClient, ChatConversation, ChatMessage } from "@prisma/client";
import type { ChatMessageDTO, ChatMessageRole } from "../../shared/chatTypes";

/** Longest a single message may be, in characters, whoever sent it. */
export const MAX_MESSAGE_CHARS = 2000;

/** How many messages one poll may return. A backlog drains over several polls. */
const POLL_PAGE = 100;

/* -------------------------------------------------------------------------
   Serialization
------------------------------------------------------------------------- */

export function toMessageDTO(row: ChatMessage): ChatMessageDTO {
  return {
    id: row.id,
    seq: row.seq,
    role: row.role as ChatMessageRole,
    content: row.content,
    kind: row.kind === "notice" ? "notice" : "message",
    ...(row.authorLabel ? { authorLabel: row.authorLabel } : {}),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Highest seq in a list, or the cursor we were given when the list is empty. */
export function cursorOf(messages: ChatMessageDTO[], fallback: number): number {
  return messages.reduce((max, m) => (m.seq > max ? m.seq : max), fallback);
}

/* -------------------------------------------------------------------------
   Conversations
------------------------------------------------------------------------- */

export interface StartConversationInput {
  visitorId?: string | null;
  sessionId?: string | null;
  gaClientId?: string | null;
  startedOn?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  country?: string | null;
}

export async function createConversation(
  prisma: PrismaClient,
  input: StartConversationInput,
): Promise<ChatConversation> {
  return prisma.chatConversation.create({
    data: {
      visitorId: input.visitorId || null,
      sessionId: input.sessionId || null,
      gaClientId: input.gaClientId || null,
      startedOn: input.startedOn || null,
      referrer: input.referrer || null,
      userAgent: input.userAgent || null,
      ipAddress: input.ipAddress || null,
      country: input.country || null,
    },
  });
}

export async function getConversation(
  prisma: PrismaClient,
  id: string,
): Promise<ChatConversation | null> {
  return prisma.chatConversation.findUnique({ where: { id } });
}

export async function touchConversation(prisma: PrismaClient, id: string): Promise<void> {
  await prisma.chatConversation
    .update({ where: { id }, data: { lastMessageAt: new Date() } })
    .catch(() => {});
}

/* -------------------------------------------------------------------------
   Messages
------------------------------------------------------------------------- */

export interface AppendMessageInput {
  conversationId: string;
  role: ChatMessageRole;
  content: string;
  kind?: "message" | "notice";
  authorLabel?: string | null;
  toolName?: string | null;
  toolArgs?: unknown;
  hidden?: boolean;
}

/**
 * Appends one message and bumps the conversation's activity clock.
 *
 * The content clamp is applied here, not at the route, so a message written by
 * the model or by a tool is bounded by the same ceiling as one typed by a
 * visitor. Nothing reaches this table unclamped.
 */
export async function appendMessage(
  prisma: PrismaClient,
  input: AppendMessageInput,
): Promise<ChatMessage> {
  const row = await prisma.chatMessage.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: String(input.content ?? "").slice(0, MAX_MESSAGE_CHARS),
      kind: input.kind || "message",
      authorLabel: input.authorLabel || null,
      toolName: input.toolName || null,
      toolArgs: (input.toolArgs ?? undefined) as never,
      hidden: input.hidden ?? false,
    },
  });
  await touchConversation(prisma, input.conversationId);
  return row;
}

/**
 * The polling query.
 *
 * Runs against @@index([conversationId, seq]). Because seq is globally
 * monotonic, "everything after N" is a range scan with no sort and no
 * reconciliation against createdAt — which is the whole reason seq exists.
 *
 * Hidden rows are excluded here rather than at each call site, so one forgotten
 * where clause cannot leak a grounding note into a visitor's transcript.
 */
export async function messagesAfter(
  prisma: PrismaClient,
  conversationId: string,
  after: number,
): Promise<ChatMessageDTO[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { conversationId, seq: { gt: after }, hidden: false },
    orderBy: { seq: "asc" },
    take: POLL_PAGE,
  });
  return rows.map(toMessageDTO);
}

/**
 * The window handed to the model, oldest first.
 *
 * Notices are excluded: "Ali joined the conversation" is a UI event, and
 * feeding it back to the model would invite it to speak as him.
 */
export async function historyForModel(
  prisma: PrismaClient,
  conversationId: string,
  turns: number,
): Promise<ChatMessage[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { conversationId, kind: "message" },
    orderBy: { seq: "desc" },
    take: turns,
  });
  return rows.reverse();
}

/** Full transcript, oldest first. For the agent console and the lead summary. */
export async function fullTranscript(
  prisma: PrismaClient,
  conversationId: string,
): Promise<ChatMessage[]> {
  return prisma.chatMessage.findMany({
    where: { conversationId, hidden: false },
    orderBy: { seq: "asc" },
  });
}

/* -------------------------------------------------------------------------
   Cost accounting
------------------------------------------------------------------------- */

export async function recordUsage(
  prisma: PrismaClient,
  conversationId: string,
  usage: { input: number; output: number },
): Promise<void> {
  await prisma.chatConversation
    .update({
      where: { id: conversationId },
      data: {
        promptTokens: { increment: usage.input },
        completionTokens: { increment: usage.output },
        turnCount: { increment: 1 },
      },
    })
    .catch(() => {});
}

/**
 * Tokens spent this calendar month, cached briefly.
 *
 * The cache is per process, so at more than one PM2 instance the cap can be
 * overshot by up to N times before any process notices. One of several reasons
 * instances must stay at 1 — see the comment in ecosystem.config.cjs.
 */
const CAP_CACHE_MS = 5 * 60 * 1000;
let capCache: { at: number; total: number } | null = null;

export async function monthlyTokensUsed(prisma: PrismaClient): Promise<number> {
  const now = Date.now();
  if (capCache && now - capCache.at < CAP_CACHE_MS) return capCache.total;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const agg = await prisma.chatConversation
    .aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { promptTokens: true, completionTokens: true },
    })
    .catch(() => null);

  const total = (agg?._sum.promptTokens ?? 0) + (agg?._sum.completionTokens ?? 0);
  capCache = { at: now, total };
  return total;
}

/* -------------------------------------------------------------------------
   Retention
------------------------------------------------------------------------- */

/**
 * Ages out old conversations.
 *
 * Three tiers, because the rows are not all worth the same: anything that
 * became a lead is kept for a year, anything that did not is kept for 90 days,
 * and the identifying technical columns are cleared after 30 days on
 * everything — a transcript stays useful for review long after the IP that
 * produced it stops being anybody's business.
 *
 * Best-effort by design. A failure here must never take the server down.
 */
export async function pruneOldChats(prisma: PrismaClient): Promise<void> {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  try {
    const anonymised = await prisma.chatConversation.updateMany({
      where: { lastMessageAt: { lt: daysAgo(30) }, NOT: { ipAddress: null } },
      data: { ipAddress: null, userAgent: null, agentIpAddress: null },
    });

    // Messages cascade on delete, so only the parent rows are named here.
    const unconverted = await prisma.chatConversation.deleteMany({
      where: { lastMessageAt: { lt: daysAgo(90) }, leadId: null },
    });
    const expired = await prisma.chatConversation.deleteMany({
      where: { lastMessageAt: { lt: daysAgo(365) } },
    });

    if (anonymised.count + unconverted.count + expired.count > 0) {
      console.log(
        `[Chat] Retention: anonymised ${anonymised.count}, deleted ${unconverted.count} unconverted, ${expired.count} expired`,
      );
    }
  } catch (err) {
    console.error("[Chat] Retention sweep failed:", err);
  }
}
