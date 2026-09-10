/**
 * The chat client: the API calls, the poller, and the small amount of state
 * that has to survive a page load.
 *
 * Kept out of the components so the widget stays about rendering. The polling
 * cadence in particular is a policy decision — how often we are willing to hit
 * the server on a visitor's behalf — and it belongs somewhere it can be read
 * without scrolling past JSX.
 */

import type {
  ChatMessageDTO,
  ChatPollResponse,
  ChatResumeResponse,
  ChatSendResponse,
  ChatStartResponse,
} from '../../shared/chatTypes';
import { getSessionId, getVisitorId } from './tracker';
import { getGaClientId } from './analytics';

/**
 * localStorage, not sessionStorage.
 *
 * This was sessionStorage, on the reasoning that a conversation is scoped to a
 * visit and that on a shared or family browser localStorage would resurrect a
 * stranger's conversation — including whatever they told the assistant — the
 * next day. That reasoning is still sound. It is being traded away knowingly.
 *
 * What it cost: a conversation died with the browser tab. Somebody who asked a
 * question on Monday, got an answer, and came back on Wednesday met a blank
 * widget and a fresh greeting — while the transcript Ali had been emailed about
 * sat on the server as an orphan, and Ali got no second email either, because
 * the "chat started" notification can only fire once per conversation. The
 * thread the visitor thought they were in did not exist on either side.
 *
 * The mitigation for the shared-browser case is the "Start a new chat" control
 * in the panel header: one visible, two-tap way to close the conversation and
 * clear this key. That is a better answer than silent amnesia, because it is
 * the visitor's decision rather than the storage API's.
 *
 * Bounded three ways even so — RESUME_WINDOW_MS here, the token's own seven-day
 * signature (server/chat/tokens.ts), and pruneOldChats on the server.
 */
const STORAGE_KEY = 'oi_chat';

/**
 * Beyond this, a stored conversation is treated as stale and a new one starts.
 *
 * Matched to VISITOR_TTL_MS in server/chat/tokens.ts. The two have to agree:
 * a longer window here would hand the server a lapsed token and resume would
 * fail, and a shorter one would throw away conversations the server would still
 * have honoured. Both slide — the server re-signs on every resume, and the
 * write below refreshes lastSeenAt — so a visitor who keeps coming back keeps
 * the thread.
 */
const RESUME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface PersistedChat {
  id: string;
  token: string;
  cursor: number;
  /**
   * Refreshed on every write, not set once at the start. The resume window
   * measures silence, not the age of the conversation.
   */
  lastSeenAt: number;
  /** Re-open the panel after a full page load, so a chat does not vanish. */
  wasOpen: boolean;
}

export function readPersisted(): PersistedChat | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedChat;
    if (!parsed?.id || !parsed.token) return null;
    if (Date.now() - (parsed.lastSeenAt || 0) > RESUME_WINDOW_MS) return null;
    return parsed;
  } catch {
    // Private mode, disabled storage, or corrupt JSON. Start fresh.
    return null;
  }
}

export function writePersisted(value: PersistedChat): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Not being able to remember the conversation is survivable; the chat
    // still works for as long as the page is open.
  }
}

export function clearPersisted(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}

