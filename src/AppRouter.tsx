/**
 * Top-level split between the three apps this site serves.
 *
 *   /admin/*        the private admin app
 *   any slug with   an injected window.__PROPOSAL__ — a prospect's proposal page
 *   everything else the marketing site (src/App.tsx)
 *
 * Why this file exists rather than new branches inside App.tsx: that component
 * is a single 2,500-line function with a hand-rolled if/else view switch, and
 * bolting a second application into it would make both harder to change. It is
 * left entirely untouched here.
 *
 * Both new apps are lazy, so the marketing site's bundle does not grow by a
 * byte — a visitor to the homepage never downloads the admin app, and neither
 * does Google.
 */

import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import App from './App';
import type { PublicProposal } from '../shared/proposalTypes';

const AdminApp = lazy(() => import('./admin/AdminApp'));
const ProposalPage = lazy(() => import('./proposal/ProposalPage'));

/**
 * A deliberately plain placeholder.
 *
 * The proposal payload is inlined into the HTML, so this is only ever visible
 * for the moment the lazy chunk is in flight. A spinner or skeleton would flash
 * and be gone.
 */
function Loading() {
  return <div style={{ minHeight: '100vh', background: '#F6F1E6' }} aria-busy="true" />;
}

/**
 * Whether the server injected a proposal into this page.
 *
 * Checking for the payload rather than matching the path against a list of
 * slugs is what keeps the client from needing to know which proposals exist:
 * the server already decided, by resolving the slug against the database before
 * it sent the shell.
 */
function injectedProposal(): PublicProposal | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__PROPOSAL__;
}

export default function AppRouter() {
  const location = useLocation();

  if (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) {
    return (
      <Suspense fallback={<Loading />}>
        <AdminApp />
      </Suspense>
    );
  }

  /*
    The payload is a page-load global, so it survives client-side navigation.
    Without the path check, clicking "Services" in the header from a proposal
    page would change the URL and then render the proposal again, because
    window.__PROPOSAL__ was still sitting there. Matching it against the current
    path scopes it to the page the server actually rendered it for.
  */
  const proposal = injectedProposal();
  if (proposal && location.pathname.replace(/\/+$/, '') === `/${proposal.slug}`) {
    return (
      <Suspense fallback={<Loading />}>
        <ProposalPage proposal={proposal} />
      </Suspense>
    );
  }

  // No payload: either a marketing route, or a slug the server did not
  // recognise — in which case it already responded 404 and App.tsx's own
  // not-found view renders the body.
  return <App />;
}
