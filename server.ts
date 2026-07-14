import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";

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
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware
  app.use(express.json());

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

  // Vite Middleware integration for SPA routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OptimizeIndex Server] Server running on http://localhost:${PORT}`);
  });
}

startServer();
