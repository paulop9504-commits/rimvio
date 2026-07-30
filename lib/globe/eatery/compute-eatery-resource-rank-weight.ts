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
import { eateryPreferenceScoreDelta } from "@/lib/workstream/preference-rank-bias";

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
  const { dimensions, distanceKm } = scoreEateryRowDimensions({
    row: input.row,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    foodBias: axes.foodBias,
    mealTiming: axes.mealTiming,
    budgetBand: axes.budgetBand,
  });
  return (
    computeWeightedEateryRankScore(dimensions, profile) +
    eateryPreferenceScoreDelta({
      name: input.row.name,
      address: input.row.address,
      categoryLabel: input.row.categoryLabel,
      cuisineHint: input.row.cuisineHint,
      specialReasonKo: input.row.specialReasonKo,
      priceLevel: input.row.priceLevel,
      distanceKm,
      reviewCount: input.row.reviewCount,
    })
  );
}
