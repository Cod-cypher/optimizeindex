/**
 * The notification email for a towing onboarding submission.
 *
 * Written for whoever on the team sets the client up, not for a database: the
 * business and how to reach them first, then anything that needs doing, then
 * every answer under the same numbered sections the client saw. Unanswered
 * questions are shown as "Not answered" rather than dropped, so a gap in the
 * email is never a gap in the template.
 *
 * Inline styles and tables only, because that is what mail clients render.
 * Every value is escaped; a link is only made from an http(s) URL.
 */

import { ONBOARDING_CONFIRMATION, ONBOARDING_SECTIONS, type OnboardingField } from "../../src/content/onboarding";

export type OnboardingAnswers = Record<string, string | string[]>;

/**
 * Answers that mean the team has something to do before setup can start.
 * Keyed by field id and the exact option wording in src/content/onboarding.ts.
 */
const FOLLOW_UPS: { field: string; answer: string; note: string }[] = [
  {
    field: "profileAccess",
    answer: "No",
    note: "Google Business Profile access has not been shared yet. Send them the instructions for granting it.",
  },
  {
    field: "hasProfile",
    answer: "No",
    note: "They do not have a Google Business Profile. One needs to be created.",
  },
  {
    field: "hasProfile",
    answer: "Not sure",
    note: "They are not sure whether they have a Google Business Profile. Check before setup.",
  },
  {
    field: "zipListStatus",
    answer: "No, I need help creating one",
    note: "They need help building their ZIP code list.",
  },
];

// A follow-up keyed to an option the form no longer offers would silently
// never fire, so say so at boot rather than discover it from a missed client.
for (const rule of FOLLOW_UPS) {
  const field = ONBOARDING_SECTIONS.flatMap((s) => s.fields).find((f) => f.id === rule.field);
  if (!field?.options?.includes(rule.answer)) {
    console.warn(`[Onboarding] Follow-up rule for ${rule.field}="${rule.answer}" matches no option on the form`);
  }
}

