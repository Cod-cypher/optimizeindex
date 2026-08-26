/**
 * Admin app root — authentication gate and shell.
 *
 * Lazy-loaded from src/AppRouter.tsx, so none of this reaches the marketing
 * bundle. Styled with the same primitives as the public site (src/portal/ui.tsx)
 * so signing in does not feel like leaving the product.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Starburst from '../components/Starburst';
import { Banner, Button, Card, Eyebrow, Heading, PortalLoader } from '../portal/ui';
import { setUnauthorizedHandler } from './api';
import ProposalList from './ProposalList';
import ProposalEditor from './ProposalEditor';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
}

type AuthState =
  | { status: 'checking' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: AdminUser };

export default function AdminApp() {
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' });

  // The session cookie is httpOnly, so the client cannot read it — asking the
  // server who we are is the only way to know whether we are signed in.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me', { credentials: 'same-origin' });
      if (!res.ok) {
        setAuth({ status: 'signed-out' });
        return;
      }
      const data = await res.json();
      setAuth({ status: 'signed-in', user: data.user });
    } catch {
      setAuth({ status: 'signed-out' });
    }
  }, []);

  useEffect(() => {
    document.title = 'Admin | OptimizeIndex';
    void refresh();
  }, [refresh]);

  // A session that expires while a tab sits open should return to the login
  // screen rather than leave every panel showing an error.
  useEffect(() => {
    setUnauthorizedHandler(() => setAuth({ status: 'signed-out' }));
  }, []);

  if (auth.status === 'checking') {
    return <PortalLoader label="Checking your session" />;
  }

  if (auth.status === 'signed-out') {
    return <LoginPage onSignedIn={(user) => setAuth({ status: 'signed-in', user })} />;
  }

  return <AdminShell user={auth.user} onSignedOut={() => setAuth({ status: 'signed-out' })} />;
}

/* -------------------------------------------------------------------------
   Login
------------------------------------------------------------------------- */

function LoginPage({ onSignedIn }: { onSignedIn: (user: AdminUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Over plain HTTP the browser silently discards the Secure session cookie, so
  // login "succeeds" and then nothing happens. Say so up front rather than
  // letting someone retype their password three times.
  const insecure =
    typeof window !== 'undefined' &&
    window.location.protocol === 'http:' &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        onSignedIn(data.user);
        return;
      }

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const mins = Math.ceil((data.retryAfterSec ?? 900) / 60);
        setError(`Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
      } else if (res.status === 503) {
        setError('Cannot reach the database right now. Try again in a moment.');
      } else {
        // Matches the server, which does not distinguish an unknown account
        // from a wrong password.
        setError('That email and password do not match an account.');
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-5 py-12 sm:py-16">
      <div className="w-full max-w-[420px]">
        {/*
          Everything lives inside the one card — logo, heading and form.
          Previously the logo and heading floated above it while the helper text
          below was centred, so nothing shared an edge and the card read as
          adrift in the page.
        */}
        <div className="relative">
          {/*
            Wrapped rather than positioned through Starburst's own className:
            that component hardcodes `relative` on its root, which wins over an
            `absolute` passed in, so the sticker stayed in normal flow and the
            offsets merely nudged it off the card. The wrapper owns the
            positioning; Starburst just draws.
          */}
          <div
            aria-hidden="true"
            className="absolute -right-7 -top-7 z-20 rotate-[10deg] hidden sm:block pointer-events-none"
          >
            <Starburst text="ADMIN ONLY" size={92} rotationSpeed={40} />
          </div>

          <Card className="p-7 sm:p-8 relative z-10">
            <Logo size={26} className="mb-7" />
            <Eyebrow pulse>Proposal portal</Eyebrow>
            <Heading level={2} className="mt-2.5 mb-7 !text-3xl">
              Sign in
            </Heading>

            <form onSubmit={submit} className="space-y-5">
              <label className="block">
                <span className="form-label">Email</span>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                />
              </label>

              <label className="block">
                <span className="form-label">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field"
                />
              </label>

              {insecure && (
                <Banner tone="cream">
                  This page is being served over HTTP. The session cookie is marked{' '}
                  <code className="font-mono">Secure</code>, so your browser will refuse to store it
                  and login will not stick until HTTPS is enabled.
                </Banner>
              )}

              {error && <Banner tone="error">{error}</Banner>}

              <Button type="submit" tone="lime" size="lg" disabled={busy} className="w-full">
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Card>
        </div>

        <p className="mt-5 text-[13px] text-stone leading-relaxed text-center">
          Accounts are created on the server with{' '}
          <code className="font-mono text-ink">npm run admin</code>. There is no sign-up and no
          password reset by email.
        </p>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------
   Shell
------------------------------------------------------------------------- */

function AdminShell({ user, onSignedOut }: { user: AdminUser; onSignedOut: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Two screens, so the path is parsed directly rather than through nested
  // routes: /admin is the list, /admin/p/<id> is the editor.
  const editingId = /^\/admin\/p\/([^/]+)$/.exec(location.pathname)?.[1] ?? null;

  async function signOut() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    onSignedOut();
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b-1.5 border-ink bg-paper sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-3 focus-ring rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="All proposals"
          >
            <Logo size={26} withIcon />
            <span className="hidden sm:inline font-mono text-[10px] font-bold uppercase tracking-widest text-stone border-l-1.5 border-ink/20 pl-3">
              Proposals
            </span>
          </button>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline font-mono text-[11px] uppercase tracking-wider text-stone">
              {user.name || user.email}
            </span>
            <button
              onClick={signOut}
              className="cursor-pointer font-mono text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full border-1.5 border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-cream transition-colors focus-ring"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-14">
        {editingId ? (
          <ProposalEditor id={editingId} onBack={() => navigate('/admin')} />
        ) : (
          <ProposalList onOpen={(id) => navigate(`/admin/p/${id}`)} />
        )}
      </main>
    </div>
  );
}
