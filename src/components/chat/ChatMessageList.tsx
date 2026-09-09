/**
 * The transcript.
 *
 * Messages render as plain text with line breaks preserved — no markdown, no
 * HTML. The only exception is a narrow allowlist handled by MessageText: our
 * own phone number and email addresses become tappable anywhere, and a human
 * agent's message may additionally carry a real URL. A link the model invented
 * is never clickable; see the header of MessageText.tsx for why that split is
 * where it is.
 */

import { useEffect, useRef } from 'react';
import type { ChatMessageDTO, TurnStep } from '../../../shared/chatTypes';
import MessageText from './MessageText';

interface Props {
  messages: ChatMessageDTO[];
  starting: boolean;
  awaitingReply: boolean;
  steps: TurnStep[];
}

export default function ChatMessageList({ messages, starting, awaitingReply, steps }: Props) {
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

      {awaitingReply &&
        (steps.length > 0 ? <StepStack steps={steps} /> : <TypingIndicator />)}

      <div ref={endRef} />
    </div>
  );
}

/**
 * What the assistant is doing, while it does it.
 *
 * A turn that runs the site audit takes fifteen seconds. Three dots for fifteen
 * seconds reads as a hang — the visitor sends the message again, or leaves.
 * Naming the work turns the same wait into something that looks deliberate, and
 * the finished lines double as a receipt: "Checked example.com — 62/100" is
 * itself a useful thing to have seen.
 *
 * Announced once as a whole via role="status" rather than per line, so a screen
 * reader is told what is happening without narrating every tick.
 */
function StepStack({ steps }: { steps: TurnStep[] }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] px-3 py-2.5 border-1.5 border-ink bg-paper rounded-2xl rounded-bl-sm">
        <span className="sr-only" role="status">
          {steps[steps.length - 1]?.label}
        </span>

        <ol className="space-y-1.5" aria-hidden="true">
          {steps.map((step) => (
            <li
              key={step.id}
              className={[
                'flex items-center gap-2 font-mono text-[11px] leading-tight transition-opacity',
                step.state === 'done' ? 'text-stone' : 'text-ink',
              ].join(' ')}
            >
              <StepMark state={step.state} />
              <span className={step.state === 'done' ? 'line-through decoration-stone/40' : ''}>
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * A spinner while running, a tick once done.
 *
 * The spin is a CSS animation, so index.css's global prefers-reduced-motion
 * block flattens it to a static ring automatically — the shape still reads as
 * "in progress" next to a ticked line above it, so nothing is lost.
 */
function StepMark({ state }: { state: TurnStep['state'] }) {
  if (state === 'done') {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 text-ink" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" className="fill-lime stroke-ink" strokeWidth="1.5" />
        <path
          d="M4.5 8.2l2.2 2.2 4.8-4.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 animate-spin text-ink" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.2" />
      <path
        d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
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
          <MessageText content={message.content} fromAgent={fromAgent} />
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
