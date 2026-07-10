import type { TripIntakeState } from "@/lib/globe/trip-intake/types";
import type { TripTemporalInference } from "@/lib/globe/trip-intake/infer-trip-temporal-from-context";

/** Fill only missing trip intake slots from temporal inference. */
export function mergeInferredTripTemporal(
  state: TripIntakeState,
  inferred: TripTemporalInference,
): TripIntakeState {
  if (!inferred.onTripNow) {
    return state;
  }

  return {
    destinationLabel: state.destinationLabel,
    originLabel: state.originLabel ?? inferred.originLabel,
    checkInIso: state.checkInIso ?? inferred.checkInIso,
    checkOutIso: state.checkOutIso ?? inferred.checkOutIso,
    guestCount: state.guestCount ?? inferred.guestCount,
    budgetBand: state.budgetBand ?? inferred.budgetBand,
  };
}
