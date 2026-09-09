/**
 * The OpenAI client.
 *
 * Raw fetch rather than the SDK, matching how this repo already calls
 * PageSpeed: the server bundle is built with `esbuild --packages=external`, so
 * every dependency has to be installed on the production host as well, and this
 * is one endpoint with one request shape.
 *
 * Targets the **Responses API** (POST /v1/responses), which OpenAI recommends
 * for new integrations over Chat Completions. The shapes differ in ways that
 * are easy to get wrong when porting an older snippet, so they are spelled out
 * at each site below.
 *
 * Verified against OpenAI's documentation on 2026-09-09. Model identifiers and
 * parameter support move faster than this file does — re-check before assuming
 * a failure here is a bug in our code.
 */

/** Default model: OpenAI's current cost-optimised tier with function calling. */
const DEFAULT_MODEL = "gpt-5.6-luna";

/**
 * Reasoning budget.
 *
 * Started at "none" on the theory that answering from a page summary needs no
 * deliberation. In practice that produced replies that were fast and thin — the
 * model would answer the literal question and miss that the visitor had already
 * given it their website two turns ago, or hand off rather than piece together
 * an answer that was there to be pieced together.
 *
 * "low" is OpenAI's recommended floor for latency-sensitive chat and costs one
 * to two seconds. Worth it: this is a sales conversation, and a thin answer
 * costs more than a slow one.
 *
 * MAX_OUTPUT_TOKENS moves with this. The cap counts reasoning tokens as well as
 * visible ones, so raising effort against an unchanged cap truncates replies
 * mid-sentence with no obvious cause.
 */
const DEFAULT_REASONING_EFFORT = "low";

/**
 * Counts reasoning tokens as well as the visible reply, so this is not 900
 * tokens of answer — at "low" effort a chunk goes on thinking. Sized to leave
 * room for a properly explained answer plus the reasoning that got there.
 */
const MAX_OUTPUT_TOKENS = 900;

/** A visitor will not wait longer than this, and neither should a socket. */
const TIMEOUT_MS = 15_000;

const ENDPOINT = "https://api.openai.com/v1/responses";

/* -------------------------------------------------------------------------
   Wire shapes
------------------------------------------------------------------------- */

/** An item in the `input` array. Note: `input`, not `messages`. */
export type InputItem =
  | { role: "user" | "assistant"; content: string }
  | { type: "function_call"; call_id: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; output: string };

/**
 * A tool definition.
 *
 * Internally tagged — name, description and parameters sit directly on the
 * object. Chat Completions nested them under a `function` key; doing that here
 * is the single most common porting error and produces a 400.
 */
export interface ToolDef {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: boolean;
}

/** A function call the model wants made, lifted out of the output array. */
export interface ToolCall {
  callId: string;
  name: string;
  /** Raw JSON string exactly as the model produced it. Parse defensively. */
  arguments: string;
}

export interface Usage {
  input: number;
  output: number;
  /** Billed at roughly a tenth of uncached input — worth watching. */
  cachedInput: number;
  reasoning: number;
}

export type CompletionFailure =
  | "no_key"
  | "rate_limited"
  | "timeout"
  | "upstream"
  | "over_cap";

/**
 * Discriminated on a string rather than a boolean `ok`.
 *
 * Not a style preference: this project does not enable `strict`, and without
 * strictNullChecks TypeScript will not narrow a union on a boolean literal
 * discriminant — `if (!result.ok)` compiles but leaves the type unnarrowed, so
 * every failure branch silently loses its `reason`. A string discriminant
 * narrows either way, and matches how shared/auditTypes.ts already models its
 * own states.
 */
export type CompletionResult =
  | { status: "ok"; text: string; toolCalls: ToolCall[]; usage: Usage }
  | { status: "error"; reason: CompletionFailure };

