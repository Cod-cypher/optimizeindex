/**
 * Proposal-page tracking.
 *
 * Separate from src/lib/tracker.ts on purpose. That one reports the marketing
 * site's funnel into Visitor/Session/PageView/Event; this reports one prospect's
 * engagement with one document, and it is what the admin sees on the proposal's
 * activity panel.
 *
 * The three-second delay before confirming a view is the whole point: Gmail,
 * Outlook and corporate security gateways fetch every link in an email, so the
 * server-side render count is not evidence anyone read anything. Code running
 * here, three seconds in, is.
 */

const VIEWER_KEY_PREFIX = 'oi_proposal_viewer_';

/** How long the page must be open before a view counts as real. */
const CONFIRM_DELAY_MS = 3000;

/**
 * A stable anonymous id per proposal per browser, so the admin can tell "one
 * prospect opened it four times" from "four people opened it". Deliberately
 * scoped to the slug — it is not a cross-site identifier.
 */
function viewerKey(slug: string): string {
  const storageKey = VIEWER_KEY_PREFIX + slug;
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const created = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(storageKey, created);
    return created;
  } catch {
    // Private mode, or storage disabled. A per-load key still lets the server
    // attach engagement to the right view row within this session.
    return 'ephemeral-' + Math.random().toString(36).slice(2);
  }
}

function post(path: string, body: unknown) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    // Tracking must never surface an error on a page a prospect is reading.
  });
}

export function trackProposalEvent(slug: string, name: string, label?: string) {
  void post(`/api/p/${encodeURIComponent(slug)}/event`, {
    name,
    label,
    viewerKey: viewerKey(slug),
  });
}

/**
 * Confirms the view after a delay, then reports time and scroll depth on the
 * way out. Returns a cleanup function for React's effect.
 */
export function initProposalTracking(slug: string): () => void {
  const key = viewerKey(slug);
  const startedAt = Date.now();
  let maxScrollPct = 0;
  let sent = false;

  const onScroll = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? ((window.scrollY / scrollable) * 100) : 100;
    if (pct > maxScrollPct) maxScrollPct = Math.min(100, pct);
  };

  const confirmTimer = window.setTimeout(() => {
    void post(`/api/p/${encodeURIComponent(slug)}/view`, { viewerKey: key });
  }, CONFIRM_DELAY_MS);

  const report = () => {
    // pagehide and visibilitychange can both fire for one departure.
    if (sent) return;
    sent = true;
    void post(`/api/p/${encodeURIComponent(slug)}/engagement`, {
      viewerKey: key,
      durationMs: Date.now() - startedAt,
      maxScrollPct: Math.round(maxScrollPct),
    });
  };

  const onHidden = () => {
    if (document.visibilityState === 'hidden') report();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  // pagehide is the reliable one on iOS Safari, where unload often never fires.
  window.addEventListener('pagehide', report);
  document.addEventListener('visibilitychange', onHidden);

  return () => {
    window.clearTimeout(confirmTimer);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pagehide', report);
    document.removeEventListener('visibilitychange', onHidden);
    report();
  };
}