const C = {
  ink: "#141210",
  cream: "#F6F1E6",
  forest: "#1B3828",
  lime: "#C9F31D",
  stone: "#5F5C53",
  muted: "#8A867C",
  rule: "#E6E0D2",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const text = (answers: OnboardingAnswers, id: string) => {
  const v = answers[id];
  return Array.isArray(v) ? v.join(", ") : (v ?? "");
};

/** http(s) only. A bare domain ("acmetowing.com") gets https://; anything else stays text. */
function safeUrl(value: string): string | null {
  const candidate = /^https?:\/\//i.test(value)
    ? value
    : /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value)
      ? `https://${value}`
      : null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

const link = (href: string, label: string, color = C.ink) =>
  `<a href="${esc(href)}" style="color:${color};font-weight:600;text-decoration:underline">${esc(label)}</a>`;

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

function valueHtml(field: OnboardingField, value: string | string[]): string {
  if (Array.isArray(value) ? value.length === 0 : !value) {
    return `<span style="color:${C.muted};font-style:italic">Not answered</span>`;
  }
  if (Array.isArray(value)) {
    return value
      .map(
        (item) =>
          `<span style="display:inline-block;margin:0 6px 6px 0;padding:3px 10px;border:1px solid ${C.ink};border-radius:999px;background:${C.cream};font-size:13px;line-height:1.4">${esc(item)}</span>`,
      )
      .join("");
  }
  if (field.kind === "email") return link(`mailto:${value}`, value);
  if (field.kind === "tel") return link(telHref(value), value);
  if (field.kind === "url") {
    const href = safeUrl(value);
    return href ? link(href, value) : esc(value);
  }
  return `<span style="white-space:pre-wrap">${esc(value)}</span>`;
}

function sectionHtml(title: string, number: number, fields: OnboardingField[], answers: OnboardingAnswers): string {
  const rows = fields
    .map(
      (f) =>
        `<tr>` +
        `<td valign="top" style="width:38%;padding:9px 12px 9px 0;border-top:1px solid ${C.rule};color:${C.stone};font-size:13px;line-height:1.45">${esc(f.short)}</td>` +
        `<td valign="top" style="padding:9px 0;border-top:1px solid ${C.rule};color:${C.ink};font-size:15px;line-height:1.5">${valueHtml(f, answers[f.id])}</td>` +
        `</tr>`,
    )
    .join("");
  return (
    `<tr><td style="padding:22px 28px 0">` +
    `<div style="font-size:16px;font-weight:800;color:${C.forest};margin-bottom:8px">${number}. ${esc(title)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>` +
    `</td></tr>`
  );
}

export function towingOnboardingEmail(answers: OnboardingAnswers): { subject: string; html: string; text: string } {
  const business = text(answers, "businessName");
  const contact = text(answers, "contactName");
  const phone = text(answers, "phone");
  const email = text(answers, "email");
  const address = text(answers, "businessAddress");
  const followUps = FOLLOW_UPS.filter((r) => answers[r.field] === r.answer).map((r) => r.note);
  const confirmNumber = ONBOARDING_SECTIONS.length + 1;

  const subject = `New towing client onboarding: ${business}`.replace(/\s+/g, " ");

  const followUpHtml = followUps.length
    ? `<tr><td style="padding:22px 28px 0">` +
      `<div style="background:#F4FBD9;border:1.5px solid ${C.ink};border-radius:10px;padding:14px 16px">` +
      `<div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.forest};margin-bottom:6px">Follow up</div>` +
      followUps
        .map((note) => `<div style="font-size:15px;line-height:1.5;color:${C.ink};margin-top:4px">&#8226;&nbsp;${esc(note)}</div>`)
        .join("") +
      `</div></td></tr>`
    : "";

  const html =
    `<div style="background:${C.cream};padding:24px 12px;font-family:${FONT}">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1.5px solid ${C.ink};border-radius:14px;border-collapse:separate;overflow:hidden">` +
    // Header: who they are and how to reach them, before anything else.
    `<tr><td style="background:${C.forest};padding:22px 28px">` +
    `<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.lime}">New towing client onboarding</div>` +
    `<div style="font-size:24px;font-weight:800;line-height:1.25;color:${C.cream};margin-top:8px">${esc(business)}</div>` +
    `<div style="font-size:15px;line-height:1.6;color:${C.cream};margin-top:8px">${esc(contact)}` +
    ` &middot; ${link(telHref(phone), phone, C.lime)} &middot; ${link(`mailto:${email}`, email, C.lime)}</div>` +
    `<div style="font-size:14px;line-height:1.5;color:${C.cream};opacity:.8;margin-top:2px">${esc(address)}</div>` +
    `</td></tr>` +
    followUpHtml +
    ONBOARDING_SECTIONS.map((s, i) => sectionHtml(s.title, i + 1, s.fields, answers)).join("") +
    `<tr><td style="padding:22px 28px 0">` +
    `<div style="font-size:16px;font-weight:800;color:${C.forest};margin-bottom:8px">${confirmNumber}. ${esc(ONBOARDING_CONFIRMATION.title)}</div>` +
    `<div style="font-size:15px;line-height:1.5;color:${C.ink}">&#10003;&nbsp;${esc(ONBOARDING_CONFIRMATION.statement)}</div>` +
    `</td></tr>` +
    `<tr><td style="padding:24px 28px 26px">` +
    `<div style="border-top:1px solid ${C.rule};padding-top:14px;font-size:13px;line-height:1.5;color:${C.stone}">` +
    `Reply to this email to reach ${esc(contact)} directly. Saved in the TowingOnboarding table.` +
    `</div></td></tr>` +
    `</table></div>`;

  // Plain-text part, in the same order, for clients that do not render HTML.
  const lines = [
    "NEW TOWING CLIENT ONBOARDING",
    business,
    `${contact} · ${phone} · ${email}`,
    address,
  ];
  if (followUps.length) lines.push("", "FOLLOW UP", ...followUps.map((n) => `- ${n}`));
  ONBOARDING_SECTIONS.forEach((s, i) => {
    lines.push("", `${i + 1}. ${s.title.toUpperCase()}`);
    for (const f of s.fields) {
      // Continuation lines of a multi-line answer are indented under it.
      const value = text(answers, f.id).replace(/\n/g, "\n    ") || "Not answered";
      lines.push(`${f.short}: ${value}`);
    }
  });
  lines.push(
    "",
    `${confirmNumber}. ${ONBOARDING_CONFIRMATION.title.toUpperCase()}`,
    `Confirmed: ${ONBOARDING_CONFIRMATION.statement}`,
    "",
    `Reply to this email to reach ${contact} directly. Saved in the TowingOnboarding table.`,
  );

  return { subject, html, text: lines.join("\n") };
}
