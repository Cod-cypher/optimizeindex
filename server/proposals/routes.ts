/**
 * Admin API for the proposal portal.
 *
 * Every route here is behind requireAdmin. The public side of the portal — the
 * slug lookup and the tracking beacons — lives in server.ts, because it has to
 * be interleaved with static file resolution.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { Prisma, type PrismaClient } from "@prisma/client";
import { isReservedSlug, isValidSlugShape, uniqueSlug } from "./slug";
import { getTemplate } from "../../shared/proposalTemplates";
import type { ProposalTemplateFields } from "../../shared/proposalTemplates";
import {
  extractTemplateFields,
  getSavedTemplateFields,
  listSavedTemplates,
  parseGroups,
  SAVED_PREFIX,
  summariseGroups,
  TEMPLATE_GROUPS,
} from "./templates";
import type { AdminRequest } from "../auth";

/** Where uploaded images land. Outside dist/ — `vite build` empties that. */
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/** Rows per page when the admin has not chosen otherwise. */
export const DEFAULT_PER_PAGE = 15;
/** Ceiling for `perPage`, whatever the query string asks for. */
export const MAX_PER_PAGE = 100;

/** Decoded image bytes. Comfortably above a logo or a truck photo. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/* -------------------------------------------------------------------------
   Input coercion
   -------------------------------------------------------------------------
   The editor autosaves partial objects, so every field is optional and only
   the keys actually present are written. `undefined` means "not supplied,
   leave it alone"; an explicit null means "clear it".
------------------------------------------------------------------------- */

function str(value: unknown, maxLen = 2000): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s.slice(0, maxLen);
}

function int(value: unknown, min = 0, max = 2_000_000_000): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

/**
 * URLs that end up in an href or an img src on the prospect's page.
 *
 * Rejects everything that is not http(s) or a same-origin /uploads path. The
 * admin is trusted, but "javascript:..." pasted into the CTA field would
 * execute on a page we send to a third party, and that is worth one check.
 */
function safeUrl(value: unknown): string | null | undefined {
  const s = str(value, 2000);
  if (s === undefined || s === null) return s;

  if (s.startsWith("/uploads/") && !s.includes("..")) return s;

  try {
    const parsed = new URL(s);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  } catch {
    // Not absolute. Fall through — a bare "example.com" is a common paste.
    if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(\/.*)?$/i.test(s)) return `https://${s}`;
  }
  return null;
}

/** Trims a free-form array to sane bounds. Non-arrays clear the column. */
function jsonList(value: unknown, maxItems = 40): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) return Prisma.DbNull;
  return value.slice(0, maxItems) as Prisma.InputJsonValue;
}

