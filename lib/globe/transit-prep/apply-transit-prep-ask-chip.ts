import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  resolveTransitPrepChipValue,
  type TransitPrepAskChip,
} from "@/lib/globe/transit-prep/build-transit-prep-ask-chips";
import { planOneShotTransitPrep } from "@/lib/globe/transit-prep/plan-one-shot-transit-prep";
import { readTripIntakeState } from "@/lib/globe/trip-intake/read-trip-intake-state";
import { writeTripIntakePartial } from "@/lib/globe/trip-intake/write-trip-intake-partial";

/** Apply one transit ask chip → partial Context persist. */
export function applyTransitPrepAskChip(input: {
  contextEventId: string;
  event: EventCandidate | null | undefined;
  message: string;
  chip: Pick<TransitPrepAskChip, "gapId" | "value">;
}): EventCandidate {
  const base = readTripIntakeState({
    event: input.event,
    message: input.message,
  });
  const patch = resolveTransitPrepChipValue({
    gapId: input.chip.gapId,
    value: input.chip.value,
  });
  const transitPlan = planOneShotTransitPrep({
    message: input.message,
    event: input.event,
  });
  const destinationLabel =
    patch.destinationLabel ??
    transitPlan?.transitState.destinationLabel ??
    base.destinationLabel;

  return writeTripIntakePartial({
    contextEventId: input.contextEventId,
    state: {
      destinationLabel,
      originLabel: patch.originLabel ?? base.originLabel,
      checkInIso: base.checkInIso,
      checkOutIso: base.checkOutIso,
      guestCount: base.guestCount ?? 1,
      budgetBand: base.budgetBand ?? "balanced",
    },
  });
}
