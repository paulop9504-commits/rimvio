import type { SlotDefinition } from "@/lib/intake/types";
import type { LodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import { areLodgingStayDatesValid } from "@/lib/globe/context-hub/lodging-booking-date-bounds";

export type LodgingIntakeGapId = "dates" | "guests" | "rooms";

function isValidIsoDate(value: string | null | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }
  return /^\d{4}-\d{2}-\d{2}/.test(value.trim());
}

function validateLodgingDates(state: LodgingBookingSlots): boolean {
  if (!isValidIsoDate(state.checkInIso) || !isValidIsoDate(state.checkOutIso)) {
    return false;
  }
  return areLodgingStayDatesValid({
    checkInYmd: state.checkInIso,
    checkOutYmd: state.checkOutIso,
  });
}

export const LODGING_INTAKE_SLOT_DEFS: readonly SlotDefinition<
  LodgingBookingSlots,
  LodgingIntakeGapId
>[] = [
  {
    id: "dates",
    required: true,
    isFilled: (state) =>
      isValidIsoDate(state.checkInIso) && isValidIsoDate(state.checkOutIso),
    validate: validateLodgingDates,
  },
  {
    id: "guests",
    required: true,
    isFilled: (state) => state.guestCount != null && state.guestCount > 0,
    validate: (state) =>
      state.guestCount != null &&
      Number.isFinite(state.guestCount) &&
      state.guestCount >= 1 &&
      state.guestCount <= 12,
  },
  {
    id: "rooms",
    required: true,
    isFilled: (state) => state.roomCount != null && state.roomCount > 0,
    validate: (state) =>
      state.roomCount != null &&
      Number.isFinite(state.roomCount) &&
      state.roomCount >= 1 &&
      state.roomCount <= 6,
  },
];
