/**
 * Shared visual primitives for the proposal portal.
 *
 * These exist so the admin app and the prospect page read as the same product
 * as the marketing site, rather than as a bolted-on tool. Everything here is a
 * direct lift of the patterns already used in src/App.tsx:
 *
 *   - cards are `border-2 border-ink rounded-2xl shadow-hard`, and lift on hover
 *   - buttons are mono, uppercase, bold and `rounded-full`
 *   - section eyebrows are mono uppercase with a lime dot
 *   - headings are `font-display font-extrabold tracking-tight`
 *   - the accent word sits in an ink chip, italic serif, slightly rotated
 *
 * The rounding matters more than it sounds: the site has no square corners
 * anywhere, so square panels are the single thing that makes a screen look like
 * it belongs to a different application.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Logo from '../components/Logo';

/* -------------------------------------------------------------------------
   Type
------------------------------------------------------------------------- */

/** Mono, uppercase, lime dot. The site's standard section label. */
export function Eyebrow({
  children,
  tone = 'dark',
  pulse = false,
}: {
  children: ReactNode;
  tone?: 'dark' | 'light';
  pulse?: boolean;
}) {
  return (
    <span
      className={`font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 ${
        tone === 'light' ? 'text-cream/60' : 'text-stone'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full bg-lime border border-ink ${pulse ? 'animate-pulse' : ''}`}
      />
      {children}
    </span>
  );
}

/**
 * The signature accent: an italic serif word in a lime-on-ink chip, tilted.
 * Used once per heading at most — it stops reading as an accent if repeated.
 */
export function Accent({
  children,
  rotate = '-rotate-1',
}: {
  children: ReactNode;
  rotate?: string;
}) {
  return (
    <span
      className={`font-serif-accent italic text-lime bg-ink px-2.5 py-0.5 rounded-sm shadow-hard inline-block ${rotate}`}
    >
      {children}
    </span>
  );
}

