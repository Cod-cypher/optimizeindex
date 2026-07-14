/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * First-party analytics tracker. Captures visitors, sessions, page views
 * (with time-on-page and scroll depth), and interaction events (CTA clicks,
 * goal selections, phone/email taps, form starts, outbound clicks), then
 * batches them to /api/track. Complements GA4 with data we own in Postgres.
 */

const VISITOR_KEY = 'oi_vid';
const SESSION_KEY = 'oi_sid';
const SESSION_ACTIVITY_KEY = 'oi_sid_last';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min inactivity = new session
const FLUSH_INTERVAL_MS = 5000;

type Json = Record<string, unknown>;

interface TrackedPageView {
  id: string;
  path: string;
  title: string;
  startedAt: string;
  durationMs?: number;
  maxScrollPct?: number;
}

interface TrackedEvent {
  name: string;
  label?: string;
  path?: string;
  metadata?: Json;
  createdAt: string;
}

interface SessionInfo {
  entryPage: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  deviceType: string;
  browser: string;
  os: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  timezone: string;
}

let visitorId = '';
let sessionId = '';
let sessionIsNew = false;
let sessionInfo: SessionInfo | null = null;

let currentView: (TrackedPageView & { startMs: number; scrollPct: number }) | null = null;
let pageViewQueue: TrackedPageView[] = [];
let eventQueue: TrackedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function rid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android.*Mobile|iPhone/i.test(ua)) return 'mobile';
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
  return 'desktop';
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/')) return 'Safari';
  return 'Other';
}

function detectOs(): string {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return 'Windows';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac OS/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other';
}

function buildSessionInfo(): SessionInfo {
  const params = new URLSearchParams(window.location.search);
  let timezone = '';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    // unsupported environment
  }
  return {
    entryPage: window.location.pathname + window.location.search,
    referrer: document.referrer || '',
    utmSource: params.get('utm_source') || '',
    utmMedium: params.get('utm_medium') || '',
    utmCampaign: params.get('utm_campaign') || '',
    utmTerm: params.get('utm_term') || '',
    utmContent: params.get('utm_content') || '',
    deviceType: detectDeviceType(),
    browser: detectBrowser(),
    os: detectOs(),
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    language: navigator.language || '',
    timezone,
  };
}

function ensureIds() {
  try {
    visitorId = localStorage.getItem(VISITOR_KEY) || '';
    if (!visitorId) {
      visitorId = 'v_' + rid();
      localStorage.setItem(VISITOR_KEY, visitorId);
    }

    const lastActivity = Number(sessionStorage.getItem(SESSION_ACTIVITY_KEY) || 0);
    sessionId = sessionStorage.getItem(SESSION_KEY) || '';
    if (!sessionId || Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
      sessionId = 's_' + rid();
      sessionStorage.setItem(SESSION_KEY, sessionId);
      sessionIsNew = true;
    }
    sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
  } catch {
    // storage unavailable (private mode) — use ephemeral ids
    if (!visitorId) visitorId = 'v_' + rid();
    if (!sessionId) {
      sessionId = 's_' + rid();
      sessionIsNew = true;
    }
  }
}

