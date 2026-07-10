import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  resolveTripIntakeChipValue,
  type TripIntakeAskChip,
} from "@/lib/globe/trip-intake/build-trip-intake-ask-chips";
import { readTripIntakeState } from "@/lib/globe/trip-intake/read-trip-intake-state";
import type { TripIntakeState } from "@/lib/globe/trip-intake/types";
import { writeTripIntakePartial } from "@/lib/globe/trip-intake/write-trip-intake-partial";

function mergeTripIntakeState(
  base: TripIntakeState,
  patch: Partial<TripIntakeState>,
): TripIntakeState {
  return {
    destinationLabel: patch.destinationLabel ?? base.destinationLabel,
    originLabel: patch.originLabel ?? base.originLabel,
    checkInIso: patch.checkInIso ?? base.checkInIso,
    checkOutIso: patch.checkOutIso ?? base.checkOutIso,
    guestCount: patch.guestCount ?? base.guestCount,
    budgetBand: patch.budgetBand ?? base.budgetBand,
  };
}

/** Apply one ask chip → partial Context persist. */
export function applyTripIntakeAskChip(input: {
  contextEventId: string;
  event: EventCandidate | null | undefined;
  message: string;
  chip: Pick<TripIntakeAskChip, "gapId" | "value">;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
}): EventCandidate {
  const base = readTripIntakeState({
    event: input.event,
    message: input.message,
    userLat: input.userLat,
    userLng: input.userLng,
    now: input.now,
  });
  const patch = resolveTripIntakeChipValue({
    gapId: input.chip.gapId,
    value: input.chip.value,
    now: input.now,
  });
  const merged = mergeTripIntakeState(base, {
    ...patch,
    guestCount: patch.guestCount ?? base.guestCount ?? 1,
    budgetBand: patch.budgetBand ?? base.budgetBand ?? "balanced",
  });

  return writeTripIntakePartial({
    contextEventId: input.contextEventId,
    state: merged,
  });
}