export function Heading({
  children,
  level = 2,
  className = '',
}: {
  children: ReactNode;
  level?: 1 | 2 | 3;
  className?: string;
}) {
  const sizes = {
    1: 'text-4xl md:text-5xl lg:text-6xl leading-[1.05]',
    2: 'text-3xl lg:text-4xl',
    3: 'text-xl lg:text-2xl',
  } as const;
  const Tag = (['h1', 'h2', 'h3'] as const)[level - 1];
  return (
    <Tag className={`font-display font-extrabold text-ink tracking-tight ${sizes[level]} ${className}`}>
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------------
   Surfaces
------------------------------------------------------------------------- */

export function Card({
  children,
  className = '',
  tone = 'paper',
  hover = false,
  onClick,
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: 'paper' | 'cream' | 'ink' | 'forest';
  hover?: boolean;
  onClick?: () => void;
  /** Anchor target, used by the editor's section navigation. */
  id?: string;
}) {
  const tones = {
    paper: 'bg-paper border-ink',
    cream: 'bg-cream border-ink',
    ink: 'bg-ink border-ink text-cream',
    forest: 'bg-forest border-ink text-cream',
  } as const;

  return (
    <div
      id={id}
      onClick={onClick}
      className={`border-2 rounded-2xl shadow-hard ${tones[tone]} ${
        hover
          ? 'hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Buttons
------------------------------------------------------------------------- */

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 font-mono font-bold uppercase rounded-full ' +
  'border-1.5 border-ink transition-all cursor-pointer focus-ring ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0';

const BTN_SIZES = {
  sm: 'text-[10px] px-3.5 py-2 tracking-wider',
  md: 'text-xs px-5 py-3 tracking-wider',
  lg: 'text-xs px-8 py-4 tracking-widest',
} as const;

const BTN_TONES = {
  /** Highest-emphasis action: publish, send, book. */
  lime: 'bg-lime text-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0',
  /** Standard primary. */
  ink: 'bg-ink text-cream shadow-hard hover:bg-lime hover:text-ink hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5',
  /** Secondary — quiet until hovered. */
  outline: 'bg-paper text-ink hover:bg-ink hover:text-cream',
  /** Tertiary, on a cream background. */
  ghost: 'bg-transparent border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-cream',
  /** Destructive. */
  danger: 'bg-paper border-red-700 text-red-700 hover:bg-red-700 hover:text-paper',
} as const;

export function Button({
  children,
  onClick,
  type = 'button',
  tone = 'ink',
  size = 'md',
  disabled,
  className = '',
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  tone?: keyof typeof BTN_TONES;
  size?: keyof typeof BTN_SIZES;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${BTN_BASE} ${BTN_SIZES[size]} ${BTN_TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Anchor styled as a Button, for real links (CTA, tel:, mailto:). */
export function ButtonLink({
  children,
  href,
  tone = 'ink',
  size = 'md',
  external,
  onClick,
  className = '',
}: {
  children: ReactNode;
  href: string;
  tone?: keyof typeof BTN_TONES;
  size?: keyof typeof BTN_SIZES;
  external?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`${BTN_BASE} ${BTN_SIZES[size]} ${BTN_TONES[tone]} ${className}`}
    >
      {children}
    </a>
  );
}

/* -------------------------------------------------------------------------
   Small pieces
------------------------------------------------------------------------- */

export function Pill({
  children,
  tone = 'cream',
}: {
  children: ReactNode;
  tone?: 'cream' | 'lime' | 'ink' | 'paper';
}) {
  const tones = {
    cream: 'bg-cream text-stone border-ink/30',
    lime: 'bg-lime text-ink border-ink',
    ink: 'bg-ink text-lime border-ink',
    paper: 'bg-paper text-ink border-ink',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border-1.5 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** The numbered chip used beside form steps and plan phases. */
export function StepChip({ n }: { n: number }) {
  return <span className="step-chip">{String(n).padStart(2, '0')}</span>;
}

export function Banner({
  children,
  tone = 'lime',
  onDismiss,
}: {
  children: ReactNode;
  tone?: 'lime' | 'error' | 'cream';
  onDismiss?: () => void;
}) {
  const tones = {
    lime: 'bg-lime border-ink text-ink',
    error: 'bg-paper border-red-700 text-red-700',
    cream: 'bg-cream border-ink text-stone',
  } as const;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`border-1.5 rounded-xl px-4 py-3 text-sm font-medium flex items-start justify-between gap-4 ${tones[tone]}`}
    >
      <span>{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="cursor-pointer focus-ring shrink-0 leading-none">
          &times;
        </button>
      )}
    </div>
  );
}

/** Full-width dark band, as used between sections on the marketing site. */
export function InkBand({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`w-full bg-ink text-cream ${className}`}>{children}</div>;
}

/* -------------------------------------------------------------------------
   Loading skeletons
------------------------------------------------------------------------- */

/**
 * A single grey bar standing in for text that has not arrived.
 *
 * Skeletons are shaped like the content they replace, so the layout does not
 * jump when the data lands — that shift is the thing a spinner does not fix.
 * `aria-hidden` throughout: the loading state is announced once by the
 * container's `aria-busy`, not by a dozen meaningless bars.
 */
export function SkeletonBar({
  w = 'w-full',
  h = 'h-4',
  className = '',
}: {
  w?: string;
  h?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-md bg-ink/10 animate-pulse ${w} ${h} ${className}`}
    />
  );
}

/**
 * Full-screen branded loader for waits with no measurable progress — chiefly
 * the session check, which is one round trip to the database.
 *
 * A pulsing line of text gave no sense that anything was happening; this is a
 * sweeping lime bar in a bordered track, which reads as motion at a glance and
 * uses the same shapes as everything else in the portal. The bar is
 * indeterminate on purpose: the wait is a network call of unknown length, and a
 * fake percentage that stalls near the end is worse than honest movement.
 *
 * Reduced motion is respected in CSS — the bar holds a static fill instead of
 * disappearing, so the state is still legible.
 */
export function PortalLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="min-h-screen bg-cream flex items-center justify-center px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-[280px] text-center">
        <div className="flex justify-center mb-7">
          <Logo size={30} variant="light" />
        </div>

        {/* Track + sweeping fill. overflow-hidden keeps the fill inside the
            rounded track as it travels. */}
        <div className="h-2.5 w-full rounded-full border-1.5 border-ink bg-paper overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-lime animate-portal-sweep" />
        </div>

        <p className="mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-stone flex items-center justify-center gap-1">
          {label}
          <span aria-hidden="true" className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="animate-portal-blink"
                style={{ animationDelay: `${i * 0.16}s` }}
              >
                .
              </span>
            ))}
          </span>
        </p>
      </div>
    </div>
  );
}

