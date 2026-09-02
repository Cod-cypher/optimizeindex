/**
 * Three-step towing assessment form, rendered in the /towing-jobs hero.
 *
 * Why a stepped form rather than one block of fields: the page argues that
 * "we need more jobs" is really several different problems, and the first two
 * questions are the same triage the page itself performs. Asking them before
 * the contact details means the lead arrives already qualified by intent and
 * capacity, and it keeps the hero short — one step is visible at a time.
 *
 * Submission reuses submitLead() in src/lib/leads.ts, which is the site's
 * existing lead mechanism: it enriches with first-touch UTM attribution,
 * mirrors to localStorage, POSTs to /api/leads (email + Postgres + file
 * fallback) and fires the GA4 conversion. No new endpoint is introduced.
 *
 * Field mapping is documented at buildLeadPayload() below, because /api/leads
 * validates a fixed set of keys and silently drops anything else.
 *
 * Nothing here promises jobs, calls, rankings or revenue. The button offers an
 * assessment, and the supporting copy says plainly that the answer may be "no".
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { submitLead } from '../../lib/leads';
import { trackEvent } from '../../lib/tracker';

/** Step 1 — mirrors the six JobSource channels on the page, plus an honest "not sure". */
const INTENTS = [
  'More direct customer calls',
  'Commercial / fleet work',
  'Motor club work',
  'Police / rotation work',
  'Property towing',
  'Not sure — I just need more jobs',
] as const;

/**
 * Step 2 — capacity, deliberately not a forecast.
 *
 * The question is what the operator could absorb, not what we would deliver.
 * Phrasing it the other way would make the form imply a volume promise.
 */
const CAPACITIES = [
  '1–5 additional jobs per week',
  '6–10',
  '11–25',
  '25+',
  'Not sure',
] as const;

const TOTAL_STEPS = 3;

/** Shape only. The server and a bounced mail are the real validation. */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/**
 * Identical on every page it appears on. Nothing about it varies per article -
 * not the steps, fields, order, validation, submit behaviour, styling, heading
 * or supporting copy.
 *
 * It takes no props on purpose. An earlier version accepted heading/intro so
 * each page could frame it differently, which meant a visitor met a different
 * form on every page of the same cluster. Keeping it prop-less is the
 * structural guarantee that cannot drift.
 */
