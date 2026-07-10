import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  resolveTripExperienceChipValue,
  type TripExperienceAskChip,
} from "@/lib/globe/trip-experience/build-trip-experience-ask-chips";
import { readTripExperienceState } from "@/lib/globe/trip-experience/read-trip-experience-state";
import type { TripExperienceState } from "@/lib/globe/trip-experience/types";
import { writeTripExperiencePartial } from "@/lib/globe/trip-experience/write-trip-experience-partial";

function mergeExperienceState(
  base: TripExperienceState,
  patch: Partial<TripExperienceState>,
): TripExperienceState {
  return {
    funAxis: patch.funAxis ?? base.funAxis,
    destinationScope: patch.destinationScope ?? base.destinationScope,
    destinationLabel: patch.destinationLabel ?? base.destinationLabel,
    checkInIso: patch.checkInIso ?? base.checkInIso,
    checkOutIso: patch.checkOutIso ?? base.checkOutIso,
    guestCount: patch.guestCount ?? base.guestCount ?? 2,
    budgetBand: patch.budgetBand ?? base.budgetBand ?? "balanced",
  };
}

/** Apply one experience ask chip → Context persist. */
export function applyTripExperienceAskChip(input: {
  contextEventId: string;
  event: EventCandidate | null | undefined;
  message: string;
  chip: Pick<TripExperienceAskChip, "gapId" | "value">;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
}): EventCandidate {
  const base = readTripExperienceState({
    event: input.event,
    message: input.message,
    userLat: input.userLat,
    userLng: input.userLng,
    now: input.now,
  });
  const patch = resolveTripExperienceChipValue({
    gapId: input.chip.gapId,
    value: input.chip.value,
    now: input.now,
  });
  const merged = mergeExperienceState(base, patch);

  return writeTripExperiencePartial({
    contextEventId: input.contextEventId,
    state: merged,
  });
}
