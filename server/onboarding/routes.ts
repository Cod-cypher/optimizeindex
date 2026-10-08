/**
 * POST /api/onboarding/towing — the towing business setup form.
 *
 * Its own endpoint and table rather than /api/leads and Lead. The answers are
 * worth reading one at a time — who runs rotators, who covers which ZIP codes —
 * which /api/leads' closed key list and 5,000-char comments field do not
 * allow. Built for clients who had already bought; since the header's "Become
 * a Tow Provider" button links here, new towing companies submit it too, and
 * neither is counted as a GA4 conversion or marked converted in the funnel.
 *
 * Validated against ONBOARDING_SECTIONS, the same definitions the form renders
 * from: a single choice must be one of its options, a multi-choice is filtered
 * to them, free text is clamped to the field's maxLength. The client is not
 * trusted to have done any of it.
 *
 * Delivery mirrors persistLead() in server.ts, in order of how much we would
 * regret losing it: the email, then the database, and the leads.json file only
 * when the database write failed.
 */

import express from "express";
import type { Prisma, PrismaClient } from "@prisma/client";
import { ONBOARDING_CONFIRMATION, ONBOARDING_SECTIONS, type OnboardingField } from "../../src/content/onboarding";
import { towingOnboardingEmail, type OnboardingAnswers } from "./email";

export interface OnboardingDeps {
  /** Mails the team (LEAD_NOTIFY_OVERRIDES in server.ts). False when nothing got out. */
  sendMail: (msg: { subject: string; html: string; text: string; replyTo?: string }) => Promise<boolean>;
  /** The leads.json fallback, for when the database write fails. */
  backup: (record: Record<string, string>) => void;
  clientIp: (req: express.Request) => string;
}

const FIELDS = ONBOARDING_SECTIONS.flatMap((s) => s.fields);

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Shape only, as on the client. A bounced reply is the real validation. */
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

function parseAnswer(field: OnboardingField, raw: unknown): string | string[] {
  if (field.kind === "multi") {
    const picked = Array.isArray(raw) ? raw : [];
    // Filtering the options rather than the input keeps the form's order and
    // drops anything the form never offered.
    return field.options.filter((option) => picked.includes(option));
  }
  const value = str(raw, field.maxLength ?? 500);
  if (field.kind === "single") return field.options.includes(value) ? value : "";
  return value;
}

/** Discriminated on a string: this project does not enable strictNullChecks. */
type ParseResult =
  | { kind: "ok"; answers: OnboardingAnswers }
  | { kind: "invalid"; problems: string[] };

function parseSubmission(rawAnswers: unknown, confirmed: unknown): ParseResult {
  const source = rawAnswers && typeof rawAnswers === "object" ? (rawAnswers as Record<string, unknown>) : {};
  const answers: OnboardingAnswers = {};
  const problems: string[] = [];

  for (const field of FIELDS) {
    const value = parseAnswer(field, source[field.id]);
    answers[field.id] = value;
    const empty = Array.isArray(value) ? value.length === 0 : !value;
    if (field.required && empty) problems.push(field.label);
    else if (field.kind === "email" && !empty && !isValidEmail(value as string)) problems.push(field.label);
  }
  if (confirmed !== true) problems.push(ONBOARDING_CONFIRMATION.title);

  return problems.length ? { kind: "invalid", problems } : { kind: "ok", answers };
}

/** Column names are the field ids; an unanswered optional question is stored as null. */
function toColumns(answers: OnboardingAnswers): Record<string, string | string[] | null> {
  const columns: Record<string, string | string[] | null> = {};
  for (const field of FIELDS) {
    const value = answers[field.id];
    columns[field.id] = Array.isArray(value) ? value : value || null;
  }
  return columns;
}

export function onboardingRoutes(prisma: PrismaClient, deps: OnboardingDeps): express.Router {
  const router = express.Router();

  router.post("/towing", async (req, res) => {
    const body = req.body || {};
    const parsed = parseSubmission(body.answers, body.confirmed);
    if (parsed.kind === "invalid") {
      res.status(400).json({ error: "Some required answers are missing or invalid", fields: parsed.problems });
      return;
    }
    const { answers } = parsed;

    const context = {
      submittedFrom: str(body.submittedFrom, 1000) || null,
      visitorId: str(body.visitorId, 100) || null,
      sessionId: str(body.sessionId, 100) || null,
      userAgent: str(req.headers["user-agent"], 500) || null,
      ipAddress: deps.clientIp(req).slice(0, 100) || null,
    };

    // 1. The email: the team acts on this, so it goes first.
    const emailForwarded = await deps.sendMail({
      ...towingOnboardingEmail(answers),
      replyTo: answers.email as string,
    });

    // 2. The database.
    let id: string | null = null;
    try {
      const saved = await prisma.towingOnboarding.create({
        // Cast because the columns are built by field id, which the compiler
        // cannot check against the model. A mismatch fails here, at runtime,
        // and lands in the backup below rather than losing the submission.
        data: {
          ...toColumns(answers),
          ...context,
          confirmedAt: new Date(),
          emailForwarded,
        } as unknown as Prisma.TowingOnboardingCreateInput,
      });
      id = saved.id;
      console.log(`[Onboarding] Saved towing onboarding ${saved.id} for ${answers.businessName} (db)`);
    } catch (err) {
      console.error("[Onboarding] Database write failed, falling back to file backup:", err);
    }

    // 3. File backup — only when the database did not take it.
    if (!id) {
      const flat: Record<string, string> = {};
      for (const [key, value] of Object.entries(answers)) {
        flat[key] = Array.isArray(value) ? value.join(", ") : value;
      }
      for (const [key, value] of Object.entries(context)) flat[key] = value ?? "";
      deps.backup({
        id: "onboarding_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        createdAt: new Date().toISOString(),
        type: "towing_onboarding",
        ...flat,
        emailForwarded: String(emailForwarded),
      });
      console.log(`[Onboarding] Saved towing onboarding for ${answers.businessName} (file backup)`);
    }

    res.json({ ok: true, id: id || "backup" });
  });

  return router;
}
