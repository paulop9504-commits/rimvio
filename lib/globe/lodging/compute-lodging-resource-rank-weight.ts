import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { LodgingRankMode } from "@/lib/globe/lodging/lodging-rank-profile";
import {
  describeLodgingRankTravelBrainAxes,
  resolveLodgingRankProfileForEvent,
} from "@/lib/globe/lodging/resolve-lodging-rank-profile-from-travel-brain";
import {
  computeWeightedLodgingRankScore,
  scoreLodgingRowDimensions,
} from "@/lib/globe/lodging/score-lodging-row-dimensions";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";
import { lodgingPreferenceScoreDelta } from "@/lib/workstream/preference-rank-bias";

/** Profile-weighted JIT score for hub carousel + feed reorder. */
export function computeLodgingResourceRankWeight(input: {
  event: EventCandidate;
  row: ContextLodgingInventoryRow;
  lat?: number | null;
  lng?: number | null;
  mode?: LodgingRankMode | null;
}): number {
  const profile = resolveLodgingRankProfileForEvent({
    event: input.event,
    mode: input.mode,
  });
  const travelBrain = buildTravelBrainState(input.event);
  const axes = describeLodgingRankTravelBrainAxes(travelBrain);
  const { dimensions, distanceKm } = scoreLodgingRowDimensions({
    row: input.row,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    lodgingPriority: axes.lodgingPriority,
    budgetBand: axes.budgetBand,
  });
  return (
    computeWeightedLodgingRankScore(dimensions, profile) +
    lodgingPreferenceScoreDelta({
      name: input.row.name,
      address: input.row.address,
      priceKrw: input.row.priceKrw ?? null,
      distanceKm,
    })
  );
}
