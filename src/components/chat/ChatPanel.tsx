/**
 * The conversation UI.
 *
 * Lazy-loaded on first click, so none of this ships in the marketing bundle.
 *
 * On mobile it is a full-screen sheet and traps focus, because there is nothing
 * else on screen to interact with. On desktop it deliberately does NOT trap
 * focus and is not aria-modal: a chat widget is an aside, and one that captures
 * the keyboard while someone is trying to read the page behind it is a bug
 * wearing an accessibility costume.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Send, X } from 'lucide-react';
import type { ChatMessageDTO } from '../../../shared/chatTypes';
import {
  CHAT_INPUT_PLACEHOLDER,
  CHAT_PANEL_TITLE,
  CHAT_SEND_FAILED,
} from '../../content/chat';
import { trackEvent } from '../../lib/tracker';
import { optimisticId, sendChatMessage } from '../../lib/chat';
import { isMuted, setMuted } from '../../lib/chatNotify';
import type { ChatSession } from './ChatWidget';
import ChatMessageList from './ChatMessageList';
import ChatForm from './ChatForm';

interface Props {
  session: ChatSession | null;
  messages: ChatMessageDTO[];
  starting: boolean;
  awaitingReply: boolean;
  onClose: () => void;
  onSent: (messages: ChatMessageDTO[], cursor: number) => void;
  onAwaiting: (value: boolean) => void;
  onStatus: (status: string, agentLabel?: string) => void;
}

export default function ChatPanel({
  session,
  messages,
  starting,
  awaitingReply,
  onClose,
  onSent,
  onAwaiting,
  onStatus,
}: Props) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMutedState] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

  // Read in an effect rather than during render. The panel is lazy so it never
  // reaches the pre-renderer, but reading storage during render is the habit
  // that breaks hydration the day something moves.
  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  /* --- escape, scroll lock, focus -------------------------------------- */

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    // Only lock the page behind a full-screen sheet. On desktop the page is
    // still readable and should still scroll.
    let previousOverflow = '';
    if (isMobile) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    const t = window.setTimeout(() => inputRef.current?.focus(), 80);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (isMobile) document.body.style.overflow = previousOverflow;
      window.clearTimeout(t);
    };
  }, [onClose, isMobile]);

  /* --- send ------------------------------------------------------------ */

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || !session?.id) return;

    setSending(true);
    setError('');
    onAwaiting(true);

    // Show it immediately. The server echoes it back with a real id and seq,
    // and mergeMessages drops this optimistic copy on arrival.
    const optimistic: ChatMessageDTO = {
      id: optimisticId(),
      seq: Number.MAX_SAFE_INTEGER,
      role: 'VISITOR',
      content: text,
      kind: 'message',
      createdAt: new Date().toISOString(),
    };
    onSent([optimistic], 0);
    setDraft('');

    try {
      const cursor = messages.reduce((max, m) => (m.seq > max && m.seq < Number.MAX_SAFE_INTEGER ? m.seq : max), 0);
      const data = await sendChatMessage(session.id, session.token, text, cursor);
      if (data.refused) {
        setError(data.refused);
      } else {
        onSent(data.messages, data.cursor);
        onStatus(data.status, data.agentLabel);
      }
      trackEvent('chat_message', session.status);
    } catch {
      setError(CHAT_SEND_FAILED);
    } finally {
      setSending(false);
      onAwaiting(false);
      inputRef.current?.focus();
    }
  }, [draft, sending, session, messages, onSent, onAwaiting, onStatus]);

  /* --- render ---------------------------------------------------------- */

  const isForm = session?.mode === 'form';

  return (
    <div
      id="oi-chat-panel"
      ref={panelRef}
      role="dialog"
      aria-modal={isMobile ? 'true' : 'false'}
      aria-labelledby="oi-chat-title"
      className={[
        'fixed z-40 flex flex-col bg-paper border-2 border-ink shadow-hard-lg',
        'inset-0 sm:inset-auto sm:bottom-20 sm:right-4',
        'sm:w-[380px] sm:h-[min(620px,calc(100dvh-8rem))] sm:rounded-2xl',
      ].join(' ')}
    >
      <header className="flex items-start justify-between gap-3 px-4 py-3 border-b-1.5 border-ink bg-cream sm:rounded-t-2xl">
        <div className="min-w-0">
          {/*
            An h2, never an h1. scripts/verify-seo.ts asserts exactly one h1 per
            page and fails on any heading-level jump greater than +1 across the
            whole document. The widget is invisible to that check today because
            it renders nothing server-side, but this keeps it safe if that ever
            changes.
          */}
          {/*
            Constant, whoever is answering. The header used to switch to
            "Ali is here" once a person joined, which was the loudest possible
            way to announce a handover the visitor did not need to know about.
          */}
          <h2 id="oi-chat-title" className="font-display font-extrabold text-base text-ink leading-tight">
            {CHAT_PANEL_TITLE}
          </h2>
          {/*
            No subtitle at all. This carried the "Assistant · not a person"
            disclosure, then a "a person is typing" line once someone joined —
            both removed on request, the second because the visitor is no longer
            told the difference.

            What remains is that the assistant says plainly it is a bot when
            asked, enforced by CHAT_RULES in src/content/chat.ts. That should
            stay.
          */}
        </div>
        <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            setMutedState(next);
          }}
          aria-label={muted ? 'Turn message sound on' : 'Turn message sound off'}
          aria-pressed={muted}
          className="h-8 w-8 grid place-items-center rounded-full border-1.5 border-ink bg-paper text-ink cursor-pointer focus-ring hover:bg-lime transition-colors"
        >
          {muted ? (
            <BellOff size={14} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Bell size={14} strokeWidth={2.5} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="shrink-0 h-8 w-8 grid place-items-center rounded-full border-1.5 border-ink bg-paper text-ink cursor-pointer focus-ring hover:bg-lime transition-colors"
        >
          <X size={16} strokeWidth={2.5} aria-hidden="true" />
        </button>
        </div>
      </header>

      {isForm ? (
        <ChatForm notice={session?.notice} onDone={onClose} />
      ) : (
        <>
          <ChatMessageList messages={messages} starting={starting} awaitingReply={awaitingReply} />

          {error && (
            <p role="alert" className="px-4 pb-2 font-mono text-[11px] text-[#B3261E] leading-relaxed">
              {error}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="border-t-1.5 border-ink p-3 flex items-end gap-2 bg-paper sm:rounded-b-2xl"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <label htmlFor="oi-chat-input" className="sr-only">
              Your message
            </label>
            <textarea
              id="oi-chat-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter is a newline. The send button exists
                // as well, because Enter alone is not discoverable on mobile.
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={CHAT_INPUT_PLACEHOLDER}
              disabled={session?.status === 'CLOSED'}
              className="field field-compact flex-1 resize-none max-h-28"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              aria-label="Send message"
              className="shrink-0 h-10 w-10 grid place-items-center rounded-full border-2 border-ink bg-lime text-ink shadow-hard cursor-pointer focus-ring transition-all hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-hard disabled:translate-x-0 disabled:translate-y-0"
            >
              <Send size={16} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
