/**
 * Keeps <head> and page-view tracking in step with client-side navigation.
 *
 * One hook, called once, unconditionally, at the top of AppRouter, so every
 * page the router renders gets it — the towing pages, the hub, /about and the
 * App.tsx views alike. It replaces an effect inside App.tsx that only ran for
 * App's own views, which meant that going from / to /towing-companies kept the
 * homepage's title, canonical and JSON-LD, a noindex from /towing-onboarding
 * survived onto the next page, and navigations into the towing pages sent no
 * page view at all.
 *
 * Crawlers load every URL fresh and get the prerendered head, so none of this
 * affects indexing. It affects analytics attribution, and anything that reads
 * the live DOM (an agent driving the page, a browser extension, a share sheet).
 *
 * On each pathname change it:
 *   1. rebuilds the head from buildHeadTags(getRouteMeta(pathname)), the same
 *      source the prerenderer bakes into the static HTML — replacing tags that
 *      exist, appending ones that do not, and removing the ones the new route
 *      does not emit (a robots meta leaving a noindex page, a canonical leaving
 *      for the 404);
 *   2. then, and never on the first run, sends the GA4 and first-party page
 *      views, so the page_title they record is the new page's. The first load
 *      is already counted by the gtag config snippet and by initTracker().
 *
 * It does nothing on private surfaces, where getRouteMeta() would answer with
 * the 404 metadata: retitling a prospect's proposal "Page Not Found (404)" and
 * replacing its `noindex, nofollow` with the 404's `noindex, follow`. Those are
 * /admin, anything under /chat/ (the agent console's path carries a bearer
 * token, which must never reach a page-view record), any page load carrying
 * window.__CHAT_AGENT__, and the proposal's own slug while window.__PROPOSAL__
 * is set. The admin app and the proposal page set their own titles.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getRouteMeta } from '../routes';
import { buildHeadTags, HEAD_SELECTORS } from './head';
import { trackPageView } from './analytics';
import { trackPageViewStart } from './tracker';

function isPrivateSurface(pathname: string): boolean {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;
  if (pathname.startsWith('/chat/')) return true;
  if (window.__CHAT_AGENT__ !== undefined) return true;
  const proposal = window.__PROPOSAL__;
  if (proposal && pathname.replace(/\/+$/, '') === `/${proposal.slug}`) return true;
  return false;
}

/**
 * Applies the route's head tags and returns the selectors it applied.
 *
 * What may be removed is every selector head.ts says it can emit
 * (HEAD_SELECTORS), plus whatever the previous run applied, minus what this
 * route emitted. The first half matters on the first sync after a page load
 * that did not come from the prerenderer — the proposal shell carries a
 * `noindex, nofollow` that must not follow the visitor onto /services.
 */
function syncHead(pathname: string, previous: Set<string>): Set<string> {
  const applied = new Set<string>();

  for (const tag of buildHeadTags(getRouteMeta(pathname))) {
    applied.add(tag.selector);
    const template = document.createElement('template');
    template.innerHTML = tag.html;
    const next = template.content.firstElementChild;
    if (!next) continue;
    const existing = document.head.querySelectorAll(tag.selector);
    if (existing.length > 0) {
      existing[0].replaceWith(next);
      // A duplicate (a shell tag plus an injected one) would leave two
      // canonicals or two JSON-LD graphs; a fresh load has exactly one.
      for (let i = 1; i < existing.length; i++) existing[i].remove();
    } else {
      document.head.appendChild(next);
    }
  }

  for (const selector of new Set([...HEAD_SELECTORS, ...previous])) {
    if (applied.has(selector)) continue;
    document.head.querySelectorAll(selector).forEach((el) => el.remove());
  }

  return applied;
}

export function useRouteHead(): void {
  const { pathname, search } = useLocation();
  // null until the first run; after that, the pathname last seen. Comparing
  // against it (rather than a "first run" boolean) also keeps StrictMode's
  // double-invoked effect in development from sending a second page view.
  const lastPathname = useRef<string | null>(null);
  const appliedSelectors = useRef<Set<string>>(new Set());

  useEffect(() => {
    const firstRun = lastPathname.current === null;
    const changed = lastPathname.current !== pathname;
    lastPathname.current = pathname;

    if (isPrivateSurface(pathname)) return;

    appliedSelectors.current = syncHead(pathname, appliedSelectors.current);

    if (!firstRun && changed) {
      trackPageView(pathname + search);
      trackPageViewStart(pathname + search);
    }
    // Keyed on pathname only: a query-string change on the same page is not a
    // new page view. `search` is deliberately left out of the dependencies; it
    // is read only for the path recorded with the view.
  }, [pathname]);
}
