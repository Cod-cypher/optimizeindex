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

interface Props {
  context: ChatAgentContext;
}

const POLL_LIVE_MS = 2000;

export default function AgentConsole({ context }: Props) {
  const [view, setView] = useState<ChatAgentViewResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [cursor, setCursor] = useState(0);
  const [joined, setJoined] = useState(context.joined);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
    setCursor(data.cursor);
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
        const query = new URLSearchParams({ after: String(cursor) });
        const res = await fetch(`/api/chat/agent/${encodeURIComponent(id)}/messages?${query}`, {
          credentials: 'same-origin',
        });
        if (res.ok) {
          const data = (await res.json()) as { messages: ChatMessageDTO[]; cursor: number };
          if (!cancelled && data.messages.length > 0) {
            setMessages((prev) => mergeMessages(prev, data.messages));
            setCursor(data.cursor);
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
  }, [id, cursor]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  /* --- actions --------------------------------------------------------- */

  const join = async () => {
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
        body: JSON.stringify({ text, cursor }),
      });
      const data = (await res.json()) as { messages: ChatMessageDTO[]; cursor: number };
      setMessages((prev) => mergeMessages(prev, data.messages || []));
      if (data.cursor > cursor) setCursor(data.cursor);
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
    <div className="min-h-dvh flex flex-col bg-cream text-ink font-sans">
      <header className="border-b-1.5 border-ink bg-paper px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-stone">Live chat</p>
        <h1 className="font-display font-extrabold text-lg leading-tight">
          {view?.visitorCompany || view?.visitorName || 'A visitor'}
        </h1>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-stone">
          {view?.visitorEmail && <Fact label="Email" value={view.visitorEmail} />}
          {view?.visitorWebsite && <Fact label="Site" value={view.visitorWebsite} />}
          {view?.startedOn && <Fact label="Page" value={view.startedOn} />}
          {view?.auditDomain && (
            <Fact label="Audit" value={`${view.auditDomain} ${view.auditScore ?? '—'}/100`} />
          )}
        </dl>
      </header>

      {context.summary && !joined && (
        <p className="px-4 py-3 bg-lime border-b-1.5 border-ink text-sm leading-relaxed">
          {context.summary}
        </p>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
                  {m.content}
                </div>
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </main>

      <footer className="border-t-1.5 border-ink bg-paper p-3">
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <dt className="inline text-stone/70">{label}: </dt>
      <dd className="inline text-ink">{value}</dd>
    </span>
  );
}
