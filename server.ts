import "dotenv/config";
import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Prisma, PrismaClient } from "@prisma/client";
import { runScan } from "./server/audit/scan";
import { runPsi } from "./server/audit/psi";
import { overallScore } from "./server/audit/checks";
import { AuditError, normalizeInput } from "./server/audit/url";
import { checkRateLimit } from "./server/audit/ratelimit";
import {
  checkLoginRate,
  clearLoginRate,
  clearSessionCookie,
  readCookie,
  requireAdmin,
  SESSION_COOKIE,
  sessionSecret,
  setSessionCookie,
  signSession,
  verifyPassword,
  verifySession,
} from "./server/auth";
import {
  isLikelyBot,
  isViewable,
  serializeForScriptTag,
  toPublicProposal,
} from "./server/proposals/public";
import { proposalAdminRoutes, UPLOAD_DIR } from "./server/proposals/routes";
import { REDIRECTS } from "./src/routes";
import type { AuditCategory, AuditResult } from "./shared/auditTypes";

// All inbound lead notifications are delivered to this inbox.
const LEAD_NOTIFY_EMAIL = "vickigms1@gmail.com";
// File-based backup so a lead is never lost even if the database is down.
const LEADS_BACKUP_FILE = path.join(process.cwd(), "leads.json");

const prisma = new PrismaClient();

type LeadInput = Record<string, string>;

function backupLeadToFile(lead: LeadInput) {
  try {
    let leads: LeadInput[] = [];
    try {
      leads = JSON.parse(fs.readFileSync(LEADS_BACKUP_FILE, "utf-8"));
    } catch {
      // no backup file yet
    }
    leads.unshift(lead);
    fs.writeFileSync(LEADS_BACKUP_FILE, JSON.stringify(leads, null, 2), "utf-8");
  } catch (err) {
    console.error("[Leads] File backup failed:", err);
  }
}

