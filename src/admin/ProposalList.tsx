/**
 * The dashboard: every proposal, with the engagement signal that decides who to
 * call next.
 *
 * "Viewed" here means a confirmed, non-bot view — see server/proposals/public.ts
 * for why a raw render count would be misleading.
 *
 * Rendered as cards rather than a dense table. There will be tens of these, not
 * thousands, and the thing being scanned for is "who opened it" — which wants a
 * highlighted number, not a column.
 */

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type ProposalListPage, type ProposalStatus } from './api';
import { Accent, Banner, Button, Card, Eyebrow, Heading, Modal, Pill } from '../portal/ui';
import {
  TemplateNote,
  TemplateOptionList,
  useTemplateOptions,
  type TemplateOption,
} from './TemplatePicker';
import { SkeletonBar } from '../portal/ui';

/** Offered sizes. The server clamps to 100 regardless of what is asked for. */
const PER_PAGE_OPTIONS = [15, 30, 50, 100];
const DEFAULT_PER_PAGE = 15;
const PER_PAGE_KEY = 'oi_admin_per_page';

/**
 * Remembered across sessions — someone who works at 50 rows should not have to
 * set it again every morning. Wrapped because localStorage throws outright in
 * some privacy modes rather than just returning null.
 */
function readPerPage(): number {
  try {
    const stored = Number(localStorage.getItem(PER_PAGE_KEY));
    return PER_PAGE_OPTIONS.includes(stored) ? stored : DEFAULT_PER_PAGE;
  } catch {
    return DEFAULT_PER_PAGE;
  }
}

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PUBLISHED', label: 'Live' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatusPill({ status }: { status: ProposalStatus }) {
  if (status === 'PUBLISHED') return <Pill tone="lime">● Live</Pill>;
  if (status === 'ARCHIVED') return <Pill tone="ink">Archived</Pill>;
  return <Pill tone="cream">Draft</Pill>;
}

