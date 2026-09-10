/**
 * Signed tokens for the chat feature.
 *
 * Two kinds, both stateless HMACs built the same way as the admin session in
 * server/auth.ts — a base64url payload, a dot, and a signature over it:
 *
 *   visitor  proves a caller opened this conversation. The conversation id is
 *            already an unguessable cuid, so this is defence in depth against
 *            id walking rather than the only lock on the door.
 *
 *   agent    the credential inside the emailed join link. This one is a real
 *            bearer token: whoever holds it can type as the agent into exactly
 *            one conversation until it expires or is revoked.
 *
 * Both keys are domain-separated from the admin session secret and from each
 * other, so a token minted for one purpose can never verify as another even
 * though all three derive from SESSION_SECRET. Rotating SESSION_SECRET
 * invalidates every admin session and every outstanding join link at once,
 * which is the intended "revoke everything" lever.
 */

import crypto from "node:crypto";
import { sessionSecret } from "../auth";

/**
 * Seven days, matching the widget's resume window in src/lib/chat.ts, and
 * re-signed on every resume so the window slides.
 *
 * This was 24 hours, on the reasoning that a visitor token only has to outlive
 * the tab it was issued to. A conversation now outlives the tab deliberately —
 * it is kept in localStorage so somebody who comes back on Thursday picks up
 * the thread they started on Monday — and a token that lapses first would mean
 * the transcript is still on the server, still the same conversation, and the
 * only person who cannot reach it is the person who wrote it.
 *
 * The cost is a seven-day bearer credential sitting in localStorage. What it
 * buys the holder is bounded: read and write one conversation, nothing else, no
 * account, no other conversation. And per the note above, the conversation id
 * is already an unguessable cuid — this is defence in depth against id walking
 * rather than the lock on the door. Rotating SESSION_SECRET still invalidates
 * every one of these at once.
 */
const VISITOR_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 48 hours. Long enough that a link read the next morning still works, short
 * enough to bound a leak. The DB carries its own agentTokenExpiresAt as well,
 * so a link can be revoked well before its signature lapses.
 */
export const AGENT_TTL_MS = 48 * 60 * 60 * 1000;

type Scope = "chat-visitor" | "chat-agent";

interface VisitorClaims {
  cid: string;
  exp: number;
  scope: "chat-visitor";
}

interface AgentClaims {
  cid: string;
  /** Nonce matched against ChatConversation.agentTokenId, so links are revocable. */
  jti: string;
  exp: number;
  scope: "chat-agent";
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * Domain separation is the point of the scope in the key material: without it,
 * a visitor token and an agent token over the same conversation id would have
 * identical signatures, and the cheaper one would unlock the stronger one.
 */
function hmac(scope: Scope, data: string): string {
  return crypto
    .createHmac("sha256", `${sessionSecret()}|${scope}-v1`)
    .update(data)
    .digest("base64url");
}

function sign(scope: Scope, claims: VisitorClaims | AgentClaims): string {
  const body = b64url(JSON.stringify(claims));
  return `${body}.${hmac(scope, body)}`;
}

function verify<T extends VisitorClaims | AgentClaims>(
  scope: Scope,
  token: string | undefined,
): T | null {
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  // Compare as bytes, and bail on a length mismatch first — timingSafeEqual
  // throws rather than returning false when the lengths differ.
  const a = Buffer.from(signature);
  const b = Buffer.from(hmac(scope, body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as T;
    if (!claims || claims.scope !== scope || !claims.cid) return null;
    if (typeof claims.exp !== "number" || Date.now() > claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------
   Visitor
------------------------------------------------------------------------- */

export function signVisitorToken(conversationId: string): string {
  return sign("chat-visitor", {
    cid: conversationId,
    exp: Date.now() + VISITOR_TTL_MS,
    scope: "chat-visitor",
  });
}

/** True when the token is valid and belongs to this conversation. */
export function visitorOwns(token: string | undefined, conversationId: string): boolean {
  const claims = verify<VisitorClaims>("chat-visitor", token);
  return Boolean(claims && claims.cid === conversationId);
}

/* -------------------------------------------------------------------------
   Agent
------------------------------------------------------------------------- */

/** A fresh nonce to store on the conversation and embed in the link. */
export function newAgentTokenId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function signAgentToken(conversationId: string, jti: string, ttlMs = AGENT_TTL_MS): string {
  return sign("chat-agent", {
    cid: conversationId,
    jti,
    exp: Date.now() + ttlMs,
    scope: "chat-agent",
  });
}

export function verifyAgentToken(token: string | undefined): AgentClaims | null {
  const claims = verify<AgentClaims>("chat-agent", token);
  return claims && claims.jti ? claims : null;
}

/**
 * A short, non-reversible handle for logging.
 *
 * The join token travels in a URL path, and a path is the most-logged string in
 * a web stack. Nothing in this codebase may log the token itself; log this
 * instead when a line is needed to correlate a request.
 */
export function tokenFingerprint(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 8);
}
