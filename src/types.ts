/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GoalId = 'revenue' | 'profit' | 'conversions' | 'cac' | 'roi';

export interface Goal {
  id: GoalId;
  label: string;
  ctaText: string;
  auditText: string;
  description: string;
}

export interface Service {
  id: string;
  index: string;
  title: string;
  description: string;
  isHot?: boolean;
  isDouble?: boolean;
}

export interface CaseStudy {
  id: string;
  client: string;
  stat: string;
  metric: string;
  goal: GoalId;
  outcome: string;
  category: string;
  /** "verified in <tool>". The tool name is read from this by verifiedIn(). */
  dataOrigin: string;
  /**
   * The before-and-after the headline percentage was computed from, in the
   * study's own words. Optional because not every study publishes one; never
   * filled with an estimate.
   */
  baseline?: string;
  fullContent?: string;
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
  isOffer?: boolean;
}

export interface Faq {
  question: string;
  answer: string;
}
