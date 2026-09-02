/**
 * Supporting pages beneath /towing-jobs.
 *
 * One array drives routes, the router, the sitemap, the SEO gate and every
 * internal-link block — the same pattern as TOWING_STATES, so adding a page is
 * one entry here plus one content file and nothing else.
 *
 * Why these pages exist
 * ---------------------
 * The pillar compares six channels in breadth. Each page here takes one channel
 * and goes deeper than the pillar can without becoming a different page. Every
 * URL was checked against its live SERP before being written; the record is the
 * table in CLAUDE.md, and a page that could not justify its own SERP row was not
 * built (see the deferred list there).
 *
 * The rule that keeps them distinct
 * ---------------------------------
 * Import nothing from towing.ts's shared copy factories — GBP_FAQS, aiFaqs(),
 * buyersGuideFor(). They are the largest source of shared text in this vertical
 * and scripts/verify-seo.ts compares every towing page pairwise for 5-gram
 * overlap. Types are fine to import; prose is not.
 *
 * Where a topic already lives on the pillar or on /towing-companies, link to it
 * rather than restating it. The boundary table in CLAUDE.md is the reference.
 */

import type { Faq } from '../../types';
import type { SourceRef, TowingSection } from '../towing';

export interface TowingJobsChild {
  slug: string;
  /**
   * Must equal the leading clause of `title`.
   *
   * scripts/verify-seo.ts asserts the two match on every page in this cluster:
   * a page whose H1 promises something different from its SERP title is a
   * bait-and-switch, however mild.
   */
  h1: string;
  /** 30-60 chars including the " | OptimizeIndex" suffix. */
  title: string;
  /** 70-160 chars. Hand-written per page; no template. */
  description: string;
  /**
   * Renders directly under the H1.
   *
   * The passage a retriever is most likely to lift, so it has to answer the
   * query outright rather than introduce the article.
   */
  lede: string;
  sections: TowingSection[];
  faqs: Faq[];
  sources?: SourceRef[];
}

import { commercialAccounts } from './commercialAccounts';
import { directCalls } from './directCalls';
import { motorClub } from './motorClub';
import { paidLeads } from './paidLeads';

/**
 * Order is the order they appear in the pillar's hub block and in its ItemList
 * schema. Direct calls and commercial accounts lead because they are the two
 * channels an operator has most agency over.
 */
export const TOWING_JOBS_CLUSTER: TowingJobsChild[] = [
  directCalls,
  commercialAccounts,
  motorClub,
  paidLeads,
];

export function getTowingJobsChild(slug: string): TowingJobsChild | undefined {
  return TOWING_JOBS_CLUSTER.find((c) => c.slug === slug);
}