function date(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Drops keys whose value is `undefined` so Prisma leaves those columns alone. */
function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

/** Maps a request body to Prisma column values. Shared by create and update. */
function proposalFields(body: Record<string, unknown>) {
  return defined({
    companyName: str(body.companyName, 200),
    contactName: str(body.contactName, 200),
    email: str(body.email, 320),
    phone: str(body.phone, 50),
    websiteUrl: safeUrl(body.websiteUrl),
    city: str(body.city, 120),
    state: str(body.state, 120),
    serviceRadius: int(body.serviceRadius, 0, 5000),
    industry: str(body.industry, 120),
    fleetSize: int(body.fleetSize, 0, 100000),
    truckTypes: jsonList(body.truckTypes),
    heroImageUrl: safeUrl(body.heroImageUrl),
    logoImageUrl: safeUrl(body.logoImageUrl),

    currentCalls: int(body.currentCalls, 0, 1_000_000),
    callSources: jsonList(body.callSources),
    currentNotes: str(body.currentNotes, 5000),

    projectedCalls: int(body.projectedCalls, 0, 1_000_000),
    avgJobValue: int(body.avgJobValue, 0, 1_000_000_00),
    timeframeMonths: int(body.timeframeMonths, 0, 120),
    projectionBasis: str(body.projectionBasis, 2000),

    phases: jsonList(body.phases, 20),
    deliverables: jsonList(body.deliverables, 60),
    monthlyPrice: int(body.monthlyPrice, 0, 100_000_00),
    setupFee: int(body.setupFee, 0, 100_000_00),
    termMonths: int(body.termMonths, 0, 120),
    ctaLabel: str(body.ctaLabel, 80),
    ctaUrl: safeUrl(body.ctaUrl),
    customSections: jsonList(body.customSections, 20),

    adminNotes: str(body.adminNotes, 10000),
    accessCode: str(body.accessCode, 100),
    expiresAt: date(body.expiresAt),
  });
}

/**
 * A template's fields as Prisma column values.
 *
 * Every key in ProposalTemplateFields is already a key proposalFields() knows,
 * so the mapping is the same one the editor's own PATCH goes through. Reusing it
 * rather than hand-writing a second copy means a template cannot skip the checks
 * a typed-in value gets — safeUrl() on the CTA and image URLs in particular,
 * which matters because those end up in an href and an img src on a page we send
 * to a third party.
 */
function templateToColumns(fields: ProposalTemplateFields) {
  const columns = proposalFields(fields as Record<string, unknown>) as Record<string, unknown>;

  /*
    A template fills fields in; it never empties one. proposalFields turns an
    empty array into DbNull and an empty string into null, which is right for a
    PATCH from the editor ("clear this") and wrong here — applying a template
    that happens to carry an empty list would wipe the column it landed on.
  */
  for (const [key, value] of Object.entries(columns)) {
    if (value === null || value === Prisma.DbNull) delete columns[key];
  }
  return columns;
}

/**
 * Resolves a picker id to its fields: `saved:<id>` reads the admin's own row,
 * anything else is a built-in vertical.
 *
 * Returns `undefined` for "no template asked for" and `null` for "asked for one
 * that does not exist" — callers must tell those apart, because a template the
 * admin picked and then had silently ignored is how a proposal ends up blank
 * with nothing on screen explaining why.
 */
async function resolveTemplateFields(
  prisma: PrismaClient,
  templateId: string,
): Promise<ProposalTemplateFields | null | undefined> {
  if (!templateId) return undefined;
  if (templateId.startsWith(SAVED_PREFIX)) {
    return (await getSavedTemplateFields(prisma, templateId)) ?? null;
  }
  return getTemplate(templateId)?.fields ?? null;
}

/* -------------------------------------------------------------------------
   Publish validation
------------------------------------------------------------------------- */

export interface ValidationProblem {
  field: string;
  message: string;
}

/**
 * What must be true before a prospect can see the page.
 *
 * The projection rules are the substantive ones. A growth number with no stated
 * basis is a fabricated statistic, and a "projection" at or below today's volume
 * is not an opportunity — both would undermine the document rather than sell it.
 */
export function validateForPublish(p: {
  companyName: string | null;
  projectedCalls: number | null;
  currentCalls: number | null;
  projectionBasis: string | null;
}): ValidationProblem[] {
  const problems: ValidationProblem[] = [];

  if (!p.companyName || p.companyName.trim() === "") {
    problems.push({ field: "companyName", message: "A company name is required." });
  }

  if (p.projectedCalls != null) {
    if (!p.projectionBasis || p.projectionBasis.trim() === "") {
      problems.push({
        field: "projectionBasis",
        message:
          "Explain where the projected call volume comes from. A growth number with no stated basis cannot be published.",
      });
    }
    if (p.currentCalls == null) {
      problems.push({
        field: "currentCalls",
        message: "Set the current monthly calls so the increase has a baseline.",
      });
    } else if (p.projectedCalls <= p.currentCalls) {
      problems.push({
        field: "projectedCalls",
        message: `Projected calls (${p.projectedCalls}) must be higher than current calls (${p.currentCalls}).`,
      });
    }
  }

  return problems;
}

/* -------------------------------------------------------------------------
   Image upload
------------------------------------------------------------------------- */

/**
 * Identifies an image from its leading bytes rather than its extension or the
 * declared MIME type, both of which are supplied by the client.
 */
function sniffImage(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }
  return null;
}

/* -------------------------------------------------------------------------
   Router
------------------------------------------------------------------------- */

