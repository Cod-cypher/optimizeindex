/**
 * The proposal editor.
 *
 * Autosaves as a draft on a debounce, so there is no "did I save that?" —
 * publishing is the only explicit commit, and it is the only thing that changes
 * what a prospect can see.
 *
 * Preview renders the real ProposalPage component against the current draft
 * rather than an iframe of the published URL. A draft has no published URL, and
 * rendering the same component is what guarantees preview and published output
 * cannot drift apart.
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, type ProposalRecord, type ValidationProblem } from './api';
import {
  ImageField,
  ListField,
  MoneyField,
  NumberField,
  RepeaterField,
  TextArea,
  TextField,
} from './fields';
import ActivityPanel from './ActivityPanel';
import { TemplateNote, TemplateOptionList, useTemplateOptions } from './TemplatePicker';
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  Collapsible,
  Eyebrow,
  Heading,
  Modal,
  Pill,
  SkeletonBar,
  SkeletonCard,
} from '../portal/ui';
import type {
  CallSource,
  CustomSection,
  ProposalPhase,
  PublicProposal,
} from '../../shared/proposalTypes';

const ProposalPage = lazy(() => import('../proposal/ProposalPage'));

const AUTOSAVE_DELAY_MS = 900;
/** How long to wait before retrying a save that failed. */
const RETRY_DELAY_MS = 4000;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ProposalEditor({ id, onBack }: { id: string; onBack: () => void }) {
  const [record, setRecord] = useState<ProposalRecord | null>(null);
  const [draft, setDraft] = useState<Partial<ProposalRecord>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [problems, setProblems] = useState<ValidationProblem[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [tab, setTab] = useState<'edit' | 'activity'>('edit');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Applying a template to this draft, as opposed to saving one from it.
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyId, setApplyId] = useState('blank');
  const [applyOverwrite, setApplyOverwrite] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const {
    options: templateOptions,
    error: templateListError,
    loading: templateListLoading,
  } = useTemplateOptions(applyOpen);
  /*
    Kept separate from `banner`. A banner renders behind the modal, so a failed
    save looked like nothing had happened at all until the dialog was closed —
    at which point a generic message appeared with no obvious cause.
  */
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [groupSummary, setGroupSummary] = useState<Record<string, string | null> | null>(null);
  const [groupSpecs, setGroupSpecs] = useState<
    { id: string; label: string; prospectSpecific?: boolean }[]
  >([]);
  const [include, setInclude] = useState<string[]>([]);

  // Holds the fields changed since the last successful save. Sending only these
  // means two edits in different sections cannot clobber one another.
  const pending = useRef<Partial<ProposalRecord>>({});
  const timer = useRef<number | null>(null);
  /** The save currently on the wire, so flush() can wait for it. */
  const inFlight = useRef<Promise<void> | null>(null);
  /** Lets flush() schedule its own retry without referencing itself. */
  const flushRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { proposal } = await api.get(id);
        if (cancelled) return;
        setRecord(proposal);
        setDraft(proposal);
      } catch (err) {
        if (!cancelled) setBanner(err instanceof ApiError ? err.message : 'Could not load.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const flush = useCallback(async () => {
    /*
      A save already on the wire has to finish first. Without this, flush()
      returned immediately whenever a debounced save happened to be in flight —
      pending was already empty — so callers that await it before reading the
      proposal back (the template dialogs, publish, duplicate) could read the row
      before the PATCH had committed and see the state from before the edit.
    */
    if (inFlight.current) await inFlight.current;

    const patch = pending.current;
    if (Object.keys(patch).length === 0) return;
    pending.current = {};

    setSaveState('saving');
    const run = (async () => {
      try {
        const { proposal, problems: rejected } = await api.update(id, patch);
        setRecord(proposal);
        setSaveState('saved');
        /*
          A field the server could not write — the slug, in practice — is shown
          on that field rather than treated as a failed save. Everything else in
          the patch did land, and re-queueing the offending value would make
          every later save fail with it.
        */
        setProblems(rejected ?? []);
      } catch (err) {
        /*
          Put the edits back. They were previously dropped the moment the request
          was built, so one failed save discarded whatever had been typed for
          good: the field still showed the value, nothing ever retried it, and
          the column stayed null. Anything typed since wins over the restored
          copy.
        */
        pending.current = { ...patch, ...pending.current };
        setSaveState('error');
        if (err instanceof ApiError && err.problems.length) setProblems(err.problems);
        setBanner(err instanceof ApiError ? err.message : 'Could not save.');

        // One retry, so a blip against a remote database does not leave the
        // edits stranded until the next keystroke.
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void flushRef.current(), RETRY_DELAY_MS);
      }
    })();

    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
  }, [id]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const set = useCallback(
    <K extends keyof ProposalRecord>(key: K, value: ProposalRecord[K]) => {
      setDraft((d) => ({ ...d, [key]: value }));
      pending.current = { ...pending.current, [key]: value };

      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    if (!showPreview) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [showPreview]);

  // Escape closes the preview, matching the dialogs.
  useEffect(() => {
    if (!showPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPreview(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPreview]);

  // A pending autosave must not be lost to a tab close or a click on "Back".
  useEffect(() => {
    const onHide = () => {
      if (Object.keys(pending.current).length > 0) void flush();
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      onHide();
    };
  }, [flush]);

  /*
    A field is marked either because the server rejected it, or because a
    blocking check is failing right now. Previously only the former counted, so
    a card could be outlined red with nothing inside it explaining why.
  */
  const problemFor = (field: string) =>
    problems.find((p) => p.field === field)?.message ??
    checks.find((c) => !c.ok && !c.soft && c.field === field)?.detail;

  async function act(fn: () => Promise<{ proposal: ProposalRecord }>, successMessage: string) {
    if (timer.current) window.clearTimeout(timer.current);
    await flush();

    setProblems([]);
    setBanner(null);
    try {
      const { proposal } = await fn();
      setRecord(proposal);
      setDraft(proposal);
      setBanner(successMessage);
    } catch (err) {
      if (err instanceof ApiError && err.problems.length) {
        setProblems(err.problems);
        setBanner('This cannot be published yet — see the highlighted fields.');
      } else {
        setBanner(err instanceof ApiError ? err.message : 'That did not work.');
      }
    }
  }

  /**
   * Opens the save dialog with everything this proposal actually has ticked by
   * default. The admin can then untick down to a single group — the point is
   * that they choose, not that a rule decides for them.
   */
  async function openTemplateDialog() {
    if (!record) return;
    setTemplateName(draft.industry || record.companyName);
    setTemplateDescription('');
    setTemplateError(null);
    setGroupSummary(null);
    setInclude([]);
    setSaveTemplateOpen(true);

    if (timer.current) window.clearTimeout(timer.current);
    await flush();

    try {
      const { groups, specs } = await api.templateGroups(record.id);
      setGroupSummary(groups);
      setGroupSpecs(specs);
      // Everything this proposal actually has, ticked. Untick what you do not
      // want carried.
      setInclude(Object.entries(groups).filter(([, v]) => v).map(([k]) => k));
    } catch (err) {
      setTemplateError(err instanceof ApiError ? err.message : 'Could not read this proposal.');
    }
  }

  /**
   * Fills this draft from a template.
   *
   * The autosave makes the ordering matter. A pending debounce is flushed first
   * so the server applies over current values, and `pending` is cleared
   * afterwards — otherwise a key still queued from a keystroke a moment ago
   * would fire its PATCH after the response and quietly undo what was applied.
   */
  async function applyTemplate() {
    if (!record) return;
    setApplying(true);
    setApplyError(null);

    if (timer.current) window.clearTimeout(timer.current);
    await flush();

    try {
      const { proposal, applied } = await api.applyTemplate(record.id, {
        templateId: applyId,
        overwrite: applyOverwrite,
      });
      pending.current = {};
      setRecord(proposal);
      setDraft(proposal);
      setApplyOpen(false);
      setBanner(
        applied.length === 0
          ? 'Nothing to fill in — this draft already has a value everywhere that template covers.'
          : `Filled in ${applied.length} ${applied.length === 1 ? 'field' : 'fields'} from the template.`,
      );
    } catch (err) {
      setApplyError(
        err instanceof ApiError ? err.message : 'Could not apply that template.',
      );
    } finally {
      setApplying(false);
    }
  }

  const publicUrl = record ? `${window.location.origin}/${record.slug}` : '';

  const previewProposal = useMemo<PublicProposal | null>(
    () => (record ? toPreview({ ...record, ...draft }) : null),
    [record, draft],
  );

  if (!record) {
    return (
      <div aria-busy="true" aria-label="Loading proposal">
        <SkeletonBar w="w-40" h="h-11" className="!rounded-full mb-6" />
        <SkeletonCard className="mb-8" lines={2} />
        <div className="flex gap-2 mb-10">
          <SkeletonBar w="w-36" h="h-11" className="!rounded-full" />
          <SkeletonBar w="w-28" h="h-11" className="!rounded-full" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[172px_minmax(0,1fr)] xl:grid-cols-[172px_minmax(0,1fr)_296px] items-start">
          <div className="hidden lg:block space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBar key={i} h="h-9" />
            ))}
          </div>
          <div className="space-y-5">
            <SkeletonCard lines={6} />
            <SkeletonCard lines={4} />
          </div>
          <div className="hidden xl:block space-y-4">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={4} />
          </div>
        </div>
      </div>
    );
  }

  const lift = liftOf(draft);
  const checks = publishChecks(draft);

  /*
    Blocking reasons, grouped by step. Drives the red outline, the badge and the
    list of causes on each card — all from the same source as the checklist in
    the right rail, so the two can never disagree.
  */
  const reasonsBySection = new Map<string, string[]>();
  for (const c of checks) {
    if (c.ok || c.soft) continue;
    reasonsBySection.set(c.section, [...(reasonsBySection.get(c.section) ?? []), c.detail]);
  }
  const reasonsFor = (id: string) => reasonsBySection.get(id) ?? [];

  return (
    <div>
      {/* Header ------------------------------------------------------- */}
      <button
        type="button"
        onClick={onBack}
        className="cursor-pointer mb-6 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-full border-1.5 border-ink/30 bg-paper text-ink hover:border-ink hover:bg-ink hover:text-cream hover:-translate-y-0.5 transition-all focus-ring"
      >
        <span aria-hidden="true">&larr;</span> All proposals
      </button>

      <Card className="p-6 md:p-7 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              {record.status === 'PUBLISHED' ? (
                <Pill tone="lime">● Live</Pill>
              ) : record.status === 'ARCHIVED' ? (
                <Pill tone="ink">Archived</Pill>
              ) : (
                <Pill tone="cream">Draft</Pill>
              )}
              <SaveIndicator state={saveState} />
            </div>

            <Heading level={2} className="truncate !text-3xl">
              {draft.companyName || record.companyName}
            </Heading>

            <p className="font-mono text-[11px] text-stone mt-2 break-all">
              {record.status === 'PUBLISHED' ? (
                <a
                  href={`/${record.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink underline underline-offset-4 decoration-lime decoration-2 hover:decoration-ink"
                >
                  {publicUrl} ↗
                </a>
              ) : (
                <span className="text-stone/70">Will publish to {publicUrl}</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              tone="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(publicUrl);
                setBanner('Link copied to your clipboard.');
              }}
            >
              Copy link
            </Button>

            <Button tone="outline" size="sm" onClick={() => setShowPreview(true)}>
              Preview
            </Button>

            {record.status === 'PUBLISHED' ? (
              <Button
                tone="ghost"
                size="sm"
                onClick={() => void act(() => api.unpublish(record.id), 'Unpublished — the link now 404s.')}
              >
                Unpublish
              </Button>
            ) : (
              <Button
                tone="lime"
                size="md"
                onClick={() => void act(() => api.publish(record.id), 'Published. The link is live.')}
              >
                Publish
              </Button>
            )}
          </div>
        </div>
      </Card>

      {banner && (
        <div className="mb-8">
          {/* Anything reporting a failed save or a blocked publish is an error,
              not a notification — it was previously shown in the same lime as
              "Link copied". */}
          <Banner
            tone={
              /cannot|need|not saved|did not|could not|failed|expired/i.test(banner)
                ? 'error'
                : 'lime'
            }
            onDismiss={() => setBanner(null)}
          >
            {banner}
          </Banner>
        </div>
      )}

      {/* Tabs --------------------------------------------------------- */}
      <div className="flex gap-2 mb-10">
        {(['edit', 'activity'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className="choice-pill cursor-pointer"
          >
            {t === 'edit' ? 'Edit proposal' : 'Activity'}
          </button>
        ))}
      </div>

      {tab === 'activity' ? (
        <ActivityPanel proposalId={record.id} status={record.status} />
      ) : (
        /*
          Three columns on a wide screen: a section rail so the form is
          navigable without scrolling through it, the fields themselves, and a
          live summary that was previously dead space. Collapses to the fields
          alone below `lg`.
        */
        <div className="grid gap-6 lg:grid-cols-[172px_minmax(0,1fr)] xl:grid-cols-[172px_minmax(0,1fr)_296px] items-start">
          <SectionNav />

          <div className="space-y-5 min-w-0">
          <Group reasons={reasonsFor('prospect')} id="prospect" title="Prospect" eyebrow="Step 1 · Who this is for">
            <TextField
              label="Company name"
              value={draft.companyName ?? null}
              onChange={(v) => set('companyName', v)}
              error={problemFor('companyName')}
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Contact name"
                value={draft.contactName ?? null}
                onChange={(v) => set('contactName', v)}
              />
              <TextField
                label="Email"
                type="email"
                value={draft.email ?? null}
                onChange={(v) => set('email', v)}
              />
              <TextField
                label="Phone"
                value={draft.phone ?? null}
                onChange={(v) => set('phone', v)}
              />
              <TextField
                label="Website"
                value={draft.websiteUrl ?? null}
                onChange={(v) => set('websiteUrl', v)}
                placeholder="example.com"
              />
              <TextField label="City" value={draft.city ?? null} onChange={(v) => set('city', v)} />
              <TextField
                label="State"
                value={draft.state ?? null}
                onChange={(v) => set('state', v)}
              />
              <NumberField
                label="Service radius"
                value={draft.serviceRadius ?? null}
                onChange={(v) => set('serviceRadius', v)}
                suffix="miles"
              />
              <NumberField
                label="Fleet size"
                value={draft.fleetSize ?? null}
                onChange={(v) => set('fleetSize', v)}
                suffix="vehicles"
              />
            </div>
            <TextField
              label="Operation type"
              value={draft.industry ?? null}
              onChange={(v) => set('industry', v)}
              placeholder="Heavy haul, towing, flatbed…"
            />
            <ListField
              label="Equipment / truck types"
              values={draft.truckTypes ?? null}
              onChange={(v) => set('truckTypes', v)}
              placeholder="Flatbed"
              hint="Press Enter to add each one."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageField
                label="Logo"
                value={draft.logoImageUrl ?? null}
                onChange={(v) => set('logoImageUrl', v)}
                upload={api.upload}
              />
              <ImageField
                label="Hero image"
                value={draft.heroImageUrl ?? null}
                onChange={(v) => set('heroImageUrl', v)}
                upload={api.upload}
                hint="A photo of their trucks works well."
              />
            </div>
          </Group>

          <Group reasons={reasonsFor('opportunity')} id="opportunity" title="Opportunity" eyebrow="Step 2 · The number they'll see">
            <SubHeading>Where they are today</SubHeading>
            <NumberField
              label="Current calls per month"
              value={draft.currentCalls ?? null}
              onChange={(v) => set('currentCalls', v)}
              suffix="calls / mo"
              error={problemFor('currentCalls')}
            />
            <RepeaterField
              label="Where those calls come from"
              hint="Use either a percentage or an absolute number per source — whichever they actually know."
              items={draft.callSources ?? null}
              blank={(): CallSource => ({ source: '' })}
              onChange={(v) => set('callSources', v)}
              addLabel="Add a source"
              render={(item, update) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField
                    label="Source"
                    value={item.source}
                    onChange={(v) => update({ source: v })}
                    placeholder="Google Maps"
                  />
                  <NumberField
                    label="Share"
                    value={item.share ?? null}
                    onChange={(v) => update({ share: v ?? undefined })}
                    suffix="%"
                  />
                  <NumberField
                    label="Calls"
                    value={item.calls ?? null}
                    onChange={(v) => update({ calls: v ?? undefined })}
                    suffix="/ mo"
                  />
                </div>
              )}
            />
            <TextArea
              label="Notes on their current setup"
              value={draft.currentNotes ?? null}
              onChange={(v) => set('currentNotes', v)}
              hint="Shown to the prospect. Keep it factual."
            />
            <SubHeading>What's possible</SubHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Projected calls per month"
                value={draft.projectedCalls ?? null}
                onChange={(v) => set('projectedCalls', v)}
                suffix="calls / mo"
                error={problemFor('projectedCalls')}
              />
              <NumberField
                label="Timeframe"
                value={draft.timeframeMonths ?? null}
                onChange={(v) => set('timeframeMonths', v)}
                suffix="months"
              />
            </div>

            {lift && (
              <div className="rounded-2xl border-2 border-ink bg-lime shadow-hard px-5 py-4 flex items-baseline gap-3 flex-wrap">
                <span className="font-display font-extrabold text-2xl text-ink tracking-tight">
                  +{lift.extra} calls a month
                </span>
                <span className="font-mono text-sm font-bold text-ink/70">(+{lift.percent}%)</span>
              </div>
            )}

            <TextArea
              label="How you got this number"
              value={draft.projectionBasis ?? null}
              onChange={(v) => set('projectionBasis', v)}
              error={problemFor('projectionBasis')}
              rows={3}
              placeholder="Based on 14 towing operators in comparable metros over six months."
              hint="Required to publish whenever a projected number is set, and shown to the prospect directly beneath it. A growth figure with no stated basis is a fabricated statistic."
            />

            <MoneyField
              label="Average job value"
              cents={draft.avgJobValue ?? null}
              onChange={(v) => set('avgJobValue', v)}
              hint="Optional. Turns the extra calls into a revenue figure on the page."
            />
          </Group>

          <Group reasons={reasonsFor('plan')} id="plan" title="Plan" eyebrow="Step 3 · What you'll do">
            <RepeaterField
              label="Phases"
              hint="Rendered as a numbered timeline. Order matters."
              items={draft.phases ?? null}
              blank={(): ProposalPhase => ({ title: '', items: [] })}
              onChange={(v) => set('phases', v)}
              addLabel="Add a phase"
              render={(item, update) => (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="Title"
                      value={item.title}
                      onChange={(v) => update({ title: v })}
                      placeholder="Google Business Profile rebuild"
                    />
                    <TextField
                      label="Timeline"
                      value={item.timeline ?? null}
                      onChange={(v) => update({ timeline: v })}
                      placeholder="Weeks 1–2"
                    />
                  </div>
                  <ListField
                    label="What happens in this phase"
                    values={item.items ?? []}
                    onChange={(v) => update({ items: v })}
                    placeholder="Rewrite every service category"
                  />
                </div>
              )}
            />
            <ListField
              label="Deliverables"
              values={draft.deliverables ?? null}
              onChange={(v) => set('deliverables', v)}
              placeholder="Monthly call-tracking report"
              hint="Shown as a 'what you get' grid."
            />
          </Group>

          <Group reasons={reasonsFor('offer')} id="offer" title="Offer" eyebrow="Step 4 · Price and next step">
            <SubHeading>What it takes</SubHeading>
            <p className="text-[13px] text-stone -mt-2">
              Leave the monthly price empty and the prospect never sees a price section.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <MoneyField
                label="Monthly"
                cents={draft.monthlyPrice ?? null}
                onChange={(v) => set('monthlyPrice', v)}
              />
              <MoneyField
                label="Setup fee"
                cents={draft.setupFee ?? null}
                onChange={(v) => set('setupFee', v)}
              />
              <NumberField
                label="Term"
                value={draft.termMonths ?? null}
                onChange={(v) => set('termMonths', v)}
                suffix="months"
                hint="0 means month to month."
              />
            </div>
            <SubHeading>Call to action</SubHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Button label"
                value={draft.ctaLabel ?? null}
                onChange={(v) => set('ctaLabel', v)}
                placeholder="Book a strategy call"
              />
              <TextField
                label="Button link"
                value={draft.ctaUrl ?? null}
                onChange={(v) => set('ctaUrl', v)}
                placeholder="https://calendly.com/…"
              />
            </div>
            <Collapsible
              label="Extra sections"
              summary={
                (draft.customSections?.length ?? 0) > 0
                  ? `${draft.customSections!.length} added`
                  : 'None — optional free-text blocks'
              }
            >
            <RepeaterField
              label="Custom sections"
              items={draft.customSections ?? null}
              blank={(): CustomSection => ({ heading: '', body: '' })}
              onChange={(v) => set('customSections', v)}
              addLabel="Add a section"
              render={(item, update) => (
                <div className="space-y-4">
                  <TextField
                    label="Heading"
                    value={item.heading}
                    onChange={(v) => update({ heading: v })}
                  />
                  <TextArea
                    label="Body"
                    value={item.body}
                    onChange={(v) => update({ body: v })}
                  />
                </div>
              )}
            />
            </Collapsible>
          </Group>

          <Group reasons={reasonsFor('publish')} id="publish" title="Publish" eyebrow="Step 5 · The link">
            <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="URL slug"
              value={draft.slug ?? null}
              onChange={(v) => set('slug', v)}
              error={problemFor('slug')}
              hint={`Changing this breaks any link already sent. Currently ${publicUrl}`}
            />
            <TextField
              label="Expires on"
              type="date"
              value={draft.expiresAt ? String(draft.expiresAt).slice(0, 10) : null}
              onChange={(v) => set('expiresAt', v || null)}
              hint="Optional. After this date the page stops rendering."
            />
            </div>
            <Collapsible
              label="Internal notes"
              summary={
                draft.adminNotes?.trim()
                  ? draft.adminNotes.trim().slice(0, 60)
                  : 'None — private, never shown to the prospect'
              }
            >
              <TextArea
                label="Internal notes"
                value={draft.adminNotes ?? null}
                onChange={(v) => set('adminNotes', v)}
                hint="Private. Never sent to the prospect's page."
              />
            </Collapsible>

            <div className="flex flex-wrap gap-3 pt-6 border-t-1.5 border-ink/12">
              <Button
                tone="outline"
                size="sm"
                onClick={() => void act(() => api.duplicate(record.id), 'Duplicated as a new draft.')}
              >
                Duplicate
              </Button>
              <Button
                tone="outline"
                size="sm"
                onClick={() => void openTemplateDialog()}
              >
                Save as template
              </Button>
              <Button
                tone="outline"
                size="sm"
                onClick={() => {
                  setApplyId('blank');
                  setApplyOverwrite(false);
                  setApplyError(null);
                  setApplyOpen(true);
                }}
              >
                Fill from a template
              </Button>
              <Button tone="danger" size="sm" onClick={() => setConfirmArchive(true)}>
                Archive
              </Button>
            </div>
          </Group>
          </div>

          <SummaryRail
            record={record}
            draft={draft}
            lift={lift}
            publicUrl={publicUrl}
            onCopy={() => {
              void navigator.clipboard?.writeText(publicUrl);
              setBanner('Link copied to your clipboard.');
            }}
            onOpenPreview={() => setShowPreview(true)}
            checks={checks}
          />
        </div>
      )}

      <Modal
        open={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        eyebrow="New template"
        title="Save this as a template"
        footer={
          <>
            <Button tone="ghost" size="md" onClick={() => setSaveTemplateOpen(false)}>
              Cancel
            </Button>
            <Button
              tone="lime"
              size="md"
              disabled={savingTemplate || !templateName.trim() || include.length === 0}
              onClick={async () => {
                if (timer.current) window.clearTimeout(timer.current);
                await flush();
                setSavingTemplate(true);
                setTemplateError(null);
                try {
                  await api.saveTemplate({
                    name: templateName.trim(),
                    description: templateDescription.trim() || undefined,
                    fromProposalId: record.id,
                    include,
                  });
                  setSaveTemplateOpen(false);
                  setBanner('Saved. It will appear when you create your next proposal.');
                } catch (err) {
                  // Stays in the dialog, where the person who caused it is looking.
                  setTemplateError(
                    err instanceof ApiError ? err.message : 'Could not save that template.',
                  );
                } finally {
                  setSavingTemplate(false);
                }
              }}
            >
              {savingTemplate ? 'Saving…' : 'Save template'}
            </Button>
          </>
        }
      >
        <label className="block">
          <span className="form-label">Template name</span>
          <input
            className="field"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Flatbed & heavy haul"
          />
        </label>

        <label className="block mt-4">
          <span className="form-label">Description (optional)</span>
          <input
            className="field"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Three-phase plan, $2k/mo, no contract"
          />
          <span className="block text-[12px] text-stone leading-snug mt-1.5">
            Shown under the name in the picker, so you can tell two similar templates apart.
          </span>
        </label>

        {templateError && (
          <div className="mt-4">
            <Banner tone="error">{templateError}</Banner>
          </div>
        )}

        <fieldset className="mt-5">
          <legend className="form-label">What to include</legend>
          {groupSummary ? (
            <div className="grid gap-1.5">
              {groupSpecs.map(({ id: key, label, prospectSpecific }) => {
                const summary = groupSummary[key];
                const has = Boolean(summary);
                const on = include.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 border-1.5 rounded-xl px-3.5 py-2.5 transition-colors ${
                      !has
                        ? 'border-ink/10 bg-cream/50 cursor-not-allowed'
                        : on
                          ? 'border-ink bg-lime/25 cursor-pointer'
                          : 'border-ink/20 bg-paper hover:border-ink/50 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-ink"
                      disabled={!has}
                      checked={on}
                      onChange={() =>
                        setInclude((list) =>
                          list.includes(key) ? list.filter((k) => k !== key) : [...list, key],
                        )
                      }
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[14px] font-semibold leading-snug ${
                            has ? 'text-ink' : 'text-stone/60'
                          }`}
                        >
                          {label}
                        </span>
                        {has && prospectSpecific && (
                          <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border-1.5 border-ink/30 text-stone">
                            About this company
                          </span>
                        )}
                      </span>
                      <span className="block text-[12px] text-stone leading-snug mt-0.5">
                        {summary ?? 'Nothing set on this proposal'}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-1.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonBar key={i} h="h-12" className="!rounded-xl" />
              ))}
            </div>
          )}

          <p className="text-[12px] text-stone leading-snug mt-3">
            Anything ticked is carried into the next proposal. Groups marked{' '}
            <strong className="text-ink">About this company</strong> describe {record.companyName}{' '}
            specifically — check those before you publish a proposal built from this template.
          </p>
        </fieldset>
      </Modal>

      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        eyebrow="Fill from a template"
        title={`Fill in ${record.companyName} from a template`}
        footer={
          <>
            <Button tone="ghost" size="md" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button
              tone="lime"
              size="md"
              disabled={applying || applyId === 'blank'}
              onClick={() => void applyTemplate()}
            >
              {applying ? 'Filling in…' : 'Fill it in'}
            </Button>
          </>
        }
      >
        {applyError && (
          <div className="mb-4">
            <Banner tone="error">{applyError}</Banner>
          </div>
        )}

        <fieldset>
          <legend className="form-label">Template</legend>
          <TemplateOptionList
            options={templateOptions.filter((t) => t.id !== 'blank')}
            value={applyId}
            onChange={setApplyId}
            loading={templateListLoading}
            error={templateListError}
            name="apply-template"
          />
          <TemplateNote selected={templateOptions.find((t) => t.id === applyId)} />
        </fieldset>

        <label
          className={`flex items-start gap-3 border-1.5 rounded-xl px-3.5 py-3 mt-4 cursor-pointer transition-colors ${
            applyOverwrite ? 'border-ink bg-lime/25' : 'border-ink/20 bg-paper hover:border-ink/50'
          }`}
        >
          <input
            type="checkbox"
            className="mt-0.5 accent-ink"
            checked={applyOverwrite}
            onChange={() => setApplyOverwrite((v) => !v)}
          />
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-ink leading-snug">
              Replace what is already filled in
            </span>
            <span className="block text-[12px] text-stone leading-snug mt-0.5">
              Off, only empty fields are filled, so nothing you have typed is lost. On, the
              template wins everywhere it has a value.
            </span>
          </span>
        </label>

        <p className="text-[12px] text-stone leading-snug mt-3">
          The company name and the link are never changed. Everything filled in lands in the
          editor, where you can see and change it before publishing.
        </p>
      </Modal>

      <Modal
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        width="sm"
        eyebrow="Archive"
        title={`Archive ${record.companyName}?`}
        footer={
          <>
            <Button tone="ghost" size="md" onClick={() => setConfirmArchive(false)}>
              Cancel
            </Button>
            <Button
              tone="danger"
              size="md"
              onClick={async () => {
                await api.archive(record.id);
                onBack();
              }}
            >
              Archive it
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-stone leading-relaxed">
          The link stops working and it moves out of your active list. Nothing is deleted — the
          view history is kept, and you can republish it later.
        </p>
      </Modal>

      {showPreview && previewProposal && (
        <div className="fixed inset-0 z-50 bg-ink/60 overflow-auto">
          <div className="sticky top-0 z-10 bg-ink text-cream px-6 py-3.5 flex items-center justify-between gap-4 border-b-1.5 border-lime/30">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
              Preview · {record.status === 'PUBLISHED' ? 'live version shown below' : 'not yet visible to the prospect'}
            </span>
            <button
              onClick={() => setShowPreview(false)}
              className="font-mono text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full border-1.5 border-cream/30 hover:bg-lime hover:text-ink hover:border-lime transition-colors focus-ring shrink-0"
            >
              Close
            </button>
          </div>
          <Suspense fallback={<div className="bg-cream min-h-screen" />}>
            <ProposalPage proposal={previewProposal} preview />
          </Suspense>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

export interface PublishCheck {
  ok: boolean;
  label: string;
  /** Advisory rather than blocking — the server will still publish without it. */
  soft?: boolean;
  /** Which step to jump to when this fails. */
  section: string;
  /** The field to mark, so the card is not just red but points at the cause. */
  field: string;
  /** What to actually do about it, in a sentence. */
  detail: string;
}

/**
 * Mirrors validateForPublish on the server, plus two advisory checks.
 *
 * Duplicating the server's rules here is deliberate: the server stays the
 * authority and rejects a bad publish regardless, but seeing what is missing —
 * and being able to click straight to it — beats discovering it from an error
 * after pressing Publish.
 */
function publishChecks(draft: Partial<ProposalRecord>): PublishCheck[] {
  const current = draft.currentCalls;
  const projected = draft.projectedCalls;

  return [
    {
      ok: Boolean(draft.companyName?.trim()),
      label: 'Company name',
      section: 'prospect',
      field: 'companyName',
      detail: 'Enter the company this proposal is for.',
    },
    {
      ok: projected == null || Boolean(draft.projectionBasis?.trim()),
      label: 'Projection has a stated basis',
      section: 'opportunity',
      field: 'projectionBasis',
      detail:
        'You have set a potential call number, so you need one line saying where it came from. It is shown to the prospect underneath the number.',
    },
    {
      ok: projected == null || current != null,
      label: 'Current calls set',
      section: 'opportunity',
      field: 'currentCalls',
      detail: 'Set the current monthly calls, so the increase has a baseline to grow from.',
    },
    {
      ok: projected == null || current == null || projected > current,
      label: 'Potential beats today',
      section: 'opportunity',
      field: 'projectedCalls',
      detail:
        current != null && projected != null
          ? `Potential calls (${projected}) must be higher than current calls (${current}) — otherwise there is no opportunity to show.`
          : 'Potential calls must be higher than current calls.',
    },
    {
      ok: Boolean(draft.ctaUrl),
      label: 'Call-to-action link',
      soft: true,
      section: 'offer',
      field: 'ctaUrl',
      detail: 'Optional. A booking link, if you have one.',
    },
    {
      ok: (draft.phases?.length ?? 0) > 0,
      label: 'At least one phase',
      soft: true,
      section: 'plan',
      field: 'phases',
      detail: 'Optional, but a proposal with no plan is a thin read.',
    },
  ];
}

/** Scrolls a step into view and gives it focus, for the checklist links. */
function jumpToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * The builder reads as five steps rather than eight panels of fields. The order
 * is the order a proposal is actually assembled after a call: who they are,
 * what the number is, what you'll do, what it costs, then ship it.
 */
const SECTIONS = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'opportunity', label: 'Opportunity' },
  { id: 'plan', label: 'Plan' },
  { id: 'offer', label: 'Offer' },
  { id: 'publish', label: 'Publish' },
];

/** Divider inside a step, for the two or three ideas a step contains. */
function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-stone pt-2 first:pt-0">
      {children}
    </h4>
  );
}

