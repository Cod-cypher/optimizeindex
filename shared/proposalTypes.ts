/**
 * The contract between the proposal API and the pages that render it.
 *
 * Lives in shared/ for the same reason auditTypes.ts does: the server builds
 * these objects and the client consumes them, and a type imported across that
 * boundary must not drag @prisma/client into the browser bundle.
 *
 * The Json columns on the Proposal model are typed here rather than in the
 * schema, since Prisma types them all as JsonValue.
 */

/** One row of "where your calls come from today". */
export interface CallSource {
  source: string;
  /** Percentage of total calls, 0-100. Use this or `calls`, not both. */
  share?: number;
  /** Absolute calls per month, when the prospect knows the real number. */
  calls?: number;
  note?: string;
}

/** A stage of the engagement, rendered as a timeline on the client page. */
export interface ProposalPhase {
  title: string;
  /** Free text: "Weeks 1-2", "Month 2", "Ongoing". */
  timeline?: string;
  items: string[];
}

/** Escape hatch for one-off content that has no dedicated field. */
export interface CustomSection {
  heading: string;
  body: string;
}

/**
 * Exactly what a prospect's browser receives, inlined into the page as
 * window.__PROPOSAL__.
 *
 * Note what is absent: adminNotes, accessCode, status, internal ids, and every
 * tracking column. The server builds this with an explicit allowlist so a field
 * added to the schema later is private until someone deliberately publishes it.
 */
export interface PublicProposal {
  slug: string;

  // Company
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  city: string | null;
  state: string | null;
  /** Miles. */
  serviceRadius: number | null;
  industry: string | null;
  fleetSize: number | null;
  truckTypes: string[] | null;
  heroImageUrl: string | null;
  logoImageUrl: string | null;

  // Current situation
  currentCalls: number | null;
  callSources: CallSource[] | null;
  currentNotes: string | null;

  // Opportunity
  projectedCalls: number | null;
  /** Cents. */
  avgJobValue: number | null;
  timeframeMonths: number | null;
  /**
   * Where the projection comes from, in plain language. The client page must
   * render this wherever it renders projectedCalls — a growth number with no
   * stated basis is a fabricated statistic.
   */
  projectionBasis: string | null;

  // Plan
  phases: ProposalPhase[] | null;
  deliverables: string[] | null;

  // Investment — all nullable; the section is hidden unless monthlyPrice is set.
  /** Cents. */
  monthlyPrice: number | null;
  /** Cents. */
  setupFee: number | null;
  termMonths: number | null;

  // Call to action
  ctaLabel: string | null;
  ctaUrl: string | null;

  customSections: CustomSection[] | null;

  /** ISO 8601. */
  publishedAt: string | null;
  /** ISO 8601 — publishedAt, falling back to createdAt for a preview. */
  preparedOn: string | null;
}

declare global {
  interface Window {
    /**
     * Injected by server.ts into the app shell for a published proposal.
     * Its presence is what tells src/AppRouter.tsx to render the proposal page
     * instead of the marketing site.
     */
    __PROPOSAL__?: PublicProposal;
  }
}
