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
  dataOrigin: string;
  fullContent?: string;
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
  isOffer?: boolean;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl: string;
}
