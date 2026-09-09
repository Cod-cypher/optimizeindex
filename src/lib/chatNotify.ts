/**
 * Letting someone know a message arrived when they are not looking at it.
 *
 * Two channels, both used by the visitor widget and the agent console:
 * a short chime, and a count in the browser tab title.
 *
 * The chime is synthesised rather than loaded from a file. An mp3 would be a
 * binary in the repo, a network request on a page that currently makes none for
 * audio, and a decode step before the first sound can play — for two notes. The
 * Web Audio API produces them in about twenty lines and they are ready
 * instantly.
 */

const MUTE_KEY = 'oi_chat_muted';

/* -------------------------------------------------------------------------
   Mute
------------------------------------------------------------------------- */

/**
 * Muting is per-browser and remembered.
 *
 * localStorage rather than sessionStorage, unlike the conversation itself: a
 * preference about noise should outlive the tab that set it. A sound on every
 * message with no way to stop it is the kind of thing people close the widget
 * over.
 */
export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Private mode. The setting just will not persist.
  }
}

/* -------------------------------------------------------------------------
   Sound
------------------------------------------------------------------------- */

let audio: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audio) return audio;

  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    audio = new Ctor();
    return audio;
  } catch {
    return null;
  }
}

/**
 * Prepares audio while a real user gesture is on the stack.
 *
 * Browsers refuse to start an AudioContext outside a click or keypress, and a
 * context created too early is born suspended — so the first chime would be
 * silently dropped, which reads as "the sound does not work" rather than "the
 * sound needed permission". Call this from the click that opens the panel and
 * from the one that joins a conversation.
 */
export function unlockAudio(): void {
  const ctx = context();
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

function note(ctx: AudioContext, frequency: number, startAt: number, duration: number, peak: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = frequency;

  // Ramped rather than switched. A gain that jumps to full produces an audible
  // click at the start of the note, which is the difference between a chime and
  // a glitch.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/**
 * A rising two-note chime. Deliberately quiet and short — this fires on a
 * message someone is already expecting, not on an alarm.
 */
export function playIncoming(): void {
  if (isMuted()) return;
  const ctx = context();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  note(ctx, 660, now, 0.11, 0.045);
  note(ctx, 880, now + 0.09, 0.16, 0.04);
}

/* -------------------------------------------------------------------------
   Tab title
------------------------------------------------------------------------- */

/**
 * Puts an unread count in front of the tab title, "(2) OptimizeIndex | …".
 *
 * The prefix is stripped from whatever the title currently is before the new
 * one is applied, rather than being restored from a value captured earlier.
 * That matters because this is a client-routed site: App.tsx rewrites the title
 * on navigation, so a saved copy goes stale the moment someone clicks a link
 * with the chat open, and restoring it later would put the wrong page's title
 * back.
 */
export function setTabBadge(count: number): void {
  if (typeof document === 'undefined') return;

  const bare = document.title.replace(/^\(\d+\)\s*/, '');
  document.title = count > 0 ? `(${count}) ${bare}` : bare;
}
