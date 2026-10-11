export const meta = {
  name: 'seo-improvement-plan',
  description: 'Four seo-explorer agents map the codebase while seo-researcher gathers current practice; then seo-comparer, seo-reviewer and seo-planner',
  whenToUse: 'To produce a sourced, code-grounded SEO / AEO / GEO improvement plan for this site',
  phases: [
    { title: 'Explore', detail: '4 x seo-explorer in parallel, one per area' },
    { title: 'Research', detail: 'seo-researcher: current SEO, AEO and GEO practice from first-party sources' },
    { title: 'Compare', detail: 'seo-comparer: sourced practice vs the code' },
    { title: 'Review', detail: 'seo-reviewer: verify every gap against code, sources and CLAUDE.md' },
    { title: 'Plan', detail: 'seo-planner writes the prioritized plan' },
  ],
}

// Each role's model, tools and standing instructions live in .claude/agents/seo-*.md;
// change a model there, not here. This script only sequences the agents and passes
// data between stages. Pass {"today": "YYYY-MM-DD"} as args to stamp the date.

const TODAY = (args && args.today) || "today's date (from your environment)"

const AREAS = [
  { key: 'head-schema', title: 'Head metadata, structured data and the SEO build gate' },
  { key: 'crawl-serve', title: 'Crawling, indexing and serving' },
  { key: 'content-links', title: 'Content, information architecture and internal linking' },
  { key: 'render-cwv', title: 'Rendering and page experience (Core Web Vitals)' },
]

// ---------- schemas ----------

const EXPLORE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Three to six sentences on how this area is implemented today' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          current_state: { type: 'string', description: 'What the code does today, with real values quoted' },
          evidence: { type: 'array', items: { type: 'string' }, description: 'file:line references' },
          possible_gap: { type: 'string', description: 'Anything missing, inconsistent or risky; empty string if none' },
        },
        required: ['topic', 'current_state', 'evidence', 'possible_gap'],
      },
    },
    unknowns: { type: 'array', items: { type: 'string' }, description: 'What cannot be determined from the code alone' },
  },
  required: ['summary', 'findings', 'unknowns'],
}

const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    practices: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Stable short id, e.g. CRAWL-03, SD-02, AI-05' },
          area: { type: 'string', enum: ['spam-policy', 'content-quality', 'crawl-index', 'rendering-js', 'snippets-metadata', 'structured-data', 'performance', 'internal-linking', 'local', 'ai-search', 'measurement', 'off-site'] },
          practice: { type: 'string', description: 'What to do or avoid, stated precisely' },
          why: { type: 'string', description: 'What the source says, closely paraphrased or quoted' },
          source_url: { type: 'string' },
          source_owner: { type: 'string', description: 'e.g. Google Search Central, Bing, OpenAI' },
          primary_source: { type: 'boolean' },
          verified_by_fetch: { type: 'boolean', description: 'True only if you opened the page itself' },
          status: { type: 'string', enum: ['current', 'changed-2025-2026', 'deprecated', 'contested'] },
          notes: { type: 'string' },
        },
        required: ['id', 'area', 'practice', 'why', 'source_url', 'source_owner', 'primary_source', 'verified_by_fetch', 'status', 'notes'],
      },
    },
    myths_and_deprecations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { claim: { type: 'string' }, reality: { type: 'string' }, source_url: { type: 'string' } },
        required: ['claim', 'reality', 'source_url'],
      },
    },
    recent_changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { when: { type: 'string' }, change: { type: 'string' }, source_url: { type: 'string' } },
        required: ['when', 'change', 'source_url'],
      },
    },
    serp_notes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { query: { type: 'string' }, observed: { type: 'string' } },
        required: ['query', 'observed'],
      },
    },
    unverified: { type: 'array', items: { type: 'string' }, description: 'Claims seen but not confirmed from a primary source' },
  },
  required: ['practices', 'myths_and_deprecations', 'recent_changes', 'serp_notes', 'unverified'],
}

const COMPARE_SCHEMA = {
  type: 'object',
  properties: {
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'GAP-01, GAP-02, ...' },
          title: { type: 'string' },
          area: { type: 'string' },
          practice_ids: { type: 'array', items: { type: 'string' } },
          current_state: { type: 'string' },
          gap: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
          constraints: { type: 'string', description: 'CLAUDE.md rules or build gates this touches; empty string if none' },
        },
        required: ['id', 'title', 'area', 'practice_ids', 'current_state', 'gap', 'evidence', 'recommendation', 'impact', 'effort', 'constraints'],
      },
    },
    strengths: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } },
          practice_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'evidence', 'practice_ids'],
      },
    },
    not_applicable: {
      type: 'array',
      items: {
        type: 'object',
        properties: { practice_id: { type: 'string' }, reason: { type: 'string' } },
        required: ['practice_id', 'reason'],
      },
    },
  },
  required: ['gaps', 'strengths', 'not_applicable'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          gap_id: { type: 'string' },
          verdict: { type: 'string', enum: ['confirmed', 'revised', 'rejected'] },
          reason: { type: 'string' },
          revised_recommendation: { type: 'string', description: 'The corrected recommendation when revised; empty string otherwise' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
        },
        required: ['gap_id', 'verdict', 'reason', 'revised_recommendation', 'impact', 'effort'],
      },
    },
    missed: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          area: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
          source_url: { type: 'string', description: 'Supporting source, or empty string for a project-rule finding' },
        },
        required: ['title', 'area', 'evidence', 'recommendation', 'impact', 'effort', 'source_url'],
      },
    },
    cautions: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdicts', 'missed', 'cautions'],
}

