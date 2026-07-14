import type { TripExperienceScoutLeg } from "@/lib/globe/trip-experience/build-trip-experience-parallel-scouts";

export const CONTEXT_TRIP_EXPERIENCE_MAIN_LEGS_META_KEY =
  "contextTripExperienceMainLegsV1";

export type TripExperienceMainLegPin = {
  readonly kind: TripExperienceScoutLeg;
  readonly resourceId: string;
  readonly placeId: string;
  readonly label: string;
  readonly pinnedAtIso: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly mapsUrl?: string | null;
  readonly previewUrl?: string | null;
};

export type TripExperienceMainLegsV1 = {
  readonly version: 1;
  readonly primaryKind: TripExperienceScoutLeg;
  readonly legs: Partial<Record<TripExperienceScoutLeg, TripExperienceMainLegPin>>;
};

export function isTripExperienceScoutBatchId(batchId: string): boolean {
  return batchId.trim().startsWith("trip-xp-");
}
