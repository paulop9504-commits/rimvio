import { assessGapsFromSlots, isIntakeComplete } from "@/lib/intake/assess-gaps-from-slots";
import { TRIP_EXPERIENCE_SLOT_DEFS } from "@/lib/globe/trip-experience/trip-experience-slots";
import type {
  TripExperienceGapId,
  TripExperienceState,
} from "@/lib/globe/trip-experience/types";

export function assessTripExperienceGaps(
  state: TripExperienceState,
): readonly TripExperienceGapId[] {
  return assessGapsFromSlots(state, TRIP_EXPERIENCE_SLOT_DEFS);
}

export function hasCompleteTripExperience(state: TripExperienceState): boolean {
  return isIntakeComplete(state, TRIP_EXPERIENCE_SLOT_DEFS);
}
