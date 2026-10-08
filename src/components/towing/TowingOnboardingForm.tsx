/**
 * The towing business setup form, rendered on /towing-onboarding.
 *
 * Generated from ONBOARDING_SECTIONS in src/content/onboarding.ts, so a new
 * question is one entry there and nothing here. One long form rather than
 * TowingJobsLeadForm's steps: it is filled in once, with the answers to hand,
 * and the operator needs to see all of it to know what to gather.
 *
 * Posts to /api/onboarding/towing (server/onboarding/routes.ts), not to
 * submitLead(), so it fires no GA4 generate_lead and does not mark the
 * analytics funnel converted. The server stores every answer in its own
 * column of the TowingOnboarding table and emails the team a formatted copy,
 * and it re-validates everything this component checks.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Loader2, Lock } from 'lucide-react';
import { getSessionId, getVisitorId } from '../../lib/tracker';
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY } from '../../routes';
import {
  ONBOARDING_CONFIRMATION,
  ONBOARDING_ERRORS,
  ONBOARDING_SECTIONS,
  ONBOARDING_SECURITY_NOTE,
  ONBOARDING_SUBMIT,
  ONBOARDING_SUCCESS,
  type OnboardingField,
  type OnboardingFieldKind,
} from '../../content/onboarding';

const FIELDS = ONBOARDING_SECTIONS.flatMap((s) => s.fields);
const CONFIRM_ID = 'confirm';

type Answers = Record<string, string | string[]>;

const domId = (id: string) => `onb-${id}`;

const isChoice = (field: OnboardingField) => field.kind === 'single' || field.kind === 'multi';

/** url is a text input: type="url" would mark "yourcompany.com" invalid. */
const INPUT_TYPE: Partial<Record<OnboardingFieldKind, string>> = {
  text: 'text',
  email: 'email',
  tel: 'tel',
  url: 'text',
};
const INPUT_MODE: Partial<Record<OnboardingFieldKind, 'email' | 'tel' | 'url'>> = {
  email: 'email',
  tel: 'tel',
  url: 'url',
};
/** Values that are inherently machine-ish read better in mono, as on the audit form. */
const MONO = new Set<OnboardingFieldKind>(['email', 'tel', 'url']);

function emptyAnswers(): Answers {
  return Object.fromEntries(FIELDS.map((f) => [f.id, f.kind === 'multi' ? [] : '']));
}

/** Shape only. The server and a bounced mail are the real validation. */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function answerText(value: string | string[]): string {
  return Array.isArray(value) ? value.join(', ') : value.trim();
}

/** Keyed in form order, so the first key is the first question to send someone back to. */
function validate(answers: Answers, confirmed: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of FIELDS) {
    const value = answerText(answers[field.id]);
    if (field.required && !value) {
      errors[field.id] =
        field.kind === 'multi'
          ? ONBOARDING_ERRORS.pickSome
          : field.kind === 'single'
            ? ONBOARDING_ERRORS.pickOne
            : ONBOARDING_ERRORS.required;
    } else if (field.kind === 'email' && value && !isValidEmail(value)) {
      errors[field.id] = ONBOARDING_ERRORS.email;
    }
  }
  if (!confirmed) errors[CONFIRM_ID] = ONBOARDING_ERRORS.confirm;
  return errors;
}

/** Throws on any non-2xx, so the caller can show the error state. */
async function submitOnboarding(answers: Answers): Promise<void> {
  const res = await fetch('/api/onboarding/towing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers,
      confirmed: true,
      submittedFrom: window.location.pathname,
      // Joins the row to the analytics journey without marking it a conversion.
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
    }),
  });
  if (!res.ok) throw new Error(`Onboarding submission failed with status ${res.status}`);
}

const optionClass = (selected: boolean) =>
  `relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-1.5 cursor-pointer transition-colors font-sans text-[15px] leading-snug has-[:focus-visible]:shadow-[0_0_0_3px_rgba(201,243,29,0.75)] ${
    selected
      ? 'bg-ink border-ink text-cream font-bold'
      : 'bg-[#FBF8F1] border-ink/45 text-ink hover:border-ink hover:bg-paper'
  }`;

// Square for multi-select, round for single choice — the shape is the
// convention that tells someone how many they may pick.
const dotClass = (selected: boolean, multi: boolean) =>
  `inline-flex items-center justify-center w-4 h-4 shrink-0 border-1.5 ${
    multi ? 'rounded-md' : 'rounded-full'
  } ${selected ? 'bg-lime border-lime' : 'bg-paper border-ink/45'}`;

const linkClass =
  'text-ink font-bold underline decoration-2 underline-offset-2 hover:text-forest focus-ring rounded-sm';

