/**
 * The transcript.
 *
 * Messages are rendered as plain text with line breaks preserved — no markdown,
 * no HTML, no autolinking. That is a safety decision rather than a shortcut: a
 * URL the model invented should not be clickable, and the site's own copy rules
 * already treat content strings as plain text for the same reason.
 */

import { useEffect, useRef } from 'react';
import type { ChatMessageDTO } from '../../../shared/chatTypes';

interface Props {
  messages: ChatMessageDTO[];
  starting: boolean;
  awaitingReply: boolean;
}

export default function ChatMessageList({ messages, starting, awaitingReply }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, awaitingReply]);

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 bg-cream">
      {/*
        aria-live on the list, not on each bubble. Because replies arrive whole
        rather than streaming token by token, each new message is announced
        exactly once — which is the concrete accessibility dividend of not
        streaming. A token stream into a live region is unusable with a screen
        reader.
      */}
      <div aria-live="polite" aria-atomic="false" className="space-y-3">
        {starting && messages.length === 0 && (
          <p className="font-mono text-[11px] text-stone">Starting…</p>
        )}

        {messages.map((message) =>
          message.kind === 'notice' ? (
            <p
              key={message.id}
              className="text-center font-mono text-[10px] uppercase tracking-wider text-stone py-1"
            >
              {message.content}
            </p>
          ) : (
            <Bubble key={message.id} message={message} />
          ),
        )}
      </div>

      {awaitingReply && <TypingIndicator />}

      <div ref={endRef} />
    </div>
  );
}

function Bubble({ message }: { message: ChatMessageDTO }) {
  const mine = message.role === 'VISITOR';
  const fromAgent = message.role === 'AGENT';

  return (
    <div className={mine ? 'flex justify-end' : 'flex justify-start'}>
      <div className="max-w-[85%]">
        {!mine && message.authorLabel && (
          <p className="font-mono text-[10px] uppercase tracking-wider text-stone mb-1">
            {message.authorLabel}
          </p>
        )}
        <div
          className={[
            'px-3 py-2 border-1.5 border-ink text-sm leading-relaxed whitespace-pre-wrap break-words',
            mine
              ? 'bg-ink text-cream rounded-2xl rounded-br-sm'
              : fromAgent
                ? 'bg-lime text-ink rounded-2xl rounded-bl-sm'
                : 'bg-paper text-ink rounded-2xl rounded-bl-sm',
          ].join(' ')}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

/**
 * The dots are decorative and hidden from assistive tech; the single status
 * node carries the meaning. Both matter: leaving the dots visible to a screen
 * reader re-announces on every animation frame.
 *
 * The animation degrades to three static dots under prefers-reduced-motion,
 * because src/index.css already forces near-zero durations globally. That reads
 * fine, so there is nothing extra to do here.
 */
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="px-3 py-2.5 border-1.5 border-ink bg-paper rounded-2xl rounded-bl-sm">
        <span className="sr-only" role="status">
          Typing
        </span>
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-stone animate-pulse"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
