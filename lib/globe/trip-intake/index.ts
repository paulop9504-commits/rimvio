export type {
  TripBudgetBand,
  TripIntakeGapId,
  TripIntakeState,
  TripIntakeWriteInput,
} from "@/lib/globe/trip-intake/types";

export {
  assessTripIntakeGaps,
  hasCompleteTripIntake,
} from "@/lib/globe/trip-intake/assess-trip-intake-gaps";

export {
  TRIP_INTAKE_MAX_GUESTS,
  TRIP_INTAKE_SLOT_DEFS,
  isTripBudgetBand,
  validateTripDates,
  validateTripGuestCount,
  validateTripIntakeSlot,
} from "@/lib/globe/trip-intake/trip-intake-slots";

export { readTripIntakeState } from "@/lib/globe/trip-intake/read-trip-intake-state";

export {
  inferTripTemporalFromContext,
  isOnTripNowMessage,
  type TripTemporalInference,
  type TripTemporalInferenceSource,
} from "@/lib/globe/trip-intake/infer-trip-temporal-from-context";

export { mergeInferredTripTemporal } from "@/lib/globe/trip-intake/merge-inferred-trip-temporal";

export {
  isBroadTripPackageMessage,
  readTripIntakeGaps,
  shouldOpenTripIntake,
} from "@/lib/globe/trip-intake/should-open-trip-intake";

export {
  readTripIntakeComplete,
  refreshTripIntakeEvent,
  writeTripIntakeSlots,
} from "@/lib/globe/trip-intake/write-trip-intake-slots";
