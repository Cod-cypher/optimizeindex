/**
 * Every conversation the chat widget has had.
 *
 * Two jobs. The urgent one is joining a live conversation without waiting for
 * an email — sign in, filter to "wants a person", click through. The slower and
 * arguably more important one is reading transcripts: the assistant speaks for
 * a business whose whole positioning is that it does not fabricate, and the
 * only way to know whether it is holding that line is to read what it actually
 * said. Worth doing by hand for the first couple of weeks.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ChatMessageDTO } from '../../shared/chatTypes';
import { Card, Eyebrow, Heading, Banner } from '../portal/ui';

interface ChatRow {
  id: string;
  createdAt: string;
  lastMessageAt: string;
  status: string;
  startedOn: string | null;
  visitorName: string | null;
  visitorEmail: string | null;
  visitorCompany: string | null;
  handoffReason: string | null;
  qualified: boolean;
  leadId: string | null;
  turnCount: number;
}

const FILTERS = [
  { id: 'HANDOFF_PENDING', label: 'Wants a person' },
  { id: 'LIVE', label: 'Live' },
  { id: 'ACTIVE', label: 'Open' },
  { id: 'ALL', label: 'All' },
] as const;

export default function ChatInbox() {
  const [filter, setFilter] = useState<string>('HANDOFF_PENDING');
  const [rows, setRows] = useState<ChatRow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    try {
      const res = await fetch(`/api/admin/chats?status=${encodeURIComponent(filter)}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { conversations: ChatRow[] };
      setRows(data.conversations);
      setError('');
    } catch {
      setError('Could not load conversations.');
      setRows([]);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (openId) {
    return <Transcript id={openId} onBack={() => setOpenId(null)} />;
  }

  return (
    <div>
      <Eyebrow>Chat</Eyebrow>
      <Heading level={2}>Conversations</Heading>

      <div className="flex flex-wrap gap-2 mt-6 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={[
              'font-mono text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full border-1.5 transition-colors cursor-pointer focus-ring',
              filter === f.id
                ? 'border-ink bg-ink text-cream'
                : 'border-ink/25 text-ink hover:border-ink',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      {rows === null ? (
        <p className="font-mono text-[11px] text-stone">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-sm text-stone">Nothing here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setOpenId(row.id)}
              className="w-full text-left cursor-pointer focus-ring rounded-2xl"
            >
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-display font-extrabold text-base text-ink">
                    {row.visitorCompany || row.visitorName || row.visitorEmail || 'A visitor'}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-stone">
                    {new Date(row.lastMessageAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-stone">
                  <span>{row.status.toLowerCase().replace('_', ' ')}</span>
                  {row.startedOn && <span>{row.startedOn}</span>}
                  <span>{row.turnCount} replies</span>
                  {row.leadId && <span className="text-ink">lead captured</span>}
                  {row.handoffReason && <span className="text-ink">{row.handoffReason.replace('_', ' ')}</span>}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   One conversation
------------------------------------------------------------------------- */

function Transcript({ id, onBack }: { id: string; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessageDTO[] | null>(null);
  const [status, setStatus] = useState('');
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/admin/chats/${encodeURIComponent(id)}`, {
          credentials: 'same-origin',
        });
        const data = (await res.json()) as {
          conversation: { status: string };
          messages: ChatMessageDTO[];
        };
        setMessages(data.messages);
        setStatus(data.conversation.status);
      } catch {
        setMessages([]);
      }
    })();
  }, [id]);

  const revoke = async () => {
    await fetch(`/api/admin/chats/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
      credentials: 'same-origin',
    });
    setRevoked(true);
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone hover:text-ink cursor-pointer focus-ring mb-6"
      >
        ← All conversations
      </button>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/*
          An admin session authorises agent replies on its own — requireAgent
          accepts either that or the cookie from an emailed join link — so this
          is the no-email path into a live conversation.
        */}
        <a
          href={`/chat/agent/${encodeURIComponent(id)}`}
          className="font-mono text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full border-2 border-ink bg-lime text-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all focus-ring"
        >
          Open live console
        </a>
        <button
          type="button"
          onClick={() => void revoke()}
          disabled={revoked}
          className="font-mono text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full border-1.5 border-ink/25 text-ink hover:border-ink transition-colors cursor-pointer focus-ring disabled:opacity-50"
        >
          {revoked ? 'Links revoked' : 'Revoke join links'}
        </button>
        <span className="font-mono text-[11px] text-stone">{status.toLowerCase().replace('_', ' ')}</span>
      </div>

      {messages === null ? (
        <p className="font-mono text-[11px] text-stone">Loading…</p>
      ) : (
        <Card>
          <div className="space-y-4">
            {messages.map((m) => (
              <div key={m.id}>
                <p className="font-mono text-[10px] uppercase tracking-wider text-stone mb-1">
                  {m.role === 'VISITOR' ? 'Visitor' : m.authorLabel || m.role.toLowerCase()}
                </p>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
