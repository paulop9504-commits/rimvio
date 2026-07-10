import type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { ContextConditionPinBatchRecord } from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";

const STORAGE_PREFIX = "rimvio.scout-reveal-pending.";

export type ScoutRevealPendingWire = {
  readonly batch: ContextConditionPinBatchRecord;
  readonly anchorPlaceName: string;
  readonly searchOriginLat: number;
  readonly searchOriginLng: number;
  readonly outcome: ContextConditionAnchorPinOutcome;
};

export function writeScoutRevealPending(
  contextEventId: string,
  wire: ScoutRevealPendingWire,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  sessionStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(wire));
}

export function readScoutRevealPending(
  contextEventId: string,
): ScoutRevealPendingWire | null {
  if (typeof window === "undefined") {
    return null;
  }
  const id = contextEventId.trim();
  if (!id) {
    return null;
  }
  const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${id}`);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as ScoutRevealPendingWire;
    if (!parsed?.batch?.batchId || !parsed.outcome) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasScoutRevealPending(contextEventId: string): boolean {
  return readScoutRevealPending(contextEventId) != null;
}

export function clearScoutRevealPending(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  sessionStorage.removeItem(`${STORAGE_PREFIX}${id}`);
}

export function consumeScoutRevealPending(
  contextEventId: string,
): ScoutRevealPendingWire | null {
  const pending = readScoutRevealPending(contextEventId);
  if (!pending) {
    return null;
  }
  clearScoutRevealPending(contextEventId);
  return pending;
}
