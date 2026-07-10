import { copy } from "@/lib/copy/human-ko";
import {
  buildLodgingIntakeSheetFields,
} from "@/lib/intake/domains/lodging/build-lodging-intake-sheet-fields";
import { LODGING_INTAKE_DOMAIN_ID } from "@/lib/intake/domains/lodging/lodging-intake-module";
import {
  buildTripIntakeSheetFields,
} from "@/lib/intake/domains/trip/build-trip-intake-sheet-fields";
import { TRIP_INTAKE_DOMAIN_ID } from "@/lib/intake/domains/trip/trip-intake-module";
import type { IntakeSheetField } from "@/lib/intake/intake-sheet-field-types";
import type { IntakeOffer } from "@/lib/intake/types";
import type { LodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import type { LodgingIntakeGapId } from "@/lib/intake/domains/lodging/lodging-intake-slots";
import type { TripIntakeGapId, TripIntakeState } from "@/lib/globe/trip-intake/types";

export type IntakeSheetPresentation = {
  readonly domainId: string;
  readonly title: string;
  readonly hint: string;
  readonly submitLabel: string;
  readonly fields: readonly IntakeSheetField[];
};

export function buildIntakeSheetFromOffer(
  offer: IntakeOffer,
  options?: { gapsOverride?: readonly string[] },
): IntakeSheetPresentation | null {
  if (offer.domainId === TRIP_INTAKE_DOMAIN_ID) {
    const gaps = (options?.gapsOverride ??
      offer.snapshot.gaps) as readonly TripIntakeGapId[];
    return {
      domainId: offer.domainId,
      title: copy.globe.tripIntakeSheetTitle,
      hint: copy.globe.tripIntakeSheetHint,
      submitLabel: copy.globe.tripIntakeApply,
      fields: buildTripIntakeSheetFields({
        state: offer.snapshot.state as TripIntakeState,
        gaps,
      }),
    };
  }

  if (offer.domainId === LODGING_INTAKE_DOMAIN_ID) {
    const gaps = (options?.gapsOverride ??
      offer.snapshot.gaps) as readonly LodgingIntakeGapId[];
    return {
      domainId: offer.domainId,
      title: copy.globe.lodgingSlotSheetTitle,
      hint: copy.globe.lodgingSlotSheetHint,
      submitLabel: copy.globe.lodgingSlotApply,
      fields: buildLodgingIntakeSheetFields({
        state: offer.snapshot.state as LodgingBookingSlots,
        gaps,
      }),
    };
  }

  return null;
}

export function buildLodgingIntakeEditOffer(
  state: LodgingBookingSlots,
): IntakeSheetPresentation {
  return {
    domainId: LODGING_INTAKE_DOMAIN_ID,
    title: copy.globe.lodgingSlotSheetTitle,
    hint: copy.globe.lodgingSlotSheetHint,
    submitLabel: copy.globe.lodgingSlotApply,
    fields: buildLodgingIntakeSheetFields({
      state,
      gaps: ["dates", "guests", "rooms"],
    }),
  };
}
