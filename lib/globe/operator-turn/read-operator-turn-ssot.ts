/**
 * Read Globe discovery SSOT before every Operator turn.
 * @see docs/RIMVIO_OPERATOR_TURN.md
 */

import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import {
  readScoutContract,
  readScoutSelectedAnchor,
} from "@/lib/globe/contracts";
import { readDiscoveryLensSession } from "@/lib/globe/discovery-lens/lens-session-bridge";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { buildGlobeResourceReelItems } from "@/lib/globe/resource-reel/build-globe-resource-reel-items";
import type { OperatorTurnSsot } from "@/lib/globe/operator-turn/types";
import type { GlobeResourceReelKind } from "@/lib/globe/resource-reel/types";

export function readOperatorTurnSsot(input: {
  contextEventId: string;
  composeTail?: readonly { role: string; text: string }[];
  hasActiveSpec?: boolean;
}): OperatorTurnSsot {
  const contextEventId = input.contextEventId.trim();
  const event = findLifeEventCandidate(contextEventId);
  const reelItems = buildGlobeResourceReelItems(event);
  const reelKinds = [
    ...new Set(reelItems.map((row) => row.kind)),
  ] as GlobeResourceReelKind[];

  return {
    contextEventId,
    scoutContract: readScoutContract(contextEventId),
    selectedAnchor: readScoutSelectedAnchor(contextEventId),
    lensSession: readDiscoveryLensSession(contextEventId),
    lastBatch: readContextConditionLastBatch(contextEventId),
    reelKinds,
    reelItemCount: reelItems.length,
    composeTail: input.composeTail ?? [],
    hasActiveSpec: input.hasActiveSpec ?? false,
  };
}

export function reelHasKindSlice(
  ssot: OperatorTurnSsot,
  kindFilter: ResourceReelKindFilterLike,
): boolean {
  if (kindFilter === "all") {
    return ssot.reelItemCount > 0;
  }
  return ssot.reelKinds.includes(kindFilter);
}

type ResourceReelKindFilterLike = "all" | GlobeResourceReelKind;
