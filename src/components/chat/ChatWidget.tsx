/**
 * The floating chat launcher, and the state behind it.
 *
 * Two things about this component are load-bearing and should not be
 * "cleaned up":
 *
 * 1. It renders null on the first pass. AppRouter is run through
 *    renderToString by src/entry-server.tsx and the output is baked into 24
 *    static HTML files by scripts/prerender.ts. Rendering nothing on pass one
 *    means the widget contributes zero bytes to those files, which is what
 *    keeps it invisible to every assertion in scripts/verify-seo.ts — the
 *    single-h1 rule, the heading-level scan across the whole document, the
 *    homepage's required 100/100 content score, and the towing pages' word
 *    count and pairwise similarity gate. Rendering the launcher server-side
 *    would put all four back in play for the sake of one button.
 *
 * 2. The panel is lazy. Only the launcher and this state ship in the marketing
 *    bundle; the conversation UI is fetched on first click. Nothing here may
 *    import motion/react or src/portal/ui.tsx — both are currently confined to
 *    lazy chunks, and importing either would pull them onto the critical path
 *    of all 24 pages.
 */

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import type { ChatMessageDTO, ChatMode } from '../../../shared/chatTypes';
import { CHAT_LAUNCHER_LABEL } from '../../content/chat';
import { trackEvent } from '../../lib/tracker';
import {
  clearPersisted,
  mergeMessages,
  pollChat,
  pollInterval,
  readPersisted,
  startChat,
  writePersisted,
} from '../../lib/chat';

const ChatPanel = lazy(() => import('./ChatPanel'));

export interface ChatSession {
  id: string;
  token: string;
  mode: ChatMode;
  status: string;
  notice?: string;
  agentLabel?: string;
}

export default function ChatWidget() {
  /**
   * The two-pass mount. State rather than a ref, because a ref does not
   * schedule the re-render that reveals the launcher.
   */
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [cursor, setCursor] = useState(0);
  const [unread, setUnread] = useState(0);
  const [starting, setStarting] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const errorStreak = useRef(0);

  useEffect(() => {
    setReady(true);
  }, []);

  /* --- resume ---------------------------------------------------------- */

  /**
   * Picks a conversation back up after a full page load.
   *
   * React Router handles navigation inside the app, so the component survives
   * most link clicks on its own. This is for the cases where it does not: a
   * hard refresh, a direct URL, an external link back into the site.
   */
  useEffect(() => {
    if (!ready) return;
    const stored = readPersisted();
    if (!stored) return;

    let cancelled = false;
    void (async () => {
      try {
        const data = await pollChat(stored.id, stored.token, 0);
        if (cancelled) return;
        setSession({
          id: stored.id,
          token: stored.token,
          mode: 'ai',
          status: data.status,
          agentLabel: data.agentLabel,
        });
        setMessages(data.messages);
        setCursor(data.cursor);
        if (stored.wasOpen) setOpen(true);
        else setUnread(0);
      } catch {
        // Expired, revoked, or pruned. Nothing to resume.
        clearPersisted();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready]);

  /* --- polling --------------------------------------------------------- */

  useEffect(() => {
    if (!session || session.mode === 'form' || session.status === 'CLOSED') return;

    let timer: number | undefined;
    let cancelled = false;

    const tick = async () => {
      try {
        const data = await pollChat(session.id, session.token, cursor);
        if (cancelled) return;
        errorStreak.current = 0;

        if (data.messages.length > 0) {
          setMessages((prev) => mergeMessages(prev, data.messages));
          setCursor(data.cursor);
          setAwaitingReply(false);
          // Only count what the visitor did not send themselves.
          if (!open) {
            const inbound = data.messages.filter((m) => m.role !== 'VISITOR').length;
            if (inbound > 0) setUnread((n) => n + inbound);
          }
        }
        if (data.status !== session.status || data.agentLabel !== session.agentLabel) {
          setSession((s) => (s ? { ...s, status: data.status, agentLabel: data.agentLabel } : s));
        }
      } catch {
        if (!cancelled) errorStreak.current += 1;
      } finally {
        if (cancelled) return;
        const next = pollInterval({
          status: session.status,
          panelOpen: open,
          awaitingReply,
          errorStreak: errorStreak.current,
        });
        if (next !== null) timer = window.setTimeout(tick, next);
      }
    };

    const delay = pollInterval({
      status: session.status,
      panelOpen: open,
      awaitingReply,
      errorStreak: errorStreak.current,
    });
    if (delay !== null) timer = window.setTimeout(tick, delay);

    // A hidden tab stops polling entirely; coming back fetches immediately
    // rather than waiting out the interval.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [session, cursor, open, awaitingReply]);

  /* --- persistence ----------------------------------------------------- */

  useEffect(() => {
    if (!session || !session.id) return;
    writePersisted({
      id: session.id,
      token: session.token,
      cursor,
      openedAt: Date.now(),
      wasOpen: open,
    });
  }, [session, cursor, open]);

  /* --- open ------------------------------------------------------------ */

  const handleOpen = useCallback(async () => {
    setOpen(true);
    setUnread(0);

    if (session || starting) return;
    setStarting(true);
    try {
      const data = await startChat();
      setSession({
        id: data.conversationId,
        token: data.visitorToken,
        mode: data.mode,
        status: data.status,
        notice: data.notice,
      });
      setMessages(data.messages);
      setCursor(data.cursor);
      trackEvent('chat_open', data.mode);
    } catch {
      // Falls back to the contact form, which posts to /api/leads and has its
      // own file-backup path on the server.
      setSession({ id: '', token: '', mode: 'form', status: 'ACTIVE' });
    } finally {
      setStarting(false);
    }
  }, [session, starting]);

  const handleClose = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  if (!ready) return null;

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => void handleOpen()}
        aria-expanded={open}
        aria-controls="oi-chat-panel"
        aria-label={CHAT_LAUNCHER_LABEL}
        className={[
          'fixed bottom-4 right-4 z-40 flex items-center justify-center',
          'h-14 w-14 rounded-full border-2 border-ink bg-lime text-ink',
          'shadow-hard transition-all cursor-pointer focus-ring',
          'hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5',
          'active:translate-x-0 active:translate-y-0',
          open ? 'opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto' : '',
        ].join(' ')}
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <MessageCircle size={24} strokeWidth={2.5} aria-hidden="true" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full border-2 border-ink bg-ink text-cream font-mono text-[10px] leading-none flex items-center justify-center"
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        {unread > 0 && <span className="sr-only">{unread} new messages</span>}
      </button>

      {open && (
        <Suspense fallback={null}>
          <ChatPanel
            session={session}
            messages={messages}
            starting={starting}
            awaitingReply={awaitingReply}
            onClose={handleClose}
            onSent={(sent, nextCursor) => {
              setMessages((prev) => mergeMessages(prev, sent));
              if (nextCursor > cursor) setCursor(nextCursor);
            }}
            onAwaiting={setAwaitingReply}
            onStatus={(status, agentLabel) =>
              setSession((s) => (s ? { ...s, status, agentLabel } : s))
            }
          />
        </Suspense>
      )}
    </>
  );
}
