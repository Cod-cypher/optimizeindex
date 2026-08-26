/**
 * The "start from" list, shared by the New proposal dialog and the editor's
 * Apply-a-template dialog.
 *
 * Both need the same three things: the built-in verticals and the admin's saved
 * rows in one list, an honest description of what the selected one will do, and
 * a way to delete a saved row. Keeping it in one place is what stops the two
 * copies drifting — the disclaimer under the list had already gone stale in the
 * dashboard while the code it described had changed underneath it.
 */

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type SavedTemplate } from './api';
import { Banner, SkeletonBar } from '../portal/ui';
import { PROPOSAL_TEMPLATES } from '../../shared/proposalTemplates';

/** Saved rows are addressed `saved:<id>` so they cannot collide with a built-in. */
export const SAVED_PREFIX = 'saved:';

export interface TemplateOption {
  id: string;
  label: string;
  description: string;
  isSample: boolean;
  /** The bare row id for a saved template, or null for a built-in. */
  savedId: string | null;
}

/**
 * Loads the admin's saved templates and merges them with the built-ins.
 *
 * `error` is surfaced rather than swallowed. Previously a failed fetch left the
 * saved templates simply absent from the list with nothing saying so, which is
 * indistinguishable from never having saved one.
 */
export function useTemplateOptions(open: boolean) {
  const [saved, setSaved] = useState<SavedTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSaved((await api.templates()).templates);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load your saved templates.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const options: TemplateOption[] = [
    ...PROPOSAL_TEMPLATES.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      isSample: Boolean(t.isSample),
      savedId: null,
    })),
    ...saved.map((t) => ({
      id: `${SAVED_PREFIX}${t.id}`,
      label: t.name,
      description: t.description || 'Your saved template.',
      isSample: false,
      savedId: t.id,
    })),
  ];

  const forget = useCallback((id: string) => {
    setSaved((list) => list.filter((t) => t.id !== id));
  }, []);

  return { options, saved, error, loading, reload, forget };
}

/**
 * What the selected template will actually do, in the admin's words.
 *
 * A saved template carries whatever was ticked when it was saved — which can
 * include the previous prospect's contact details and figures. The old copy here
 * promised the opposite ("they never fill in the customer's numbers"), which was
 * true of the first version of the feature and has not been true since.
 */
export function TemplateNote({ selected }: { selected: TemplateOption | undefined }) {
  if (selected?.isSample) {
    return (
      <p className="text-[12.5px] text-ink bg-lime/40 border-1.5 border-ink rounded-xl px-3 py-2.5 mt-2.5 leading-snug">
        <strong>This one is filled in with made-up numbers</strong> so you can see a finished
        page. Replace every figure, the notes and the booking link before you publish it — none
        of it is about this customer.
      </p>
    );
  }

  if (selected?.savedId) {
    return (
      <p className="text-[12.5px] text-ink bg-cream border-1.5 border-ink/30 rounded-xl px-3 py-2.5 mt-2.5 leading-snug">
        <strong>This fills in everything you ticked when you saved it.</strong> If that included
        the contact details, the call volumes or the projection, they are the previous
        customer&rsquo;s — check them before you publish.
      </p>
    );
  }

  return (
    <p className="text-[12.5px] text-stone mt-2.5 leading-snug">
      Built-in templates fill in the plan, the deliverables, the equipment wording and your
      pricing. They never fill in the customer&rsquo;s numbers — call volumes, percentages and
      the projection all come from your call with them.
    </p>
  );
}

/**
 * The radio list itself. `onDelete` is omitted where deleting makes no sense.
 */
export function TemplateOptionList({
  options,
  value,
  onChange,
  onDelete,
  loading,
  error,
  name = 'template',
}: {
  options: TemplateOption[];
  value: string;
  onChange: (id: string) => void;
  onDelete?: (option: TemplateOption) => void;
  loading?: boolean;
  error?: string | null;
  name?: string;
}) {
  return (
    <>
      {error && (
        <div className="mb-2.5">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      <div className="grid gap-2">
        {options.map((t) => (
          <label
            key={t.id}
            className={`flex gap-3 items-start border-1.5 rounded-xl px-3.5 py-3 cursor-pointer transition-colors ${
              value === t.id
                ? 'border-ink bg-lime/25'
                : 'border-ink/20 bg-paper hover:border-ink/50'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={t.id}
              checked={value === t.id}
              onChange={() => onChange(t.id)}
              className="mt-1 accent-ink"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[15px] text-ink leading-snug">{t.label}</span>
                {t.savedId && (
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border-1.5 border-ink/30 text-stone">
                    Yours
                  </span>
                )}
              </span>
              <span className="block text-[12.5px] text-stone leading-snug mt-0.5">
                {t.description}
              </span>
            </span>
            {t.savedId && onDelete && (
              <button
                type="button"
                aria-label={`Delete template ${t.label}`}
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(t);
                }}
                className="cursor-pointer shrink-0 w-6 h-6 rounded-full border-1.5 border-red-700/40 text-red-700 text-xs leading-none hover:bg-red-700 hover:text-paper transition-colors focus-ring"
              >
                &times;
              </button>
            )}
          </label>
        ))}

        {loading && <SkeletonBar h="h-16" className="!rounded-xl" />}
      </div>
    </>
  );
}
