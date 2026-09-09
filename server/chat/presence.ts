/**
 * Whether a human is actually still at the keyboard.
 *
 * Joining a conversation mutes the assistant, which is right while someone is
 * there and badly wrong the moment they are not: a visitor typing into a
 * conversation whose agent closed the tab gets silence, from a widget that was
 * answering perfectly well a minute earlier. Nothing tells the server that a
 * browser tab went away, so presence has to be inferred.
 *
 * The agent console polls every two seconds. Each poll is a heartbeat. If the
 * heartbeats stop for longer than STALE_MS, the agent is treated as gone and
 * the assistant takes the conversation back.
 *
 * Held in memory rather than the database, for the same reason the turn steps
 * were: the lifetime of this fact is one open browser tab. It also means a
 * server restart reads as "no agent present", which is exactly right — every
 * console connection died with the process, so falling back to the assistant is
 * the correct behaviour rather than a bug to work around.
 *
 * One more thing that assumes a single PM2 instance. A poll served by a
 * different process than the one holding the heartbeat would see an absent
 * agent and hand the conversation back early. See ecosystem.config.cjs.
 */

/**
 * How long silence means gone.
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
