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

/* -------------------------------------------------------------------------
   Tuning

   Kept as named constants because "make it more aggressive" is a knob that
   gets turned more than once, and the alternative is hunting magic numbers
   through the oscillator code.
------------------------------------------------------------------------- */

/**
 * Triangle rather than sine. A sine is a single harmonic — pure, soft, and
 * easily lost under music or a noisy room. A triangle carries odd harmonics,
 * which is what makes it cut through, without the buzz of a square wave.
 */
const WAVE: OscillatorType = 'triangle';

/** Peak gain per note. Was 0.045; this is roughly three times as loud. */
const PEAK = 0.13;

/** Seconds from silence to full. Short enough to read as a hit, not a swell. */
const ATTACK = 0.004;

/** A bright ascending triad — G5, B5, E6. Rising reads as "arrived". */
const NOTES = [784, 988, 1319];

/** Gap between note onsets. Tight, so it lands as one event rather than three. */
const SPACING = 0.062;

const DURATION = 0.13;

function note(ctx: AudioContext, frequency: number, startAt: number, duration: number, peak: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = WAVE;
  osc.frequency.value = frequency;

  // Ramped rather than switched. A gain that jumps to full produces an audible
  // click at the start of the note, which is the difference between a chime and
  // a glitch. The attack is deliberately near the edge of that — fast enough to
  // have some snap, slow enough not to pop.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + ATTACK);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

function chime(ctx: AudioContext): void {
  const now = ctx.currentTime;

  NOTES.forEach((frequency, i) => {
    const at = now + i * SPACING;
    // The last note rings slightly longer, so the sound resolves rather than
    // being cut off mid-flight.
    const duration = i === NOTES.length - 1 ? DURATION * 1.6 : DURATION;
    note(ctx, frequency, at, duration, PEAK);
  });
}

/**
 * A rising three-note alert. Loud enough and bright enough to be noticed from
 * another tab, which is the whole reason it exists — a sound nobody hears over
 * their music is the same as no sound.
 *
 * The mute toggle in the panel header is the counterweight. Tune it through the
 * constants above rather than here.
 *
 * A suspended context is resumed and then played, rather than skipped. resume()
 * is asynchronous, so a context unlocked by a click a moment earlier can still
 * be mid-resume when the first message lands — and the earlier version returned
 * silently in exactly that window, which is the first chime of the
 * conversation. Scheduling against a suspended context is not an option either:
 * its currentTime does not advance, so the notes would be queued at a timestamp
 * that never arrives.
 */
export function playIncoming(): void {
  if (isMuted()) return;
  const ctx = context();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx
      .resume()
      .then(() => chime(ctx))
      .catch(() => {});
    return;
  }
  if (ctx.state !== 'running') return;
  chime(ctx);
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
