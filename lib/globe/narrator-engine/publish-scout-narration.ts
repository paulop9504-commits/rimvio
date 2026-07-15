import {
  appendScoutNarrationComposeTurn,
  appendScoutNarrationLiveStep,
  markScoutNarrationComposeDone,
} from "@/lib/globe/assistant";
import type { ScoutNarration } from "@/lib/globe/narrator-engine/types";

/**
 * Emit one Cursor-style Narrator stream turn (understanding + animated logs).
 * Returns turn id so runtime can mark status done when scout finishes.
 */
export function publishScoutNarration(input: {
  contextEventId: string;
  narration: ScoutNarration;
  /** @deprecated Progress is animated inside the stream panel. */
  understandingOnly?: boolean;
}): string {
  const { contextEventId, narration } = input;
  const turn = appendScoutNarrationComposeTurn(contextEventId, {
    understandingKo: narration.understandingKo.trim(),
    steps: narration.progressSteps.map((step) => ({
      id: step.id,
      textKo: step.textKo,
    })),
    status: "running",
    mode: narration.plan.mode,
    entityLabelKo: narration.plan.entityLabelKo,
    domain: narration.plan.domain,
  });
  return turn.id;
}

/** Mark Narrator stream complete — UI settles checks / stops pulse. */
export function completeScoutNarration(input: {
  contextEventId: string;
  turnId: string | null | undefined;
}): void {
  const turnId = input.turnId?.trim();
  if (!turnId) {
    return;
  }
  markScoutNarrationComposeDone(input.contextEventId, turnId);
}

/**
 * Push a live system log into the running Narrator stream.
 * Falls back to false when no running stream (caller may use build_log).
 */
export function publishScoutNarrationLiveStep(input: {
  contextEventId: string;
  textKo: string;
  stepId?: string;
  turnId?: string | null;
}): boolean {
  const textKo = input.textKo.trim();
  if (!textKo) {
    return false;
  }
  const stepId =
    input.stepId?.trim() ||
    `live_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  return appendScoutNarrationLiveStep(
    input.contextEventId,
    { id: stepId, textKo },
    input.turnId,
  );
}

/**
 * @deprecated Prefer publishScoutNarrationLiveStep — streams animate in UI.
 */
export function publishScoutNarrationProgress(input: {
  contextEventId: string;
  narration: ScoutNarration;
  fromIndex?: number;
  toIndexExclusive?: number;
}): void {
  const from = Math.max(0, input.fromIndex ?? 0);
  const to = Math.min(
    input.narration.progressSteps.length,
    input.toIndexExclusive ?? input.narration.progressSteps.length,
  );
  for (let i = from; i < to; i += 1) {
    const step = input.narration.progressSteps[i];
    if (!step) {
      continue;
    }
    publishScoutNarrationLiveStep({
      contextEventId: input.contextEventId,
      textKo: step.textKo,
      stepId: step.id,
    });
  }
}
