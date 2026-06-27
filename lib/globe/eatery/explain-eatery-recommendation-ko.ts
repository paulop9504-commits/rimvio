import { copy } from "@/lib/copy/human-ko";

export type EateryRecommendReasonInput = {
  peoplePlaceMatch?: { displayName: string; placeLabel: string } | null;
  travelTrajectory?: boolean;
  distanceKm?: number | null;
  cuisineHint?: string | null;
  rankIndex?: number;
};

export function explainEateryRecommendationKo(
  input: EateryRecommendReasonInput,
): { reasonKo: string; matchReasons: string[] } {
  const matchReasons: string[] = [];
  const globe = copy.globe;

  if (input.peoplePlaceMatch) {
    matchReasons.push(
      globe.eateryReasonPeoplePlace(
        input.peoplePlaceMatch.displayName,
        input.peoplePlaceMatch.placeLabel,
      ),
    );
  }

  if (input.travelTrajectory) {
    matchReasons.push(globe.eateryReasonTravelTrajectory);
  }

  if (input.distanceKm != null && input.distanceKm <= 0.5) {
    matchReasons.push(globe.eateryReasonNearHere);
  } else if (input.distanceKm != null && input.distanceKm <= 1.5) {
    matchReasons.push(globe.eateryReasonWithinReach);
  }

  if (input.cuisineHint?.trim()) {
    matchReasons.push(globe.eateryReasonCuisine(input.cuisineHint.trim()));
  }

  if (input.rankIndex === 0 && matchReasons.length === 0) {
    matchReasons.push(globe.eateryReasonTopPick);
  }

  const reasonKo = matchReasons[0] ?? globe.eateryReasonFallback;
  return { reasonKo, matchReasons: matchReasons.slice(0, 3) };
}
