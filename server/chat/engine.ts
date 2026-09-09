/**
 * One turn of the assistant: build the window, call the model, run whatever
 * tools it asks for, and produce the text to append to the transcript.
 *
 * Separated from the routes so that the HTTP layer stays about requests and
 * this stays about the conversation. Everything here returns a value on
 * failure — the caller's contract is that a visitor always gets a reply, even
 * if the reply is that we cannot reach the model.
 */

import type { ChatConversation, ChatMessage, PrismaClient } from "@prisma/client";
import {
  CHAT_FALLBACK_MESSAGE,
  CHAT_HANDOFF_UNAVAILABLE,
  CHAT_TURN_CAP,
} from "../../src/content/chat";
import { respond, type InputItem } from "./openai";
import { conversationContext, systemPrompt } from "./prompt";
import { historyForModel, recordUsage } from "./store";
import { runTool, TOOLS, type ToolContext, type ToolEffects } from "./tools";

/** How many past messages the model sees. Older turns are dropped, not summarised. */
const HISTORY_TURNS = 16;

/** Longest a single past message may be when replayed into the window. */
const HISTORY_CHARS = 1500;

/** Tool rounds before we force a prose answer. Two is enough for audit-then-lead. */
const MAX_TOOL_ROUNDS = 2;

/** Default ceiling on assistant turns in one conversation. */
const DEFAULT_MAX_TURNS = 25;

/**
 * Phrases that mean "get me a person", matched before the model is called.
 *
 * The requirement is that asking for a human works, and that must not depend on
 * the model choosing to call a tool. This catches the common phrasings
 * deterministically; request_human catches the ones it misses. Belt and braces,
 * because the failure mode — a visitor asking for help and being answered by a
 * bot again — is the one that loses them.
 */
const ASKS_FOR_HUMAN =
  /\b(real (person|human)|speak (to|with) (a |someone|somebody)|talk to (a )?(real )?(person|human|someone|somebody)|human being|customer service|sales rep|account manager|call me|phone me|ring me|is this a bot|are you a (bot|robot|human|real)|not a bot)\b/i;

export function asksForHuman(text: string): boolean {
  return ASKS_FOR_HUMAN.test(text);
}

export interface TurnResult {
  /** What to say to the visitor. Never empty. */
  text: string;
  /** Whether a handoff was triggered during this turn, by tool or by regex. */
  handoffTriggered: boolean;
  leadCaptured: boolean;
  auditRan: boolean;
  /** True when the model could not be reached at all. */
  degraded: boolean;
}

export function maxTurns(): number {
  const raw = Number(process.env.CHAT_MAX_TURNS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_TURNS;
}

/**
 * Replays stored rows as model input.
 *
 * A human agent's messages are replayed as `assistant`, because from the
 * model's point of view they are things "our side" said — presenting them as
 * user turns would have it answering Ali instead of the visitor.
 */
function toInputItems(rows: ChatMessage[]): InputItem[] {
  return rows.map((row) => ({
    role: row.role === "VISITOR" ? ("user" as const) : ("assistant" as const),
    content: row.content.slice(0, HISTORY_CHARS),
  }));
}

/**
 * Runs one assistant turn.
 *
 * `ctx` carries the injected lead pipeline and handoff trigger; `conversation`
 * is read for its turn count and context. The visitor's new message must
 * already be stored before this is called, so it arrives through the history
 * window like every other turn and there is one source of truth for what was
 * said.
 */
export async function runTurn(
  prisma: PrismaClient,
  conversation: ChatConversation,
  ctx: ToolContext,
): Promise<TurnResult> {
  const effects: ToolEffects = { handoffTriggered: false, leadCaptured: false, auditRan: false };

  // A conversation that has gone on this long is not going to be rescued by
  // another guess. Hand it over rather than keep spending.
  if (conversation.turnCount >= maxTurns()) {
    const notified = await ctx.requestHuman("out_of_scope", "Conversation reached the turn limit.", "today");
    return {
      text: notified ? CHAT_TURN_CAP : CHAT_HANDOFF_UNAVAILABLE,
      handoffTriggered: true,
      leadCaptured: false,
      auditRan: false,
      degraded: false,
    };
  }

  const history = await historyForModel(prisma, conversation.id, HISTORY_TURNS);
  const input: InputItem[] = [];

  const context = conversationContext(conversation.startedOn);
  if (context) input.push({ role: "user", content: context });
  input.push(...toInputItems(history));

  const instructions = systemPrompt();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await respond(instructions, input, TOOLS);
    if (result.status === "error") return degraded(result.reason, effects);

    await recordUsage(prisma, conversation.id, result.usage);
    if (result.usage.cachedInput > 0) {
      console.log(
        `[Chat] Tokens in=${result.usage.input} (cached ${result.usage.cachedInput}) out=${result.usage.output}`,
      );
    }

    if (result.toolCalls.length === 0) {
      return {
        text: result.text || CHAT_FALLBACK_MESSAGE,
        handoffTriggered: effects.handoffTriggered,
        leadCaptured: effects.leadCaptured,
        auditRan: effects.auditRan,
        degraded: false,
      };
    }

    // parallel_tool_calls is false, so this is a loop over at most one call.
    for (const call of result.toolCalls) {
      const output = await runTool(call.name, call.arguments, ctx, effects);
      input.push({
        type: "function_call",
        call_id: call.callId,
        name: call.name,
        arguments: call.arguments,
      });
      input.push({
        type: "function_call_output",
        call_id: call.callId,
        output: JSON.stringify(output),
      });
    }
  }

  // Out of tool rounds. Ask once more with no tools available, so the model has
  // no choice but to answer in words.
  const final = await respond(instructions, input);
  if (final.status === "error") return degraded(final.reason, effects);
  await recordUsage(prisma, conversation.id, final.usage);

  return {
    text: final.text || CHAT_FALLBACK_MESSAGE,
    handoffTriggered: effects.handoffTriggered,
    leadCaptured: effects.leadCaptured,
    auditRan: effects.auditRan,
    degraded: false,
  };
}

function degraded(reason: string, effects: ToolEffects): TurnResult {
  console.error(`[Chat] Model unavailable (${reason}) — falling back`);
  return {
    text: CHAT_FALLBACK_MESSAGE,
    handoffTriggered: effects.handoffTriggered,
    leadCaptured: effects.leadCaptured,
    auditRan: effects.auditRan,
    degraded: true,
  };
}
