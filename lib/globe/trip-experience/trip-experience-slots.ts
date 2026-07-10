import type { SlotDefinition } from "@/lib/intake/types";
import type {
  TripExperienceGapId,
  TripExperienceState,
} from "@/lib/globe/trip-experience/types";

export const TRIP_EXPERIENCE_SLOT_DEFS: readonly SlotDefinition<
  TripExperienceState,
  TripExperienceGapId
>[] = [
  {
    id: "fun_axis",
    required: true,
    isFilled: (state) => state.funAxis != null && state.funAxis !== "open",
  },
  {
    id: "destination_scope",
    required: true,
    isFilled: (state) =>
      state.destinationScope != null && state.destinationScope !== "open",
  },
  {
    id: "dates",
    required: true,
    isFilled: (state) => Boolean(state.checkInIso && state.checkOutIso),
  },
  {
    id: "guests",
    required: false,
    isFilled: (state) => state.guestCount != null && state.guestCount > 0,
  },
  {
    id: "budget",
    required: false,
    isFilled: (state) => state.budgetBand != null,
  },
];
