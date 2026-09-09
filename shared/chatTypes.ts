/**
 * The contract between the chat API and the widget that renders it.
 *
 * Lives in shared/ for the same reason proposalTypes.ts and auditTypes.ts do:
 * the server builds these objects and the client consumes them, and a type
 * imported across that boundary must not drag @prisma/client into the browser
 * bundle.
 *
 * Rule that governs the message shape: what the visitor sees is exactly what is
 * stored. There is no client-side rendering of model output beyond line breaks,
 * and no markdown, because a link the model invented would then be clickable.
 */

/** Who said it. Mirrors the ChatRole enum, minus the rows the visitor never sees. */
export type ChatMessageRole = "VISITOR" | "ASSISTANT" | "AGENT" | "SYSTEM";

/** Mirrors ChatStatus. */
export type ChatConversationStatus = "ACTIVE" | "HANDOFF_PENDING" | "LIVE" | "CLOSED";

/**
 * A single rendered message.
 *
 * `seq` is the polling cursor — a client sends back the highest one it has and
 * gets everything after it. Global and monotonic, so it never needs reconciling
 * against createdAt when two writers land in the same millisecond.
 */
export interface ChatMessageDTO {
  id: string;
  seq: number;
  role: ChatMessageRole;
  content: string;
  /** "message" renders as a bubble; "notice" as centred grey text. */
  kind: "message" | "notice";
  /** Label on the bubble — "Ali", "OptimizeIndex". Absent for the visitor's own. */
  authorLabel?: string;
  createdAt: string;
}

/**
 * How the widget should behave.
 *
 * "ai" is the assistant. "form" is the degraded mode used whenever the model is
 * unavailable — no key, disabled, over the monthly cap, or the database is
 * down. Form mode is a working contact form, deliberately, so that an outage
 * shows up as a plainer widget rather than a broken one.
 */
export type ChatMode = "ai" | "form";

export interface ChatStartResponse {
  conversationId: string;
  /** Signed, scoped to this conversation. Sent back on every subsequent call. */
  visitorToken: string;
  mode: ChatMode;
  status: ChatConversationStatus;
  messages: ChatMessageDTO[];
  cursor: number;
  /** Present in form mode: why the assistant is unavailable, in plain words. */
  notice?: string;
}

export interface ChatPollResponse {
  messages: ChatMessageDTO[];
  cursor: number;
  status: ChatConversationStatus;
  /** Set once a human joins, so the widget can say who it is. */
  agentLabel?: string;
  /** True while the assistant is composing, so the widget holds its indicator. */
  pending?: boolean;
}

export interface ChatSendResponse extends ChatPollResponse {
  /** Set when the send was refused — rate limit, turn cap, closed conversation. */
  refused?: string;
  retryAfterSec?: number;
}

/* -------------------------------------------------------------------------
   Agent console
------------------------------------------------------------------------- */

/**
 * Injected into the shell as window.__CHAT_AGENT__ when a join link is opened.
 *
 * Deliberately does not carry the token: the console re-reads it from the
 * httpOnly cookie the join route set, and the page scrubs the token out of the
 * address bar on load. Nothing here is a credential.
 */
export interface ChatAgentContext {
  conversationId: string;
  agentLabel: string;
  /** Already joined, e.g. because Ali reopened the link on a second device. */
  joined: boolean;
  /** What the visitor asked for, so the console can lead with it. */
  summary?: string;
  visitorEmail?: string;
  visitorWebsite?: string;
  startedOn?: string;
}

export interface ChatAgentViewResponse {
  conversationId: string;
  status: ChatConversationStatus;
  messages: ChatMessageDTO[];
  cursor: number;
  joined: boolean;
  agentLabel: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  visitorCompany?: string;
  visitorWebsite?: string;
  /** Where they operate, in their own words. */
  visitorArea?: string;
  startedOn?: string;
  handoffReason?: string;
  /** Score of the audit run in-conversation, when there was one. */
  auditScore?: number | null;
  auditDomain?: string;
}

declare global {
  interface Window {
    __CHAT_AGENT__?: ChatAgentContext;
  }
}