function SectionCard({
  number,
  id,
  title,
  children,
}: {
  number: number;
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="bg-paper border-1.5 border-ink rounded-2xl shadow-hard overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 md:px-7 py-3.5 bg-cream border-b-1.5 border-ink">
        <span className="step-chip" aria-hidden="true">
          {number}
        </span>
        <h2
          id={`${id}-title`}
          className="font-display font-extrabold text-lg md:text-xl text-ink tracking-tight leading-tight"
        >
          {title}
        </h2>
      </div>
      <div className="px-5 md:px-7 py-6 space-y-7">{children}</div>
    </section>
  );
}

export default function TowingOnboardingForm() {
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // The success card replaces a form several screens long, so the visitor is
  // taken to it rather than left looking at the footer.
  const successRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!isSuccess) return;
    successRef.current?.scrollIntoView({ block: 'center' });
    successRef.current?.focus({ preventScroll: true });
  }, [isSuccess]);

  /**
   * Clears a question's error the moment the visitor acts on it. An error that
   * stays on screen while someone is fixing it reads as though the fix is not
   * working.
   */
  const clearError = (id: string) => {
    setSubmitError('');
    setErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const setAnswer = (id: string, value: string | string[]) => {
    clearError(id);
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const toggle = (id: string, option: string) => {
    const current = answers[id] as string[];
    setAnswer(id, current.includes(option) ? current.filter((v) => v !== option) : [...current, option]);
  };

  /** Choice groups are reached through their first option, which is what a Tab lands on. */
  const focusQuestion = (id: string) => {
    const field = FIELDS.find((f) => f.id === id);
    const target = document.getElementById(field && isChoice(field) ? `${domId(id)}-0` : domId(id));
    target?.scrollIntoView({ block: 'center' });
    target?.focus({ preventScroll: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const found = validate(answers, confirmed);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      focusQuestion(firstInvalid);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await submitOnboarding(answers);
      setIsSuccess(true);
    } catch {
      setSubmitError(ONBOARDING_ERRORS.failed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        className="bg-paper border-2 border-ink rounded-3xl shadow-hard-lg p-6 md:p-9 text-center"
        role="status"
      >
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-lime border-1.5 border-ink shadow-hard rotate-3 mb-5">
          <Check className="w-7 h-7 text-ink stroke-[3]" aria-hidden="true" />
        </span>
        <h2
          ref={successRef}
          tabIndex={-1}
          className="font-display font-black text-2xl md:text-3xl text-ink tracking-tight focus-ring rounded-sm"
        >
          {ONBOARDING_SUCCESS.title}
        </h2>
        <p className="font-sans text-stone text-base leading-relaxed mt-3 max-w-xl mx-auto">
          {ONBOARDING_SUCCESS.body}
        </p>
        <p className="flex items-start justify-center gap-2 font-sans text-sm text-stone leading-relaxed mt-6 max-w-xl mx-auto">
          <Lock className="w-4 h-4 shrink-0 mt-0.5 text-forest" aria-hidden="true" />
          <span>{ONBOARDING_SECURITY_NOTE}</span>
        </p>
      </div>
    );
  }

  const renderField = (field: OnboardingField) => {
    const id = domId(field.id);
    const error = errors[field.id];
    const hintId = field.hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
    const value = answers[field.id];

    const label = (
      <>
        {field.label}
        {!field.required && <span className="opt">optional</span>}
      </>
    );
    const hint = field.hint && (
      <p id={hintId} className="font-sans text-sm text-stone leading-relaxed mb-3">
        {field.hint}
      </p>
    );
    const errorText = error && (
      <p id={errorId} className="font-sans text-sm font-semibold text-[#B4232A] mt-2">
        {error}
      </p>
    );

    if (isChoice(field)) {
      const multi = field.kind === 'multi';
      const selected = multi ? (value as string[]) : [value as string];
      return (
        <fieldset key={field.id} aria-describedby={describedBy}>
          <legend className="form-label">{label}</legend>
          {hint}
          <div className={multi ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}>
            {field.options.map((option, i) => {
              const on = selected.includes(option);
              return (
                <label key={option} className={optionClass(on)}>
                  <input
                    id={i === 0 ? `${id}-0` : undefined}
                    type={multi ? 'checkbox' : 'radio'}
                    name={id}
                    value={option}
                    checked={on}
                    onChange={() => (multi ? toggle(field.id, option) : setAnswer(field.id, option))}
                    className="sr-only"
                  />
                  <span className={dotClass(on, multi)} aria-hidden="true">
                    {on && <Check className="w-2.5 h-2.5 text-ink stroke-[4]" />}
                  </span>
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          {errorText}
        </fieldset>
      );
    }

    const common = {
      id,
      value: value as string,
      maxLength: field.maxLength,
      placeholder: field.placeholder,
      autoComplete: field.autoComplete,
      'aria-describedby': describedBy,
      'aria-required': field.required || undefined,
      'aria-invalid': error ? true : undefined,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setAnswer(field.id, e.target.value),
    };

    return (
      <div key={field.id}>
        <label htmlFor={id} className="form-label">
          {label}
        </label>
        {hint}
        {field.kind === 'textarea' ? (
          <>
            <textarea {...common} rows={3} className="field" />
            {/* A visible limit, because maxLength alone truncates a paste
                without saying so — and a ZIP list is usually pasted. */}
            {field.maxLength && (
              <p className="font-mono text-[11px] text-stone text-right mt-1.5" aria-hidden="true">
                {(value as string).length} / {field.maxLength}
              </p>
            )}
          </>
        ) : (
          <input
            {...common}
            type={INPUT_TYPE[field.kind]}
            inputMode={INPUT_MODE[field.kind]}
            className={MONO.has(field.kind) ? 'field field-mono' : 'field'}
          />
        )}
        {errorText}
      </div>
    );
  };

  const errorCount = Object.keys(errors).length;
  const confirmError = errors[CONFIRM_ID];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {ONBOARDING_SECTIONS.map((section, i) => (
        <SectionCard key={section.id} number={i + 1} id={domId(section.id)} title={section.title}>
          {section.fields.map(renderField)}
        </SectionCard>
      ))}

      <SectionCard
        number={ONBOARDING_SECTIONS.length + 1}
        id={domId('confirmation')}
        title={ONBOARDING_CONFIRMATION.title}
      >
        <div>
          <label
            className={`relative flex items-start gap-3 p-4 rounded-xl border-1.5 cursor-pointer transition-colors font-sans text-[15px] text-ink leading-relaxed has-[:focus-visible]:shadow-[0_0_0_3px_rgba(201,243,29,0.75)] ${
              confirmed
                ? 'bg-lime/30 border-ink'
                : 'bg-[#FBF8F1] border-ink/45 hover:border-ink hover:bg-paper'
            }`}
          >
            <input
              id={domId(CONFIRM_ID)}
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                clearError(CONFIRM_ID);
                setConfirmed(e.target.checked);
              }}
              aria-describedby={confirmError ? `${domId(CONFIRM_ID)}-error` : undefined}
              className="sr-only"
            />
            <span
              className={`inline-flex items-center justify-center w-5 h-5 shrink-0 mt-0.5 rounded-md border-1.5 ${
                confirmed ? 'bg-ink border-ink' : 'bg-paper border-ink/45'
              }`}
              aria-hidden="true"
            >
              {confirmed && <Check className="w-3 h-3 text-lime stroke-[4]" />}
            </span>
            <span>{ONBOARDING_CONFIRMATION.statement}</span>
          </label>
          {confirmError && (
            <p
              id={`${domId(CONFIRM_ID)}-error`}
              className="font-sans text-sm font-semibold text-[#B4232A] mt-2"
            >
              {confirmError}
            </p>
          )}
        </div>

        <p className="flex items-start gap-2.5 font-sans text-sm text-stone leading-relaxed">
          <Lock className="w-4 h-4 shrink-0 mt-0.5 text-forest" aria-hidden="true" />
          <span>{ONBOARDING_SECURITY_NOTE}</span>
        </p>

        <div className="space-y-4">
          {(errorCount > 0 || submitError) && (
            <p
              role="alert"
              className="flex items-start gap-2 font-sans text-sm text-[#B4232A] font-semibold p-3 bg-[#B4232A]/10 border-1.5 border-[#B4232A]/30 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{submitError || ONBOARDING_ERRORS.summary(errorCount)}</span>
            </p>
          )}

          <button
            type="submit"
            id="towing-onboarding-submit"
            disabled={isSubmitting}
            className="group w-full px-6 py-3.5 bg-lime text-ink font-sans font-extrabold text-base border-1.5 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-hard rounded-full transition-all flex items-center justify-center gap-2.5 cursor-pointer focus-ring disabled:opacity-60 disabled:cursor-wait disabled:translate-x-0 disabled:translate-y-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>{ONBOARDING_SUBMIT.busy}</span>
              </>
            ) : (
              <>
                <span>{ONBOARDING_SUBMIT.idle}</span>
                <ArrowRight
                  className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </>
            )}
          </button>

          {/* Plain links rather than CallLink: that one reports a GA4 lead
              conversion, and someone asking about this form is already a client. */}
          <p className="font-sans text-sm text-stone leading-relaxed text-center">
            {ONBOARDING_SUBMIT.help}{' '}
            <a href={`tel:${CONTACT_PHONE}`} className={linkClass}>
              {CONTACT_PHONE_DISPLAY}
            </a>{' '}
            ·{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </SectionCard>
    </form>
  );
}
