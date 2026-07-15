import {
  appendScoutNarrationComposeTurn,
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
 * @deprecated Kept for call-site compatibility — no-op.
 * Progress cascade lives in GlobeScoutNarrationStream.
 */
export function publishScoutNarrationProgress(_input: {
  contextEventId: string;
  narration: ScoutNarration;
  fromIndex?: number;
  toIndexExclusive?: number;
}): void {
  /* animated in UI */
}
