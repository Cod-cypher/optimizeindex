/**
 * What the assistant is doing right now, so the widget can show it.
 *
 * A turn that runs the site audit takes fifteen seconds or more. Three animated
 * dots for fifteen seconds reads as a hang, and the visitor either sends the
 * message again or leaves. Naming the work — "checking example.com" — turns the
 * same wait into something that looks deliberate.
 *
 * Held in memory rather than the database on purpose. The lifetime of this data
 * is one turn: if the process restarts mid-turn the steps are meaningless
 * because the turn died with it, so persisting them would only create rows that
 * outlive their own truth. It does mean this is one more thing that assumes a
 * single PM2 instance — a poll served by a different process than the one
 * running the turn would see no steps and fall back to the plain indicator,
 * which degrades quietly rather than breaking. See ecosystem.config.cjs.
 *
 * The visitor never sees these as transcript messages. They exist only while
 * the turn is in flight and vanish when it finishes, which is why they are not
 * ChatMessage rows.
 */

import type { TurnStep } from "../../shared/chatTypes";

/** A turn this old is over, however it ended. Guards against a leaked entry. */
const TURN_TTL_MS = 2 * 60 * 1000;

interface TurnState {
  steps: TurnStep[];
  at: number;
}

const turns = new Map<string, TurnState>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [id, state] of turns) {
    if (now - state.at > TURN_TTL_MS) turns.delete(id);
  }
}

/** Clears anything from a previous turn and starts fresh. */
export function beginTurn(conversationId: string): void {
  sweep(Date.now());
  turns.set(conversationId, { steps: [], at: Date.now() });
}

/**
 * Marks a step as started, completing whatever was running before it.
 *
 * Steps are sequential — the tool loop does one thing at a time — so starting a
 * new one is the signal that the previous finished. That keeps the call sites
 * to a single line each.
 */
export function startStep(conversationId: string, id: string, label: string): void {
  const state = turns.get(conversationId);
  if (!state) return;

  for (const step of state.steps) {
    if (step.state === "active") step.state = "done";
  }
  state.steps.push({ id, label, state: "active" });
  state.at = Date.now();
}

/**
 * Rewrites the label of the running step, usually to add its result.
 *
 * "Checking example.com" becomes "Checked example.com — 62/100", so the
 * finished list reads as a record of what happened rather than a list of
 * intentions.
 */
export function finishStep(conversationId: string, label?: string): void {
  const state = turns.get(conversationId);
  if (!state) return;

  const active = state.steps.filter((s) => s.state === "active").pop();
  if (!active) return;

  active.state = "done";
  if (label) active.label = label;
  state.at = Date.now();
}

export function endTurn(conversationId: string): void {
  turns.delete(conversationId);
}

/** What the poll reports. Empty when no turn is running. */
export function getSteps(conversationId: string): TurnStep[] {
  const state = turns.get(conversationId);
  if (!state) return [];
  if (Date.now() - state.at > TURN_TTL_MS) {
    turns.delete(conversationId);
    return [];
  }
  return state.steps;
}
