import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  resolveFinancePrepChipValue,
  type FinancePrepAskChip,
} from "@/lib/globe/finance-prep/build-finance-prep-ask-chips";
import { readTripIntakeState } from "@/lib/globe/trip-intake/read-trip-intake-state";
import { writeTripIntakePartial } from "@/lib/globe/trip-intake/write-trip-intake-partial";

/** Apply one finance ask chip → budget persist on Context. */
export function applyFinancePrepAskChip(input: {
  contextEventId: string;
  event: EventCandidate | null | undefined;
  message: string;
  chip: Pick<FinancePrepAskChip, "gapId" | "value">;
}): EventCandidate {
  const base = readTripIntakeState({
    event: input.event,
    message: input.message,
  });
  const patch = resolveFinancePrepChipValue({
    gapId: input.chip.gapId,
    value: input.chip.value,
  });

  return writeTripIntakePartial({
    contextEventId: input.contextEventId,
    state: {
      destinationLabel: base.destinationLabel,
      originLabel: base.originLabel,
      checkInIso: base.checkInIso,
      checkOutIso: base.checkOutIso,
      guestCount: base.guestCount ?? 1,
      budgetBand: patch.budgetBand ?? base.budgetBand ?? "balanced",
    },
  });
}