function touchActivity() {
  try {
    sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/** Queue a custom event. Public API. */
export function trackEvent(name: string, label?: string, metadata?: Json) {
  if (!initialized) return;
  eventQueue.push({
    name,
    label: label?.slice(0, 300),
    path: window.location.pathname,
    metadata,
    createdAt: new Date().toISOString(),
  });
  touchActivity();
}

/** Close out the current page view (records duration + scroll depth). */
function endCurrentPageView() {
  if (!currentView) return;
  const finished: TrackedPageView = {
    id: currentView.id,
    path: currentView.path,
    title: currentView.title,
    startedAt: currentView.startedAt,
    durationMs: Math.min(Date.now() - currentView.startMs, 4 * 60 * 60 * 1000),
    maxScrollPct: Math.round(currentView.scrollPct),
  };
  pageViewQueue.push(finished);
  currentView = null;
}

/** Start tracking a new page view. Called on init and on SPA route change. */
export function trackPageViewStart(path?: string) {
  if (!initialized) return;
  endCurrentPageView();
  const view = {
    id: 'pv_' + rid(),
    path: path || window.location.pathname + window.location.search,
    title: document.title,
    startedAt: new Date().toISOString(),
    startMs: Date.now(),
    scrollPct: computeScrollPct(),
  };
  currentView = view;
  // Send the "opened" record immediately so a quick bounce is still counted;
  // the end-of-view flush updates the same id with duration and scroll.
  pageViewQueue.push({ id: view.id, path: view.path, title: view.title, startedAt: view.startedAt });
  touchActivity();
}

function computeScrollPct(): number {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 100;
  return Math.min(100, ((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100);
}

function onScroll() {
  if (!currentView) return;
  const pct = computeScrollPct();
  if (pct > currentView.scrollPct) currentView.scrollPct = pct;
}

/** Automatic click capture: CTAs (by element id), phone, email, outbound. */
function onClick(e: MouseEvent) {
  const target = (e.target as HTMLElement)?.closest?.('a, button');
  if (!target) return;

  const id = target.id || '';
  const text = (target.textContent || '').trim().slice(0, 120);
  const href = target instanceof HTMLAnchorElement ? target.href : '';

  if (href.startsWith('tel:')) {
    trackEvent('phone_click', href.replace('tel:', ''), { text });
  } else if (href.startsWith('mailto:')) {
    trackEvent('email_click', href.replace('mailto:', ''), { text });
  } else if (href && new URL(href, window.location.href).origin !== window.location.origin) {
    trackEvent('outbound_click', href.slice(0, 300), { text });
  } else if (id.startsWith('goal-pill-') || id.startsWith('modal-goal-')) {
    trackEvent('goal_selected', id.replace(/^(goal-pill-|modal-goal-)/, ''), { text });
  } else if (id) {
    trackEvent('click', id, { text });
  }
}

/** First interaction with any form on a page = form_start (funnel top). */
const startedForms = new WeakSet<HTMLFormElement>();
function onFocusIn(e: FocusEvent) {
  const el = e.target as HTMLElement;
  if (!el || !('form' in el)) return;
  const form = (el as HTMLInputElement).form;
  if (!form || startedForms.has(form)) return;
  startedForms.add(form);
  trackEvent('form_start', (el as HTMLInputElement).id || 'unknown-field');
}

interface TrackBatch {
  visitorId: string;
  sessionId: string;
  sessionIsNew: boolean;
  session?: SessionInfo;
  pageViews: TrackedPageView[];
  events: TrackedEvent[];
}

function drainBatch(): TrackBatch | null {
  if (pageViewQueue.length === 0 && eventQueue.length === 0 && !sessionIsNew) return null;
  const batch: TrackBatch = {
    visitorId,
    sessionId,
    sessionIsNew,
    session: sessionInfo || undefined,
    pageViews: pageViewQueue,
    events: eventQueue,
  };
  pageViewQueue = [];
  eventQueue = [];
  sessionIsNew = false;
  return batch;
}

function flush(useBeacon = false) {
  const batch = drainBatch();
  if (!batch) return;
  const body = JSON.stringify(batch);
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        // analytics must never break the site
      });
    }
  } catch {
    // ignore — analytics is best-effort
  }
}

/** Accessors so lead submissions can be joined to the visitor's journey. */
export function getVisitorId(): string {
  return visitorId;
}
export function getSessionId(): string {
  return sessionId;
}

/** Boot the tracker. Call once, before the app renders. */
export function initTracker() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  ensureIds();
  sessionInfo = buildSessionInfo();
  if (sessionIsNew) {
    eventQueue.push({
      name: 'session_start',
      path: window.location.pathname,
      createdAt: new Date().toISOString(),
    });
  }

  trackPageViewStart();

  document.addEventListener('click', onClick, { capture: true, passive: true });
  document.addEventListener('focusin', onFocusIn, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  // Final flush when the tab hides or closes — sendBeacon survives unload.
  const onHide = () => {
    if (document.visibilityState === 'hidden') {
      endCurrentPageView();
      flush(true);
    }
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', () => {
    endCurrentPageView();
    flush(true);
  });

  flushTimer = setInterval(() => flush(), FLUSH_INTERVAL_MS);
}