export function proposalAdminRoutes(prisma: PrismaClient): express.Router {
  const router = express.Router();

  /** List one page, with the engagement summary the dashboard sorts on. */
  router.get("/proposals", async (req, res) => {
    const status = String(req.query.status || "");
    const q = String(req.query.q || "").trim();

    // Clamped rather than trusted: these come straight off the query string.
    const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
    // Clamped to the same set the UI offers, so a hand-edited query string
    // cannot ask for 10,000 rows.
    const perPage = Math.min(
      MAX_PER_PAGE,
      Math.max(5, Math.floor(Number(req.query.perPage)) || DEFAULT_PER_PAGE),
    );

    const where = {
      ...(status && status !== "ALL" ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { companyName: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
              { contactName: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    try {
      const proposals = await prisma.proposal.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          slug: true,
          status: true,
          companyName: true,
          contactName: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
          expiresAt: true,
          projectedCalls: true,
          currentCalls: true,
        },
      });

      const ids = proposals.map((p) => p.id);

      /*
        Two different totals, deliberately.

        `total` counts what matches the current filter, and drives the pager.
        `stats` counts the whole pipeline regardless of filter, because the
        header summary answers "how is the pipeline doing?" — filtering to
        Drafts previously made it report 0 live, which was simply wrong.
      */
      const [total, statTotal, statLive, statOpened] = await Promise.all([
        prisma.proposal.count({ where }),
        prisma.proposal.count(),
        prisma.proposal.count({ where: { status: "PUBLISHED" } }),
        prisma.proposal.count({
          where: { views: { some: { confirmed: true, isBot: false } } },
        }),
      ]);

      // Only confirmed, non-bot views count. A raw render count would include
      // every email scanner that prefetched the link.
      const [viewGroups, eventGroups] = await Promise.all([
        prisma.proposalView.groupBy({
          by: ["proposalId"],
          where: { proposalId: { in: ids }, confirmed: true, isBot: false },
          _count: { _all: true },
          _max: { viewedAt: true },
        }),
        prisma.proposalEvent.groupBy({
          by: ["proposalId"],
          where: { proposalId: { in: ids }, name: "cta_click" },
          _count: { _all: true },
        }),
      ]);

      const viewsBy = new Map(viewGroups.map((g) => [g.proposalId, g] as const));
      const clicksBy = new Map(eventGroups.map((g) => [g.proposalId, g._count._all] as const));

      res.json({
        proposals: proposals.map((p) => ({
          ...p,
          viewCount: viewsBy.get(p.id)?._count._all ?? 0,
          lastViewedAt: viewsBy.get(p.id)?._max.viewedAt ?? null,
          ctaClicks: clicksBy.get(p.id) ?? 0,
        })),
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
        stats: { total: statTotal, live: statLive, opened: statOpened },
      });
    } catch (err) {
      console.error("[Proposals] List failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  router.post("/proposals", async (req: AdminRequest, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const companyName = str(body.companyName, 200);

    if (!companyName) {
      res.status(400).json({ error: "invalid", problems: [{ field: "companyName", message: "A company name is required." }] });
      return;
    }

    try {
      const slug = await uniqueSlug(prisma, String(body.slug || companyName));

      /*
        A template carries whatever the admin ticked when they saved it — the
        plan and the pricing, and, if they said so, the contact details and the
        prospect figures too. See server/proposals/templates.ts for why that is
        deliberate. Anything explicitly posted alongside it still wins, so the
        template is a default and never an override.
      */
      const templateId = String(body.templateId || "");
      const tf = await resolveTemplateFields(prisma, templateId);

      /*
        A picked-but-missing template is refused rather than ignored. Choosing a
        template someone deleted used to produce an empty draft and a 201, which
        looked exactly like the template having carried nothing.
      */
      if (tf === null) {
        res.status(404).json({ error: "template_not_found" });
        return;
      }

      // proposalFields(body) is spread afterwards so anything typed into the
      // create dialog — the company name in particular — wins over the template.
      const templateData = tf ? templateToColumns(tf) : {};

      const proposal = await prisma.proposal.create({
        data: {
          ...templateData,
          ...proposalFields(body),
          companyName,
          slug,
          authorId: req.adminId!,
        },
      });
      res.status(201).json({ proposal });
    } catch (err) {
      console.error("[Proposals] Create failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  router.get("/proposals/:id", async (req, res) => {
    try {
      const proposal = await prisma.proposal.findUnique({ where: { id: String(req.params.id) } });
      if (!proposal) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({ proposal });
    } catch (err) {
      console.error("[Proposals] Fetch failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  router.patch("/proposals/:id", async (req, res) => {
    const id = String(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;

    try {
      const existing = await prisma.proposal.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      const data = proposalFields(body);
      const problems: ValidationProblem[] = [];

      /*
        A slug change is a URL change: any link already sent stops working, so it
        is only honoured when explicitly different and still valid.

        Its validation reports rather than rejects, and this matters more than it
        looks. The editor autosaves every keystroke and sends every field dirtied
        since the last save in one patch, so a slug on its way to being valid is
        invalid for a few hundred milliseconds — "a" is too short, "abc-" ends in
        a hyphen. Aborting the request there discarded the whole patch, so a
        contact name typed a second earlier died with it, silently, and kept
        dying on every save afterwards because `slug` stayed in the pending set.
        An unusable slug is simply not written; everything else still lands, and
        the field says why.
      */
      if (typeof body.slug === "string") {
        const wanted = body.slug.trim().toLowerCase();
        if (wanted && wanted !== existing.slug) {
          if (!isValidSlugShape(wanted)) {
            problems.push({
              field: "slug",
              message: "Use lowercase letters, numbers and hyphens only.",
            });
          } else if (isReservedSlug(wanted)) {
            problems.push({ field: "slug", message: `"${wanted}" is reserved by the site.` });
          } else {
            const clash = await prisma.proposal.findUnique({
              where: { slug: wanted },
              select: { id: true },
            });
            if (clash && clash.id !== id) {
              problems.push({
                field: "slug",
                message: `"${wanted}" is already used by another proposal.`,
              });
            } else {
              (data as Record<string, unknown>).slug = wanted;
            }
          }
        }
      }

      const proposal = await prisma.proposal.update({ where: { id }, data });
      res.json({ proposal, problems });
    } catch (err) {
      console.error("[Proposals] Update failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  router.post("/proposals/:id/publish", async (req, res) => {
    const id = String(req.params.id);
    try {
      const existing = await prisma.proposal.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      const problems = validateForPublish(existing);
      if (problems.length > 0) {
        res.status(400).json({ error: "invalid", problems });
        return;
      }

      const proposal = await prisma.proposal.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          // Preserved on re-publish so "prepared on" does not jump forward
          // every time a typo is fixed.
          publishedAt: existing.publishedAt ?? new Date(),
        },
      });
      res.json({ proposal });
    } catch (err) {
      console.error("[Proposals] Publish failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  router.post("/proposals/:id/unpublish", async (req, res) => {
    try {
      const proposal = await prisma.proposal.update({
        where: { id: String(req.params.id) },
        data: { status: "DRAFT" },
      });
      res.json({ proposal });
    } catch (err) {
      console.error("[Proposals] Unpublish failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  router.post("/proposals/:id/duplicate", async (req: AdminRequest, res) => {
    try {
      const source = await prisma.proposal.findUnique({ where: { id: String(req.params.id) } });
      if (!source) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      const {
        id: _id,
        slug: _slug,
        createdAt: _c,
        updatedAt: _u,
        publishedAt: _p,
        status: _s,
        authorId: _a,
        ...rest
      } = source;

      const proposal = await prisma.proposal.create({
        data: {
          ...rest,
          truckTypes: rest.truckTypes ?? Prisma.DbNull,
          callSources: rest.callSources ?? Prisma.DbNull,
          phases: rest.phases ?? Prisma.DbNull,
          deliverables: rest.deliverables ?? Prisma.DbNull,
          customSections: rest.customSections ?? Prisma.DbNull,
          companyName: `${source.companyName} (copy)`,
          slug: await uniqueSlug(prisma, `${source.companyName} copy`),
          status: "DRAFT",
          publishedAt: null,
          authorId: req.adminId!,
        },
      });
      res.status(201).json({ proposal });
    } catch (err) {
      console.error("[Proposals] Duplicate failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  /**
   * Applies a template to a draft that already exists.
   *
   * Creating from a template only helps if you chose it before you started
   * typing. This is the same fill for a proposal already underway.
   *
   * The default fills only columns that are still empty, so applying a template
   * cannot destroy work already in the draft. `overwrite` replaces everything
   * the template carries. Either way the response says which columns actually
   * changed — a fill that quietly did nothing is indistinguishable from a
   * template that carried nothing, and that ambiguity is what made this feature
   * look broken in the first place.
   */
  router.post("/proposals/:id/apply-template", async (req, res) => {
    const id = String(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const overwrite = body.overwrite === true;

    try {
      const existing = await prisma.proposal.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      const fields = await resolveTemplateFields(prisma, String(body.templateId || ""));
      if (!fields) {
        res.status(404).json({ error: "template_not_found" });
        return;
      }

      const columns = templateToColumns(fields);

      /*
        Identity stays with the proposal, not the template. companyName drives
        the slug and the whole page heading, and slug/status/accessCode are not
        template material at all.
      */
      delete (columns as Record<string, unknown>).companyName;
      delete (columns as Record<string, unknown>).accessCode;
      delete (columns as Record<string, unknown>).expiresAt;

      const row = existing as unknown as Record<string, unknown>;
      const data: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(columns)) {
        const current = row[key];
        const empty =
          current === null ||
          current === undefined ||
          (Array.isArray(current) && current.length === 0) ||
          (typeof current === "string" && current.trim() === "");
        if (overwrite || empty) data[key] = value;
      }

      const applied = Object.keys(data);
      if (applied.length === 0) {
        res.json({ proposal: existing, applied });
        return;
      }

      const proposal = await prisma.proposal.update({ where: { id }, data });
      res.json({ proposal, applied });
    } catch (err) {
      console.error("[Proposals] Apply template failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  /**
   * Archive rather than delete. The view and event history is the record of
   * whether a prospect engaged, and it is worth keeping after a deal is lost.
   */
  router.delete("/proposals/:id", async (req, res) => {
    try {
      await prisma.proposal.update({
        where: { id: String(req.params.id) },
        data: { status: "ARCHIVED" },
      });
      res.json({ ok: true });
    } catch (err) {
      console.error("[Proposals] Archive failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  router.get("/proposals/:id/activity", async (req, res) => {
    const proposalId = String(req.params.id);
    try {
      const [views, events, scannerHits] = await Promise.all([
        prisma.proposalView.findMany({
          where: { proposalId, confirmed: true, isBot: false },
          orderBy: { viewedAt: "desc" },
          take: 100,
          select: {
            id: true,
            viewedAt: true,
            durationMs: true,
            maxScrollPct: true,
            viewerKey: true,
            referrer: true,
          },
        }),
        prisma.proposalEvent.findMany({
          where: { proposalId },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.proposalView.count({ where: { proposalId, OR: [{ confirmed: false }, { isBot: true }] } }),
      ]);

      const uniqueViewers = new Set(views.map((v) => v.viewerKey).filter(Boolean)).size;

      res.json({
        views,
        events,
        summary: {
          viewCount: views.length,
          uniqueViewers,
          lastViewedAt: views[0]?.viewedAt ?? null,
          ctaClicks: events.filter((e) => e.name === "cta_click").length,
          // Surfaced separately and labelled, never folded into viewCount.
          scannerHits,
        },
      });
    } catch (err) {
      console.error("[Proposals] Activity failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  /* ---------------------------------------------------------------------
     Saved templates
  --------------------------------------------------------------------- */

  router.get("/templates", async (req: AdminRequest, res) => {
    try {
      res.json({ templates: await listSavedTemplates(prisma, req.adminId!) });
    } catch (err) {
      console.error("[Templates] List failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  /** What each selectable group would contribute for a given proposal. */
  router.get("/proposals/:id/template-groups", async (req, res) => {
    try {
      const source = await prisma.proposal.findUnique({ where: { id: String(req.params.id) } });
      if (!source) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({ groups: summariseGroups(source), specs: TEMPLATE_GROUPS });
    } catch (err) {
      console.error("[Templates] Group summary failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  /** Saves the parts of an existing proposal the admin ticked. */
  router.post("/templates", async (req: AdminRequest, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = str(body.name, 80);
    const fromProposalId = String(body.fromProposalId || "");

    if (!name) {
      res.status(400).json({
        error: "invalid",
        problems: [{ field: "name", message: "Give the template a name." }],
      });
      return;
    }

    try {
      const source = await prisma.proposal.findUnique({ where: { id: fromProposalId } });
      if (!source) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      /*
        Whatever the admin ticked — one group or all of them. The only refusal
        is an empty selection, because a template that carries nothing would sit
        in the picker doing nothing when chosen.
      */
      const include = parseGroups(body.include);
      const fields = extractTemplateFields(source, include);

      if (Object.keys(fields).length === 0) {
        res.status(400).json({
          error: "invalid",
          problems: [
            {
              field: "include",
              message: "Tick at least one thing to include in the template.",
            },
          ],
        });
        return;
      }

      const template = await prisma.savedTemplate.create({
        data: {
          name,
          description: str(body.description, 200) ?? null,
          fields: fields as Prisma.InputJsonValue,
          authorId: req.adminId!,
        },
      });
      res.status(201).json({ template });
    } catch (err) {
      console.error("[Templates] Create failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  router.delete("/templates/:id", async (req: AdminRequest, res) => {
    try {
      /*
        Checked before deleting rather than letting Prisma's P2025 fall into the
        catch below, which reported a missing template as "Cannot reach the
        database right now." The authorId is part of the match, so one admin
        cannot delete another's.
      */
      const existing = await prisma.savedTemplate.findFirst({
        where: { id: String(req.params.id), authorId: req.adminId! },
        select: { id: true },
      });
      if (!existing) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      await prisma.savedTemplate.delete({ where: { id: existing.id } });
      res.json({ ok: true });
    } catch (err) {
      console.error("[Templates] Delete failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  /**
   * Image upload as base64 JSON rather than multipart.
   *
   * Avoids adding multer for one endpoint, and lets the editor send a file it
   * already read for the preview thumbnail. The body limit is set on this route
   * alone — the global express.json() cap is 100 KB and would reject any image.
   */
  router.post("/upload", express.json({ limit: "8mb" }), async (req, res) => {
    const dataUrl = String((req.body ?? {}).dataUrl || "");
    const match = /^data:([a-z/+-]+);base64,(.+)$/i.exec(dataUrl);

    if (!match) {
      res.status(400).json({ error: "invalid_payload", message: "Expected a base64 data URL." });
      return;
    }

    let buf: Buffer;
    try {
      buf = Buffer.from(match[2], "base64");
    } catch {
      res.status(400).json({ error: "invalid_payload", message: "Could not decode the image." });
      return;
    }

    if (buf.length > MAX_IMAGE_BYTES) {
      res.status(413).json({
        error: "too_large",
        message: `Images must be under ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`,
      });
      return;
    }

    const kind = sniffImage(buf);
    if (!kind) {
      res.status(400).json({
        error: "unsupported_type",
        message: "Only JPEG, PNG and WebP images are accepted.",
      });
      return;
    }

    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const id = crypto.randomBytes(16).toString("hex");

      let filename = `${id}.${kind === "jpeg" ? "jpg" : kind}`;
      let output = buf;

      // sharp is an optionalDependency and genuinely fails to install on some
      // hosts. Losing the resize is acceptable; losing the upload is not.
      try {
        const sharp = (await import("sharp")).default;
        output = await sharp(buf)
          .rotate() // honour EXIF orientation before the metadata is dropped
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        filename = `${id}.webp`;
      } catch (err) {
        console.warn("[Proposals] sharp unavailable, storing the original image:", err);
      }

      fs.writeFileSync(path.join(UPLOAD_DIR, filename), output);
      res.status(201).json({ url: `/uploads/${filename}`, bytes: output.length });
    } catch (err) {
      console.error("[Proposals] Upload failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  return router;
}
