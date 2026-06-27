import { copy } from "@/lib/copy/human-ko";

export type LodgingRecommendReasonInput = {
  peoplePlaceMatch?: { displayName: string; placeLabel: string } | null;
  travelTrajectory?: boolean;
  distanceKm?: number | null;
  priceKrw?: number | null;
  rankIndex?: number;
};

export function explainLodgingRecommendationKo(
  input: LodgingRecommendReasonInput,
): { reasonKo: string; matchReasons: string[] } {
  const matchReasons: string[] = [];
  const globe = copy.globe;

  if (input.peoplePlaceMatch) {
    matchReasons.push(
      globe.lodgingReasonPeoplePlace(
        input.peoplePlaceMatch.displayName,
        input.peoplePlaceMatch.placeLabel,
      ),
    );
  }

  if (input.travelTrajectory) {
    matchReasons.push(globe.lodgingReasonTravelTrajectory);
  }

  if (input.distanceKm != null && input.distanceKm <= 3) {
    matchReasons.push(globe.lodgingReasonNearHere);
  } else if (input.distanceKm != null && input.distanceKm <= 8) {
    matchReasons.push(globe.lodgingReasonWithinReach);
  }

  if (input.priceKrw != null && input.priceKrw <= 80_000) {
    matchReasons.push(globe.lodgingReasonGoodPrice);
  }

  if (input.rankIndex === 0 && matchReasons.length === 0) {
    matchReasons.push(globe.lodgingReasonTopPick);
  }

  const reasonKo = matchReasons[0] ?? globe.lodgingReasonFallback;
  return { reasonKo, matchReasons: matchReasons.slice(0, 3) };
}
