import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import type { EateryRankMode } from "@/lib/globe/eatery/eatery-rank-profile";
import {
  describeEateryRankTravelBrainAxes,
  resolveEateryRankProfileForEvent,
} from "@/lib/globe/eatery/resolve-eatery-rank-profile-from-travel-brain";
import {
  computeWeightedEateryRankScore,
  scoreEateryRowDimensions,
} from "@/lib/globe/eatery/score-eatery-row-dimensions";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";

/** Profile-weighted JIT score for hub carousel + feed reorder. */
export function computeEateryResourceRankWeight(input: {
  event: EventCandidate;
  row: ContextEateryInventoryRow;
  lat?: number | null;
  lng?: number | null;
  mode?: EateryRankMode | null;
}): number {
  const profile = resolveEateryRankProfileForEvent({
    event: input.event,
    mode: input.mode,
  });
  const travelBrain = buildTravelBrainState(input.event);
  const axes = describeEateryRankTravelBrainAxes(travelBrain);
  const { dimensions } = scoreEateryRowDimensions({
    row: input.row,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    foodBias: axes.foodBias,
    mealTiming: axes.mealTiming,
    budgetBand: axes.budgetBand,
  });
  return computeWeightedEateryRankScore(dimensions, profile);
}
