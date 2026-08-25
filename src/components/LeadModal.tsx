/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Sparkles,
  Trophy,
  ArrowRight,
  AlertCircle,
  Globe,
  Mail,
  User,
  Building2,
  Target,
  ChevronDown,
  Clock,
  Lock,
} from 'lucide-react';
import { GoalId } from '../types';
import { GOALS } from '../data';
import { submitLead } from '../lib/leads';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'quote' | 'audit';
  preselectedGoal: GoalId;
}

export default function LeadModal({ isOpen, onClose, type, preselectedGoal }: LeadModalProps) {
  const [goal, setGoal] = useState<GoalId>(preselectedGoal);
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [competitor, setCompetitor] = useState('');
  const [phone, setPhone] = useState('');

  const [budget, setBudget] = useState('<1000/month');
  const [comments, setComments] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setGoal(preselectedGoal);
      setIsSuccess(false);
      setIsSubmitting(false);
      setError('');
    }
  }, [isOpen, preselectedGoal]);

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    // Focus the first field so keyboard users land inside the dialog.
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 80);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(t);
    };
  }, [isOpen, onClose]);

  const isAudit = type === 'audit';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website || !email) return;

    setIsSubmitting(true);
    setError('');
    try {
      await submitLead({
        type: `modal_${type}`,
        goal,
        website,
        email,
        name,
        company,
        competitor,
        phone,
        budget,
        comments,
      });
      setIsSuccess(true);
    } catch {
      setError('Something went wrong sending your request. Please try again, or call us at 202 810 7042 .');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/75 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-modal-title"
            initial={{ scale: 0.97, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className="relative w-full max-w-xl my-auto border-2 border-ink bg-paper shadow-hard-lg z-10 rounded-3xl overflow-hidden"
          >
            {/* Masthead */}
            <div className="relative bg-cream border-b-1.5 border-ink px-6 md:px-8 pt-5 pb-4">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 text-stone hover:text-ink hover:bg-ink/5 transition-colors focus-ring rounded-full cursor-pointer"
                aria-label="Close dialog"
                id="close-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-lime text-ink font-mono text-[10px] font-bold border-1.5 border-ink shadow-hard rounded-full mb-3 -rotate-2">
                <Sparkles className="w-3 h-3" />
                <span>{isAudit ? '100% FREE 15-POINT AUDIT' : '100% FREE CUSTOM PROPOSAL'}</span>
              </div>

              <h3
                id="lead-modal-title"
                className="font-display font-extrabold text-2xl text-ink leading-tight tracking-tight pr-10"
              >
                {isAudit ? (
                  <>
                    Get your free{' '}
                    <span className="font-serif-accent italic text-lime bg-ink px-2 py-0.5 rounded-sm">audit</span>
                  </>
                ) : (
                  <>
                    Get your free{' '}
                    <span className="font-serif-accent italic text-lime bg-ink px-2 py-0.5 rounded-sm">custom</span>{' '}
                    quote
                  </>
                )}
              </h3>
              <p className="font-sans text-[13px] text-stone mt-1.5 leading-relaxed">
                We audit your search footprint, benchmark your competitors, and send back a plan built for your
                business.
              </p>
              <p className="modal-note font-mono text-[10px] uppercase tracking-widest text-stone mt-2.5">
                Only your site and email are required
              </p>
            </div>

            {!isSubmitting && !isSuccess && (
              <form onSubmit={handleSubmit} className="fit-form px-6 md:px-8 py-5 space-y-4">
                {/* Objective */}
                <fieldset>
                  <legend className="form-label mb-2.5">Your primary objective</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {GOALS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGoal(g.id)}
                        aria-pressed={goal === g.id}
                        className="choice-pill justify-start"
                        id={`modal-goal-${g.id}`}
                      >
                        {goal === g.id ? (
                          <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
                        ) : (
                          <Target className="w-3.5 h-3.5 shrink-0 opacity-45" />
                        )}
                        <span className="truncate">{g.label}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label htmlFor="modal-website" className="form-label">
                      Your website
                    </label>
                    <span className="field-wrap">
                      <Globe className="field-icon" />
                      <input
                        ref={firstFieldRef}
                        type="url"
                        id="modal-website"
                        required
                        autoComplete="url"
                        inputMode="url"
                        placeholder="https://yourcompany.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="field field-mono"
                      />
                    </span>
                  </div>

                  <div>
                    <label htmlFor="modal-email" className="form-label">
                      Work email
                    </label>
                    <span className="field-wrap">
                      <Mail className="field-icon" />
                      <input
                        type="email"
                        id="modal-email"
                        required
                        autoComplete="email"
                        inputMode="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="field field-mono"
                      />
                    </span>
                  </div>

                  <div>
                    <label htmlFor="modal-name" className="form-label">
                      Your name<span className="opt">optional</span>
                    </label>
                    <span className="field-wrap">
                      <User className="field-icon" />
                      <input
                        type="text"
                        id="modal-name"
                        autoComplete="name"
                        placeholder="Sarah Jenkins"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="field"
                      />
                    </span>
                  </div>

                  <div>
                    <label htmlFor="modal-company" className="form-label">
                      Company<span className="opt">optional</span>
                    </label>
                    <span className="field-wrap">
                      <Building2 className="field-icon" />
                      <input
                        type="text"
                        id="modal-company"
                        autoComplete="organization"
                        placeholder="VeloSaaS"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="field"
                      />
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-budget" className="form-label">
                    Monthly budget<span className="opt">helps us scope it</span>
                  </label>
                  <span className="field-wrap">
                    <select
                      id="modal-budget"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="field field-mono"
                    >
                      <option value="<1000/month">&lt; $1,000 / month</option>
                      <option value="1000-3000/month">$1,000 - $3,000 / month</option>
                      <option value="3000-5000/month">$3,000 - $5,000 / month</option>
                      <option value="5000+/month">$5,000+ / month</option>
                    </select>
                    <ChevronDown className="field-chevron" />
                  </span>
                </div>

                <div>
                  <label htmlFor="modal-comments" className="form-label">
                    Anything we should know?<span className="opt">optional</span>
                  </label>
                  <textarea
                    id="modal-comments"
                    rows={2}
                    placeholder="Target keywords, competitors, growth goals..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="field"
                  />
                </div>

                <div className="pt-1">
                  {error && (
                    <p
                      role="alert"
                      className="flex items-start gap-2 font-sans text-sm text-[#B4232A] font-semibold mb-4 p-3 bg-[#B4232A]/10 border-1.5 border-[#B4232A]/30 rounded-xl"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </p>
                  )}
                  <button
                    type="submit"
                    className="group w-full py-3.5 px-6 bg-lime text-ink font-sans font-extrabold text-base border-1.5 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-hard rounded-full transition-all flex items-center justify-center gap-2.5 cursor-pointer focus-ring"
                    id="modal-submit-btn"
                  >
                    <span>{isAudit ? 'Get my free audit' : 'Get my free quote'}</span>
                    <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-3 font-mono text-[10px] uppercase tracking-wide text-stone">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-forest" />
                      Back in 24 hours
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-forest" />
                      Never sold
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-forest stroke-[3]" />
                      No sales calls
                    </span>
                  </div>
                </div>
              </form>
            )}

            {/* Submitting state */}
            {isSubmitting && (
              <div className="px-6 md:px-8 py-16 text-center flex flex-col items-center justify-center min-h-[280px]">
                <div className="w-14 h-14 border-4 border-ink/15 border-t-ink rounded-full animate-spin mb-6" />
                <h4 className="font-display font-extrabold text-xl text-ink mb-1.5">Sending your request...</h4>
                <p className="font-sans text-sm text-stone">This only takes a second.</p>
              </div>
            )}

            {/* Success state */}
            {isSuccess && (
              <div className="px-6 md:px-8 py-8 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 bg-forest text-lime border-1.5 border-ink rounded-full flex items-center justify-center shadow-hard mb-5">
                  <Trophy className="w-7 h-7" />
                </div>
                <h4 className="font-display font-extrabold text-2xl text-ink mb-1.5">Request received</h4>
                <p className="font-mono text-[11px] text-stone uppercase tracking-wide mb-6">
                  FOR <span className="text-ink underline">{website}</span>
                </p>

                <div className="w-full bg-cream border-1.5 border-ink p-5 rounded-2xl text-left mb-6">
                  <p className="form-label mb-3">What happens next</p>
                  <ul className="space-y-2.5 text-sm text-ink/80 leading-relaxed font-sans">
                    <li className="flex gap-2.5 items-start">
                      <Check className="w-4 h-4 text-forest shrink-0 mt-0.5 stroke-[3]" />
                      <span>A strategist reviews your website, competitors, and market.</span>
                    </li>
                    <li className="flex gap-2.5 items-start">
                      <Check className="w-4 h-4 text-forest shrink-0 mt-0.5 stroke-[3]" />
                      <span>We prepare a personalized proposal with pricing and timelines.</span>
                    </li>
                    <li className="flex gap-2.5 items-start">
                      <Check className="w-4 h-4 text-forest shrink-0 mt-0.5 stroke-[3]" />
                      <span>
                        You hear back at <strong className="text-ink">{email}</strong> within 24 hours.
                      </span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-ink text-cream font-mono text-xs border-1.5 border-ink shadow-hard rounded-full hover:bg-ink/90 text-center font-bold uppercase tracking-wide cursor-pointer focus-ring"
                  id="success-close-btn"
                >
                  Done &mdash; back to site
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
