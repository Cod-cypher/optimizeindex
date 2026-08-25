/**
 * Sliding-window rate limiting for the audit endpoints.
 *
 * Each scan makes the server fetch several URLs on a stranger's behalf and can
 * cost a PageSpeed API call, so these routes need a ceiling the rest of the
 * API doesn't. One PM2 instance (see ecosystem.config.cjs) means an in-process
 * Map is sufficient; if the app is ever scaled out this must move to the
 * database or Redis.
 */

interface Window {
  limit: number;
  windowMs: number;
  label: string;
}

const WINDOWS: Window[] = [
  { limit: 8, windowMs: 10 * 60 * 1000, label: "10 minutes" },
  { limit: 20, windowMs: 60 * 60 * 1000, label: "hour" },
];

const LONGEST = Math.max(...WINDOWS.map((w) => w.windowMs));

const hits = new Map<string, number[]>();
let lastSweep = Date.now();

/** Drops keys whose most recent hit has aged out, so the Map can't grow forever. */
function sweep(now: number) {
  if (now - lastSweep < 5 * 60 * 1000) return;
  lastSweep = now;
  for (const [key, times] of hits) {
    if (times.length === 0 || now - times[times.length - 1] > LONGEST) {
      hits.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
  message?: string;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const times = (hits.get(key) || []).filter((t) => now - t < LONGEST);

  for (const w of WINDOWS) {
    const inWindow = times.filter((t) => now - t < w.windowMs);
    if (inWindow.length >= w.limit) {
      const oldest = inWindow[0];
      const retryAfterSec = Math.max(1, Math.ceil((w.windowMs - (now - oldest)) / 1000));
      hits.set(key, times);
      return {
        allowed: false,
        retryAfterSec,
        message: `You've run ${w.limit} scans this ${w.label}. Take the human route instead — we'll audit it properly and send it over.`,
      };
    }
  }

  times.push(now);
  hits.set(key, times);
  return { allowed: true };
}
