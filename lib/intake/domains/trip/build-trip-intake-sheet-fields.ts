import { copy } from "@/lib/copy/human-ko";
import type { TripBudgetBand, TripIntakeGapId, TripIntakeState } from "@/lib/globe/trip-intake/types";
import type { IntakeSheetField } from "@/lib/intake/intake-sheet-field-types";

function dateInputValue(iso: string | null): string {
  return iso?.slice(0, 10) ?? "";
}

export function buildTripIntakeSheetFields(input: {
  state: TripIntakeState;
  gaps: readonly TripIntakeGapId[];
}): IntakeSheetField[] {
  const { state, gaps } = input;
  const show = (gapId: TripIntakeGapId, filled: boolean) =>
    gaps.includes(gapId) || !filled;

  const fields: IntakeSheetField[] = [];

  if (show("destination", Boolean(state.destinationLabel?.trim()))) {
    fields.push({
      id: "destinationLabel",
      gapId: "destination",
      kind: "text",
      label: copy.globe.tripIntakeDestination,
      placeholder: copy.globe.tripIntakeDestinationPlaceholder,
      value: state.destinationLabel ?? "",
    });
  }

  if (show("origin", Boolean(state.originLabel?.trim()))) {
    fields.push({
      id: "originLabel",
      gapId: "origin",
      kind: "text",
      label: copy.globe.tripIntakeOrigin,
      placeholder: copy.globe.tripIntakeOriginPlaceholder,
      value: state.originLabel ?? "",
    });
  }

  if (
    show(
      "dates",
      Boolean(state.checkInIso?.trim() && state.checkOutIso?.trim()),
    )
  ) {
    fields.push(
      {
        id: "checkInIso",
        gapId: "dates",
        kind: "date",
        label: copy.globe.tripIntakeDepart,
        value: dateInputValue(state.checkInIso),
      },
      {
        id: "checkOutIso",
        gapId: "dates",
        kind: "date",
        label: copy.globe.tripIntakeReturn,
        value: dateInputValue(state.checkOutIso),
      },
    );
  }

  if (show("guests", state.guestCount != null && state.guestCount > 0)) {
    fields.push({
      id: "guestCount",
      gapId: "guests",
      kind: "number",
      label: copy.globe.tripIntakeGuestCount,
      value: state.guestCount ?? 2,
      min: 1,
      max: 12,
    });
  }

  if (show("budget", Boolean(state.budgetBand))) {
    fields.push({
      id: "budgetBand",
      gapId: "budget",
      kind: "enum",
      label: copy.globe.tripIntakeBudget,
      value: state.budgetBand ?? "balanced",
      enumOptions: [
        { id: "value", label: copy.globe.tripIntakeBudgetValue },
        { id: "balanced", label: copy.globe.tripIntakeBudgetBalanced },
        { id: "premium", label: copy.globe.tripIntakeBudgetPremium },
      ],
    });
  }

  return fields;
}

export function parseTripIntakeSubmitValues(
  values: Record<string, string | number>,
): {
  destinationLabel: string;
  originLabel: string;
  checkInIso: string;
  checkOutIso: string;
  guestCount: number;
  budgetBand: TripBudgetBand;
} {
  const checkIn = String(values.checkInIso ?? "").slice(0, 10);
  const checkOut = String(values.checkOutIso ?? "").slice(0, 10);
  const budgetRaw = String(values.budgetBand ?? "balanced");
  const budgetBand: TripBudgetBand =
    budgetRaw === "value" || budgetRaw === "premium" ? budgetRaw : "balanced";

  return {
    destinationLabel: String(values.destinationLabel ?? "").trim(),
    originLabel: String(values.originLabel ?? "").trim(),
    checkInIso: `${checkIn}T09:00:00.000Z`,
    checkOutIso: `${checkOut}T18:00:00.000Z`,
    guestCount: Math.max(1, Math.round(Number(values.guestCount) || 1)),
    budgetBand,
  };
}
