/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, Target, Mail, User, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { GOALS } from '../../data';
import type { GoalId } from '../../types';
import { submitLead } from '../../lib/leads';
import { summarizeForLead, type AuditResult, bucketIssues } from '../../lib/audit';

interface AuditLeadFormProps {
  result: AuditResult;
  selectedGoal: GoalId;
  onGoalSelect: (goal: GoalId) => void;
}

/**
 * Sits below the results, once we've already given something away. The goal
 * pills live here rather than in the hero: asking what someone is trying to
 * achieve lands better right after they've seen what's broken.
 */
export default function AuditLeadForm({ result, selectedGoal, onGoalSelect }: AuditLeadFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const { critical, warnings } = bucketIssues(result);
  const fixCount = critical.length + warnings.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    try {
      await submitLead({
        type: 'hero_audit',
        goal: selectedGoal,
        website: result.finalUrl || result.url,
        email,
        name,
        budget: 'N/A (Instant Audit)',
        auditId: result.auditId || undefined,
        comments: summarizeForLead(result),
      });
      setIsSuccess(true);
    } catch {
      setError('Something went wrong sending that. Please try again, or call us at 202 810 7042.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        className="bg-forest border-1.5 border-ink shadow-hard-lg rounded-2xl p-6 md:p-8 text-center"
        role="status"
      >
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lime border-1.5 border-ink shadow-hard mb-3">
          <Check className="w-6 h-6 text-ink stroke-[3]" aria-hidden="true" />
        </span>
        <h3 className="font-display font-extrabold text-xl text-cream leading-tight">
          Got it — check your inbox.
        </h3>
        <p className="font-sans text-sm text-cream/75 leading-relaxed mt-2 max-w-md mx-auto">
          We're putting together your prioritised fix plan for{' '}
          <span className="font-mono text-lime">{result.domain}</span>, including the{' '}
          {fixCount} item{fixCount === 1 ? '' : 's'} above ranked by revenue impact. A real person
          reviews every one — expect it within 24 hours.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-cream/60 mt-4">
          No contracts · 15-day money back guarantee
        </p>
      </div>
    );
  }

  return (
    <div className="bg-ink border-1.5 border-ink shadow-hard-lg rounded-2xl p-6 md:p-8">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-lime text-ink font-mono text-[10px] font-bold border-1.5 border-ink rounded-full mb-3 -rotate-1">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          <span>FREE · NO OBLIGATION</span>
        </div>

        <h3 className="font-display font-extrabold text-2xl md:text-3xl text-cream leading-tight tracking-tight">
          Want the{' '}
          <span className="font-serif-accent italic text-lime bg-cream/10 px-2 py-0.5 rounded-sm">
            fix plan
          </span>{' '}
          for these {fixCount} issue{fixCount === 1 ? '' : 's'}?
        </h3>
        <p className="font-sans text-sm text-cream/75 leading-relaxed mt-2">
          Everything above is yours already. Tell us where you're headed and we'll send back the
          same list ranked by revenue impact — what to fix first, what it's worth, and what it takes.
          Reviewed by a human, not generated.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <fieldset>
          <legend className="font-mono text-[10px] font-bold uppercase tracking-widest text-cream/60 mb-2.5">
            What's your #1 growth goal right now?
          </legend>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => {
              const isSelected = selectedGoal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onGoalSelect(g.id)}
                  aria-pressed={isSelected}
                  id={`audit-goal-${g.id}`}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-1.5 font-mono text-[11px] font-bold uppercase tracking-wide transition-all cursor-pointer focus-ring ${
                    isSelected
                      ? 'bg-lime border-lime text-ink'
                      : 'bg-transparent border-cream/25 text-cream/75 hover:border-cream/60 hover:text-cream'
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" aria-hidden="true" />
                  ) : (
                    <Target className="w-3.5 h-3.5 shrink-0 opacity-50" aria-hidden="true" />
                  )}
                  <span>{g.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="audit-lead-email" className="form-label text-cream/60">
              Work email
            </label>
            <span className="field-wrap">
              <Mail className="field-icon" aria-hidden="true" />
              <input
                id="audit-lead-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="field field-mono"
              />
            </span>
          </div>
          <div>
            <label htmlFor="audit-lead-name" className="form-label text-cream/60">
              Name <span className="opt">optional</span>
            </label>
            <span className="field-wrap">
              <User className="field-icon" aria-hidden="true" />
              <input
                id="audit-lead-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Reyes"
                className="field"
              />
            </span>
          </div>
        </div>

        {error && (
          <p role="alert" className="font-mono text-[11px] text-[#FF8A8F] leading-relaxed">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="submit"
            id="audit-result-cta"
            disabled={isSubmitting}
            className="px-7 py-3.5 bg-lime text-ink font-sans font-extrabold text-sm border-2 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 rounded-full transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus-ring disabled:opacity-60 disabled:cursor-wait disabled:translate-x-0 disabled:translate-y-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <span>Send me the fix plan</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
          <p className="font-mono text-[10px] uppercase tracking-widest text-cream/60">
            We only need your email · No sales calls unless you ask
          </p>
        </div>
      </form>
    </div>
  );
}
