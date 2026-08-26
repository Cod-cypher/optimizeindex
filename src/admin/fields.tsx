/**
 * Form primitives for the proposal editor.
 *
 * Built on the `.form-label` / `.field` / `.choice-pill` component classes that
 * already live in src/index.css and style the audit page, quote page and lead
 * modal. Reusing them is the point: the admin gets the same rounded fields and
 * lime focus ring as the public forms, and any future change to that system
 * reaches this screen for free.
 */

import { useState } from 'react';

export function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="form-label-compact">
        {label}
        {optional && <span className="opt">optional</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-[12px] text-stone mt-1.5 leading-snug">{hint}</span>}
      {error && (
        <span
          role="alert"
          className="flex items-start gap-1.5 text-[12px] text-red-700 mt-1.5 font-semibold leading-snug"
        >
          <span aria-hidden="true">▲</span>
          {error}
        </span>
      )}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  optional,
  mono,
  type = 'text',
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  optional?: boolean;
  mono?: boolean;
  type?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      <input
        type={type}
        className={`field field-compact ${mono ? 'field-mono' : ''}`}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  error,
  rows = 4,
  placeholder,
  optional,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  rows?: number;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      <textarea
        className="field field-compact"
        rows={rows}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/**
 * A field with a unit label fused to its right edge.
 *
 * The suffix is drawn as an overlay rather than a sibling box, so the input
 * keeps the shared `.field` border radius and focus ring intact — a separate
 * bordered box beside it would break the rounded pill shape.
 */
function Affixed({
  children,
  prefix,
  suffix,
}: {
  children: React.ReactNode;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <span className="field-wrap block relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-stone pointer-events-none">
          {prefix}
        </span>
      )}
      {children}
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-wider text-stone pointer-events-none">
          {suffix}
        </span>
      )}
    </span>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  error,
  suffix,
  optional,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
  error?: string;
  suffix?: string;
  optional?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      <Affixed suffix={suffix}>
        <input
          type="number"
          className="field field-compact field-mono"
          style={suffix ? { paddingRight: `${Math.max(3, suffix.length * 0.52 + 1.4)}rem` } : undefined}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      </Affixed>
    </Field>
  );
}

/**
 * Edits dollars over a value stored in cents.
 *
 * Prices are stored as integer cents so no amount is ever a float, but nobody
 * wants to type 149000 for $1,490.
 */
export function MoneyField({
  label,
  cents,
  onChange,
  hint,
  error,
  optional,
}: {
  label: string;
  cents: number | null;
  onChange: (cents: number | null) => void;
  hint?: string;
  error?: string;
  optional?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      <Affixed prefix="$">
        <input
          type="number"
          step="1"
          min="0"
          className="field field-compact field-mono"
          style={{ paddingLeft: '1.75rem' }}
          value={cents == null ? '' : String(Math.round(cents / 100))}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : Math.round(Number(e.target.value) * 100))
          }
        />
      </Affixed>
    </Field>
  );
}

/**
 * A list of short strings, entered one at a time.
 *
 * Entries render as removable `.choice-pill`s — the same control the audit page
 * uses for goal selection.
 */
