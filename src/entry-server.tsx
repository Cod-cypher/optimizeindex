/**
 * SSR entry, used only at build time by scripts/prerender.ts.
 *
 * react-router is v7, where StaticRouter comes from the root `react-router`
 * package — the v6 `react-router-dom/server` subpath no longer exists.
 */

import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';
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
        <App />
      </StaticRouter>
    </StrictMode>,
  );

  return { html, head: renderHeadHtml(getRouteMeta(url)) };
}
