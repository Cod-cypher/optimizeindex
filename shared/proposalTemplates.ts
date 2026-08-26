/**
 * Starting points for a new proposal.
 *
 * A proposal for a towing outfit and one for a flatbed carrier differ in the
 * words, not the shape — the same four moves (get found, cover the service
 * area, turn searches into calls, measure it) apply to both. Templates carry
 * that reusable half so a proposal starts three-quarters written instead of
 * blank.
 *
 * There are two kinds here.
 *
 * VERTICAL TEMPLATES (flatbed, towing, delivery, dump)
 *   Carry the plan, the deliverables, the CTA label and the equipment
 *   vocabulary — and no numbers at all. Admin-saved templates
 *   (server/proposals/templates.ts) follow the same rule but may also carry the
 *   agency's own pricing, which is not a claim about any prospect. Current calls, potential calls,
 *   percentage shares, average job value, price and the projection basis are
 *   findings about one specific company; pre-filling them would invent facts
 *   about a business nobody has looked at yet. Call sources appear as *labels
 *   only*, because they are the questions to ask ("how much comes from Maps?"),
 *   not the answers.
 *
 * THE WORKED EXAMPLE (`isSample: true`)
 *   Deliberately fills everything, numbers included, so the finished page can be
 *   seen end to end without inventing a proposal by hand. Its figures are
 *   illustration, not findings — so the picker warns before it is chosen, its
 *   projection basis opens with "SAMPLE TEXT — replace this", and it stamps a
 *   reminder into the internal notes. Those three markers are the safety rail:
 *   publishing it unedited would put invented numbers about a real business in
 *   front of that business. Keep them if you edit the sample.
 *
 * validateForPublish in server/proposals/routes.ts is unaffected either way — it
 * still refuses any projection without a written basis.
 */

import type { CallSource, CustomSection, ProposalPhase } from './proposalTypes';

/**
 * Fields a template may pre-fill — which is now all of them.
 *
 * The admin ticks which groups to carry when saving (see
 * server/proposals/templates.ts). Prospect-specific groups exist because
 * `Duplicate` has always copied the entire proposal anyway; withholding the
 * same data here bought no safety, it just made templates less useful than the
 * button next to them. What still holds is that the admin sees every carried
 * value in the editor before publishing, and validateForPublish continues to
 * refuse a projection with no stated basis.
 */
export interface ProposalTemplateFields {
  // Identity
  contactName?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;

  // Location and operation
  city?: string;
  state?: string;
  serviceRadius?: number;
  fleetSize?: number;
  industry?: string;
  truckTypes?: string[];

  // Where they are today
  currentCalls?: number;
  callSources?: CallSource[];
  currentNotes?: string;

  // The projection
  projectedCalls?: number;
  timeframeMonths?: number;
  /** Cents. */
  avgJobValue?: number;
  projectionBasis?: string;

  // The plan
  phases?: ProposalPhase[];
  deliverables?: string[];
  customSections?: CustomSection[];

  // Offer
  /** Cents. */
  monthlyPrice?: number;
  /** Cents. */
  setupFee?: number;
  termMonths?: number;
  ctaLabel?: string;
  ctaUrl?: string;

  // Images
  logoImageUrl?: string;
  heroImageUrl?: string;

  /** Internal only; never rendered to a prospect. */
  adminNotes?: string;
}

export interface ProposalTemplate {
  id: string;
  label: string;
  /** One line, shown in the picker. */
  description: string;
  /**
   * Marks a template whose figures are invented illustration rather than
   * findings. The picker warns on it and the editor stamps a reminder into the
   * internal notes, because publishing this unedited would put fabricated
   * numbers about a real business in front of that business.
   */
  isSample?: boolean;
  fields: ProposalTemplateFields;
}

/** Every template ends with the same two commitments; only the wording above varies. */
const COMMON_DELIVERABLES = [
  'Monthly call report',
  'Your Google listing managed for you',
  'A real person to call',
];

