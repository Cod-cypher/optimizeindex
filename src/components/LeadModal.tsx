/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Shield, Sparkles, Trophy, ArrowRight, TrendingUp, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen) {
      setGoal(preselectedGoal);
      setIsSuccess(false);
      setIsSubmitting(false);
      setError('');
    }
  }, [isOpen, preselectedGoal]);

  const activeGoal = GOALS.find(g => g.id === goal) || GOALS[0];

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
      setError('Something went wrong sending your request. Please try again, or call us at 817 409 8408.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/75 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg overflow-hidden border-2 border-ink bg-cream p-6 md:p-8 shadow-hard z-10 rounded-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 text-stone hover:text-ink transition-colors focus-ring rounded-full"
              aria-label="Close modal"
              id="close-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>

            {!isSubmitting && !isSuccess && (
              <div>
                {/* Header */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-lime text-ink font-mono text-xs font-bold border border-ink shadow-hard rounded-full mb-3 -rotate-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>100% FREE CUSTOM PROPOSAL</span>
                  </div>
                  <h3 className="font-display font-extrabold text-2xl md:text-3xl text-ink leading-tight tracking-tight">
                    Get your free <span className="font-serif-accent italic text-lime bg-ink px-2 py-0.5 rounded-sm">custom</span> quote
                  </h3>
                  <p className="text-stone text-xs mt-2 leading-relaxed">
                    We will audit your search footprint, benchmark competitors, and craft a fully customized proposal showing you how to grow revenue.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Goal declaration (Self-segmentation) */}
                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-stone mb-1.5">
                      YOUR PRIMARY OBJECTIVE:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {GOALS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGoal(g.id)}
                          className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                            goal === g.id
                              ? 'bg-ink border-ink text-lime'
                              : 'bg-paper border-ink/20 text-ink hover:border-ink/50'
                          }`}
                          id={`modal-goal-${g.id}`}
                        >
                          <span className="truncate">{g.label}</span>
                          {goal === g.id && <Check className="w-3 h-3 shrink-0 ml-1" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Website */}
                    <div>
                      <label htmlFor="modal-website" className="block font-mono text-[10px] font-bold uppercase tracking-wider text-stone mb-1">
                        YOUR WEBSITE *
                      </label>
                      <input
                        type="url"
                        id="modal-website"
                        required
                        placeholder="https://yourcompany.com"
                        value={website}
                        onChange={e => setWebsite(e.target.value)}
                        className="w-full px-3 py-1.5 border-1.5 border-ink bg-paper text-ink font-mono text-xs rounded-xl focus-ring"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="modal-email" className="block font-mono text-[10px] font-bold uppercase tracking-wider text-stone mb-1">
                        WORK EMAIL *
                      </label>
                      <input
                        type="email"
                        id="modal-email"
                        required
                        placeholder="name@company.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-3 py-1.5 border-1.5 border-ink bg-paper text-ink font-mono text-xs rounded-xl focus-ring"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Name */}
                    <div>
                      <label htmlFor="modal-name" className="block font-mono text-[10px] font-bold uppercase tracking-wider text-stone mb-1">
                        YOUR NAME
                      </label>
                      <input
                        type="text"
                        id="modal-name"
                        placeholder="Sarah Jenkins"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-3 py-1.5 border-1.5 border-ink bg-paper text-ink font-mono text-xs rounded-xl focus-ring"
                      />
                    </div>

                    {/* Company */}
                    <div>
                      <label htmlFor="modal-company" className="block font-mono text-[10px] font-bold uppercase tracking-wider text-stone mb-1">
                        COMPANY NAME
                      </label>
                      <input
                        type="text"
                        id="modal-company"
                        placeholder="VeloSaaS"
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        className="w-full px-3 py-1.5 border-1.5 border-ink bg-paper text-ink font-mono text-xs rounded-xl focus-ring"
                      />
                    </div>
                  </div>

                  {/* Budget Selector */}
                  <div>
                    <label htmlFor="modal-budget" className="block font-mono text-[10px] font-bold uppercase tracking-wider text-stone mb-1">
                      PROJECT BUDGET
                    </label>
                    <select
                      id="modal-budget"
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                      className="w-full px-3 py-1.5 border-1.5 border-ink bg-paper text-ink font-mono text-xs rounded-xl focus-ring cursor-pointer"
                    >
                      <option value="<1000/month">&lt;$1,000 / month</option>
                      <option value="1000-3000/month">$1,000 - $3,000 / month</option>
                      <option value="3000-5000/month">$3,000 - $5,000 / month</option>
                      <option value="5000+/month">$5,000+ / month</option>
                    </select>
                  </div>

                  {/* Comments */}
                  <div>
                    <label htmlFor="modal-comments" className="block font-mono text-[10px] font-bold uppercase tracking-wider text-stone mb-1">
                      COMMENTS OR QUESTIONS
                    </label>
                    <textarea
                      id="modal-comments"
                      rows={2}
                      placeholder="Tell us about your target keywords, competitors, or growth goals..."
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      className="w-full px-3 py-1.5 border-1.5 border-ink bg-paper text-ink font-mono text-xs rounded-xl focus-ring resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    {error && (
                      <p className="flex items-center justify-center gap-2 font-mono text-[11px] text-rose-700 font-bold mb-3">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="w-full py-2.5 px-6 bg-lime text-ink font-sans font-bold text-sm border-1.5 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer"
                      id="modal-submit-btn"
                    >
                      <span>Get free quote</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Trust indicator */}
                  <div className="flex items-center justify-center gap-6 pt-3 border-t border-ink/10 text-[10px] font-mono text-stone uppercase">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-forest" />
                      SECURE SSL
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-lime" />
                      15-DAY GUARANTEE
                    </span>
                    <span className="flex items-center gap-1">
                      NO SALES CALLS
                    </span>
                  </div>
                </form>
              </div>
            )}

            {/* Submitting state */}
            {isSubmitting && (
              <div className="py-8 text-center flex flex-col items-center justify-center min-h-[250px]">
                <div className="w-16 h-16 border-4 border-ink border-t-lime rounded-full animate-spin mb-6" />
                <h4 className="font-display font-extrabold text-xl text-ink mb-2">
                  Sending your request...
                </h4>
                <p className="font-sans text-xs text-stone">This only takes a second.</p>
              </div>
            )}

            {/* Success state */}
            {isSuccess && (
              <div className="py-2 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-forest text-lime border-1.5 border-ink rounded-full flex items-center justify-center shadow-hard mb-4">
                  <Trophy className="w-6 h-6" />
                </div>
                <h4 className="font-display font-extrabold text-2xl text-ink mb-2">
                  Request Received!
                </h4>
                <p className="text-stone text-xs font-mono uppercase tracking-wide mb-6">
                  FOR <span className="text-ink underline">{website}</span>
                </p>

                <div className="w-full bg-paper border-1.5 border-ink p-4 rounded-2xl text-left shadow-hard mb-6">
                  <p className="font-mono text-[10px] text-stone uppercase tracking-widest mb-2 font-bold">
                    WHAT HAPPENS NEXT:
                  </p>
                  <ul className="space-y-2 text-xs text-ink/80 leading-relaxed font-sans">
                    <li className="flex gap-2 items-start">
                      <Check className="w-3.5 h-3.5 text-forest shrink-0 mt-0.5 stroke-[3]" />
                      <span>A strategist reviews your website, competitors, and market.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <Check className="w-3.5 h-3.5 text-forest shrink-0 mt-0.5 stroke-[3]" />
                      <span>We prepare a personalized proposal with pricing and timelines.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <Check className="w-3.5 h-3.5 text-forest shrink-0 mt-0.5 stroke-[3]" />
                      <span>You hear back at <strong className="text-ink">{email}</strong> within 24 hours.</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-ink text-cream font-mono text-xs border border-ink shadow-hard rounded-full hover:bg-ink/90 text-center font-bold cursor-pointer"
                  id="success-close-btn"
                >
                  Done — Back to Site
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