export function ListField({
  label,
  values,
  onChange,
  hint,
  placeholder,
  optional,
}: {
  label: string;
  values: string[] | null;
  onChange: (v: string[]) => void;
  hint?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const list = values ?? [];

  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...list, v]);
    setDraft('');
  }

  return (
    <Field label={label} hint={hint} optional={optional}>
      <div className="flex gap-2">
        <input
          className="field field-compact"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="cursor-pointer shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider px-4 rounded-full border-1.5 border-ink bg-ink text-cream hover:bg-lime hover:text-ink transition-colors focus-ring"
        >
          Add
        </button>
      </div>

      {list.length > 0 && (
        <ul className="flex flex-wrap gap-2 mt-3">
          {list.map((v, i) => (
            <li key={`${v}-${i}`} className="choice-pill">
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(list.filter((_, j) => j !== i))}
                className="cursor-pointer ml-0.5 text-stone hover:text-red-700 transition-colors focus-ring leading-none"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

/**
 * A repeating group of objects — call sources, phases, custom sections.
 *
 * Order matters on the client page for phases, so reordering is buttons rather
 * than drag: they work on touch and with a keyboard.
 */
export function RepeaterField<T>({
  label,
  hint,
  items,
  blank,
  onChange,
  addLabel,
  render,
}: {
  label: string;
  hint?: string;
  items: T[] | null;
  blank: () => T;
  onChange: (items: T[]) => void;
  addLabel: string;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const list = items ?? [];

  const replace = (i: number, patch: Partial<T>) =>
    onChange(list.map((item, j) => (j === i ? { ...item, ...patch } : item)));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const iconBtn =
    'cursor-pointer w-7 h-7 rounded-full border-1.5 border-ink/30 bg-cream text-ink text-xs leading-none ' +
    'hover:border-ink hover:bg-ink hover:text-cream disabled:opacity-25 disabled:hover:bg-cream ' +
    'disabled:hover:text-ink disabled:hover:border-ink/30 transition-colors focus-ring';

  return (
    <fieldset>
      <legend className="form-label-compact">{label}</legend>
      {hint && <p className="text-[12px] text-stone mb-3 leading-snug">{hint}</p>}

      <div className="space-y-3">
        {list.map((item, i) => (
          <div
            key={i}
            className="border-1.5 border-ink/25 rounded-xl bg-paper p-4 hover:border-ink/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="step-chip">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  className={iconBtn}
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === list.length - 1}
                  onClick={() => move(i, i + 1)}
                  className={iconBtn}
                >
                  &darr;
                </button>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => onChange(list.filter((_, j) => j !== i))}
                  className="cursor-pointer w-7 h-7 rounded-full border-1.5 border-red-700/40 bg-cream text-red-700 text-xs leading-none hover:bg-red-700 hover:text-paper hover:border-red-700 transition-colors focus-ring"
                >
                  &times;
                </button>
              </div>
            </div>
            {render(item, (patch) => replace(i, patch))}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...list, blank()])}
        className="cursor-pointer mt-4 font-mono text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-full border-1.5 border-dashed border-ink/40 text-stone hover:border-ink hover:text-ink hover:border-solid transition-all focus-ring"
      >
        + {addLabel}
      </button>
    </fieldset>
  );
}

/**
 * Image upload with a live preview.
 *
 * Reads the file to a data URL for the preview and posts the same string to the
 * server, so there is no second read and no multipart handling on either side.
 */
export function ImageField({
  label,
  value,
  onChange,
  hint,
  upload,
  optional,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
  upload: (dataUrl: string, filename: string) => Promise<{ url: string }>;
  optional?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read that file.'));
        reader.readAsDataURL(file);
      });
      const { url } = await upload(dataUrl, file.name);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field label={label} hint={hint} error={error ?? undefined} optional={optional}>
      {busy ? (
        /* A real placeholder in the drop zone's shape, rather than swapping the
           label text and leaving the box looking idle while bytes upload. */
        <div
          aria-busy="true"
          className="flex items-center gap-3 border-1.5 border-ink/25 rounded-xl bg-paper p-2.5"
        >
          <span className="h-14 w-14 rounded-lg bg-ink/10 animate-pulse shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-stone mb-2">
              Uploading
            </span>
            <span className="block h-2 w-full rounded-full border-1.5 border-ink/30 bg-cream overflow-hidden">
              <span className="block h-full w-1/3 rounded-full bg-lime animate-portal-sweep" />
            </span>
          </span>
        </div>
      ) : value ? (
        <div className="flex items-center gap-3 border-1.5 border-ink/25 rounded-xl bg-paper p-2.5">
          <img
            src={value}
            alt=""
            className="h-14 w-14 object-contain rounded-lg border-1.5 border-ink/20 bg-cream p-1"
          />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-wider text-stone mb-2">Uploaded</p>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="cursor-pointer font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border-1.5 border-red-700/40 text-red-700 hover:bg-red-700 hover:text-paper transition-colors focus-ring"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={`flex flex-col items-center justify-center gap-2 border-1.5 border-dashed rounded-xl px-4 py-5 cursor-pointer transition-all ${
            dragging ? 'border-ink bg-lime/20' : 'border-ink/35 bg-paper hover:border-ink hover:bg-cream'
          }`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
            Drop an image or click
          </span>
          <span className="text-[12px] text-stone">JPEG, PNG or WebP · max 5 MB</span>
        </label>
      )}
    </Field>
  );
}