export default function ProposalList({ onOpen }: { onOpen: (id: string) => void }) {
  const [data, setData] = useState<ProposalListPage | null>(null);
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(readPerPage);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  /*
    True whenever a request is in flight — not just the first one. Previously
    only the initial load showed a skeleton, so changing page or typing a search
    left the old rows sitting there until the new ones arrived. Against a remote
    database that is a couple of seconds of the UI looking frozen and the click
    looking ignored.
  */
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [templateId, setTemplateId] = useState('blank');
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<TemplateOption | null>(null);
  const { options, error: templatesError, loading: templatesLoading, forget } =
    useTemplateOptions(showNew);

  const load = useCallback(async () => {
    try {
      setError(null);
      const next = await api.list({ status, q, page, perPage });

      /*
        A filter change can leave you past the end — deleting the only row on
        page 3, or searching while on it. Step back rather than showing an empty
        list with a pager that says "Page 3 of 1".
      */
      if (next.page > next.totalPages && next.totalPages >= 1) {
        setPage(next.totalPages);
        return;
      }
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load proposals.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [status, q, page, perPage]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  // The skeleton goes up immediately though, before the debounce — the results
  // on screen are already known to be stale the moment a key is pressed.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => void load(), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function createNew(e?: React.FormEvent) {
    e?.preventDefault();
    const companyName = newName.trim();
    if (!companyName) return;

    setCreating(true);
    try {
      const { proposal } = await api.create({ companyName, templateId });
      onOpen(proposal.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the proposal.');
      setShowNew(false);
    } finally {
      setCreating(false);
    }
  }

  /**
   * Mirrors slugify() on the server so the admin sees the URL before the
   * proposal exists. The server still owns the real value — it also has to
   * resolve reserved words and collisions, which this cannot know about.
   */
  const slugPreview = newName
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['\p{Pf}]/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  /*
    Resolved against the merged list rather than getTemplate(), which searches
    only the built-ins — so a saved template used to come back undefined here and
    the note under the list described the wrong behaviour entirely.
  */
  const selectedTemplate = options.find((t) => t.id === templateId);

  function openNewDialog() {
    setNewName('');
    setTemplateId('blank');
    // The hook fetches the saved list whenever the dialog opens.
    setShowNew(true);
  }

  async function removeTemplate(option: TemplateOption) {
    setConfirmDeleteTemplate(null);
    try {
      await api.deleteTemplate(option.savedId!);
      forget(option.savedId!);
      if (templateId === option.id) setTemplateId('blank');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete that template.');
    }
  }
  const proposals = data?.proposals ?? null;
  const stats = data?.stats;

  return (
    <div>
      {/* Header ------------------------------------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
        <div>
          <Eyebrow>Pipeline</Eyebrow>
          <Heading level={1} className="mt-3 !text-4xl lg:!text-5xl">
            Your <Accent>proposals</Accent>
          </Heading>
          {stats ? (
            <dl className="flex flex-wrap items-center gap-2.5 mt-4">
              <Stat value={stats.total} label="total" />
              <Stat value={stats.live} label="live" tone={stats.live > 0 ? 'ink' : 'quiet'} />
              <Stat
                value={stats.opened}
                label={stats.opened === 1 ? 'opened by a prospect' : 'opened by prospects'}
                tone={stats.opened > 0 ? 'lime' : 'quiet'}
              />
            </dl>
          ) : (
            <div className="mt-4">
              <SkeletonBar w="w-64" h="h-8" />
            </div>
          )}
        </div>
        <Button
          onClick={openNewDialog}
          tone="lime"
          size="lg"
        >
          + New proposal
        </Button>
      </div>

      {/* Filters ------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {STATUS_TABS.map((tab) => {
            const on = status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  // Page 4 of "All" is meaningless once the filter changes.
                  setStatus(tab.value);
                  setPage(1);
                }}
                aria-pressed={on}
                className={`cursor-pointer font-mono text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-full border-1.5 transition-all focus-ring ${
                  on
                    ? 'bg-ink text-lime border-ink shadow-hard'
                    : 'bg-paper text-ink border-ink/30 hover:border-ink hover:-translate-y-0.5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search company or slug…"
          className="field flex-1 min-w-[220px] max-w-sm"
        />
      </div>

      {error && (
        <div className="mb-8">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      {/* Empty state -------------------------------------------------- */}
      {proposals && proposals.length === 0 && !error && !loading && (
        <Card tone="cream" className="p-14 text-center border-dashed">
          <p className="font-display font-extrabold text-2xl text-ink mb-2">
            {q || status !== 'ALL' ? 'Nothing matches that filter' : 'No proposals yet'}
          </p>
          <p className="text-stone max-w-md mx-auto">
            {q || status !== 'ALL'
              ? 'Try a different search or switch tabs.'
              : 'Create one, fill in what you learned on the call, and publish it to a link you can text them.'}
          </p>
        </Card>
      )}

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        eyebrow="New proposal"
        title="Who is this for?"
        footer={
          <>
            <Button tone="ghost" size="md" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
            <Button
              tone="lime"
              size="md"
              disabled={creating || !newName.trim()}
              onClick={() => void createNew()}
            >
              {creating ? 'Creating…' : 'Create draft'}
            </Button>
          </>
        }
      >
        <form onSubmit={createNew} className="space-y-5">
          <label className="block">
            <span className="form-label">Company name</span>
            <input
              className="field"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ABC Logistics"
            />
          </label>

          <fieldset>
            <legend className="form-label">Start from</legend>
            <TemplateOptionList
              options={options}
              value={templateId}
              onChange={setTemplateId}
              onDelete={setConfirmDeleteTemplate}
              loading={templatesLoading}
              error={templatesError}
            />
            <TemplateNote selected={selectedTemplate} />
          </fieldset>

          <p className="text-[13px] text-stone leading-relaxed">
            {slugPreview ? (
              <>
                The link will be{' '}
                <code className="font-mono text-ink">
                  {window.location.host}/{slugPreview}
                </code>
                . You can change it later, and nothing is visible to anyone until you publish.
              </>
            ) : (
              'This creates a draft. Nothing is visible to anyone until you publish it.'
            )}
          </p>
        </form>
      </Modal>

      {/* Deleting a template is irreversible, so it asks — the same courtesy
          Archive already extends. */}
      <Modal
        open={confirmDeleteTemplate !== null}
        onClose={() => setConfirmDeleteTemplate(null)}
        eyebrow="Delete template"
        title={`Delete “${confirmDeleteTemplate?.label ?? ''}”?`}
        footer={
          <>
            <Button tone="ghost" size="md" onClick={() => setConfirmDeleteTemplate(null)}>
              Keep it
            </Button>
            <Button
              tone="danger"
              size="md"
              onClick={() => confirmDeleteTemplate && void removeTemplate(confirmDeleteTemplate)}
            >
              Delete template
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-stone leading-relaxed">
          This removes the template only. Proposals you already built from it are untouched, but
          the template itself cannot be recovered — you would have to save it again from a
          proposal.
        </p>
      </Modal>

      {/* Loading ------------------------------------------------------ */}
      {loading && !error && (
        <div className="grid gap-4" aria-busy="true" aria-label="Loading proposals">
          {/* Matches the row count that was on screen, so the page does not
              jump when the real rows land. */}
          {Array.from({ length: proposals?.length || Math.min(perPage, 8) }).map((_, i) => (
            <ProposalRowSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Cards -------------------------------------------------------- */}
      <div className={`grid gap-4 ${loading ? 'hidden' : ''}`}>
        {proposals?.map((p) => (
          <Card key={p.id} hover onClick={() => onOpen(p.id)} className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
              {/* Identity */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                  <h2 className="font-display font-extrabold text-xl text-ink tracking-tight truncate">
                    {p.companyName}
                  </h2>
                  <StatusPill status={p.status} />
                </div>
                <p className="font-mono text-[11px] text-stone truncate">
                  /{p.slug}
                  {p.contactName && <span className="text-ink/50"> · {p.contactName}</span>}
                </p>
                {p.currentCalls != null && p.projectedCalls != null && (
                  <p className="font-mono text-[11px] text-stone mt-1.5">
                    {p.currentCalls} → <span className="text-ink font-bold">{p.projectedCalls}</span>{' '}
                    calls/mo
                  </p>
                )}
              </div>

              {/* Engagement */}
              <div className="flex items-stretch gap-3 shrink-0">
                <Metric
                  label="Views"
                  value={p.viewCount > 0 ? String(p.viewCount) : '—'}
                  active={p.viewCount > 0}
                />
                <Metric
                  label="CTA"
                  value={p.ctaClicks > 0 ? String(p.ctaClicks) : '—'}
                  active={p.ctaClicks > 0}
                />
                <div className="text-right min-w-[92px] flex flex-col justify-center">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-stone">
                    Last viewed
                  </p>
                  <p
                    className={`font-mono text-sm font-bold ${
                      p.lastViewedAt ? 'text-ink' : 'text-stone/60'
                    }`}
                  >
                    {relativeTime(p.lastViewedAt)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* The footer bar renders whenever there are rows, not only when there is
          more than one page — otherwise setting 100 rows collapses the list to a
          single page and takes the control to change it back with it. */}
      {data && data.total > 0 && !loading && (
        <Pager
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          perPage={data.perPage}
          onPage={(n) => {
            setPage(n);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onPerPage={(n) => {
            setPerPage(n);
            // Page 4 at 15 rows is past the end at 100.
            setPage(1);
            try {
              localStorage.setItem(PER_PAGE_KEY, String(n));
            } catch {
              // Storage unavailable — the choice just will not persist.
            }
          }}
        />
      )}
    </div>
  );
}

/** Mirrors a proposal card exactly: title, slug line, and the three metrics. */
function ProposalRowSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="border-2 border-ink/15 rounded-2xl bg-paper p-5 md:p-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4"
    >
      <div className="min-w-0 flex-1 space-y-2.5">
        <SkeletonBar w="w-48" h="h-6" />
        <SkeletonBar w="w-32" h="h-3" />
        <SkeletonBar w="w-24" h="h-3" />
      </div>
      <div className="flex items-stretch gap-3 shrink-0">
        <SkeletonBar w="w-16" h="h-14" className="!rounded-xl" />
        <SkeletonBar w="w-16" h="h-14" className="!rounded-xl" />
        <div className="min-w-[92px] space-y-2 pt-2">
          <SkeletonBar w="w-16" h="h-2.5" />
          <SkeletonBar w="w-20" h="h-4" />
        </div>
      </div>
    </div>
  );
}

/**
 * Offset pager.
 *
 * Page numbers rather than infinite scroll: this list is worked through
 * deliberately — "who haven't I followed up?" — and a page you can return to
 * beats a feed you have to re-scroll. The window keeps the control a fixed
 * width once there are more pages than fit.
 */
function Pager({
  page,
  totalPages,
  total,
  perPage,
  onPage,
  onPerPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPage: (n: number) => void;
  onPerPage: (n: number) => void;
}) {
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  // Up to 5 numbers, always including the first and last, centred on the
  // current page.
  const numbers: (number | 'gap')[] = [];
  const push = (n: number) => {
    if (!numbers.includes(n)) numbers.push(n);
  };
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i += 1) push(i);
  } else {
    push(1);
    if (page > 3) numbers.push('gap');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i += 1) push(i);
    if (page < totalPages - 2) numbers.push('gap');
    push(totalPages);
  }

  const btn =
    'cursor-pointer font-mono text-[11px] font-bold uppercase tracking-wider rounded-full border-1.5 transition-all focus-ring ' +
    'disabled:opacity-35 disabled:cursor-not-allowed';

  return (
    <nav
      className="mt-8 pt-6 border-t-1.5 border-ink/12 flex flex-wrap items-center justify-between gap-x-6 gap-y-4"
      aria-label="Proposal pages"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <p className="font-mono text-[11px] uppercase tracking-wider text-stone">
          {from}–{to} of {total}
        </p>

        <div className="flex items-center gap-2">
          <span
            id="per-page-label"
            className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone"
          >
            Rows
          </span>
          <div className="flex gap-1" role="group" aria-labelledby="per-page-label">
            {PER_PAGE_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPerPage(n)}
                aria-pressed={n === perPage}
                className={`cursor-pointer font-mono text-[11px] font-bold h-8 min-w-[2.25rem] px-2 rounded-full border-1.5 transition-all focus-ring ${
                  n === perPage
                    ? 'bg-ink text-lime border-ink shadow-hard'
                    : 'bg-paper text-ink border-ink/30 hover:border-ink'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-1.5 ${totalPages <= 1 ? 'hidden' : ''}`}>
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className={`${btn} px-4 py-2.5 border-ink/30 bg-paper text-ink hover:border-ink hover:bg-ink hover:text-cream disabled:hover:bg-paper disabled:hover:text-ink disabled:hover:border-ink/30`}
        >
          &larr; Prev
        </button>

        {numbers.map((n, i) =>
          n === 'gap' ? (
            <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-stone font-mono text-xs">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`${btn} w-9 h-9 flex items-center justify-center ${
                n === page
                  ? 'bg-ink text-lime border-ink shadow-hard'
                  : 'bg-paper text-ink border-ink/30 hover:border-ink'
              }`}
            >
              {n}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className={`${btn} px-4 py-2.5 border-ink/30 bg-paper text-ink hover:border-ink hover:bg-ink hover:text-cream disabled:hover:bg-paper disabled:hover:text-ink disabled:hover:border-ink/30`}
        >
          Next &rarr;
        </button>
      </div>
    </nav>
  );
}

/**
 * One counter in the pipeline summary.
 *
 * Was a single run-on line of dot-separated text, where "1 live" and "1 opened
 * by a prospect" — the two numbers actually worth knowing — carried no more
 * weight than the total.
 */
function Stat({
  value,
  label,
  tone = 'quiet',
}: {
  value: number;
  label: string;
  tone?: 'quiet' | 'ink' | 'lime';
}) {
  const tones = {
    quiet: 'bg-paper border-ink/25 text-stone',
    ink: 'bg-paper border-ink text-ink',
    lime: 'bg-lime border-ink text-ink shadow-hard',
  } as const;
  return (
    <div
      className={`inline-flex items-baseline gap-1.5 border-1.5 rounded-full px-3.5 py-1.5 ${tones[tone]}`}
    >
      <dt className="sr-only">{label}</dt>
      <dd className="font-display font-extrabold text-lg leading-none">{value}</dd>
      <span aria-hidden="true" className="font-mono text-[10px] uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

/** A single engagement number. Lime fill is the "this prospect is warm" signal. */
function Metric({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div
      className={`w-16 rounded-xl border-1.5 px-2 py-2 text-center ${
        active ? 'bg-lime border-ink' : 'bg-cream border-ink/20'
      }`}
    >
      <p className="font-mono text-[9px] uppercase tracking-wider text-stone">{label}</p>
      <p className={`font-display font-extrabold text-lg ${active ? 'text-ink' : 'text-stone/60'}`}>
        {value}
      </p>
    </div>
  );
}
