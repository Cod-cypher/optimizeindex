/**
 * SSR entry, used only at build time by scripts/prerender.ts.
 *
 * react-router is v7, where StaticRouter comes from the root `react-router`
 * package — the v6 `react-router-dom/server` subpath no longer exists.
 *
 * Renders AppRouter rather than App so the pre-rendered markup matches what
 * src/main.tsx hydrates. This used to render App directly, which was fine
 * while every marketing route lived inside App; once AppRouter started owning
 * whole pages of its own (the towing vertical), rendering App here would have
 * pre-rendered App's not-found view for those paths and then thrown it away on
 * hydrate. For the routes App still owns, AppRouter falls straight through to
 * it and the output is unchanged.
 *
 * The lazy admin and proposal branches inside AppRouter are unreachable here:
 * /admin is not in ROUTES, and the proposal branch needs a window global that
 * does not exist on the server.
 */

import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import AppRouter from './AppRouter';
import { getRouteMeta } from './routes';
import { renderHeadHtml } from './lib/head';
import './index.css';

// Re-exported so the prerenderer gets the route list from the same bundle it
// gets `render` from, rather than guessing at the SSR build's file layout.
export { ROUTES, NOT_FOUND_ROUTE, SITE_ORIGIN } from './routes';

export interface RenderResult {
  html: string;
  head: string;
}

export function render(url: string): RenderResult {
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <AppRouter />
      </StaticRouter>
    </StrictMode>,
  );

  return { html, head: renderHeadHtml(getRouteMeta(url)) };
}
