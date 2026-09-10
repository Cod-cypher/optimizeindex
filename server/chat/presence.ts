/**
 * Who is actually still at the keyboard — on both sides of the conversation.
 *
 * Nothing tells a server that a browser tab went away, so presence has to be
 * inferred from polls. Both sides already poll, so both heartbeats are free.
 *
 * AGENT presence exists because joining a conversation mutes the assistant,
 * which is right while someone is there and badly wrong the moment they are
 * not: a visitor typing into a conversation whose agent closed the tab gets
 * silence, from a widget that was answering perfectly well a minute earlier.
 * The console polls every two seconds; if the heartbeats stop for longer than
 * AGENT_STALE_MS the assistant takes the conversation back.
 *
 * VISITOR presence exists for the mirror-image problem. The agent console shows
 * a transcript and a composer whether or not anyone is still reading, so Ali
 * could be typing carefully to a window that closed ten minutes ago. This is
 * what puts "they left" on his screen, and what triggers the email when they
 * leave before he ever arrived.
 *
 * Held in memory rather than the database, for the same reason the turn steps
 * were: the lifetime of this fact is one open browser tab. It also means a
 * server restart reads as "nobody present", which is exactly right — every
 * connection died with the process, so falling back to the assistant is the
 * correct behaviour rather than a bug to work around.
 *
 * All of this assumes a single PM2 instance. A poll served by a different
 * process than the one holding the heartbeat would see an absent agent and hand
 * the conversation back early, or an absent visitor and email that they left.
 * See ecosystem.config.cjs.
 */

/**
 * How long agent silence means gone.
 *
 * The console polls every 2s, so this tolerates roughly fifteen missed polls.
 * Long enough to ride out a phone changing network or a laptop sleeping for a
 * moment; short enough that a visitor is not left waiting on someone who has
 * closed the tab.
 */
const STALE_MS = 35_000;

const seen = new Map<string, number>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [id, at] of seen) {
    if (now - at > STALE_MS * 4) seen.delete(id);
  }
  for (const [id, entry] of visitors) {
    if (now - entry.at > VISITOR_STALE_MS * 4) visitors.delete(id);
  }
}

/** Called on every agent poll, message and join. */
export function markAgentSeen(conversationId: string): void {
  const now = Date.now();
  sweep(now);
  seen.set(conversationId, now);
}

/** Called when an agent explicitly leaves or closes the console. */
export function clearAgentSeen(conversationId: string): void {
  seen.delete(conversationId);
}

/**
 * Whether an agent has been heard from recently enough to still be counted.
 *
 * A conversation with no entry at all — never joined, or lost to a restart —
 * is absent rather than present. The caller decides what to do about it.
 */
export function agentPresent(conversationId: string): boolean {
  const at = seen.get(conversationId);
  if (at === undefined) return false;
  return Date.now() - at <= STALE_MS;
}

/* -------------------------------------------------------------------------
   The visitor
------------------------------------------------------------------------- */

/**
 * "here"  reading the conversation right now — panel open, tab in front.
 * "away"  the page is loaded but they are not looking at it: another tab, or
 *         the widget minimised. Still reachable; a reply will be waiting.
 * "gone"  the page is closed. Nothing more we send will be seen.
 */
export type VisitorState = "here" | "away" | "gone";

/**
 * How long visitor silence means gone. Nearly three times the agent's window,
 * and the difference is deliberate.
 *
 * A backgrounded visitor tab polls every 30s (HIDDEN_IDLE_MS in
 * src/lib/chat.ts), and browsers throttle hidden-tab timers further the longer
 * they stay hidden — toward one per minute. The agent's 35s would report
 * "they left" for somebody who is reading a different tab with our page still
 * open behind it, which is the one wrong answer that matters: it fires an email
 * saying a live visitor walked away.
 *
 * So the timeout is generous, and the fast path is the explicit beacon the
 * widget sends on pagehide. That covers the case this exists for — someone
 * closing the window — in about a second. This is the backstop for crashes,
 * lost signal, and a tab the OS killed.
 */