/** A card-shaped placeholder, matching the real cards' border and radius. */
export function SkeletonCard({ className = '', lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div
      aria-hidden="true"
      className={`border-2 border-ink/15 rounded-2xl bg-paper p-5 md:p-6 space-y-3 ${className}`}
    >
      <SkeletonBar w="w-1/3" h="h-5" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar key={i} w={i === lines - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  );
}

/**
 * A disclosure for genuinely optional content.
 *
 * Fields like internal notes and expiry are used on a minority of proposals but
 * take the same vertical space as the ones used on every single one. Folding
 * them away keeps the builder about the proposal.
 *
 * `summary` shows what is inside while it is closed, so nothing that has been
 * filled in can hide silently behind a collapsed heading.
 */
export function Collapsible({
  label,
  summary,
  defaultOpen = false,
  children,
}: {
  label: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-1.5 border-ink/20 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="cursor-pointer w-full flex items-center justify-between gap-3 px-4 py-3 bg-cream hover:bg-ink/5 transition-colors focus-ring text-left"
      >
        <span className="min-w-0">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
            {label}
          </span>
          {!open && summary && (
            <span className="block text-[12px] text-stone truncate mt-0.5">{summary}</span>
          )}
        </span>
        <span
          aria-hidden="true"
          className="font-mono text-xs text-stone shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}
        >
          ▾
        </span>
      </button>
      {open && <div className="p-4 space-y-5 bg-paper">{children}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Modal
------------------------------------------------------------------------- */

/**
 * An in-app dialog, replacing window.prompt / window.confirm.
 *
 * The native dialogs are unstyled Chrome chrome, cannot be branded, block the
 * whole renderer, and on some platforms are suppressed entirely — so a flow
 * built on them can silently become a dead button.
 *
 * Handles the three things a hand-rolled modal usually gets wrong: Escape
 * closes it, focus moves into it on open and returns to the trigger on close,
 * and the page behind it cannot scroll.
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md';
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  /*
    onClose is almost always an inline arrow, so it has a new identity on every
    render. Depending on it directly re-ran this effect on each keystroke, and
    the cleanup's `restoreTo.current.focus()` handed focus straight back to the
    button that opened the dialog — so the field could never be typed into.
    Holding it in a ref keeps the effect keyed on `open` alone.
  */
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);

    // Stop the list behind the dialog scrolling under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first field so typing works immediately, the way a prompt does.
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'input, textarea, select, button',
    );
    focusable?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        // Only a click that both starts and ends on the backdrop dismisses —
        // otherwise a text selection dragged out of an input closes the dialog.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${width === 'sm' ? 'max-w-sm' : 'max-w-lg'} bg-paper border-2 border-ink rounded-2xl shadow-hard-lg max-h-[90vh] overflow-y-auto`}
      >
        <div className="p-6 md:p-7">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 className="font-display font-extrabold text-2xl text-ink tracking-tight mt-2 mb-5">
            {title}
          </h2>
          {children}
        </div>
        {footer && (
          <div className="px-6 md:px-7 py-4 border-t-1.5 border-ink/12 bg-cream rounded-b-2xl flex flex-wrap justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
