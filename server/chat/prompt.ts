/**
 * Assembles the system prompt, once.
 *
 * The prompt is built at first use and then held forever, byte for byte. That
 * is deliberate and it is worth money: OpenAI caches long identical prefixes
 * automatically, and cached input bills at roughly a tenth of fresh input. The
 * prompt is the largest constant part of every request, so a stable prefix is
 * the single biggest cost lever available here.
 *
 * The practical consequence: never interpolate anything per-request into this
 * string. No timestamp, no visitor name, no current path. Per-conversation
 * context goes into the input array as a hidden message instead — see
 * conversationContext() at the bottom.
 *
 * The knowledge comes from public/llms.txt, which already summarises every page
 * on the site for machines, is already maintained, and is already checked by
 * scripts/verify-seo.ts against the route table on every build. Updating
 * llms.txt updates the assistant. There is no second corpus to keep in sync.
 */

import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import {
  CHAT_CONTACT_FACTS,
  CHAT_GROUNDING_PREAMBLE,
  CHAT_PERSONA,
  CHAT_RULES,
} from "../../src/content/chat";

let cached: string | null = null;

/**
 * Reads the machine-readable site summary.
 *
 * Read from disk rather than imported so that editing llms.txt and restarting
 * is enough to change what the assistant knows — no rebuild. Falls back to an
 * empty corpus rather than throwing: an assistant with no knowledge still
 * refuses questions politely and hands off, which is a far better failure than
 * a server that will not boot.
 */
function loadSiteKnowledge(): string {
  const candidates = [
    path.join(process.cwd(), "public", "llms.txt"),
    path.join(process.cwd(), "dist", "client", "llms.txt"),
  ];

  for (const file of candidates) {
    try {
      const text = fs.readFileSync(file, "utf-8").trim();
      if (text) return text;
    } catch {
      // Try the next location.
    }
  }

  console.error("[Chat] Could not read llms.txt — the assistant has no site knowledge");
  return "";
}

/**
 * Pages whose exact wording visitors ask about.
 *
 * llms.txt summarises the site but only *links* to the policies, so the
 * assistant could name them and nothing else — which is the worst possible
 * answer to "what is your refund policy": confident enough to sound informed,
 * empty enough to be useless.
 *
 * Read from the pre-rendered HTML rather than duplicated into a content file,
 * so the assistant works from the same words the visitor would read on the
 * page and there is no second copy to drift. Costs a couple of thousand
 * tokens, cached with the rest of the prefix.
 */
const POLICY_PAGES = ["privacy-policy", "terms-of-service"];

function loadPolicyPages(): string {
  const chunks: string[] = [];

  for (const slug of POLICY_PAGES) {
    const file = path.join(process.cwd(), "dist", "client", slug, "index.html");
    try {
      const html = fs.readFileSync(file, "utf-8");
      const $ = cheerio.load(html);
      // <main> only: nav and footer are identical on every page and would
      // just be repeated noise in the prompt.
      const text = $("main").text().replace(/\s+/g, " ").trim();
      if (text) chunks.push(`## ${slug}\n${text}`);
    } catch {
      // Not built yet. The assistant still has the llms.txt summary and will
      // hand off rather than guess.
    }
  }

  if (chunks.length === 0) {
    console.warn(
      "[Chat] No pre-rendered policy pages found - the assistant cannot answer " +
        "refund or terms questions in detail. Run npm run build.",
    );
  }
  return chunks.join("\n\n");
}

export function systemPrompt(): string {
  if (cached) return cached;

  const rules = CHAT_RULES.map((rule) => `- ${rule}`).join("\n");

  cached = [
    CHAT_PERSONA,
    "",
    "Rules:",
    rules,
    "",
    CHAT_CONTACT_FACTS,
    "",
    CHAT_GROUNDING_PREAMBLE,
    "",
    "---",
    loadSiteKnowledge(),
    "",
    loadPolicyPages(),
    "---",
  ].join("\n");

  return cached;
}

/** Test seam, and a way to pick up an edited llms.txt without a restart. */
export function resetPromptCache(): void {
  cached = null;
}

/**
 * Per-conversation context, as a hidden input item rather than part of the
 * prompt, so the cached prefix stays identical across every conversation.
 *
 * Kept deliberately thin. Telling the model which page someone is reading helps
 * it answer in context; telling it everything we know about them invites it to
 * repeat those details back, which reads as surveillance.
 */
export function conversationContext(startedOn?: string | null): string | null {
  if (!startedOn) return null;
  return `Context: the visitor opened this chat on the page ${startedOn}. Use it to judge what they are likely asking about. Do not mention that you know it.`;
}
