/**
 * Open lodging Diff → Tool / LiteAPI / reserve_prep stay args.
 * Context Pack SSOT must reach Tools (Cursor open-file continuity).
 */

import type { ContextPackLodgingDiff } from "@/lib/context-builder/build-context-pack";
import { readLastContextPack } from "@/lib/context-builder/context-pack-memory";
import { resolveLodgingDiffForPack } from "@/lib/context-builder/resolve-lodging-diff-for-pack";
import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { readSessionGraph } from "@/lib/graph-command/session-graph-store";

export type LodgingStayForTools = {
  readonly checkInIso: string | null;
  readonly checkOutIso: string | null;
  readonly guestCount: number;
  readonly roomCount: number | null;
  /** Seed query for same-project re-search. */
  readonly searchQueryHint: string | null;
};

const DEFAULT_GUEST_COUNT = 2;

/**
 * Resolve stay from last pack Diff (or live slots/graph overlay).
 */
export function resolveLodgingStayForTools(
  contextEventId: string | null | undefined,
): LodgingStayForTools {
  const eventId = contextEventId?.trim() || "";
  if (!eventId) {
    return {
      checkInIso: null,
      checkOutIso: null,
      guestCount: DEFAULT_GUEST_COUNT,
      roomCount: null,
      searchQueryHint: null,
    };
  }

  const previous = readLastContextPack(eventId)?.lodgingDiff ?? null;
  const graph = readSessionGraph(eventId);
  const diff: ContextPackLodgingDiff | null =
    resolveLodgingDiffForPack({
      contextEventId: eventId,
      graph,
      previous,
    }) ?? previous;

  const guestRaw = diff?.guestCount;
  const guestCount =
    typeof guestRaw === "number" && Number.isFinite(guestRaw) && guestRaw > 0
      ? Math.round(guestRaw)
      : DEFAULT_GUEST_COUNT;

  const label = diff?.selectedLodgingLabelKo?.trim() || null;
  const batchTrigger =
    readContextConditionLastBatch(eventId)?.triggerMessage?.trim() || null;

  return {
    checkInIso: diff?.checkInIso ?? null,
    checkOutIso: diff?.checkOutIso ?? null,
    guestCount,
    roomCount: diff?.roomCount ?? null,
    searchQueryHint: label || batchTrigger,
  };
}

/** Merge explicit ToolInvoke stay over Diff defaults. */
export function mergeLodgingStayForToolInvoke(input: {
  readonly contextEventId?: string | null;
  readonly checkInIso?: string | null;
  readonly checkOutIso?: string | null;
  readonly guestCount?: number | null;
}): {
  readonly checkInIso: string | null;
  readonly checkOutIso: string | null;
  readonly guestCount: number;
} {
  const fromDiff = resolveLodgingStayForTools(input.contextEventId);
  const guest =
    typeof input.guestCount === "number" &&
    Number.isFinite(input.guestCount) &&
    input.guestCount > 0
      ? Math.round(input.guestCount)
      : fromDiff.guestCount;
  return {
    checkInIso: input.checkInIso?.trim() || fromDiff.checkInIso,
    checkOutIso: input.checkOutIso?.trim() || fromDiff.checkOutIso,
    guestCount: guest,
  };
}