export function hasApiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function modelName(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

/* -------------------------------------------------------------------------
   The call
------------------------------------------------------------------------- */

/**
 * One turn against the model.
 *
 * Never throws. Every failure is a value, because the caller's job is to append
 * a graceful message to the transcript and return 200 — a chat widget that
 * shows a stack trace, or an endpoint that 500s because OpenAI is having a bad
 * afternoon, is worse than one that says it cannot reach its brain.
 */
export async function respond(
  instructions: string,
  input: InputItem[],
  tools?: ToolDef[],
): Promise<CompletionResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { status: "error", reason: "no_key" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelName(),
        // The system prompt goes in `instructions`, not as a role in the input.
        instructions,
        input,
        ...(tools && tools.length ? { tools } : {}),
        // At most one call per turn, which keeps the tool loop a simple
        // sequence rather than a fan-out that has to be joined.
        parallel_tool_calls: false,
        reasoning: {
          effort: process.env.OPENAI_REASONING_EFFORT || DEFAULT_REASONING_EFFORT,
        },
        max_output_tokens: MAX_OUTPUT_TOKENS,
        // We own the transcript in Postgres. Server-side state would diverge
        // the moment a human agent's message lands in the middle of it.
        store: false,
        // NOTE: no `temperature` and no `top_p`. The current reasoning models
        // reject sampling parameters outright — the presence of the parameter
        // is the error, whatever its value. Response shaping comes from the
        // prompt rules in src/content/chat.ts instead.
      }),
    });

    if (res.status === 429) return { status: "error", reason: "rate_limited" };
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[Chat] OpenAI ${res.status}: ${detail.slice(0, 400)}`);
      return { status: "error", reason: "upstream" };
    }

    const body = (await res.json()) as OpenAIResponseBody;
    return {
      status: "ok",
      text: readText(body),
      toolCalls: readToolCalls(body),
      usage: readUsage(body),
    };
  } catch (err) {
    if (controller.signal.aborted) {
      console.error("[Chat] OpenAI timed out after", TIMEOUT_MS, "ms");
      return { status: "error", reason: "timeout" };
    }
    console.error("[Chat] OpenAI request failed:", err);
    return { status: "error", reason: "upstream" };
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------------------------------------------------------
   Reading the response
------------------------------------------------------------------------- */

interface OpenAIResponseBody {
  output_text?: string;
  output?: Array<{
    type?: string;
    call_id?: string;
    name?: string;
    arguments?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens_details?: { reasoning_tokens?: number };
  };
}

/**
 * `output_text` is the convenience accessor and is present on ordinary replies.
 * The manual walk is the fallback for the turns where it is absent — notably
 * when the model emitted a tool call alongside a partial message.
 */
function readText(body: OpenAIResponseBody): string {
  if (typeof body.output_text === "string" && body.output_text.trim()) {
    return body.output_text.trim();
  }
  const parts: string[] = [];
  for (const item of body.output || []) {
    if (item.type !== "message") continue;
    for (const chunk of item.content || []) {
      if (typeof chunk.text === "string") parts.push(chunk.text);
    }
  }
  return parts.join("").trim();
}

/**
 * Tool calls are their own items in the output array, correlated to their
 * results by `call_id` on the next turn — not by position, and not by a
 * `tool_call_id` on a message.
 */
function readToolCalls(body: OpenAIResponseBody): ToolCall[] {
  const calls: ToolCall[] = [];
  for (const item of body.output || []) {
    if (item.type === "function_call" && item.call_id && item.name) {
      calls.push({ callId: item.call_id, name: item.name, arguments: item.arguments || "{}" });
    }
  }
  return calls;
}

function readUsage(body: OpenAIResponseBody): Usage {
  return {
    input: body.usage?.input_tokens ?? 0,
    output: body.usage?.output_tokens ?? 0,
    cachedInput: body.usage?.input_tokens_details?.cached_tokens ?? 0,
    reasoning: body.usage?.output_tokens_details?.reasoning_tokens ?? 0,
  };
}