export default function TowingJobsLeadForm() {
  const [step, setStep] = useState(1);

  /** Multi-select: an operator can reasonably want more of several channels. */
  const [intents, setIntents] = useState<string[]>([]);
  const [capacity, setCapacity] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Move focus to the new step's heading, so a keyboard or screen-reader user
  // travels with the form instead of being left on a button that no longer
  // exists. Skipped on first paint, which includes the server pre-render.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const goTo = (next: number) => {
    setError('');
    setStep(next);
  };

  /**
   * Clears the error the moment the visitor acts on it.
   *
   * An error that stays on screen while someone is typing the fix reads as
   * though the fix is not working.
   */
  const onField =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setError('');
      setter(e.target.value);
    };

  const resetForm = () => {
    setIntents([]);
    setCapacity('');
    setName('');
    setEmail('');
    setPhone('');
    setError('');
    setIsSuccess(false);
    setStep(1);
  };

  const toggleIntent = (option: string) => {
    setError('');
    setIntents((prev) =>
      prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option],
    );
  };

  const handleContinue = () => {
    if (step === 1) {
      if (intents.length === 0) {
        setError('Pick at least one kind of work you want more of.');
        return;
      }
      trackEvent('form_step', 'towing_jobs_assessment', { step: '1' });
      goTo(2);
      return;
    }
    if (step === 2) {
      if (!capacity) {
        setError('Let us know roughly how much more work you could take.');
        return;
      }
      trackEvent('form_step', 'towing_jobs_assessment', { step: '2' });
      goTo(3);
    }
  };

  /**
   * Maps the assessment onto the payload /api/leads accepts.
   *
   * The endpoint validates a fixed key list and ignores unknown fields, so
   * `intent` and `capacity` cannot be sent under their own names without a
   * schema change and a migration against the production database. They go
   * into fields that already exist:
   *
   *   type     — the source, so these leads are filterable on their own
   *   budget   — capacity, self-labelled (AuditLeadForm already uses this slot
   *              as a free-text qualifier rather than a currency amount)
   *   comments — the full readable block, which is what lands in the
   *              notification email
   *
   * `website` is required by the endpoint but is not asked for on this form,
   * so it records that plainly rather than carrying an invented URL.
   */
  const buildLeadPayload = () => ({
    type: 'towing_jobs_assessment',
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    website: 'Not collected — towing jobs assessment',
    budget: `Capacity: ${capacity}`,
    comments: [
      // Names the page the lead came from, so a lead is attributable to the
      // article that produced it. submitLead() also records submittedFrom
      // independently; this line is the human-readable half in the email.
      `Source: ${typeof window !== 'undefined' ? window.location.pathname : '/towing-jobs'}`,
      `Wants more of: ${intents.join(', ')}`,
      `Capacity: ${capacity}`,
      `Phone: ${phone.trim()}`,
    ].join('\n'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      setError('Please add your name.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('That email address does not look right.');
      return;
    }
    if (!phone.trim()) {
      setError('Please add a phone number.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await submitLead(buildLeadPayload());
      setIsSuccess(true);
    } catch {
      setError('That did not send. Please try again, or call us on 202 810 7042.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        className="bg-ink border-1.5 border-ink shadow-hard-lg rounded-2xl p-6 md:p-7 text-center"
        role="status"
      >
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-lime border-1.5 border-ink shadow-hard mb-3">
          <Check className="w-5 h-5 text-ink stroke-[3]" aria-hidden="true" />
        </span>
        <h2 className="font-display font-extrabold text-xl text-cream leading-tight">
          Got it. We will take a look.
        </h2>
        <p className="font-sans text-sm text-cream/75 leading-relaxed mt-2">
          We will review how your business shows up in your market and come back within one
          business day — including if the honest answer is that search
          visibility is not your constraint.
        </p>
        <button
          type="button"
          onClick={resetForm}
          id="towing-jobs-form-restart"
          className="inline-flex items-center gap-1.5 mt-5 px-4 py-2.5 bg-transparent text-cream/80 border-1.5 border-cream/25 font-sans font-bold text-sm rounded-full hover:border-cream/60 hover:text-cream transition-colors cursor-pointer focus-ring"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Start again from step 1</span>
        </button>
      </div>
    );
  }

  const optionClass = (selected: boolean) =>
    `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-1.5 cursor-pointer transition-colors font-sans text-[14px] ${
      selected
        ? 'bg-lime border-lime text-ink font-bold'
        : 'bg-transparent border-cream/25 text-cream/80 hover:border-cream/60 hover:text-cream'
    }`;

  // Square for the multi-select step, round for the single-choice step - the
  // shape is the convention that tells someone how many they may pick.
  const dotClass = (selected: boolean, multi = false) =>
    `inline-flex items-center justify-center w-4 h-4 shrink-0 border-1.5 ${
      multi ? 'rounded-md' : 'rounded-full'
    } ${selected ? 'bg-ink border-ink' : 'border-cream/40'}`;

  return (
    <div className="bg-ink border-1.5 border-ink shadow-hard-lg rounded-2xl p-5 md:p-6">
      {/* h2, not h3: the hero has only the h1 above it, and the SEO gate rejects
          a skipped heading level. Step titles below are h3s under this. */}
      <h2 className="font-display font-extrabold text-lg md:text-xl text-cream leading-tight tracking-tight">
        Free towing visibility assessment
      </h2>

      {/* Progress. aria-hidden because the live region below announces the same
          thing in a form a screen reader can actually use. */}
      <div className="flex items-center gap-2 mt-3" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <React.Fragment key={n}>
            <span
              className={`inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-full border-1.5 font-mono text-[11px] font-bold transition-colors ${
                n === step
                  ? 'bg-lime border-lime text-ink'
                  : n < step
                    ? 'bg-cream/20 border-cream/30 text-cream'
                    : 'bg-transparent border-cream/25 text-cream/40'
              }`}
            >
              {n < step ? <Check className="w-3 h-3 stroke-[3]" /> : n}
            </span>
            {n < 3 && (
              <span
                className={`h-px flex-1 transition-colors ${n < step ? 'bg-cream/40' : 'bg-cream/15'}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        Step {step} of {TOTAL_STEPS}
      </p>

      <form onSubmit={handleSubmit} className="mt-5" noValidate>
        {/* Keyed on step so the enter animation replays on every transition. */}
        <div key={step} className="oi-step">
          {step === 1 && (
            <fieldset>
              <legend className="sr-only">What kind of towing work do you want more of?</legend>
              <h3
                ref={headingRef}
                tabIndex={-1}
                className="font-sans text-[15px] font-bold text-cream leading-snug focus-ring rounded-sm"
              >
                What kind of towing work are you looking to get more of?
              </h3>
              <p className="font-sans text-[13px] text-cream/60 leading-relaxed mt-1.5">
                Select all that apply.
              </p>
              <div className="mt-3 space-y-2">
                {INTENTS.map((option) => (
                  <label key={option} className={optionClass(intents.includes(option))}>
                    <input
                      type="checkbox"
                      name="towing-intent"
                      value={option}
                      checked={intents.includes(option)}
                      onChange={() => toggleIntent(option)}
                      className="sr-only"
                    />
                    <span className={dotClass(intents.includes(option), true)}>
                      {intents.includes(option) && (
                        <Check className="w-2.5 h-2.5 text-lime stroke-[4]" aria-hidden="true" />
                      )}
                    </span>
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset>
              <legend className="sr-only">Roughly how much more work could you handle?</legend>
              <h3
                ref={headingRef}
                tabIndex={-1}
                className="font-sans text-[15px] font-bold text-cream leading-snug focus-ring rounded-sm"
              >
                Roughly how much more work could you handle?
              </h3>
              {/* Capacity, not a forecast — said out loud so the question cannot
                  be read as an implied promise of volume. */}
              <p className="font-sans text-[13px] text-cream/60 leading-relaxed mt-1.5">
                We are asking what your operation could absorb, not predicting what you would get.
              </p>
              <div className="mt-3 space-y-2">
                {CAPACITIES.map((option) => (
                  <label key={option} className={optionClass(capacity === option)}>
                    <input
                      type="radio"
                      name="towing-capacity"
                      value={option}
                      checked={capacity === option}
                      onChange={() => {
                        setError('');
                        setCapacity(option);
                      }}
                      className="sr-only"
                    />
                    <span className={dotClass(capacity === option)}>
                      {capacity === option && (
                        <Check className="w-2.5 h-2.5 text-lime stroke-[4]" aria-hidden="true" />
                      )}
                    </span>
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === 3 && (
            <div>
              <h3
                ref={headingRef}
                tabIndex={-1}
                className="font-sans text-[15px] font-bold text-cream leading-snug focus-ring rounded-sm"
              >
                Where should we send your assessment?
              </h3>

              <div className="mt-3">
                <label htmlFor="tj-name" className="form-label form-label-compact text-cream">
                  Name
                </label>
                <input
                  id="tj-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={onField(setName)}
                  placeholder="Jordan Reyes"
                  className="field field-compact"
                />
              </div>

              <div className="mt-2.5">
                <label htmlFor="tj-email" className="form-label form-label-compact text-cream">
                  Email
                </label>
                <input
                  id="tj-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={onField(setEmail)}
                  placeholder="you@company.com"
                  className="field field-compact field-mono"
                />
              </div>

              <div className="mt-2.5">
                <label htmlFor="tj-phone" className="form-label form-label-compact text-cream">
                  Phone
                </label>
                <input
                  id="tj-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={onField(setPhone)}
                  placeholder="202 810 7042"
                  className="field field-compact field-mono"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="font-mono text-[11px] text-[#FF8A8F] leading-relaxed mt-3">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2.5 mt-4">
          {step > 1 && (
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-transparent text-cream/80 border-1.5 border-cream/25 font-sans font-bold text-sm rounded-full hover:border-cream/60 hover:text-cream transition-colors cursor-pointer focus-ring"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back</span>
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleContinue}
              id={`towing-jobs-form-continue-${step}`}
              className="flex-1 px-5 py-2.5 bg-lime text-ink font-sans font-extrabold text-sm border-2 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 rounded-full transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus-ring"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              id="towing-jobs-form-submit"
              disabled={isSubmitting}
              className="flex-1 px-5 py-2.5 bg-lime text-ink font-sans font-extrabold text-sm border-2 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 rounded-full transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus-ring disabled:opacity-60 disabled:cursor-wait disabled:translate-x-0 disabled:translate-y-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Sending…</span>
                </>
              ) : (
                <>
                  <span>See My Opportunity</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          )}
        </div>

        <p className="font-sans text-[13px] text-cream/60 leading-relaxed mt-3">
          We will review your market and tell you whether search visibility is actually an
          opportunity for your business.
        </p>
      </form>
    </div>
  );
}
