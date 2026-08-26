/**
 * Admin-saved templates.
 *
 * The built-in verticals in shared/proposalTemplates.ts are code. These are
 * rows: an admin builds a proposal, ticks which parts of it are worth reusing,
 * and it appears in the picker beside the built-ins.
 *
 * Every field can be carried, including the prospect-specific ones. That is a
 * deliberate change from the first version, which withheld them: `Duplicate`
 * has always copied an entire proposal, numbers included, so refusing the same
 * data here bought no real safety — it only made templates less capable than
 * the button beside them.
 *
 * What still holds:
 *   - the admin ticks each group explicitly and sees what it contains first
 *   - every carried value is visible in the editor before anything is published
 *   - validateForPublish still refuses a projection with no stated basis
 *
 * The groups marked `prospectSpecific` are the ones describing a particular
 * business rather than how the agency works. They are flagged so the dialog can
 * say so, since carrying them into a proposal for a different company means
 * reviewing them before it goes out.
 */

import type { PrismaClient, Proposal } from "@prisma/client";
import type { ProposalTemplateFields } from "../../shared/proposalTemplates";

export interface GroupSpec {
  id: string;
  label: string;
  /** Describes one business rather than the agency's way of working. */
  prospectSpecific?: boolean;
}

/** Selectable groups, in the order the dialog lists them. */
export const TEMPLATE_GROUPS: GroupSpec[] = [
  { id: "identity", label: "Contact details", prospectSpecific: true },
  { id: "location", label: "Location & fleet", prospectSpecific: true },
  { id: "industry", label: "Industry & equipment" },
  { id: "currentSituation", label: "Where they are today", prospectSpecific: true },
  { id: "projection", label: "The projection", prospectSpecific: true },
  { id: "phases", label: "Plan phases" },
  { id: "deliverables", label: "Deliverables" },
  { id: "pricing", label: "Pricing" },
  { id: "cta", label: "Call to action" },
  { id: "customSections", label: "Extra sections" },
  { id: "images", label: "Logo & hero image", prospectSpecific: true },
  { id: "adminNotes", label: "Internal notes" },
];

const GROUP_IDS = TEMPLATE_GROUPS.map((g) => g.id);

function arr<T>(v: unknown): T[] | undefined {
  return Array.isArray(v) && v.length > 0 ? (v as T[]) : undefined;
}

const money = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

/**
 * A short description of what each group would contribute, so the dialog can
 * show "Plan phases — 4 phases" rather than an unlabelled checkbox, and disable
 * the groups this proposal has nothing for.
 */
export function summariseGroups(p: Proposal): Record<string, string | null> {
  const types = arr<string>(p.truckTypes);
  const sources = arr<{ source?: string }>(p.callSources)?.filter((s) => s?.source);
  const join = (parts: (string | null | false | undefined)[]) => {
    const kept = parts.filter(Boolean) as string[];
    return kept.length ? kept.join(" · ") : null;
  };

  return {
    identity: join([p.contactName, p.phone, p.email, p.websiteUrl]),
    location: join([
      p.city && p.state ? `${p.city}, ${p.state}` : p.city,
      p.serviceRadius != null && `${p.serviceRadius} mile radius`,
      p.fleetSize != null && `${p.fleetSize} trucks`,
    ]),
    industry: join([p.industry, types?.length && `${types.length} equipment types`]),
    currentSituation: join([
      p.currentCalls != null && `${p.currentCalls} calls/mo`,
      sources?.length && `${sources.length} sources`,
      p.currentNotes && "notes",
    ]),
    projection: join([
      p.projectedCalls != null && `${p.projectedCalls} potential calls`,
      p.avgJobValue != null && `${money(p.avgJobValue)} job value`,
      p.projectionBasis && "stated basis",
    ]),
    phases: arr<unknown>(p.phases)?.length ? `${arr<unknown>(p.phases)!.length} phases` : null,
    deliverables: arr<string>(p.deliverables)?.length
      ? `${arr<string>(p.deliverables)!.length} items`
      : null,
    pricing: join([
      p.monthlyPrice != null && `${money(p.monthlyPrice)}/mo`,
      p.setupFee ? `${money(p.setupFee)} setup` : null,
      p.termMonths != null && (p.termMonths === 0 ? "no contract" : `${p.termMonths}-month term`),
    ]),
    cta: p.ctaLabel || p.ctaUrl || null,
    customSections: arr<unknown>(p.customSections)?.length
      ? `${arr<unknown>(p.customSections)!.length} sections`
      : null,
    images: join([p.logoImageUrl && "logo", p.heroImageUrl && "hero image"]),
    adminNotes: p.adminNotes ? p.adminNotes.trim().slice(0, 40) : null,
  };
}

