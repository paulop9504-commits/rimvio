import type { SlotDefinition } from "@/lib/intake/types";
import type {
  TripBudgetBand,
  TripIntakeGapId,
  TripIntakeState,
} from "@/lib/globe/trip-intake/types";

const MAX_GUESTS = 12;

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function isValidIsoDate(value: string | null | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function parseDateMs(value: string): number | null {
  const ms = Date.parse(value.slice(0, 10));
  return Number.isFinite(ms) ? ms : null;
}

export function validateTripDates(state: TripIntakeState): boolean {
  if (!isValidIsoDate(state.checkInIso) || !isValidIsoDate(state.checkOutIso)) {
    return false;
  }
  const checkIn = parseDateMs(state.checkInIso!);
  const checkOut = parseDateMs(state.checkOutIso!);
  if (checkIn == null || checkOut == null) {
    return false;
  }
  return checkOut > checkIn;
}

export function validateTripGuestCount(state: TripIntakeState): boolean {
  return (
    state.guestCount != null &&
    Number.isFinite(state.guestCount) &&
    state.guestCount >= 1 &&
    state.guestCount <= MAX_GUESTS
  );
}

export function validateTripBudgetBand(state: TripIntakeState): boolean {
  return (
    state.budgetBand === "value" ||
    state.budgetBand === "balanced" ||
    state.budgetBand === "premium"
  );
}

export function validateTripIntakeSlot(
  gapId: TripIntakeGapId,
  state: TripIntakeState,
): boolean {
  switch (gapId) {
    case "destination":
      return hasText(state.destinationLabel);
    case "origin":
      return hasText(state.originLabel);
    case "dates":
      return validateTripDates(state);
    case "guests":
      return validateTripGuestCount(state);
    case "budget":
      return validateTripBudgetBand(state);
    default:
      return false;
  }
}

export const TRIP_INTAKE_SLOT_DEFS: readonly SlotDefinition<
  TripIntakeState,
  TripIntakeGapId
>[] = [
  {
    id: "destination",
    required: true,
    isFilled: (state) => hasText(state.destinationLabel),
    validate: (state) => hasText(state.destinationLabel),
  },
  {
    id: "origin",
    required: true,
    isFilled: (state) => hasText(state.originLabel),
    validate: (state) => hasText(state.originLabel),
  },
  {
    id: "dates",
    required: true,
    isFilled: (state) =>
      isValidIsoDate(state.checkInIso) && isValidIsoDate(state.checkOutIso),
    validate: validateTripDates,
  },
  {
    id: "guests",
    required: true,
    isFilled: (state) => state.guestCount != null && state.guestCount > 0,
    validate: validateTripGuestCount,
  },
  {
    id: "budget",
    required: true,
    isFilled: (state) => state.budgetBand != null,
    validate: validateTripBudgetBand,
  },
];

export function isTripBudgetBand(value: unknown): value is TripBudgetBand {
  return value === "value" || value === "balanced" || value === "premium";
}

export const TRIP_INTAKE_MAX_GUESTS = MAX_GUESTS;
