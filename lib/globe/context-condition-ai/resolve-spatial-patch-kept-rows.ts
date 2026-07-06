import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { ScoredEateryRecommendation } from "@/lib/globe/eatery/score-eatery-recommendations";
import type { ScoredLodgingRecommendation } from "@/lib/globe/lodging/score-lodging-recommendations";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type SpatialPatchKeptRows = {
  lodgingRows: ContextLodgingInventoryRow[];
  eateryRows: ContextEateryInventoryRow[];
  lodgingScored: ScoredLodgingRecommendation[];
  eateryScored: ScoredEateryRecommendation[];
};

function toLodgingScored(
  row: ContextLodgingInventoryRow,
  recommendation: ContextConditionRecommendation,
): ScoredLodgingRecommendation {
  return {
    row,
    score: 1,
    reasonKo: recommendation.reasonKo,
    matchReasons: [],
  };
}

function toEateryScored(
  row: ContextEateryInventoryRow,
  recommendation: ContextConditionRecommendation,
): ScoredEateryRecommendation {
  return {
    row,
    score: 1,
    reasonKo: recommendation.reasonKo,
    matchReasons: [],
  };
}

/** Reload inventory rows for recommendations kept during a partial patch. */
export function resolveSpatialPatchKeptRows(input: {
  event: EventCandidate;
  kept: readonly ContextConditionRecommendation[];
}): SpatialPatchKeptRows {
  const lodgingInventory = readLodgingInventoryRows(input.event);
  const eateryInventory = readEateryInventoryRows(input.event);
  const lodgingRows: ContextLodgingInventoryRow[] = [];
  const eateryRows: ContextEateryInventoryRow[] = [];
  const lodgingScored: ScoredLodgingRecommendation[] = [];
  const eateryScored: ScoredEateryRecommendation[] = [];

  for (const recommendation of input.kept) {
    if (recommendation.kind === "lodging") {
      const row = lodgingInventory.find(
        (entry) => entry.placeId === recommendation.placeId,
      );
      if (!row) {
        continue;
      }
      lodgingRows.push(row);
      lodgingScored.push(toLodgingScored(row, recommendation));
      continue;
    }
    const row = eateryInventory.find(
      (entry) => entry.placeId === recommendation.placeId,
    );
    if (!row) {
      continue;
    }
    eateryRows.push(row);
    eateryScored.push(toEateryScored(row, recommendation));
  }

  return { lodgingRows, eateryRows, lodgingScored, eateryScored };
}
