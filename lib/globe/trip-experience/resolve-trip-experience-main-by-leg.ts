import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { TripExperienceScoutLeg } from "@/lib/globe/trip-experience/build-trip-experience-parallel-scouts";

export type TripExperienceMainByLeg = Record<
  TripExperienceScoutLeg,
  ContextConditionRecommendation | null
>;

function rankOne(
  recommendations: readonly ContextConditionRecommendation[],
  kind: TripExperienceScoutLeg,
): ContextConditionRecommendation | null {
  const rows = recommendations.filter((row) => row.kind === kind);
  if (rows.length === 0) {
    return null;
  }
  return [...rows].sort((left, right) => left.rank - right.rank)[0] ?? null;
}

/** Rank-1 candidate per scout leg for trip experience MAIN slots. */
export function resolveTripExperienceMainByLeg(
  recommendations: readonly ContextConditionRecommendation[],
  activeLegs: readonly TripExperienceScoutLeg[] = ["lodging", "eatery", "activity"],
): TripExperienceMainByLeg {
  const result: TripExperienceMainByLeg = {
    lodging: null,
    eatery: null,
    activity: null,
  };
  for (const leg of activeLegs) {
    result[leg] = rankOne(recommendations, leg);
  }
  return result;
}