/* -------------------------------------------------------------------------
   API
------------------------------------------------------------------------- */

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 429) throw new Error(`Chat request failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function startChat(): Promise<ChatStartResponse> {
  return postJson<ChatStartResponse>('/api/chat/start', {
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    gaClientId: getGaClientId(),
    path: window.location.pathname,
    referrer: document.referrer || '',
  });
}

export async function sendChatMessage(
  id: string,
  token: string,
  text: string,
  cursor: number,
): Promise<ChatSendResponse> {
  return postJson<ChatSendResponse>(`/api/chat/${encodeURIComponent(id)}/message`, {
    visitorToken: token,
    text,
    cursor,
  });
}

/**
 * `active` is panel-open-and-tab-visible, and it is the visitor's half of the
 * presence signal the agent console reads. It rides a request that was already
 * being made, so knowing whether somebody is still reading costs nothing.
 */
export async function pollChat(
  id: string,
  token: string,
  after: number,
  active: boolean,
): Promise<ChatPollResponse> {
  const query = new URLSearchParams({ after: String(after), t: token, v: active ? '1' : '0' });
  const res = await fetch(`/api/chat/${encodeURIComponent(id)}/messages?${query}`);
  if (!res.ok) throw new Error(`Chat poll failed: ${res.status}`);
  return (await res.json()) as ChatPollResponse;
}

/**
 * Picks up a conversation from a previous visit.
 *
 * Deliberately not a poll from cursor zero, which is what this used to be. The
 * server re-reads whether the assistant is available (it may have gone down
 * since the last visit), decides whether the gap earns a welcome-back line, and
 * hands back a freshly signed token — so the seven-day window slides from this
 * visit rather than counting down from the first one. Store the token it
 * returns; the one that was sent is the older of the two.
 */
export async function resumeChat(
  id: string,
  token: string,
  active: boolean,
): Promise<ChatResumeResponse> {
  return postJson<ChatResumeResponse>(`/api/chat/${encodeURIComponent(id)}/resume`, {
    visitorToken: token,
    active,
  });
}

/**
 * Tells the server the page is closing, so the agent console stops showing a
 * reader who is not there.
 *
 * sendBeacon rather than fetch: the page is unloading and a normal request is
 * cancelled with it. Best effort by nature — nothing fires for a crash or a
 * killed tab, which is why the server also times the heartbeat out.
 *
 * Note this does not close the conversation. The visitor may be back tomorrow,
 * and the transcript is kept for them.
 */
export function beaconAway(id: string, token: string): void {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;
  try {
    navigator.sendBeacon(
      `/api/chat/${encodeURIComponent(id)}/away`,
      new Blob([JSON.stringify({ visitorToken: token })], { type: 'application/json' }),
    );
  } catch {
    // Nothing useful to do while the page is going away.
  }
}

export async function closeChat(id: string, token: string): Promise<void> {
  try {
    await postJson(`/api/chat/${encodeURIComponent(id)}/close`, { visitorToken: token });
  } catch {
    // Closing is a courtesy to the server, not something the visitor waits on.
  }
}

/* -------------------------------------------------------------------------
   Polling
------------------------------------------------------------------------- */

/** A hidden tab with nothing happening. Cheap background heartbeat. */
const HIDDEN_IDLE_MS = 30_000;

/**
 * A hidden tab while a person is actually typing to them.
 *
 * Browsers throttle timers in background tabs — roughly one per second, and
 * after a few minutes hidden, closer to one per minute. There is no way to opt
 * out of that from a page, so the interval we ask for is a floor and not a
 * promise. Asking for five seconds rather than thirty is what makes the
 * difference between "heard it a moment later" and "heard it when I came back
 * to the tab", which is the complaint this exists to fix.
 */
const HIDDEN_LIVE_MS = 5_000;

/**
 * How long to wait before the next poll.
 *
 * Two seconds only while it matters — a human is typing, or a reply is
 * outstanding. Everything else backs off.
 *
 * A hidden tab used to stop polling altogether, on the reasoning that a visitor
 * who left a tab open overnight should not be making requests all night. That
 * was wrong once the widget grew a sound and a tab-title badge: both exist
 * precisely to reach someone who is looking at a different tab, and neither can
 * fire for a message that was never fetched. So a hidden tab keeps checking,
 * slowly. Thirty seconds is roughly a hundred requests over an eight-hour
 * night, against an indexed query — cheap enough not to matter, frequent enough
 * that a reply is noticed within half a minute.
 */
export function pollInterval(state: {
  status: string;
  panelOpen: boolean;
  awaitingReply: boolean;
  errorStreak: number;
}): number | null {
  if (state.errorStreak >= 3) {
    // Exponential, capped at a minute. Enough to ride out a deploy.
    return Math.min(60_000, 5_000 * 2 ** (state.errorStreak - 2));
  }
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    // A hidden tab in a live conversation is the case that matters most: a
    // person is typing to someone who is looking at something else, and the
    // whole point of the chime is to bring them back.
    return state.status === 'LIVE' || state.awaitingReply ? HIDDEN_LIVE_MS : HIDDEN_IDLE_MS;
  }
  if (state.status === 'LIVE' || state.awaitingReply) return 2_000;
  if (state.panelOpen) return 5_000;
  return 20_000;
}

/** Ids given to messages shown before the server has confirmed them. */
export const OPTIMISTIC_PREFIX = 'local-';

export function optimisticId(): string {
  return `${OPTIMISTIC_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Merges new messages in.
 *
 * Two kinds of duplicate to worry about. The first is the same row arriving
 * twice — the send response and a poll that overlapped it — which the id set
 * handles.
 *
 * The second is subtler and was worth writing this comment for: a message the
 * visitor sent is rendered immediately with a made-up id so the input clears
 * without waiting for a round trip, and the server then echoes the real row
 * back with a cuid. Deduplicating on id alone would leave both, and the visitor
 * would watch their own message appear twice. So an optimistic entry is dropped
 * as soon as a real VISITOR message with the same text arrives.
 */
export function mergeMessages(
  existing: ChatMessageDTO[],
  incoming: ChatMessageDTO[],
): ChatMessageDTO[] {
  if (incoming.length === 0) return existing;

  const seen = new Set(existing.map((m) => m.id));
  const added = incoming.filter((m) => !seen.has(m.id));
  if (added.length === 0) return existing;

  const confirmed = new Set(
    added.filter((m) => m.role === 'VISITOR').map((m) => m.content),
  );
  const kept = existing.filter(
    (m) => !(m.id.startsWith(OPTIMISTIC_PREFIX) && confirmed.has(m.content)),
  );

  return [...kept, ...added].sort((a, b) => a.seq - b.seq);
}