// ---------- run ----------

const results = await parallel([
  ...AREAS.map(a => () => agent(
    `Explore area: ${a.key} (${a.title}). Work through that area's checklist in your instructions.`,
    { label: `explore:${a.key}`, phase: 'Explore', agentType: 'seo-explorer', schema: EXPLORE_SCHEMA })),
  () => agent(
    `Research current SEO, AEO and GEO practice for OptimizeIndex as your instructions describe. Today is ${TODAY}; use it as checkedAt.`,
    { label: 'research:web', phase: 'Research', agentType: 'seo-researcher', schema: RESEARCH_SCHEMA }),
])

const explorers = AREAS.map((a, i) => results[i] && { area: a.title, ...results[i] }).filter(Boolean)
const research = results[AREAS.length]
if (explorers.length < AREAS.length) log(`${AREAS.length - explorers.length} explorer(s) returned nothing; continuing with ${explorers.length}`)
if (!explorers.length) return { error: 'No explorer returned a map of the codebase.' }
if (!research) return { error: 'The web researcher returned nothing, so there is nothing to compare against.' }
const findingCount = explorers.reduce((n, e) => n + e.findings.length, 0)
log(`${findingCount} code findings across ${explorers.length} areas; ${research.practices.length} sourced practices`)

const compare = await agent(`Produce the gap analysis described in your instructions. The practices were checked ${TODAY}.

(A) Explorer maps:
${JSON.stringify(explorers)}

(B) Research:
${JSON.stringify(research)}`, { label: 'compare', phase: 'Compare', agentType: 'seo-comparer', schema: COMPARE_SCHEMA })
if (!compare) return { error: 'The comparison agent returned nothing.' }
log(`${compare.gaps.length} gaps, ${compare.strengths.length} strengths, ${compare.not_applicable.length} not applicable`)

const coverage = explorers.map(e => ({ area: e.area, summary: e.summary, unknowns: e.unknowns }))

const review = await agent(`Review this gap analysis as your instructions describe.

Gap analysis:
${JSON.stringify(compare)}

Research practices (for source checks):
${JSON.stringify(research.practices)}

What each explorer covered, and what it could not determine:
${JSON.stringify(coverage)}`, { label: 'review', phase: 'Review', agentType: 'seo-reviewer', schema: REVIEW_SCHEMA })
if (!review) return { error: 'The review agent returned nothing.', gaps: compare.gaps }

const verdicts = Object.fromEntries((review.verdicts || []).map(v => [v.gap_id, v]))
const accepted = []
const rejected = []
for (const g of compare.gaps) {
  const v = verdicts[g.id]
  if (v && v.verdict === 'rejected') {
    rejected.push({ id: g.id, title: g.title, reason: v.reason })
    continue
  }
  accepted.push({
    ...g,
    recommendation: v && v.verdict === 'revised' && v.revised_recommendation ? v.revised_recommendation : g.recommendation,
    impact: v ? v.impact : g.impact,
    effort: v ? v.effort : g.effort,
    review: v ? `${v.verdict}: ${v.reason}` : 'unreviewed',
  })
}
const unreviewed = accepted.filter(g => g.review === 'unreviewed').length
if (unreviewed) log(`${unreviewed} gap(s) had no reviewer verdict; passed to the planner marked unreviewed`)
const missed = (review.missed || []).map((m, i) => ({ id: `MISS-${String(i + 1).padStart(2, '0')}`, ...m }))
const unknowns = explorers.flatMap(e => e.unknowns.map(u => `${e.area}: ${u}`))
const count = verdict => (review.verdicts || []).filter(v => v.verdict === verdict).length
log(`Review: ${count('confirmed')} confirmed, ${count('revised')} revised, ${rejected.length} rejected, ${missed.length} added`)

const plan = await agent(`Write the plan as your instructions describe. Today is ${TODAY}.

Accepted gaps (the reviewer's revised recommendation, impact and effort are already applied):
${JSON.stringify(accepted)}

Reviewer additions:
${JSON.stringify(missed)}

Cautions:
${JSON.stringify(review.cautions)}

Already strong:
${JSON.stringify(compare.strengths)}

Rejected (for "Not doing"):
${JSON.stringify(rejected)}

Myths, deprecations and recent changes:
${JSON.stringify({ myths: research.myths_and_deprecations, recent: research.recent_changes })}

Unknowns from exploration and unverified claims (for "Open questions"):
${JSON.stringify({ unknowns, unverified: research.unverified })}`, { label: 'plan', phase: 'Plan', agentType: 'seo-planner' })
if (!plan) return { error: 'The planner returned nothing.', accepted, missed, rejected }

return {
  plan,
  stats: {
    explorers: `${explorers.length}/${AREAS.length}`,
    code_findings: findingCount,
    practices: research.practices.length,
    gaps: compare.gaps.length,
    confirmed: count('confirmed'),
    revised: count('revised'),
    rejected: rejected.length,
    unreviewed,
    added_by_reviewer: missed.length,
  },
  rejected,
}
