import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import AppRouter from './AppRouter.tsx';
import './index.css';
import {initTracker} from './lib/tracker';

// The marketing site's first-party analytics. Skipped on the proposal portal:
// those pages are private, one per prospect, and have their own tracking that
// reports to the admin dashboard rather than into the site-wide funnel.
//
// The agent console is excluded for a second reason on top of that one: it is
// reached through a URL whose path contains a bearer token, and PageView.path
// would write that token into the database in plaintext. This check is the
// thing that stops it, so it is load-bearing for security and not only for
// funnel hygiene.
const isPortalPage =
  window.location.pathname.startsWith('/admin') ||
  window.location.pathname.startsWith('/chat/join/') ||
  window.__PROPOSAL__ !== undefined ||
  window.__CHAT_AGENT__ !== undefined;

if (!isPortalPage) {
  initTracker();
}

const container = document.getElementById('root')!;

const tree = (
  <StrictMode>
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </StrictMode>
);

// Production builds are pre-rendered, so the markup is already there and we
// hydrate it. The dev server has no SSR step, so there is nothing to hydrate
// and we mount normally — hydrating an empty container would warn on every
// route and throw the tree away.
if (container.dataset.prerendered === 'true') {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