export const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Start from nothing and write the plan yourself.',
    fields: {},
  },

  {
    id: 'sample-worked-example',
    label: 'Worked example (sample numbers)',
    isSample: true,
    description:
      'A complete filled-in proposal so you can see the finished page. Every figure is invented — replace them all.',
    fields: {
      contactName: 'Ray Delgado',
      email: 'ray@example.com',
      phone: '214-555-0180',
      city: 'Dallas',
      state: 'TX',
      serviceRadius: 75,
      fleetSize: 9,
      industry: 'Flatbed & heavy haul',
      truckTypes: ['Flatbed', 'Step deck', 'Lowboy'],

      currentCalls: 41,
      currentNotes:
        'Right now you show up on the second page for "flatbed hauling Dallas", and you do not appear on the map at all past about 20 miles out.',
      callSources: [
        { source: 'Google Search', share: 62 },
        {
          source: 'Google Maps',
          share: 38,
          note: 'Your profile is missing 5 of the services you actually run.',
        },
      ],

      projectedCalls: 56,
      timeframeMonths: 6,
      avgJobValue: 35000,
      projectionBasis:
        'SAMPLE TEXT — replace this. We looked at 14 flatbed outfits your size around DFW that we set this up for. Over six months their call volume moved between 30% and 45%. We used the low end of that range for your number.',

      phases: [
        {
          title: 'Get found',
          timeline: 'Weeks 1-2',
          items: ['Fix your Google listing', 'Add every service you actually run'],
        },
        {
          title: 'Show up locally',
          timeline: 'Weeks 3-6',
          items: ['Cover the full 75-mile radius', 'A page for each area you serve'],
        },
        {
          title: 'Turn searches into calls',
          timeline: 'Weeks 6-10',
          items: ['Make the phone number impossible to miss'],
        },
        {
          title: 'Track what works',
          timeline: 'Ongoing',
          items: ['A tracking number so you know what is working'],
        },
      ],
      deliverables: COMMON_DELIVERABLES,

      monthlyPrice: 89000,
      termMonths: 0,
      ctaLabel: 'Book a quick call',
      ctaUrl: 'https://calendly.com/example',

      adminNotes:
        'CREATED FROM THE WORKED EXAMPLE. Every number, note and the projection basis is invented sample data. Replace all of it — and the CTA link — before publishing.',
    },
  },

  {
    id: 'flatbed-heavy-haul',
    label: 'Flatbed & heavy haul',
    description: 'Open-deck carriers, oversize and step-deck work across a wide radius.',
    fields: {
      industry: 'Flatbed & heavy haul',
      truckTypes: ['Flatbed', 'Step deck', 'Lowboy', 'RGN'],
      callSources: [
        { source: 'Google Search' },
        { source: 'Google Maps' },
        { source: 'Load boards' },
        { source: 'Word of mouth' },
      ],
      phases: [
        {
          title: 'Get found',
          timeline: 'Weeks 1-2',
          items: [
            'Fix and verify your Google listing',
            'List every type of haul you actually run',
            'Sort out the photos so the equipment is obvious',
          ],
        },
        {
          title: 'Show up across your radius',
          timeline: 'Weeks 3-6',
          items: [
            'Cover the full service area, not just your home city',
            'A page for each corridor and lane you run',
            'Equipment-specific pages so oversize searches land on the right one',
          ],
        },
        {
          title: 'Turn searches into calls',
          timeline: 'Weeks 6-10',
          items: [
            'Make the phone number impossible to miss on a phone',
            'Answer the questions shippers ask before they call',
          ],
        },
        {
          title: 'Track what works',
          timeline: 'Ongoing',
          items: [
            'A tracking number so you know which channel produced the call',
            'A monthly report in plain English',
          ],
        },
      ],
      deliverables: COMMON_DELIVERABLES,
      ctaLabel: 'Book a quick call',
      termMonths: 0,
    },
  },

  {
    id: 'towing-recovery',
    label: 'Towing & recovery',
    description: 'Light and heavy-duty towing, roadside and accident recovery. Urgent, local, map-driven.',
    fields: {
      industry: 'Towing & recovery',
      truckTypes: ['Light-duty wrecker', 'Heavy-duty wrecker', 'Rollback / flatbed', 'Rotator'],
      callSources: [
        { source: 'Google Maps' },
        { source: 'Google Search' },
        { source: 'Motor clubs' },
        { source: 'Police / rotation list' },
        { source: 'Repeat customers' },
      ],
      phases: [
        {
          title: 'Win the map',
          timeline: 'Weeks 1-2',
          items: [
            'Verify and rebuild your Google listing',
            'List every service — winching, lockouts, jump starts, recovery',
            'Get the hours right, including nights and weekends',
          ],
        },
        {
          title: 'Cover your whole tow zone',
          timeline: 'Weeks 3-6',
          items: [
            'Show up on the map across the area you actually run, not just your yard',
            'A page for each town and stretch of highway you cover',
          ],
        },
        {
          title: 'Make calling instant',
          timeline: 'Weeks 5-8',
          items: [
            'Tap-to-call above everything else — nobody stranded is filling in a form',
            'Make response time and coverage obvious in the first line',
          ],
        },
        {
          title: 'Track what works',
          timeline: 'Ongoing',
          items: [
            'A tracking number so calls from the map are counted separately',
            'A monthly report in plain English',
          ],
        },
      ],
      deliverables: COMMON_DELIVERABLES,
      ctaLabel: 'Book a quick call',
      termMonths: 0,
    },
  },

  {
    id: 'local-delivery',
    label: 'Local delivery & box truck',
    description: 'Last-mile, courier, furniture and appliance delivery inside a metro.',
    fields: {
      industry: 'Local delivery & box truck',
      truckTypes: ['Box truck', 'Cargo van', 'Sprinter', 'Liftgate'],
      callSources: [
        { source: 'Google Search' },
        { source: 'Google Maps' },
        { source: 'Repeat business accounts' },
        { source: 'Referrals' },
      ],
      phases: [
        {
          title: 'Get found',
          timeline: 'Weeks 1-2',
          items: [
            'Fix and verify your Google listing',
            'Spell out exactly what you haul and what you do not',
          ],
        },
        {
          title: 'Show up across the metro',
          timeline: 'Weeks 3-6',
          items: [
            'Cover every suburb you deliver to',
            'Separate pages for the jobs worth the most to you',
          ],
        },
        {
          title: 'Turn searches into calls',
          timeline: 'Weeks 6-10',
          items: [
            'Make quoting a job take one tap',
            'Answer the pricing questions people ask before calling',
          ],
        },
        {
          title: 'Track what works',
          timeline: 'Ongoing',
          items: [
            'A tracking number per channel',
            'A monthly report in plain English',
          ],
        },
      ],
      deliverables: COMMON_DELIVERABLES,
      ctaLabel: 'Book a quick call',
      termMonths: 0,
    },
  },

  {
    id: 'dump-aggregate',
    label: 'Dump truck & aggregate',
    description: 'Dirt, gravel, demolition haul-off and site work for contractors.',
    fields: {
      industry: 'Dump truck & aggregate hauling',
      truckTypes: ['Tri-axle dump', 'Tandem dump', 'End dump', 'Side dump'],
      callSources: [
        { source: 'Google Search' },
        { source: 'Google Maps' },
        { source: 'Contractor relationships' },
        { source: 'Word of mouth' },
      ],
      phases: [
        {
          title: 'Get found',
          timeline: 'Weeks 1-2',
          items: [
            'Fix and verify your Google listing',
            'List the materials you haul and the jobs you take',
          ],
        },
        {
          title: 'Show up where the work is',
          timeline: 'Weeks 3-6',
          items: [
            'Cover the counties you run, not just your yard',
            'Pages aimed at the contractors and builders who book you',
          ],
        },
        {
          title: 'Turn searches into calls',
          timeline: 'Weeks 6-10',
          items: [
            'Make it easy to ask for a load count and a price',
            'Show capacity and turnaround up front',
          ],
        },
        {
          title: 'Track what works',
          timeline: 'Ongoing',
          items: [
            'A tracking number so you know which jobs came from search',
            'A monthly report in plain English',
          ],
        },
      ],
      deliverables: COMMON_DELIVERABLES,
      ctaLabel: 'Book a quick call',
      termMonths: 0,
    },
  },
];

export function getTemplate(id: string | undefined | null): ProposalTemplate | undefined {
  if (!id) return undefined;
  return PROPOSAL_TEMPLATES.find((t) => t.id === id);
}
