"use client";

import { useMemo } from "react";
import { GlobeIntakeSheet } from "@/components/globe/intake/globe-intake-sheet";
import { copy } from "@/lib/copy/human-ko";
import { buildTripIntakeSheetFields, parseTripIntakeSubmitValues } from "@/lib/intake/domains/trip/build-trip-intake-sheet-fields";
import type {
  TripBudgetBand,
  TripIntakeGapId,
  TripIntakeState,
} from "@/lib/globe/trip-intake/types";

export type GlobeTripIntakeSheetProps = {
  open: boolean;
  initialState: TripIntakeState;
  gaps: readonly TripIntakeGapId[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    destinationLabel: string;
    originLabel: string;
    checkInIso: string;
    checkOutIso: string;
    guestCount: number;
    budgetBand: TripBudgetBand;
  }) => void;
};

/** @deprecated Prefer GlobeIntakeSheet + buildTripIntakeSheetFields. */
export function GlobeTripIntakeSheet({
  open,
  initialState,
  gaps,
  onOpenChange,
  onSubmit,
}: GlobeTripIntakeSheetProps) {
  const fields = useMemo(
    () => buildTripIntakeSheetFields({ state: initialState, gaps }),
    [gaps, initialState],
  );

  return (
    <GlobeIntakeSheet
      open={open}
      domainId="trip"
      title={copy.globe.tripIntakeSheetTitle}
      hint={copy.globe.tripIntakeSheetHint}
      fields={fields}
      submitLabel={copy.globe.tripIntakeApply}
      onOpenChange={onOpenChange}
      onSubmit={(values) => onSubmit(parseTripIntakeSubmitValues(values))}
    />
  );
}
