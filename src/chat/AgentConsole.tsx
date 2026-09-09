/**
 * Ali's side of a live chat.
 *
 * Served from app-shell.html the same way /admin is, with the context injected
 * as window.__CHAT_AGENT__. Deliberately NOT a route in src/routes.ts: adding
 * one would oblige it to carry a canonical, a title, a description, a sitemap
 * entry, an llms.txt bullet and 700 words of body copy, all enforced by
 * scripts/verify-seo.ts, for a private page that must never be indexed.
 *
 * Kept plain on purpose. It is opened on a phone, usually in a hurry, to answer
 * someone who is waiting.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatAgentContext, ChatAgentViewResponse, ChatMessageDTO } from '../../shared/chatTypes';
import { mergeMessages } from '../lib/chat';
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from '../routes';
import MessageText from '../components/chat/MessageText';
import { playIncoming, setTabBadge, unlockAudio } from '../lib/chatNotify';

interface Props {
  context: ChatAgentContext;
}

const POLL_LIVE_MS = 2000;

/**
 * One-tap lines the agent can drop into the draft.
 *
 * The phone number and email are written as plain text, not as markup: the
 * transcript renderer recognises OptimizeIndex's own contact details and turns
 * them into tel: and mailto: links on the visitor's side (see
 * components/chat/MessageText.tsx). So the agent types words and the visitor
 * gets something tappable, with no way for anyone to inject a different target.
 */
const QUICK_REPLIES = [
  {
    label: 'Send call link',
    text: `Easiest is a quick call — tap ${CONTACT_PHONE_DISPLAY} and you will get one of us.`,
  },
  {
    label: 'Send email link',
    text: `You can also reach us at ${CONTACT_EMAIL} and we will reply there.`,
  },
  {
    label: 'Ask for a time',
    text: 'What time works for you in the next day or two? I will make sure someone is free.',
  },
] as const;