// Forward the lead to email via FormSubmit (https://formsubmit.co).
// NOTE: the very first submission triggers a one-time activation email to
// LEAD_NOTIFY_EMAIL — click the link inside it once and all future leads
// arrive automatically. Returns whether the forward succeeded.
async function emailLead(lead: LeadInput): Promise<boolean> {
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${LEAD_NOTIFY_EMAIL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `New OptimizeIndex lead: ${lead.company || lead.website || "unknown"} (${lead.type})`,
        _template: "table",
        ...lead,
      }),
    });
    if (!res.ok) {
      console.error(`[Leads] Email forward failed with status ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Leads] Email forward failed:", err);
    return false;
  }
}

function clientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "";
}

function clientCountry(req: express.Request): string {
  // Populated automatically when behind Cloudflare / Vercel / some proxies.
  const h = req.headers;
  return String(h["cf-ipcountry"] || h["x-vercel-ip-country"] || h["x-country-code"] || "");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  // Resolve the signing secret up front. In production a missing SESSION_SECRET
  // throws here, at boot, rather than at the first login attempt — a server that
  // cannot sign sessions should not come up claiming to be healthy.
  sessionSecret();

  // Middleware
  //
  // gzip everything compressible. nginx in front of this has no gzip_types, and
  // nginx's default covers text/html only — so without this the ~500 KB JS
  // bundle went over the wire uncompressed.
  app.use(compression());
  app.use(express.json());

  /**
   * Canonical host + legacy URL redirects.
   *
   * Must run before every route so nothing serves duplicate content at 200.
   * Two URLs with identical content split the ranking signals they earn, and
   * the site had four such pairs plus the www host.
   */
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();

    const host = String(req.headers.host || "");
    const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https");

    // www -> apex. nginx serves both hostnames from one block and passes Host
    // through, so doing it here fixes it without a server-side nginx edit.
    if (host.toLowerCase().startsWith("www.")) {
      const target = `${proto}://${host.slice(4)}${req.originalUrl}`;
      res.redirect(301, target);
      return;
    }

    const alias = REDIRECTS[req.path.replace(/\/+$/, "") || "/"];
    if (alias) {
      const query = req.originalUrl.slice(req.path.length); // preserve ?goal=…
      res.redirect(301, alias + query);
      return;
    }

    // Trailing slashes on anything but the root are a second URL for the same page.
    if (req.path.length > 1 && req.path.endsWith("/")) {
      res.redirect(301, req.path.replace(/\/+$/, "") + req.originalUrl.slice(req.path.length));
      return;
    }

    next();
  });

  // Health endpoint for uptime monitoring (e.g. UptimeRobot pinging every 5 min).
  // Returns 503 when the database is unreachable so monitors alert on real outages.
  app.get("/api/health", async (req, res) => {
    try {
      // Probe the Lead table itself (not just the connection) so the monitor
      // alerts when the schema is missing or migrations haven't been applied.
      await prisma.$queryRaw`SELECT 1 FROM "Lead" LIMIT 1`;
      res.json({ status: "ok", db: "up", time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: "degraded", db: "down", time: new Date().toISOString() });
    }
  });

  // Analytics ingestion: visitors, sessions, page views, events.
  // Best-effort by design — never let analytics failures surface to visitors.
  app.post("/api/track", async (req, res) => {
    const body = req.body || {};
    const str = (v: unknown, max = 500) => String(v ?? "").slice(0, max);
    const visitorId = str(body.visitorId, 100);
    const sessionId = str(body.sessionId, 100);
    if (!visitorId || !sessionId) {
      res.status(400).json({ error: "visitorId and sessionId are required" });
      return;
    }

    const s = body.session || {};
    const country = clientCountry(req);
    const userAgent = str(req.headers["user-agent"]);
    const ipAddress = str(clientIp(req), 100);

    try {
      // 1. Visitor: create with first-touch attribution, or refresh lastSeenAt
      await prisma.visitor.upsert({
        where: { id: visitorId },
        create: {
          id: visitorId,
          firstReferrer: str(s.referrer, 1000),
          firstLandingPage: str(s.entryPage, 1000),
          firstUtmSource: str(s.utmSource, 200),
          firstUtmMedium: str(s.utmMedium, 200),
          firstUtmCampaign: str(s.utmCampaign, 200),
          deviceType: str(s.deviceType, 20),
          browser: str(s.browser, 50),
          os: str(s.os, 50),
          language: str(s.language, 20),
          timezone: str(s.timezone, 100),
          country: country || null,
        },
        update: {
          lastSeenAt: new Date(),
          ...(body.sessionIsNew ? { sessionCount: { increment: 1 } } : {}),
        },
      });

      // 2. Session: create on first batch, otherwise refresh activity/exit page
      const lastPath = Array.isArray(body.pageViews) && body.pageViews.length > 0
        ? str(body.pageViews[body.pageViews.length - 1].path, 1000)
        : undefined;
      await prisma.session.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          visitorId,
          entryPage: str(s.entryPage, 1000),
          referrer: str(s.referrer, 1000),
          utmSource: str(s.utmSource, 200),
          utmMedium: str(s.utmMedium, 200),
          utmCampaign: str(s.utmCampaign, 200),
          utmTerm: str(s.utmTerm, 200),
          utmContent: str(s.utmContent, 200),
          deviceType: str(s.deviceType, 20),
          browser: str(s.browser, 50),
          os: str(s.os, 50),
          screenWidth: Number(s.screenWidth) || null,
          screenHeight: Number(s.screenHeight) || null,
          language: str(s.language, 20),
          timezone: str(s.timezone, 100),
          country: country || null,
          ipAddress,
          userAgent,
          exitPage: lastPath,
        },
        update: {
          lastActivityAt: new Date(),
          ...(lastPath ? { exitPage: lastPath } : {}),
        },
      });

      // 3. Page views: client-generated ids; the end-of-view batch updates
      // the same row with duration and scroll depth.
      const pageViews = Array.isArray(body.pageViews) ? body.pageViews.slice(0, 100) : [];
      for (const pv of pageViews) {
        const id = str(pv.id, 100);
        if (!id) continue;
        const data = {
          sessionId,
          visitorId,
          path: str(pv.path, 1000),
          title: str(pv.title, 300),
          durationMs: pv.durationMs != null ? Number(pv.durationMs) || 0 : undefined,
          maxScrollPct: pv.maxScrollPct != null ? Number(pv.maxScrollPct) || 0 : undefined,
        };
        await prisma.pageView.upsert({
          where: { id },
          create: { id, ...data, startedAt: pv.startedAt ? new Date(pv.startedAt) : new Date() },
          update: { durationMs: data.durationMs, maxScrollPct: data.maxScrollPct },
        });
      }

      // 4. Events
      const events = Array.isArray(body.events) ? body.events.slice(0, 200) : [];
      if (events.length > 0) {
        await prisma.event.createMany({
          data: events.map((ev: Record<string, unknown>) => ({
            sessionId,
            visitorId,
            name: str(ev.name, 50) || "unknown",
            label: str(ev.label, 300) || null,
            path: str(ev.path, 1000) || null,
            metadata: ev.metadata && typeof ev.metadata === "object" ? ev.metadata : undefined,
            createdAt: ev.createdAt ? new Date(String(ev.createdAt)) : new Date(),
          })),
        });
      }

      // 5. Keep denormalized counters current for cheap dashboard queries
      const [pvCount, evCount] = await Promise.all([
        prisma.pageView.count({ where: { sessionId } }),
        prisma.event.count({ where: { sessionId } }),
      ]);
      await prisma.session.update({
        where: { id: sessionId },
        data: { pageViewCount: pvCount, eventCount: evCount },
      });

      res.json({ ok: true });
    } catch (err) {
      console.error("[Track] Ingestion failed:", err);
      // Still 200 — the client must never retry-loop or surface analytics errors
      res.json({ ok: false });
    }
  });

  /* -----------------------------------------------------------------------
     INSTANT SITE AUDIT
     Two stages so the hero can show real findings in a few seconds while
     Google's speed test — the slow half — is still running.

     These are the only routes that make the server fetch a URL a stranger
     supplied, so they are the only ones that are rate limited. The SSRF
     guarding lives in server/audit/url.ts.
  ----------------------------------------------------------------------- */

  const AUDIT_CACHE_MS = 6 * 60 * 60 * 1000;

  function categoryScore(categories: AuditCategory[], id: string): number | null {
    return categories.find((c) => c.id === id)?.score ?? null;
  }

  function sendAuditError(res: express.Response, err: unknown) {
    if (err instanceof AuditError) {
      const status = err.code === "BLOCKED_HOST" || err.code === "INVALID_URL" ? 400 : 502;
      res.status(status).json({ error: { code: err.code, message: err.message, status: err.status } });
      return;
    }
    console.error("[Audit] Unexpected failure:", err);
    res.status(500).json({
      error: { code: "UNKNOWN", message: "Something went wrong running that scan." },
    });
  }

  app.post("/api/audit/scan", async (req, res) => {
    const body = req.body || {};
    const rawUrl = String(body.url ?? "").slice(0, 2000);
    const visitorId = String(body.visitorId ?? "").slice(0, 100) || null;
    const sessionId = String(body.sessionId ?? "").slice(0, 100) || null;

    // Normalize first: it's pure string work, and it gives us the cache key
    // before we spend a crawl or a rate-limit slot on it.
    let domain: string;
    try {
      domain = normalizeInput(rawUrl).domain;
    } catch (err) {
      sendAuditError(res, err);
      return;
    }

    // A recent complete audit of the same domain is served whole. This is
    // what stops the endpoint being used to hammer a third-party site.
    const cached = await prisma.siteAudit
      .findFirst({
        where: {
          domain,
          psiFetched: true,
          checks: { not: Prisma.DbNull },
          createdAt: { gt: new Date(Date.now() - AUDIT_CACHE_MS) },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => null);

    if (cached?.checks) {
      const payload = cached.checks as unknown as AuditResult;
      res.json({
        ...payload,
        auditId: cached.id,
        meta: { ...payload.meta, cached: true, psiPending: false },
      });
      return;
    }

    const limit = checkRateLimit(clientIp(req) || "unknown");
    if (!limit.allowed) {
      res.status(429).json({
        error: { code: "RATE_LIMITED", message: limit.message, retryAfterSec: limit.retryAfterSec },
      });
      return;
    }

    try {
      const { result } = await runScan(rawUrl);

      const saved = await prisma.siteAudit
        .create({
          data: {
            url: result.url,
            finalUrl: result.finalUrl,
            domain: result.domain,
            overallScore: result.overall,
            technicalScore: categoryScore(result.categories, "technical"),
            contentScore: categoryScore(result.categories, "content"),
            geoScore: categoryScore(result.categories, "geo"),
            durationMs: result.meta.durationMs,
            // Stored so the PageSpeed stage can merge into it server-side,
            // and so a cache hit can replay the whole report.
            checks: result as unknown as Prisma.InputJsonValue,
            visitorId,
            sessionId,
            ipAddress: clientIp(req).slice(0, 100),
            userAgent: String(req.headers["user-agent"] ?? "").slice(0, 500),
          },
        })
        .catch((err) => {
          // The visitor still gets their audit if the database is down.
          console.error("[Audit] Could not persist scan:", err);
          return null;
        });

      console.log(`[Audit] Scanned ${result.domain} — ${result.overall}/100 in ${result.meta.durationMs}ms`);
      res.json({ ...result, auditId: saved?.id ?? "" });
    } catch (err) {
      // Failures are recorded too — a domain someone tried to check is a lead
      // signal even when the scan couldn't complete.
      await prisma.siteAudit
        .create({
          data: {
            url: rawUrl.slice(0, 500),
            domain,
            errorCode: err instanceof AuditError ? err.code : "UNKNOWN",
            visitorId,
            sessionId,
            ipAddress: clientIp(req).slice(0, 100),
          },
        })
        .catch(() => {});
      sendAuditError(res, err);
    }
  });

  app.post("/api/audit/psi", async (req, res) => {
    const body = req.body || {};
    const auditId = String(body.auditId ?? "").slice(0, 100);
    const rawUrl = String(body.url ?? "").slice(0, 2000);
    if (!rawUrl) {
      res.status(400).json({ error: { code: "INVALID_URL", message: "url is required" } });
      return;
    }
    // Re-validate: this URL arrives from the client and must clear the same
    // bar as the original scan before we hand it to Google.
    try {
      normalizeInput(rawUrl);
    } catch (err) {
      sendAuditError(res, err);
      return;
    }

    try {
      const outcome = await runPsi(rawUrl);

      // The other three categories are read back from the stored scan rather
      // than accepted from the client, so the overall score can't be forged.
      const stored = auditId
        ? await prisma.siteAudit.findUnique({ where: { id: auditId } }).catch(() => null)
        : null;
      const priorResult = stored?.checks as unknown as AuditResult | null;

      const combined: AuditCategory[] = [
        ...(priorResult?.categories ?? []).filter((c) => c.id !== "performance"),
        outcome.category,
      ];
      // Only meaningful when the stored scan was found; otherwise the client
      // recomputes from the categories it is already holding.
      const overall = priorResult ? overallScore(combined) : null;

      if (stored && priorResult) {
        const merged: AuditResult = {
          ...priorResult,
          auditId: stored.id,
          overall: overall ?? priorResult.overall,
          overallState: "final",
          categories: priorResult.categories.map((c) =>
            c.id === "performance" ? outcome.category : c,
          ),
          cwv: outcome.cwv,
          lighthouse: outcome.lighthouse,
          meta: { ...priorResult.meta, psiPending: false },
        };
        await prisma.siteAudit
          .update({
            where: { id: stored.id },
            data: {
              psiFetched: outcome.available,
              performanceScore: outcome.category.score,
              overallScore: overall ?? undefined,
              lcpMs: outcome.cwv?.lcpMs ?? null,
              clsScore: outcome.cwv?.cls ?? null,
              inpMs: outcome.cwv?.inpMs ?? null,
              cwvSource: outcome.cwv?.source ?? null,
              checks: merged as unknown as Prisma.InputJsonValue,
            },
          })
          .catch(() => {});
      }

      res.json({
        auditId,
        available: outcome.available,
        note: outcome.note,
        overall,
        category: outcome.category,
        cwv: outcome.cwv,
        lighthouse: outcome.lighthouse,
      });
    } catch (err) {
      sendAuditError(res, err);
    }
  });

  app.post("/api/leads", async (req, res) => {
    const body = req.body || {};
    if (!body.email || !body.website) {
      res.status(400).json({ error: "email and website are required" });
      return;
    }

    const str = (v: unknown, max = 2000) => String(v ?? "").slice(0, max);

    const leadData = {
      type: str(body.type) || "unknown",
      name: str(body.name, 200),
      email: str(body.email, 320),
      phone: str(body.phone, 50),
      company: str(body.company, 200),
      website: str(body.website, 500),
      competitor: str(body.competitor, 500),
      goal: str(body.goal, 50),
      service: str(body.service, 50),
      budget: str(body.budget, 100),
      comments: str(body.comments, 5000),
      // Marketing attribution captured client-side
      utmSource: str(body.utmSource, 200),
      utmMedium: str(body.utmMedium, 200),
      utmCampaign: str(body.utmCampaign, 200),
      utmTerm: str(body.utmTerm, 200),
      utmContent: str(body.utmContent, 200),
      referrer: str(body.referrer, 1000),
      landingPage: str(body.landingPage, 1000),
      submittedFrom: str(body.submittedFrom, 1000),
      gaClientId: str(body.gaClientId, 100),
      // Journey linkage to the analytics tables
      visitorId: str(body.visitorId, 100),
      sessionId: str(body.sessionId, 100),
      auditId: str(body.auditId, 100),
      // Technical context captured server-side
      userAgent: str(req.headers["user-agent"], 500),
      ipAddress: str(clientIp(req), 100),
    };

    // 1. Email forward (primary notification channel)
    const emailForwarded = await emailLead({ ...leadData, createdAt: new Date().toISOString() });

    // 2. Database (source of truth for business analysis)
    let dbId: string | null = null;
    try {
      const saved = await prisma.lead.create({ data: { ...leadData, emailForwarded } });
      dbId = saved.id;
      console.log(`[Leads] Saved ${leadData.type} lead ${saved.id} from ${leadData.email} (db)`);

      // Mark the visitor and session as converted for funnel analysis
      if (leadData.visitorId) {
        await prisma.visitor
          .update({
            where: { id: leadData.visitorId },
            data: { convertedAt: new Date(), leadEmail: leadData.email },
          })
          .catch(() => {}); // visitor row may not exist if tracking was blocked
      }
      if (leadData.sessionId) {
        await prisma.session
          .update({ where: { id: leadData.sessionId }, data: { isConverted: true } })
          .catch(() => {});
      }
      // Tie the audit they ran to the email they gave, so the report we send
      // back is the one they actually saw.
      if (leadData.auditId) {
        await prisma.siteAudit
          .update({ where: { id: leadData.auditId }, data: { leadEmail: leadData.email } })
          .catch(() => {});
      }
    } catch (err) {
      console.error("[Leads] Database write failed, falling back to file backup:", err);
    }

    // 3. File backup — always written when the DB failed, so nothing is lost
    if (!dbId) {
      backupLeadToFile({
        id: "lead_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        createdAt: new Date().toISOString(),
        ...leadData,
        emailForwarded: String(emailForwarded),
      });
      console.log(`[Leads] Saved ${leadData.type} lead from ${leadData.email} (file backup)`);
    }

    // The lead was captured via at least one channel — report success to the visitor.
    res.json({ ok: true, id: dbId || "backup" });
  });

  /* =======================================================================
     Proposal portal
     =======================================================================
     Admin authentication, then the public proposal pages served at the root
     (optimizeindex.com/abc-logistics).

     These are the only pages on the site that are not pre-rendered — they are
     per-prospect, so there is no build-time artifact for them. They are served
     from an empty app shell with the proposal JSON inlined into the HTML, which
     keeps the prospect's first paint a single round trip.
  ======================================================================= */

  // --- Auth -------------------------------------------------------------

  app.post("/api/admin/login", async (req, res) => {
    const ip = clientIp(req) || "unknown";
    const gate = checkLoginRate(ip);
    if (!gate.allowed) {
      res.setHeader("Retry-After", String(gate.retryAfterSec ?? 60));
      res.status(429).json({ error: "too_many_attempts", retryAfterSec: gate.retryAfterSec });
      return;
    }

    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      res.status(400).json({ error: "missing_credentials" });
      return;
    }

    try {
      const user = await prisma.adminUser.findUnique({ where: { email } });

      // One generic message for "no such account", "wrong password" and
      // "deactivated". Distinguishing them turns the login form into a way to
      // enumerate who has an account.
      if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
        console.warn(`[Auth] Failed login for ${email} from ${ip}`);
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }

      clearLoginRate(ip);
      setSessionCookie(res, signSession(user.id));
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
      console.error("[Auth] Login failed:", err);
      res.status(503).json({ error: "auth_unavailable" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get("/api/admin/me", async (req, res) => {
    const userId = verifySession(readCookie(req, SESSION_COOKIE));
    if (!userId) {
      res.status(401).json({ error: "unauthenticated" });
      return;
    }
    try {
      const user = await prisma.adminUser.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, isActive: true },
      });
      if (!user || !user.isActive) {
        clearSessionCookie(res);
        res.status(401).json({ error: "unauthenticated" });
        return;
      }
      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
      console.error("[Auth] /me failed:", err);
      res.status(503).json({ error: "auth_unavailable" });
    }
  });

  // --- Admin proposal API -----------------------------------------------

  app.use("/api/admin", requireAdmin(prisma), proposalAdminRoutes(prisma));

  /**
   * Uploaded images.
   *
   * Served from outside dist/ because `vite build` empties that directory on
   * every deploy, which would delete every prospect's logo. The filenames are
   * random hex, so a long immutable cache is safe — an edited image gets a new
   * name rather than a new version of an old one.
   *
   * `dotfiles: "deny"` and the absence of `index` keep this to exactly what was
   * uploaded, nothing more.
   */
  app.use(
    "/uploads",
    express.static(UPLOAD_DIR, {
      index: false,
      redirect: false,
      dotfiles: "deny",
      maxAge: "1y",
      immutable: true,
    }),
  );

  // --- Public proposal read + view tracking -----------------------------

  /**
   * Resolves a single URL segment to a viewable proposal.
   *
   * Returns null for drafts, archived and expired proposals as well as unknown
   * slugs, so all four produce an identical 404. A distinguishable response
   * would confirm that a named company is a prospect of ours.
   */
  async function lookupProposal(slug: string) {
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) return null;
    try {
      const proposal = await prisma.proposal.findUnique({ where: { slug } });
      if (!proposal || !isViewable(proposal)) return null;
      return proposal;
    } catch (err) {
      console.error(`[Proposals] Lookup failed for "${slug}":`, err);
      return null;
    }
  }

  /**
   * Logs the render as an *unconfirmed* view.
   *
   * Email clients and security gateways prefetch links, so this alone is not
   * evidence a human opened anything. POST /api/p/:slug/view (fired 3s into a
   * real browser session) is what promotes the row to confirmed.
   */
  async function recordProposalView(proposalId: string, req: express.Request) {
    const userAgent = String(req.headers["user-agent"] || "");
    try {
      await prisma.proposalView.create({
        data: {
          proposalId,
          confirmed: false,
          isBot: isLikelyBot(userAgent),
          ipAddress: clientIp(req),
          userAgent,
          referrer: String(req.headers.referer || ""),
        },
      });
    } catch (err) {
      // Never let analytics break the page the prospect came to read.
      console.error("[Proposals] View logging failed:", err);
    }
  }

  /**
   * Promotes the most recent view for this viewer to confirmed.
   *
   * Also clears isBot: running JavaScript three seconds in is stronger evidence
   * of a real browser than the user-agent heuristic is evidence against one, so
   * a misflagged prospect still gets counted.
   */
  app.post("/api/p/:slug/view", async (req, res) => {
    const proposal = await lookupProposal(String(req.params.slug || ""));
    if (!proposal) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const viewerKey = String(req.body?.viewerKey || "").slice(0, 64) || null;
    try {
      const recent = await prisma.proposalView.findFirst({
        where: { proposalId: proposal.id, ipAddress: clientIp(req) },
        orderBy: { viewedAt: "desc" },
      });
      if (recent) {
        await prisma.proposalView.update({
          where: { id: recent.id },
          data: { confirmed: true, isBot: false, viewerKey },
        });
      } else {
        await prisma.proposalView.create({
          data: {
            proposalId: proposal.id,
            confirmed: true,
            isBot: false,
            viewerKey,
            ipAddress: clientIp(req),
            userAgent: String(req.headers["user-agent"] || ""),
          },
        });
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[Proposals] View confirm failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  /** Engagement on the way out: how long they stayed, how far they scrolled. */
  app.post("/api/p/:slug/engagement", async (req, res) => {
    const proposal = await lookupProposal(String(req.params.slug || ""));
    if (!proposal) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const viewerKey = String(req.body?.viewerKey || "").slice(0, 64);
    const durationMs = Number(req.body?.durationMs);
    const maxScrollPct = Number(req.body?.maxScrollPct);

    try {
      const recent = await prisma.proposalView.findFirst({
        where: { proposalId: proposal.id, viewerKey: viewerKey || undefined, confirmed: true },
        orderBy: { viewedAt: "desc" },
      });
      if (recent) {
        await prisma.proposalView.update({
          where: { id: recent.id },
          data: {
            durationMs: Number.isFinite(durationMs) ? Math.min(durationMs, 6 * 60 * 60 * 1000) : null,
            maxScrollPct: Number.isFinite(maxScrollPct)
              ? Math.max(0, Math.min(100, Math.round(maxScrollPct)))
              : null,
          },
        });
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[Proposals] Engagement update failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  /** Only these event names are accepted — the endpoint is public. */
  const PROPOSAL_EVENTS = new Set([
    "cta_click",
    "section_view",
    "phone_click",
    "email_click",
    "reply_submit",
  ]);

  app.post("/api/p/:slug/event", async (req, res) => {
    const proposal = await lookupProposal(String(req.params.slug || ""));
    if (!proposal) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const name = String(req.body?.name || "");
    if (!PROPOSAL_EVENTS.has(name)) {
      res.status(400).json({ error: "unknown_event" });
      return;
    }
    try {
      await prisma.proposalEvent.create({
        data: {
          proposalId: proposal.id,
          name,
          label: String(req.body?.label || "").slice(0, 200) || null,
          viewerKey: String(req.body?.viewerKey || "").slice(0, 64) || null,
        },
      });
      res.json({ ok: true });
    } catch (err) {
      console.error("[Proposals] Event write failed:", err);
      res.status(503).json({ error: "unavailable" });
    }
  });

  /**
   * Injects the proposal payload and a noindex directive into the app shell.
   *
   * The payload goes in as JSON rather than being fetched after load, so the
   * page the prospect opens is complete on first paint. serializeForScriptTag
   * escapes it — a company name containing "</script>" would otherwise close
   * the tag and turn the rest of the payload into markup.
   */
  function injectShell(html: string, payload: string | null): string {
    // The built shell carries its own robots meta, as a safety net for the case
    // where app-shell.html is fetched directly. The dev template does not, so
    // it is added here only when absent rather than unconditionally.
    const robots = /<meta[^>]+name="robots"/i.test(html)
      ? ""
      : '<meta name="robots" content="noindex, nofollow" />';
    const script = payload ? `<script>window.__PROPOSAL__ = ${payload};</script>` : "";
    return html.replace("</head>", `${robots}${script}</head>`);
  }

  /**
   * Headers for every page in the portal.
   *
   * Both the admin app and the proposal pages carry a named prospect's business
   * data. `X-Robots-Tag` is belt-and-braces with the meta tag above: it also
   * covers the case where a crawler reads the headers but not the body.
   */
  function setPrivateHeaders(res: express.Response) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
  }

  // Vite Middleware integration for SPA routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    /**
     * Dev equivalents of the production shell routes below.
     *
     * These must be registered before vite.middlewares, whose SPA fallback
     * would otherwise answer /admin and every proposal slug with an
     * un-injected index.html.
     */
    const devShell = async (url: string) => {
      const raw = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
      return vite.transformIndexHtml(url, raw);
    };

    app.get(/^\/admin(?:\/.*)?$/, async (req, res, next) => {
      try {
        setPrivateHeaders(res);
        res.status(200).type("html").send(injectShell(await devShell(req.originalUrl), null));
      } catch (err) {
        next(err);
      }
    });

    app.get(/^\/[a-z0-9][a-z0-9-]*$/, async (req, res, next) => {
      try {
        const proposal = await lookupProposal(req.path.slice(1));
        if (!proposal) return next();

        void recordProposalView(proposal.id, req);
        setPrivateHeaders(res);
        const payload = serializeForScriptTag(toPublicProposal(proposal));
        res.status(200).type("html").send(injectShell(await devShell(req.originalUrl), payload));
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    // dist/client only. The backend bundle (dist/server.cjs, plus its sourcemap)
    // and the SSR bundle (dist/ssr) deliberately live outside this directory —
    // serving the whole of dist/ published the entire backend at /server.cjs.
    const distPath = path.join(process.cwd(), "dist", "client");

    // Hashed assets are immutable and can be cached for a year; HTML must
    // revalidate or a pre-render fix would take a year to reach repeat visitors.
    app.use(
      express.static(distPath, {
        index: false, // the route resolver below owns HTML, not express.static
        // Without this, express.static sees dist/services/ as a directory and
        // 301s /services -> /services/, which the trailing-slash rule above
        // then 301s straight back. Every pre-rendered route was a redirect loop.
        redirect: false,
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
          }
        },
      }),
    );

    /**
     * Serves the pre-rendered HTML for a path, or a real 404.
     *
     * The old fallback returned dist/index.html for *every* unmatched path at
     * HTTP 200 — a soft 404. Google treats those as thin duplicates of the
     * homepage, and it meant a typo'd URL looked like a real page.
     */
    const pageFor = (urlPath: string): string | null => {
      const clean = urlPath.length > 1 ? urlPath.replace(/\/+$/, "") : "/";
      const candidate =
        clean === "/" ? path.join(distPath, "index.html") : path.join(distPath, clean, "index.html");
      // Refuse anything that escapes dist — the path comes from the URL.
      const resolved = path.resolve(candidate);
      if (!resolved.startsWith(path.resolve(distPath))) return null;
      return fs.existsSync(resolved) ? resolved : null;
    };

    /**
     * The un-prerendered app shell, written by scripts/prerender.ts alongside
     * the static pages. Everything the portal serves is built from this: the
     * pre-rendered index.html contains the marketing homepage's markup and
     * would flash it before React replaced it.
     */
    const shellPath = path.join(distPath, "app-shell.html");
    let shellHtml: string | null = null;
    const readShell = (): string | null => {
      if (shellHtml !== null) return shellHtml;
      if (!fs.existsSync(shellPath)) {
        console.error(
          `[Proposals] ${shellPath} is missing. Run \`npm run build\` — the prerender step writes it. ` +
            "The admin app and every proposal page will 404 until it exists.",
        );
        return null;
      }
      shellHtml = fs.readFileSync(shellPath, "utf-8");
      return shellHtml;
    };

    app.get(/^\/admin(?:\/.*)?$/, (req, res, next) => {
      const shell = readShell();
      if (!shell) return next();
      setPrivateHeaders(res);
      res.status(200).type("html").send(injectShell(shell, null));
    });

    app.get("*", async (req, res) => {
      const page = pageFor(req.path);
      if (page) {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        res.sendFile(page);
        return;
      }

      // Not a pre-rendered page. Before 404ing, check whether this single
      // segment is a published proposal — this is what makes
      // optimizeindex.com/abc-logistics resolve.
      const segments = req.path.split("/").filter(Boolean);
      if (segments.length === 1) {
        const shell = readShell();
        const proposal = shell ? await lookupProposal(segments[0]) : null;
        if (proposal && shell) {
          void recordProposalView(proposal.id, req);
          setPrivateHeaders(res);
          const payload = serializeForScriptTag(toPublicProposal(proposal));
          res.status(200).type("html").send(injectShell(shell, payload));
          return;
        }
      }

      const notFound = path.join(distPath, "404.html");
      res
        .status(404)
        .sendFile(fs.existsSync(notFound) ? notFound : path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OptimizeIndex Server] Server running on http://localhost:${PORT}`);
  });
}

startServer();
