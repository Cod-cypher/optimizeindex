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
 * Direct calls carries two pages. more-direct-towing-calls is organised by what
 * the operator configures; towing-near-me-searches is organised by the query
 * the public types. Same channel, different axis — that is what keeps them
 * apart under the similarity gate, and it is the only channel deep enough to
 * need it.
 *
 * The rule that keeps them distinct
 * ---------------------------------
 * Import no prose from towing.ts — GBP_FAQS is pillar-only, buyersGuideFor()
 * holds no shared prose, and aiFaqs() was removed. Shared copy is the largest
 * source of shared text in this vertical, and scripts/verify-seo.ts compares every towing page pairwise for 5-gram
 * overlap. Types are fine to import; prose is not.
 *
 * Where a topic already lives on /towing-jobs or on /towing-companies, link to
 * it rather than restating it. The boundary table in CLAUDE.md is the
 * reference. Copy names the destination in plain words ("our guide to where
 * towing work comes from", "our towing services overview"), never "the
 * pillar", and the link itself is rendered by TowingJobsChildPage from
 * CHILD_LINKS, because a content string cannot carry one.
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
  /**
   * When the page's content was first committed: ISO 8601 date-time with
   * offset, from `git log --format=%cI` on the commit that created it.
   */
  published: string;
  /**
   * Last substantive change to the page, same format. Drives the visible
   * "Last updated" stamp, Article dateModified and the sitemap <lastmod>.
   *
   * Bumped by hand when the copy actually changes, to the date of the commit
   * that changed it, and never generated from the build date: an automatic
   * date would claim a fresh review on every deploy, which is exactly the
   * unearned freshness signal this codebase refuses to fabricate. A typo fix
   * or a new sibling in this array is not a substantive change to a page.
   */
  updated: string;
  sections: TowingSection[];
  faqs: Faq[];
  sources?: SourceRef[];
}

import { commercialAccounts } from './commercialAccounts';
import { directCalls } from './directCalls';
import { heavyDutyAccounts } from './heavyDutyAccounts';
import { motorClub } from './motorClub';
import { nearMeSearches } from './nearMeSearches';
import { paidLeads } from './paidLeads';
import { privatePropertyContracts } from './privatePropertyContracts';

/**
 * Order is the order they appear in the pillar's hub block and in its ItemList
 * schema. Direct calls and commercial accounts lead because they are the two
 * channels an operator has most agency over; the near-me page follows direct
 * calls because it is the query-side view of the same channel; heavy-duty
 * follows commercial because it is the specialised case of it; property
 * contracts sit with the other work someone else controls the terms of.
 */
export const TOWING_JOBS_CLUSTER: TowingJobsChild[] = [
  directCalls,
  nearMeSearches,
  commercialAccounts,
  heavyDutyAccounts,
  motorClub,
  privatePropertyContracts,
  paidLeads,
];

export function getTowingJobsChild(slug: string): TowingJobsChild | undefined {
  return TOWING_JOBS_CLUSTER.find((c) => c.slug === slug);
}
