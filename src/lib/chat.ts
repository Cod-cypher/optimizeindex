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
  ChatSendResponse,
  ChatStartResponse,
} from '../../shared/chatTypes';
import { getSessionId, getVisitorId } from './tracker';
import { getGaClientId } from './analytics';

/**
 * sessionStorage, not localStorage.
 *
 * A conversation is scoped to a visit. On a shared or family browser,
 * localStorage would resurrect a stranger's conversation — including whatever
 * they told the assistant — the next day. This matches how tracker.ts scopes
 * its own session id.
 */
const STORAGE_KEY = 'oi_chat';

/** Beyond this, a stored conversation is treated as stale and a new one starts. */
const RESUME_WINDOW_MS = 2 * 60 * 60 * 1000;

export interface PersistedChat {
  id: string;
  token: string;
  cursor: number;
  openedAt: number;
  /** Re-open the panel after a full page load, so a chat does not vanish. */
  wasOpen: boolean;
}

export function readPersisted(): PersistedChat | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedChat;
    if (!parsed?.id || !parsed.token) return null;
    if (Date.now() - parsed.openedAt > RESUME_WINDOW_MS) return null;
    return parsed;
  } catch {
    // Private mode, disabled storage, or corrupt JSON. Start fresh.
    return null;
  }
}

export function writePersisted(value: PersistedChat): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Not being able to remember the conversation is survivable; the chat
    // still works for as long as the page is open.
  }
}

export function clearPersisted(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
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

export async function pollChat(
  id: string,
  token: string,
  after: number,
): Promise<ChatPollResponse> {
  const query = new URLSearchParams({ after: String(after), t: token });
  const res = await fetch(`/api/chat/${encodeURIComponent(id)}/messages?${query}`);
  if (!res.ok) throw new Error(`Chat poll failed: ${res.status}`);
  return (await res.json()) as ChatPollResponse;
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
