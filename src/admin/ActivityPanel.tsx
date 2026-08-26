/**
 * What the prospect actually did with the proposal.
 *
 * The distinction this panel exists to preserve: a *view* is a confirmed,
 * non-bot page open. Link scanners in Gmail and Outlook fetch every URL in a
 * message, so folding those into the view count would tell you a prospect read
 * your proposal thirty seconds after you sent it. They are reported separately
 * and labelled for what they are.
 */

import { useEffect, useState } from 'react';
import { api, ApiError, type Activity, type ProposalStatus } from './api';
import { relativeTime } from './ProposalList';
import { Banner, Card, Eyebrow, SkeletonBar } from '../portal/ui';

function duration(ms: number | null): string {
  if (ms == null) return '—';
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

const EVENT_LABELS: Record<string, string> = {
  cta_click: 'Clicked the call to action',
  phone_click: 'Tapped the phone number',
  email_click: 'Clicked the email address',
  section_view: 'Reached a section',
  reply_submit: 'Sent a reply',
};

export default function ActivityPanel({
  proposalId,
  status,
}: {
  proposalId: string;
  status: ProposalStatus;
}) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.activity(proposalId);
        if (!cancelled) setActivity(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load activity.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  if (error) return <Banner tone="error">{error}</Banner>;

  if (!activity) {
    // Shaped like the real panel — four stat tiles then the views table — so
    // the layout does not jump when the numbers arrive.
    return (
      <div className="max-w-3xl space-y-8" aria-busy="true" aria-label="Loading activity">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-2 border-ink/15 rounded-2xl bg-paper p-5 space-y-2.5">
              <SkeletonBar w="w-16" h="h-2.5" />
              <SkeletonBar w="w-12" h="h-7" />
            </div>
          ))}
        </div>
        <div>
          <SkeletonBar w="w-24" h="h-3" className="mb-4" />
          <div className="border-2 border-ink/15 rounded-2xl bg-paper divide-y-1.5 divide-ink/10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center justify-between gap-4">
                <SkeletonBar w="w-28" h="h-4" />
                <SkeletonBar w="w-16" h="h-4" />
                <SkeletonBar w="w-12" h="h-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { summary, views, events } = activity;

  return (
    <div className="max-w-3xl space-y-8">
      {status !== 'PUBLISHED' && (
        <Banner tone="cream">
          This proposal is not published, so the link does not resolve. Any activity below is from a
          period when it was live.
        </Banner>
      )}

      <dl className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat label="Views" value={String(summary.viewCount)} />
        <Stat label="Unique viewers" value={String(summary.uniqueViewers)} />
        <Stat label="Last viewed" value={relativeTime(summary.lastViewedAt)} />
        <Stat label="CTA clicks" value={String(summary.ctaClicks)} highlight={summary.ctaClicks > 0} />
      </dl>

      {summary.viewCount === 0 && (
        <Card tone="cream" className="border-dashed px-6 py-12 text-center">
          <p className="font-display font-extrabold text-xl text-ink mb-1.5">
            No confirmed views yet
          </p>
          <p className="text-stone text-sm max-w-sm mx-auto">
            {summary.scannerHits > 0
              ? 'The link has been fetched, but only by automated scanners — nobody has opened it in a real browser.'
              : 'Nothing has opened this link yet.'}
          </p>
        </Card>
      )}

      {views.length > 0 && (
        <section>
          <div className="mb-4">
            <Eyebrow>Views</Eyebrow>
          </div>
          <div className="border-2 border-ink rounded-2xl shadow-hard overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full bg-paper text-left text-sm min-w-[480px]">
              <thead>
                <tr className="border-b-1.5 border-ink bg-cream">
                  {['When', 'Time on page', 'Scrolled', 'Viewer'].map((h) => (
                    <th
                      key={h}
                      className="font-mono text-[10px] uppercase tracking-widest text-stone px-4 py-2.5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {views.map((v) => (
                  <tr key={v.id} className="border-b-1.5 border-ink/10 last:border-0 hover:bg-cream/60 transition-colors">
                    <td className="px-4 py-2.5">{relativeTime(v.viewedAt)}</td>
                    <td className="px-4 py-2.5 font-mono">{duration(v.durationMs)}</td>
                    <td className="px-4 py-2.5 font-mono">
                      {v.maxScrollPct == null ? '—' : `${v.maxScrollPct}%`}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-stone">
                      {v.viewerKey ? v.viewerKey.slice(0, 8) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <div className="mb-4">
            <Eyebrow>Interactions</Eyebrow>
          </div>
          <ul className="border-2 border-ink rounded-2xl shadow-hard bg-paper overflow-hidden">
            {events.map((e) => (
              <li
                key={e.id}
                className="px-5 py-3.5 flex items-baseline justify-between gap-4 border-b-1.5 border-ink/10 last:border-0"
              >
                <span>
                  {EVENT_LABELS[e.name] ?? e.name}
                  {e.label && <span className="text-stone text-sm"> — {e.label}</span>}
                </span>
                <span className="text-sm text-stone whitespace-nowrap">
                  {relativeTime(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.scannerHits > 0 && (
        <section>
          <div className="mb-4">
            <Eyebrow>Automated fetches</Eyebrow>
          </div>
          <p className="border-1.5 border-ink/25 rounded-2xl bg-cream px-5 py-4 text-sm text-stone leading-relaxed">
            The link was fetched {summary.scannerHits} time
            {summary.scannerHits === 1 ? '' : 's'} without a browser session — almost always an email
            provider or security gateway scanning the URL. Deliberately excluded from the view count
            above, because it is not evidence anyone read the proposal.
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border-2 border-ink rounded-2xl shadow-hard p-5 ${
        highlight ? 'bg-lime' : 'bg-paper'
      }`}
    >
      <dt className="font-mono text-[9px] font-bold uppercase tracking-wider text-stone mb-1.5">
        {label}
      </dt>
      <dd className="font-display font-extrabold text-2xl text-ink tracking-tight">{value}</dd>
    </div>
  );
}