/** Builds the template fields from the groups the admin ticked, and nothing else. */
export function extractTemplateFields(p: Proposal, include: string[]): ProposalTemplateFields {
  const on = (g: string) => include.includes(g);
  const out: ProposalTemplateFields = {};
  const set = <K extends keyof ProposalTemplateFields>(
    k: K,
    v: ProposalTemplateFields[K] | null | undefined,
  ) => {
    if (v !== null && v !== undefined) out[k] = v;
  };

  if (on("identity")) {
    // No companyName: the create dialog always supplies its own, and applying a
    // template to an existing draft must not rename it. Carrying it would put a
    // value on the checkbox that is guaranteed never to be used.
    set("contactName", p.contactName);
    set("email", p.email);
    set("phone", p.phone);
    set("websiteUrl", p.websiteUrl);
  }

  if (on("location")) {
    set("city", p.city);
    set("state", p.state);
    set("serviceRadius", p.serviceRadius);
    set("fleetSize", p.fleetSize);
  }

  if (on("industry")) {
    set("industry", p.industry);
    set("truckTypes", arr<string>(p.truckTypes)?.map(String));
  }

  if (on("currentSituation")) {
    set("currentCalls", p.currentCalls);
    set("currentNotes", p.currentNotes);
    // Full sources now, numbers included — the admin asked for the data, and
    // they can see and edit every row in the editor.
    const sources = arr<Record<string, unknown>>(p.callSources)
      ?.map((s) => ({
        source: String(s?.source ?? "").trim(),
        ...(typeof s?.share === "number" ? { share: s.share } : {}),
        ...(typeof s?.calls === "number" ? { calls: s.calls } : {}),
        ...(s?.note ? { note: String(s.note) } : {}),
      }))
      .filter((s) => s.source !== "");
    if (sources?.length) out.callSources = sources;
  }

  if (on("projection")) {
    set("projectedCalls", p.projectedCalls);
    set("timeframeMonths", p.timeframeMonths);
    set("avgJobValue", p.avgJobValue);
    set("projectionBasis", p.projectionBasis);
  }

  if (on("phases")) {
    const phases = arr<{ title?: string; timeline?: string; items?: unknown }>(p.phases)?.map(
      (ph) => ({
        title: String(ph?.title ?? ""),
        ...(ph?.timeline ? { timeline: String(ph.timeline) } : {}),
        items: Array.isArray(ph?.items) ? ph.items.map(String) : [],
      }),
    );
    if (phases?.length) out.phases = phases;
  }

  if (on("deliverables")) set("deliverables", arr<string>(p.deliverables)?.map(String));

  if (on("pricing")) {
    set("monthlyPrice", p.monthlyPrice);
    set("setupFee", p.setupFee);
    set("termMonths", p.termMonths);
  }

  if (on("cta")) {
    set("ctaLabel", p.ctaLabel);
    set("ctaUrl", p.ctaUrl);
  }

  if (on("customSections")) {
    const custom = arr<{ heading?: string; body?: string }>(p.customSections)?.map((c) => ({
      heading: String(c?.heading ?? ""),
      body: String(c?.body ?? ""),
    }));
    if (custom?.length) out.customSections = custom;
  }

  if (on("images")) {
    set("logoImageUrl", p.logoImageUrl);
    set("heroImageUrl", p.heroImageUrl);
  }

  if (on("adminNotes")) set("adminNotes", p.adminNotes);

  return out;
}

/** Keeps only recognised group ids, so a request cannot invent one. */
export function parseGroups(value: unknown): string[] {
  if (!Array.isArray(value)) return [...GROUP_IDS];
  return value.filter((v): v is string => typeof v === "string" && GROUP_IDS.includes(v));
}

/**
 * Saved templates, newest first, shaped like the built-ins for the picker.
 *
 * Scoped to the admin who saved them. The picker labels these "Yours", and they
 * can carry one admin's prospect contact details and figures, so that label had
 * better be true.
 */
export async function listSavedTemplates(prisma: PrismaClient, authorId: string) {
  return prisma.savedTemplate.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, name: true, description: true, createdAt: true },
  });
}

/**
 * Saved templates are addressed as `saved:<id>` so they can never collide with
 * a built-in id, and so an unknown id fails closed rather than silently
 * matching the wrong thing.
 */
export const SAVED_PREFIX = "saved:";

export async function getSavedTemplateFields(
  prisma: PrismaClient,
  templateId: string,
): Promise<ProposalTemplateFields | null> {
  if (!templateId.startsWith(SAVED_PREFIX)) return null;
  const row = await prisma.savedTemplate.findUnique({
    where: { id: templateId.slice(SAVED_PREFIX.length) },
    select: { fields: true },
  });
  if (!row) return null;
  const fields = (row.fields ?? {}) as ProposalTemplateFields;
  // A row whose blob is empty is as good as missing — the caller has to be able
  // to say "that template no longer fills anything in" rather than apply {}.
  return Object.keys(fields).length > 0 ? fields : null;
}