/**
 * Sticky section rail.
 *
 * The form is long by nature — it is the whole proposal — so the fix for "too
 * much scrolling" is to make scrolling unnecessary rather than to hide fields
 * behind steps a wizard would force you through in order.
 *
 * The active item is tracked with IntersectionObserver rather than scroll maths
 * so it stays correct when a section grows as repeatable rows are added.
 */
function SectionNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  /*
    Deliberately scroll position rather than IntersectionObserver.
    These sections differ enormously in height — Company is several screens,
    Investment is a few rows — so "which section is intersecting" picks the tall
    one long after you have scrolled past it. What is actually wanted is the
    last section whose top edge has passed under the header, which is a
    straightforward comparison.
  */
  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;

      // At the very bottom the short trailing sections can never push their top
      // edge above the line — there is no scroll left — so they would be
      // unreachable in the rail. Snap to the last one instead.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActive(SECTIONS[SECTIONS.length - 1].id);
        return;
      }

      const line = 140; // just below the sticky header
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav className="hidden lg:block sticky top-24" aria-label="Proposal sections">
      <ul className="space-y-0.5">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              onClick={() =>
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              aria-current={active === s.id ? 'true' : undefined}
              className={`cursor-pointer w-full text-left font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-colors focus-ring ${
                active === s.id
                  ? 'bg-ink text-lime'
                  : 'text-stone hover:text-ink hover:bg-ink/5'
              }`}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The right rail: what the numbers currently say, and what still blocks
 * publishing.
 *
 * The checklist mirrors validateForPublish on the server exactly. Duplicating
 * it here is deliberate — the server stays the authority and rejects a bad
 * publish regardless, but finding out what is missing before clicking Publish
 * is worth more than a single source of truth for four conditions.
 */
function SummaryRail({
  record,
  draft,
  lift,
  publicUrl,
  onCopy,
  onOpenPreview,
  checks,
}: {
  record: ProposalRecord;
  draft: Partial<ProposalRecord>;
  lift: { extra: number; percent: number } | null;
  publicUrl: string;
  onCopy: () => void;
  onOpenPreview: () => void;
  checks: PublishCheck[];
}) {
  const blocking = checks.filter((c) => !c.ok && !c.soft).length;
  const revenue =
    lift && draft.avgJobValue != null ? (lift.extra * draft.avgJobValue) / 100 : null;

  return (
    <aside className="hidden xl:block sticky top-24 space-y-4">
      {/*
        The headline number as the prospect will see it — dark panel, lime
        figure, same treatment as the published page. The point of the rail is
        to answer "what will they actually see?" without leaving the form.
      */}
      <Card tone="forest" className="p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-lime flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-lime" />
          Live prospect preview
        </p>

        {lift ? (
          <>
            <p className="font-display font-extrabold text-lime text-5xl tracking-tight leading-none mt-4">
              +{lift.extra}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-cream/60 mt-1.5">
              calls / month · +{lift.percent}%
            </p>
            {revenue != null && (
              <p className="text-[13px] text-cream/70 mt-3 leading-snug">
                ≈{' '}
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(revenue)}{' '}
                / month in potential booked work
              </p>
            )}
          </>
        ) : (
          <p className="text-[13px] text-cream/65 mt-3 leading-snug">
            Add current and potential calls, plus where the number comes from, and the headline the
            prospect reads will appear here.
          </p>
        )}

        <button
          onClick={onOpenPreview}
          className="mt-5 w-full font-mono text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-full border-1.5 border-lime text-lime hover:bg-lime hover:text-ink transition-colors focus-ring"
        >
          Open full preview
        </button>
      </Card>

      <Card className="p-5">
        <Eyebrow>{blocking === 0 ? 'Ready to publish' : 'Before publishing'}</Eyebrow>
        <ul className="mt-4 space-y-1.5">
          {checks.map((c) => {
            const Row = (
              <>
                <span
                  aria-hidden="true"
                  className={`w-6 h-6 rounded-full border-1.5 flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    c.ok
                      ? 'bg-lime border-ink text-ink'
                      : c.soft
                        ? 'bg-cream border-ink/30 text-stone'
                        : 'bg-red-700 border-red-700 text-paper'
                  }`}
                >
                  {c.ok ? '✓' : c.soft ? '·' : '!'}
                </span>
                <span
                  className={`text-[14px] leading-snug ${
                    c.ok ? 'text-stone' : c.soft ? 'text-stone' : 'text-red-700 font-bold'
                  }`}
                >
                  {c.label}
                </span>
              </>
            );

            // A failing check is a link to the field that fixes it. Passing and
            // advisory ones stay inert — nothing to go and do.
            return (
              <li key={c.label}>
                {c.ok || c.soft ? (
                  <span className="flex items-center gap-2.5 px-2 py-2">{Row}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => jumpToSection(c.section)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left cursor-pointer bg-red-50 hover:bg-red-100 transition-colors focus-ring"
                  >
                    {Row}
                    <span aria-hidden="true" className="ml-auto text-red-700 text-xs shrink-0">
                      &rarr;
                    </span>
                    <span className="sr-only">— go to this field</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card tone="cream" className="p-5">
        <Eyebrow>The link</Eyebrow>
        <p className="font-mono text-[11px] text-stone mt-3 break-all leading-relaxed">
          {publicUrl}
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button tone="outline" size="sm" onClick={onCopy}>
            Copy
          </Button>
          {record.status === 'PUBLISHED' && (
            <ButtonLink href={`/${record.slug}`} external tone="ghost" size="sm">
              Open ↗
            </ButtonLink>
          )}
        </div>
      </Card>
    </aside>
  );
}

function Group({
  id,
  title,
  eyebrow,
  reasons = [],
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  /** Why this step blocks publishing. Empty means it does not. */
  reasons?: string[];
  children: React.ReactNode;
}) {
  const invalid = reasons.length > 0;
  return (
    <Card
      id={id}
      className={`p-5 md:p-6 scroll-mt-24 ${invalid ? '!border-red-700' : ''}`}
    >
      <div className="mb-5 pb-4 border-b-1.5 border-ink/12">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <div className="flex items-center gap-2.5 flex-wrap mt-2">
          <Heading level={3} className="!text-xl">
            {title}
          </Heading>
          {invalid && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border-1.5 border-red-700 bg-red-50 text-red-700">
              <span aria-hidden="true">!</span> Needs attention
            </span>
          )}
        </div>

        {/* The reasons, at the top of the card. A red outline alone told you
            something here was wrong without telling you what. */}
        {invalid && (
          <ul className="mt-4 space-y-1.5">
            {reasons.map((r) => (
              <li key={r} className="flex gap-2 text-[13px] text-red-700 leading-snug">
                <span aria-hidden="true" className="font-bold shrink-0">
                  !
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text =
    state === 'saving'
      ? 'Saving…'
      : state === 'saved'
        ? 'Saved'
        : state === 'error'
          ? 'Not saved'
          : '';
  if (!text) return null;
  return (
    <span
      className={`font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
        state === 'error' ? 'text-red-700' : 'text-stone'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          state === 'saving'
            ? 'bg-stone animate-pulse'
            : state === 'error'
              ? 'bg-red-700'
              : 'bg-lime border border-ink'
        }`}
      />
      {text}
    </span>
  );
}

function liftOf(d: Partial<ProposalRecord>) {
  if (d.currentCalls == null || d.projectedCalls == null) return null;
  if (d.currentCalls <= 0 || d.projectedCalls <= d.currentCalls) return null;
  const extra = d.projectedCalls - d.currentCalls;
  return { extra, percent: Math.round((extra / d.currentCalls) * 100) };
}

/**
 * Maps the editing record onto the public payload shape.
 *
 * Deliberately mirrors server/proposals/public.ts rather than reusing it — that
 * module takes a Prisma row with Date objects, and importing it here would drag
 * @prisma/client into the browser bundle.
 */
function toPreview(r: ProposalRecord): PublicProposal {
  return {
    slug: r.slug,
    companyName: r.companyName,
    contactName: r.contactName,
    email: r.email,
    phone: r.phone,
    websiteUrl: r.websiteUrl,
    city: r.city,
    state: r.state,
    serviceRadius: r.serviceRadius,
    industry: r.industry,
    fleetSize: r.fleetSize,
    truckTypes: r.truckTypes,
    heroImageUrl: r.heroImageUrl,
    logoImageUrl: r.logoImageUrl,
    currentCalls: r.currentCalls,
    callSources: r.callSources,
    currentNotes: r.currentNotes,
    projectedCalls: r.projectedCalls,
    avgJobValue: r.avgJobValue,
    timeframeMonths: r.timeframeMonths,
    projectionBasis: r.projectionBasis,
    phases: r.phases,
    deliverables: r.deliverables,
    monthlyPrice: r.monthlyPrice,
    setupFee: r.setupFee,
    termMonths: r.termMonths,
    ctaLabel: r.ctaLabel,
    ctaUrl: r.ctaUrl,
    customSections: r.customSections,
    publishedAt: r.publishedAt,
    preparedOn: r.publishedAt ?? r.createdAt,
  };
}
