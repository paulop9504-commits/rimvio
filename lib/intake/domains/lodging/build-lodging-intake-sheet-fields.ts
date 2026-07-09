import { copy } from "@/lib/copy/human-ko";
import type { LodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import type { LodgingIntakeGapId } from "@/lib/intake/domains/lodging/lodging-intake-slots";
import type { IntakeSheetField } from "@/lib/intake/intake-sheet-field-types";

function dateInputValue(iso: string | null): string {
  return iso?.slice(0, 10) ?? "";
}

export function buildLodgingIntakeSheetFields(input: {
  state: LodgingBookingSlots;
  gaps: readonly LodgingIntakeGapId[];
}): IntakeSheetField[] {
  const { state, gaps } = input;
  const show = (gapId: LodgingIntakeGapId, filled: boolean) =>
    gaps.includes(gapId) || !filled;

  const fields: IntakeSheetField[] = [];

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
        label: copy.globe.lodgingSlotCheckIn,
        value: dateInputValue(state.checkInIso),
      },
      {
        id: "checkOutIso",
        gapId: "dates",
        kind: "date",
        label: copy.globe.lodgingSlotCheckOut,
        value: dateInputValue(state.checkOutIso),
      },
    );
  }

  if (show("guests", state.guestCount != null && state.guestCount > 0)) {
    fields.push({
      id: "guestCount",
      gapId: "guests",
      kind: "number",
      label: copy.globe.lodgingSlotGuestCount,
      value: state.guestCount ?? 1,
      min: 1,
      max: 12,
    });
  }

  if (show("rooms", state.roomCount != null && state.roomCount > 0)) {
    fields.push({
      id: "roomCount",
      gapId: "rooms",
      kind: "number",
      label: copy.globe.lodgingSlotRoomCount,
      value: state.roomCount ?? 1,
      min: 1,
      max: 6,
    });
  }

  return fields;
}

export function parseLodgingIntakeSubmitValues(
  values: Record<string, string | number>,
): {
  checkInIso: string;
  checkOutIso: string;
  guestCount: number;
  roomCount: number;
} {
  const checkIn = String(values.checkInIso ?? "").slice(0, 10);
  const checkOut = String(values.checkOutIso ?? "").slice(0, 10);
  return {
    checkInIso: `${checkIn}T15:00:00.000Z`,
    checkOutIso: `${checkOut}T11:00:00.000Z`,
    guestCount: Math.max(1, Math.round(Number(values.guestCount) || 1)),
    roomCount: Math.max(1, Math.round(Number(values.roomCount) || 1)),
  };
}
