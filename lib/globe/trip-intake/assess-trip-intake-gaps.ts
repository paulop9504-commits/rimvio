import { assessGapsFromSlots, isIntakeComplete } from "@/lib/intake/assess-gaps-from-slots";
import { TRIP_INTAKE_SLOT_DEFS } from "@/lib/globe/trip-intake/trip-intake-slots";
import type { TripIntakeGapId, TripIntakeState } from "@/lib/globe/trip-intake/types";

export function assessTripIntakeGaps(
  state: TripIntakeState,
): readonly TripIntakeGapId[] {
  return assessGapsFromSlots(state, TRIP_INTAKE_SLOT_DEFS);
}

export function hasCompleteTripIntake(state: TripIntakeState): boolean {
  return isIntakeComplete(state, TRIP_INTAKE_SLOT_DEFS);
}
