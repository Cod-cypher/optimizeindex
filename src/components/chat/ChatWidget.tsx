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
import { playIncoming, setTabBadge, unlockAudio } from '../../lib/chatNotify';
import {
  beaconAway,
  clearPersisted,
  closeChat,
  mergeMessages,
  pollChat,
  pollInterval,
  readPersisted,
  resumeChat,
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
  /**
   * The poll cursor, in a ref rather than state.
   *
   * As state it was a dependency of the polling effect, so every message tore
   * the timer down and started the wait again from zero. On a visible tab that
   * is merely wasteful; on a hidden one, where the browser has already
   * stretched the interval to conserve power, it is the difference between
   * hearing a reply and not hearing it until you come back to the tab.
   * Nothing renders from the cursor, so state was the wrong tool.
   */
  const cursorRef = useRef(0);
  const [unread, setUnread] = useState(0);
  const [starting, setStarting] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const errorStreak = useRef(0);

  /**
   * The session, readable synchronously.
   *
   * handleOpen has to ask "do we already have a conversation?" *after* an
   * await, and the `session` it closed over is stale by then. Reading state
   * across an await is how the launcher ends up starting a second conversation
   * on top of one that had just been resumed.
   */
  const sessionRef = useRef<ChatSession | null>(null);

  /**
   * The in-flight resume, so the launcher can wait for it.
   *
   * This is the fix for a real bug rather than a precaution. The resume is a
   * round trip; the launcher is on screen while it is happening; and a visitor
   * coming back to the site clicks it immediately, because the badge is what
   * called them over. handleOpen would find a null session, conclude there was
   * nothing to pick up, and call startChat() — so the server resumed the old
   * conversation (which is why the agent console correctly showed them back on
   * the page) while the visitor was handed a brand-new one with a fresh
   * greeting. The old thread was never lost; it was replaced in the widget a
   * few hundred milliseconds after being restored.
   */
  const resumeRef = useRef<Promise<void> | null>(null);

  /** Keeps the synchronous mirror honest wherever the session is set. */
  const applySession = useCallback((next: ChatSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  /** Same problem as sessionRef, for code that reads `open` after an await. */
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  /*
    The poll and the panel both patch status and agentLabel through plain
    setSession, so the mirror would otherwise drift on those two fields. Nothing
    reads them off the ref today, but a mirror that is only sometimes true is
    worse than no mirror at all.
  */
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  /**
   * The single way a message enters the widget.
   *
   * Both paths land here, and that is the point. An assistant reply arrives on
   * the *send response*, not the poll — the POST returns the answer and
   * advances the cursor, so the next poll correctly finds nothing new. Putting
   * the chime and the unread count only in the poll meant they fired for a
   * human agent's out-of-band message and never for the ordinary case of the
   * assistant answering, which is every message most visitors will ever get.
   */
  const ingest = useCallback(
    (incoming: ChatMessageDTO[], nextCursor: number) => {
      if (incoming.length === 0) return;

      setMessages((prev) => mergeMessages(prev, incoming));
      if (nextCursor > cursorRef.current) cursorRef.current = nextCursor;

      // Anything the visitor did not send themselves. Their own optimistic echo
      // is a VISITOR row and is filtered out here along with the real one.
      const inbound = incoming.filter((m) => m.role !== 'VISITOR');
      if (inbound.length === 0) return;

      setAwaitingReply(false);
      playIncoming();

      // An open panel on a backgrounded tab is still unread. Counting only on
      // !open would leave someone who tabbed away with no badge and no reason
      // to come back.
      const unseen = !open || document.visibilityState === 'hidden';
      if (unseen) setUnread((n) => n + inbound.length);
    },
    [open],
  );

  /* --- mount and resume ------------------------------------------------ */

  /**
   * Reveals the launcher, and picks any stored conversation back up.
   *
   * React Router handles navigation inside the app, so the component survives
   * most link clicks on its own. The resume is for everything else: a hard
   * refresh, a direct URL, an external link back into the site — and, since the
   * conversation moved to localStorage, a visit days after the last one.
   *
   * The two are one effect on purpose. They were separate, with the resume
   * gated on `ready`, which meant the launcher was painted and clickable a
   * whole commit before the resume had even been *started* — never mind
   * finished. Kicking the resume off in the same effect that sets `ready`
   * guarantees resumeRef is populated before anything the visitor can click
   * exists, and handleOpen waits on it from there.
   *
   * The mode comes from the response rather than being assumed. Resuming used
   * to hardcode 'ai', which meant a reload during a model outage re-entered AI
   * mode against an assistant that was not answering.
   */
  useEffect(() => {
    setReady(true);

    const stored = readPersisted();
    if (!stored) return;

    let cancelled = false;
    resumeRef.current = (async () => {
      try {
        // wasOpen is what decides whether the panel comes back up below, so it
        // is also the honest answer to "are they about to be reading this".
        const data = await resumeChat(stored.id, stored.token, stored.wasOpen);
        if (cancelled) return;

        if (data.resumed !== 'ok') {
          /*
            "expired" is the server saying this conversation is really gone —
            pruned, closed, or a token past its seven days. That is the only
            answer that earns forgetting it.

            Anything else reaching here is transient: a rate-limit body, a shape
            we do not recognise. A conversation is now days old by design, and
            throwing one away because a single request came back wrong is the
            failure worth coding against. Leave it; the next page load retries.
          */
          if (data.resumed === 'expired') clearPersisted();
          return;
        }

        applySession({
          id: stored.id,
          // The server re-signs on every resume; the stored one is now the
          // older of the two. The persistence effect writes this back.
          token: data.visitorToken || stored.token,
          mode: data.mode,
          status: data.status,
          ...(data.notice ? { notice: data.notice } : {}),
        });
        setMessages(data.messages);
        cursorRef.current = data.cursor;

        /*
          Only ever opens, never closes. The visitor may have clicked the
          launcher while this was in flight, and slamming the panel shut on
          somebody who just opened it is a worse bug than the one this path
          exists to fix.
        */
        if (stored.wasOpen) setOpen(true);

        /*
          A welcome-back line is a message that arrived while they were away, so
          it gets the badge treatment — otherwise the one thing added for a
          returning visitor is the one thing they never see, because the panel
          is shut on a cold load.

          Read through the ref, not `open`: this closure captured `open` as
          false at mount, and by now the visitor may well be looking at the
          panel, where a badge would be counting a message on screen.

          The chime will usually be dropped and that is expected: an
          AudioContext created outside a user gesture is born suspended, and on
          a cold load nothing has been clicked yet. unlockAudio() runs on the
          launcher click. The badge is the half that always works.
        */
        if (data.welcomedBack && !stored.wasOpen && !openRef.current) {
          setUnread(1);
          playIncoming();
        }
      } catch {
        // A throw is the network or a 5xx, never a verdict on the conversation
        // — the server says that in the body. Deliberately does not clear
        // storage: this used to, back when a stored chat was worth two hours
        // and a failed resume cost almost nothing.
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
        // The second half of the presence signal the agent console reads:
        // reading it right now, versus a page that is open but not looked at.
        const active = open && document.visibilityState === 'visible';
        const data = await pollChat(session.id, session.token, cursorRef.current, active);
        if (cancelled) return;
        errorStreak.current = 0;

        ingest(data.messages, data.cursor);

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

    // A hidden tab still polls, but slowly. Coming back fetches immediately
    // rather than waiting out the remaining interval.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    /*
      Coming back through the bfcache.

      pagehide fires on a back/forward-cache navigation as well as on a real
      close, so the beacon below will have told the server this visitor left.
      Returning has to correct that, and the next scheduled poll could be
      twenty seconds away — long enough for the agent to be looking at "left
      the page" for somebody who is reading. An immediate tick re-marks them.
    */
    const onPageShow = () => {
      window.clearTimeout(timer);
      void tick();
    };
    window.addEventListener('pageshow', onPageShow);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [session, open, awaitingReply, ingest]);

  /*
    Tell the server on the way out, so the agent console stops showing a reader
    who is not there.

    pagehide, not beforeunload — beforeunload is unreliable on mobile, where
    most of these conversations happen, and pagehide is the event that actually
    fires when iOS discards a tab.

    Best effort, and deliberately not the mechanism the server relies on: this
    does not fire for a crash, a killed tab, or a phone losing signal. The
    heartbeat timeout in server/chat/presence.ts is what decides somebody has
    gone. This makes the ordinary case register in a second instead of ninety.

    In-app navigation does not fire pagehide, so clicking through the site
    leaves the conversation alone — which is the whole reason the widget lives
    in AppRouter rather than inside a page.
  */
  useEffect(() => {
    if (!session?.id || !session.token) return;

    const onLeave = () => beaconAway(session.id, session.token);
    window.addEventListener('pagehide', onLeave);
    return () => window.removeEventListener('pagehide', onLeave);
  }, [session]);

  // Mirror the unread count into the tab title, so a backgrounded tab shows
  // "(2) OptimizeIndex | …" without the widget being visible at all.
  useEffect(() => {
    setTabBadge(unread);
    return () => setTabBadge(0);
  }, [unread]);

  // Coming back to the tab with the panel open means they have seen it.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && open) setUnread(0);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [open]);

  /* --- persistence ----------------------------------------------------- */

  useEffect(() => {
    if (!session || !session.id) return;
    writePersisted({
      id: session.id,
      token: session.token,
      cursor: cursorRef.current,
      // Refreshed on every write, which is what makes the resume window slide.
      // The server does the same to the token itself on each resume, so the two
      // halves expire together rather than one stranding the other.
      lastSeenAt: Date.now(),
      wasOpen: open,
    });
  }, [session, open]);

  /* --- open ------------------------------------------------------------ */

  const handleOpen = useCallback(async () => {
    // Must happen inside the click. A browser will not start an AudioContext
    // outside a user gesture, and one created later is born suspended — the
    // first chime would be dropped silently.
    unlockAudio();
    openRef.current = true;
    setOpen(true);
    setUnread(0);

    if (sessionRef.current || starting) return;
    setStarting(true);
    try {
      /*
        Let any resume finish first.

        A returning visitor clicks this the moment the page paints — the unread
        badge is what called them over — which is squarely inside the resume's
        round trip. Without this wait, handleOpen saw a null session, concluded
        there was nothing to pick up, and started a second conversation over the
        top of the one being restored. The visitor got a fresh greeting while
        the server, correctly, had them back in the old conversation.

        Re-checking the ref rather than `session` afterwards is the other half:
        the state read here was captured before the await and is stale by now.
      */
      if (resumeRef.current) {
        await resumeRef.current;
        if (sessionRef.current) return;
      }

      const data = await startChat();
      applySession({
        id: data.conversationId,
        token: data.visitorToken,
        mode: data.mode,
        status: data.status,
        notice: data.notice,
      });
      setMessages(data.messages);
      cursorRef.current = data.cursor;
      trackEvent('chat_open', data.mode);
    } catch {
      // Falls back to the contact form, which posts to /api/leads and has its
      // own file-backup path on the server.
      applySession({ id: '', token: '', mode: 'form', status: 'ACTIVE' });
    } finally {
      setStarting(false);
    }
  }, [starting, applySession]);

  const handleClose = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  /**
   * Abandons the conversation and starts a clean one.
   *
   * This is the counterweight to keeping conversations in localStorage. A
   * thread that survives for a week is the right default on a personal device
   * and the wrong one on a shared or family browser, where the next person to
   * open the widget would otherwise be handed a stranger's transcript. Rather
   * than solve that by forgetting everything for everyone, there is one visible
   * way to end it — and it is the visitor's decision, which is the part that
   * matters.
   *
   * Closes the conversation server-side as well as clearing storage, so the
   * abandoned thread stops being something Ali could join, and shows as closed
   * in the admin inbox rather than sitting there looking live.
   */
  const handleReset = useCallback(() => {
    const current = sessionRef.current;
    if (current?.id && current.token) void closeChat(current.id, current.token);
    clearPersisted();

    // Nothing to resume any more. Left in place, a resume still in flight from
    // this page load would restore the conversation that was just discarded.
    resumeRef.current = null;

    setMessages([]);
    setUnread(0);
    setAwaitingReply(false);
    cursorRef.current = 0;
    errorStreak.current = 0;
    applySession(null);

    // Start the replacement immediately. Clearing and leaving an empty panel
    // reads as having broken something.
    setStarting(true);
    void (async () => {
      try {
        const data = await startChat();
        applySession({
          id: data.conversationId,
          token: data.visitorToken,
          mode: data.mode,
          status: data.status,
          notice: data.notice,
        });
        setMessages(data.messages);
        cursorRef.current = data.cursor;
      } catch {
        applySession({ id: '', token: '', mode: 'form', status: 'ACTIVE' });
      } finally {
        setStarting(false);
      }
    })();
  }, [applySession]);

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
            onReset={handleReset}
            onSent={ingest}
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
