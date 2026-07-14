import { appendContextAgentComposeTurn } from "@/lib/globe/assistant";
import type { ScoutNarration } from "@/lib/globe/narrator-engine/types";

/**
 * Emit Cursor-style plan summary + gray progress logs into the compose thread.
 * Understanding first (user-facing), then progress steps (build_log).
 */
export function publishScoutNarration(input: {
  contextEventId: string;
  narration: ScoutNarration;
  /** When true, only emit understanding (progress emitted later by execute). */
  understandingOnly?: boolean;
}): void {
  const { contextEventId, narration } = input;
  const understanding = narration.understandingKo.trim();
  if (understanding) {
    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "text",
      text: understanding,
    });
  }
  if (input.understandingOnly) {
    return;
  }
  for (const step of narration.progressSteps) {
    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "build_log",
      text: step.textKo,
    });
  }
}

/** Emit progressive build_log lines (optionally staggered by caller). */
export function publishScoutNarrationProgress(input: {
  contextEventId: string;
  narration: ScoutNarration;
  fromIndex?: number;
  toIndexExclusive?: number;
}): void {
  const from = input.fromIndex ?? 0;
  const to = input.toIndexExclusive ?? input.narration.progressSteps.length;
  for (let i = from; i < to; i += 1) {
    const step = input.narration.progressSteps[i];
    if (!step) {
      continue;
    }
    appendContextAgentComposeTurn(input.contextEventId, {
      role: "assistant",
      kind: "build_log",
      text: step.textKo,
    });
  }
}