const VISITOR_STALE_MS = 90_000;

/**
 * How long a departure has to hold before it is worth telling anyone about.
 *
 * The beacon fires on pagehide, and pagehide does not mean "closed the site".
 * It also fires on a hard navigation — an external link, a form post, any link
 * that escapes the client-side router — and on a back/forward-cache suspend.
 * Emailing straight off the beacon would send "they left before you got there"
 * to Ali every time somebody followed a link that reloaded the page, while the
 * visitor carried on reading two seconds later.
 *
 * So the beacon is allowed to change what the agent *sees* immediately, because
 * a pill that corrects itself two seconds later costs nothing. Only the email
 * waits out this grace period, and any heartbeat arriving inside it cancels the
 * departure outright.
 */
const VISITOR_LEFT_GRACE_MS = 60_000;

interface VisitorEntry {
  /** Last heartbeat. */
  at: number;
  /** Panel open AND tab visible at the last heartbeat. */
  active: boolean;
  /** When the beacon said they were leaving, if it did. */
  goneAt: number | null;
  /** Whether the departure has already been handed to the notifier. */
  reported: boolean;
}

const visitors = new Map<string, VisitorEntry>();

/**
 * Called on every visitor poll, resume and message.
 *
 * `active` is panel-open-and-tab-visible. Anything else is a page that is
 * loaded but not being read, which is worth telling the agent apart from both
 * of the other two states.
 *
 * Note that this clears goneAt. A heartbeat is proof they are still here, and
 * it is what makes a hard navigation — beacon out, page back, poll in —
 * resolve to "never left" rather than to an email.
 */
export function markVisitorSeen(conversationId: string, active: boolean): void {
  const now = Date.now();
  sweep(now);
  visitors.set(conversationId, { at: now, active, goneAt: null, reported: false });
}

/** Called by the pagehide beacon. The fast path for a closed window. */
export function markVisitorGone(conversationId: string): void {
  const now = Date.now();
  const existing = visitors.get(conversationId);
  visitors.set(conversationId, {
    at: existing?.at ?? now,
    active: false,
    goneAt: now,
    // A visitor who leaves, comes back and leaves again is a second departure
    // worth considering on its own merits. The database guard stops the second
    // email; this map does not need to.
    reported: false,
  });
}

export function visitorState(conversationId: string): {
  state: VisitorState;
  lastSeenAt: number | null;
} {
  const entry = visitors.get(conversationId);

  // No entry at all is not the same as gone. It is a conversation this process
  // has never heard a poll for — never resumed, or predating a restart — and
  // claiming the visitor left would be inventing a fact.
  if (!entry) return { state: "away", lastSeenAt: null };

  if (entry.goneAt !== null) return { state: "gone", lastSeenAt: entry.at };
  if (Date.now() - entry.at > VISITOR_STALE_MS) return { state: "gone", lastSeenAt: entry.at };
  return { state: entry.active ? "here" : "away", lastSeenAt: entry.at };
}

/**
 * Departures that have held long enough to be worth an email, marked as
 * reported on the way out.
 *
 * Two ways in. A beacon that has since gone quiet for the grace period — they
 * closed the window and did not come back. Or a heartbeat that simply stopped,
 * which is the crash, the killed tab, the phone that lost signal; no beacon is
 * ever coming for those, so the timeout stands in for one.
 *
 * Marking reported inside the read is what stops the next sweep thirty seconds
 * later from finding the same departure again. The database guard is the second
 * line, not the first.
 */
export function takeDepartedVisitors(): string[] {
  const now = Date.now();
  const departed: string[] = [];

  for (const [id, entry] of visitors) {
    if (entry.reported) continue;

    const leftByBeacon = entry.goneAt !== null && now - entry.goneAt > VISITOR_LEFT_GRACE_MS;
    const leftBySilence = now - entry.at > VISITOR_STALE_MS + VISITOR_LEFT_GRACE_MS;
    if (!leftByBeacon && !leftBySilence) continue;

    entry.reported = true;
    departed.push(id);
  }

  return departed;
}