export default function AgentConsole({ context }: Props) {
  const [view, setView] = useState<ChatAgentViewResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  /**
   * The poll cursor, held in a ref rather than state.
   *
   * It was state, and the polling effect listed it as a dependency — so every
   * message tore the effect down and built it back up, cancelling the pending
   * timer and starting a fresh 2s wait. With messages arriving steadily that
   * means the poll keeps getting pushed back, and since the poll IS the
   * heartbeat the server uses to decide the agent is still here, a busy
   * conversation was the one most at risk of being handed back to the
   * assistant. Nothing re-renders on a cursor change, so a ref is the honest
   * type for it.
   */
  const cursorRef = useRef(0);
  const [joined, setJoined] = useState(context.joined);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const id = context.conversationId;

  /**
   * Takes the token out of the address bar as soon as the page is up.
   *
   * The join link is a bearer credential in a URL path. The cookie is already
   * set by the time this runs, so the token in the location bar is pure
   * liability — it would otherwise survive in browser history, in a screenshot
   * of the conversation, and in anything the agent pastes to a colleague.
   */
  useEffect(() => {
    if (window.location.pathname.startsWith('/chat/join/')) {
      window.history.replaceState({}, '', '/chat/agent');
    }
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/chat/agent/${encodeURIComponent(id)}`, {
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as ChatAgentViewResponse;
    setView(data);
    setMessages(data.messages);
    cursorRef.current = data.cursor;
    setJoined(data.joined);
  }, [id]);

  useEffect(() => {
    void load().catch(() => setError('This conversation could not be loaded. The link may have expired.'));
  }, [load]);

  /* --- polling --------------------------------------------------------- */

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    const tick = async () => {
      try {
        const query = new URLSearchParams({ after: String(cursorRef.current) });
        const res = await fetch(`/api/chat/agent/${encodeURIComponent(id)}/messages?${query}`, {
          credentials: 'same-origin',
        });
        if (res.ok) {
          const data = (await res.json()) as { messages: ChatMessageDTO[]; cursor: number };
          if (!cancelled && data.messages.length > 0) {
            setMessages((prev) => mergeMessages(prev, data.messages));
            cursorRef.current = data.cursor;

            // Only the visitor's own messages. The assistant's replies and the
            // agent's own echo are not things to be alerted about.
            const fromVisitor = data.messages.filter((m) => m.role === 'VISITOR').length;
            if (fromVisitor > 0) {
              playIncoming();
              if (document.visibilityState === 'hidden') setUnread((n) => n + fromVisitor);
            }
          }
        }
      } catch {
        // Transient. The next tick retries.
      } finally {
        if (!cancelled) timer = window.setTimeout(tick, POLL_LIVE_MS);
      }
    };

    timer = window.setTimeout(tick, POLL_LIVE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  // The console is usually one tab among many. The count in the title is how a
  // waiting visitor gets noticed at all.
  useEffect(() => {
    setTabBadge(unread);
    return () => setTabBadge(0);
  }, [unread]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setUnread(0);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  /*
    Tell the server on the way out.

    Best effort only, and deliberately not the mechanism this relies on:
    beforeunload does not fire on a crash, a killed tab, or a phone losing
    signal. The heartbeat in server/chat/presence.ts is what actually decides
    the agent has gone. This just makes the common case — closing the tab —
    hand back in a second instead of in thirty-five.
  */
  useEffect(() => {
    const onLeave = () => {
      if (!joined) return;
      navigator.sendBeacon?.(
        `/api/chat/agent/${encodeURIComponent(id)}/leave`,
        new Blob([JSON.stringify({ resumeBot: true })], { type: 'application/json' }),
      );
    };
    window.addEventListener('pagehide', onLeave);
    return () => window.removeEventListener('pagehide', onLeave);
  }, [id, joined]);

  /* --- actions --------------------------------------------------------- */

  const join = async () => {
    // Inside the click, so the AudioContext starts running rather than
    // suspended and the first chime is actually audible.
    unlockAudio();
    setBusy(true);
    try {
      await fetch(`/api/chat/agent/${encodeURIComponent(id)}/join`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      setJoined(true);
      await load();
    } catch {
      setError('Could not join.');
    } finally {
      setBusy(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;

    setBusy(true);
    setDraft('');
    try {
      const res = await fetch(`/api/chat/agent/${encodeURIComponent(id)}/message`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, cursor: cursorRef.current }),
      });
      const data = (await res.json()) as { messages: ChatMessageDTO[]; cursor: number };
      setMessages((prev) => mergeMessages(prev, data.messages || []));
      if (data.cursor > cursorRef.current) cursorRef.current = data.cursor;
    } catch {
      setError('That did not send.');
    } finally {
      setBusy(false);
    }
  };

  const leave = async (resumeBot: boolean) => {
    setBusy(true);
    try {
      await fetch(`/api/chat/agent/${encodeURIComponent(id)}/leave`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeBot }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  /* --- render ---------------------------------------------------------- */

  if (error) {
    return (
      <div className="min-h-dvh grid place-items-center bg-cream p-6 text-center">
        <div>
          <h1 className="font-display font-extrabold text-xl text-ink mb-2">Not available</h1>
          <p className="text-sm text-stone max-w-[40ch]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    /*
      h-dvh, not min-h-dvh.

      With a minimum height the column grows to fit its content, so a long
      transcript pushed the page past the viewport: the whole console scrolled,
      the composer at the bottom disappeared below the fold, and <main>'s own
      overflow-y-auto never engaged because it was never constrained. Pinning
      the height to the viewport and hiding overflow on the shell is what makes
      the middle section the only thing that scrolls.
    */
    <div className="h-dvh overflow-hidden flex flex-col bg-cream text-ink font-sans">
      <header className="shrink-0 border-b-1.5 border-ink bg-paper px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-stone">Live chat</p>
        <h1 className="font-display font-extrabold text-lg leading-tight">
          {view?.visitorName || view?.visitorCompany || 'A visitor'}
          {view?.visitorName && view?.visitorCompany && (
            <span className="font-sans font-normal text-sm text-stone"> · {view.visitorCompany}</span>
          )}
        </h1>

        {/*
          The point of this block: whoever opens the link is about to talk to a
          stranger and needs to know who, on what, and how else to reach them —
          without scrolling the transcript to find out. The email and phone are
          real links, because this is usually opened on a phone and the fastest
          resolution is often to stop typing and call.
        */}
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[11px] text-stone">
          {view?.visitorEmail && (
            <Fact label="Email" value={view.visitorEmail} href={`mailto:${view.visitorEmail}`} />
          )}
          {view?.visitorPhone && (
            <Fact
              label="Phone"
              value={view.visitorPhone}
              href={`tel:${view.visitorPhone.replace(/[^\d+]/g, '')}`}
            />
          )}
          {view?.visitorArea && <Fact label="Area" value={view.visitorArea} />}
          {view?.visitorWebsite && <Fact label="Site" value={view.visitorWebsite} />}
          {view?.startedOn && <Fact label="Page" value={view.startedOn} />}
          {view?.auditDomain && (
            <Fact label="Audit" value={`${view.auditDomain} ${view.auditScore ?? '—'}/100`} />
          )}
        </dl>

        {/*
          Say plainly when a detail is missing, rather than leaving a gap the
          reader has to notice. "No email yet" is an instruction to go and ask.
        */}
        {view && !view.visitorEmail && !view.visitorPhone && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink bg-lime border-1.5 border-ink rounded-full px-2.5 py-1 inline-block">
            No contact details yet
          </p>
        )}
      </header>

      {context.summary && !joined && (
        <p className="px-4 py-3 bg-lime border-b-1.5 border-ink text-sm leading-relaxed">
          {context.summary}
        </p>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
        {messages.map((m) =>
          m.kind === 'notice' ? (
            <p key={m.id} className="text-center font-mono text-[10px] uppercase tracking-wider text-stone py-1">
              {m.content}
            </p>
          ) : (
            <div key={m.id} className={m.role === 'VISITOR' ? 'flex justify-start' : 'flex justify-end'}>
              <div className="max-w-[85%]">
                <p className="font-mono text-[10px] uppercase tracking-wider text-stone mb-1">
                  {m.role === 'VISITOR' ? 'Visitor' : m.authorLabel || 'Assistant'}
                </p>
                <div
                  className={[
                    'px-3 py-2 border-1.5 border-ink text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl',
                    m.role === 'VISITOR'
                      ? 'bg-paper rounded-bl-sm'
                      : m.role === 'AGENT'
                        ? 'bg-lime rounded-br-sm'
                        : 'bg-paper/60 rounded-br-sm',
                  ].join(' ')}
                >
                  <MessageText content={m.content} fromAgent={m.role === 'AGENT'} />
                </div>
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </main>

      <footer className="shrink-0 border-t-1.5 border-ink bg-paper p-3">
        {!joined ? (
          <>
            {/*
              Joining is explicit. Mail clients prefetch links, so if opening the
              link announced the agent, a link scanner would do it seconds after
              the email was sent and the visitor would be watching an empty room.
            */}
            <button
              type="button"
              onClick={() => void join()}
              disabled={busy}
              className="w-full px-5 py-3 bg-lime text-ink font-sans font-extrabold text-sm border-2 border-ink shadow-hard rounded-full cursor-pointer focus-ring transition-all hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50"
            >
              Join the conversation
            </button>
            <p className="mt-2 text-center font-mono text-[10px] text-stone">
              The visitor is not told you are here until you join.
            </p>
          </>
        ) : (
          <>
            <form onSubmit={send} className="flex items-end gap-2">
              <label htmlFor="oi-agent-input" className="sr-only">
                Your reply
              </label>
              <textarea
                id="oi-agent-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send(e as unknown as React.FormEvent);
                  }
                }}
                rows={2}
                maxLength={2000}
                placeholder="Reply…"
                className="field field-compact flex-1 resize-none"
              />
              <button
                type="submit"
                disabled={!draft.trim() || busy}
                className="shrink-0 px-4 py-2.5 bg-lime text-ink font-sans font-extrabold text-sm border-2 border-ink shadow-hard rounded-full cursor-pointer focus-ring disabled:opacity-40"
              >
                Send
              </button>
            </form>
            {/*
              One tap to send something the visitor can act on.
              These write into the draft rather than sending outright, so a
              line can be edited or have a sentence added before it goes —
              and so a mis-tap is not a message the visitor already saw.
            */}
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_REPLIES.map((quick) => (
                <button
                  key={quick.label}
                  type="button"
                  onClick={() => setDraft((d) => (d ? `${d.trimEnd()} ${quick.text}` : quick.text))}
                  className="font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border-1.5 border-ink/25 text-ink hover:border-ink hover:bg-lime transition-colors cursor-pointer focus-ring"
                >
                  {quick.label}
                </button>
              ))}
            </div>

            <div className="mt-2 flex gap-3 justify-center font-mono text-[10px]">
              <button
                type="button"
                onClick={() => void leave(true)}
                className="underline text-stone cursor-pointer focus-ring"
              >
                Hand back to the assistant
              </button>
              <button
                type="button"
                onClick={() => void leave(false)}
                className="underline text-stone cursor-pointer focus-ring"
              >
                Close conversation
              </button>
            </div>
          </>
        )}
      </footer>
    </div>
  );
}

function Fact({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <span>
      <dt className="inline text-stone/70">{label}: </dt>
      <dd className="inline text-ink">
        {href ? (
          <a
            href={href}
            className="underline underline-offset-2 decoration-2 hover:opacity-70 focus-ring rounded-sm"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </span>
  );
}
