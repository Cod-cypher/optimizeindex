/**
 * Rate limiting for the chat endpoints.
 *
 * Separate from server/audit/ratelimit.ts and from the login throttle in
 * server/auth.ts on purpose, for the same reason those two are separate from
 * each other: the windows and the copy are different, and sharing one module
 * would mean a visitor who ran an audit had less chat budget. That is the
 * precedent set at server/auth.ts:194.
 *
 * The exception is the in-chat site audit, which deliberately calls the *audit*
 * limiter — see server/chat/tools.ts. Scanning a stranger's site costs the same
 * whether it was requested from the hero or from a conversation.
 *
 * In-process, which is sufficient for the single PM2 instance this app runs as.
 * MUST move to the database or Redis before instances is raised above 1 — at N
 * instances every limit here silently becomes N times looser, and unlike the
 * other two limiters this one is what stands between an abuser and an OpenAI
 * bill. See the comment in ecosystem.config.cjs.
 */

interface Window {
  limit: number;
  windowMs: number;
  label: string;
}

/** Opening the widget. Cheap, but it writes a row and hands out a token. */
const START_WINDOWS: Window[] = [
  { limit: 3, windowMs: 10 * 60 * 1000, label: "10 minutes" },
  { limit: 20, windowMs: 24 * 60 * 60 * 1000, label: "day" },
];

/** Sending a message. This is the one that costs money. */
const MESSAGE_WINDOWS: Window[] = [
  { limit: 12, windowMs: 60 * 1000, label: "minute" },
  { limit: 60, windowMs: 60 * 60 * 1000, label: "hour" },
  { limit: 120, windowMs: 24 * 60 * 60 * 1000, label: "day" },
];

/** Polling. An indexed read, so the ceiling only has to stop a runaway loop. */
const POLL_WINDOWS: Window[] = [{ limit: 120, windowMs: 60 * 1000, label: "minute" }];

/** An agent typing. Generous — this is a colleague, not the public. */
const AGENT_WINDOWS: Window[] = [{ limit: 40, windowMs: 60 * 1000, label: "minute" }];

export type ChatLimit = "start" | "message" | "poll" | "agent";

const WINDOWS: Record<ChatLimit, Window[]> = {
  start: START_WINDOWS,
  message: MESSAGE_WINDOWS,
  poll: POLL_WINDOWS,
  agent: AGENT_WINDOWS,
};

const LONGEST = Math.max(...Object.values(WINDOWS).flat().map((w) => w.windowMs));

const hits = new Map<string, number[]>();
let lastSweep = Date.now();

/** Drops keys whose most recent hit has aged out, so the Map cannot grow forever. */
function sweep(now: number) {
  if (now - lastSweep < 5 * 60 * 1000) return;
  lastSweep = now;
  for (const [key, times] of hits) {
    if (times.length === 0 || now - times[times.length - 1] > LONGEST) {
      hits.delete(key);
    }
  }
}

export interface ChatRateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
  /** Written to be shown to the visitor verbatim, in the site's voice. */
  message?: string;
}

/**
 * @param kind  which budget to spend from
 * @param key   the identity to meter — an IP for public calls, a conversation
 *              id where the cost is per conversation rather than per person
 */
export function checkChatRate(kind: ChatLimit, key: string): ChatRateLimitResult {
  const now = Date.now();
  sweep(now);

  // Namespaced so one visitor's message budget and poll budget are separate
  // counters rather than one shared list.
  const mapKey = `${kind}:${key}`;
  const times = (hits.get(mapKey) || []).filter((t) => now - t < LONGEST);

  for (const w of WINDOWS[kind]) {
    const inWindow = times.filter((t) => now - t < w.windowMs);
    if (inWindow.length >= w.limit) {
      const oldest = inWindow[0];
      const retryAfterSec = Math.max(1, Math.ceil((w.windowMs - (now - oldest)) / 1000));
      // Persist the filtered list so an over-limit caller still gets its old
      // entries aged out rather than pinned forever.
      hits.set(mapKey, times);
      return { allowed: false, retryAfterSec, message: refusal(kind, w) };
    }
  }

  times.push(now);
  hits.set(mapKey, times);
  return { allowed: true };
}

function refusal(kind: ChatLimit, w: Window): string {
  if (kind === "start") {
    return "That is a lot of new conversations from one place. Give it a few minutes, or email ali@optimizeindex.com and we will pick it up there.";
  }
  if (kind === "agent") {
    return `Sending too quickly — ${w.limit} messages a ${w.label} is the ceiling.`;
  }
  if (kind === "poll") {
    return "Too many requests.";
  }
  return `You have sent ${w.limit} messages this ${w.label}. Take the human route instead — email ali@optimizeindex.com and we will reply properly.`;
}

/** Test seam: drops all counters. Not called in production. */
export function resetChatRateLimits() {
  hits.clear();
}
