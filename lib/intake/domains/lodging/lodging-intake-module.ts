import { copy } from "@/lib/copy/human-ko";
import { createDomainIntakeModule } from "@/lib/intake/create-domain-intake-module";
import type { IntakeContext } from "@/lib/intake/types";
import {
  hasCompleteLodgingBookingSlots,
  isLodgingBookingQuery,
  readLodgingBookingSlots,
} from "@/lib/globe/context-hub/lodging-booking-slots";
import { requiresLodgingBookingSlots } from "@/lib/globe/context-condition-ai/instant-lodging-search";
import { planOneShotLodgingPrep } from "@/lib/globe/lodging-prep/plan-one-shot-lodging-prep";
import { buildTripIntakeAskChips } from "@/lib/globe/trip-intake/build-trip-intake-ask-chips";
import { LODGING_INTAKE_SLOT_DEFS } from "@/lib/intake/domains/lodging/lodging-intake-slots";

export const LODGING_INTAKE_DOMAIN_ID = "lodging" as const;
export const LODGING_INTAKE_PRIORITY = 20;

export const lodgingIntakeModule = createDomainIntakeModule({
  domainId: LODGING_INTAKE_DOMAIN_ID,
  priority: LODGING_INTAKE_PRIORITY,
  toastMessageKo: copy.globe.lodgingSlotMissingToast,
  slotDefs: LODGING_INTAKE_SLOT_DEFS,
  readState: (ctx: IntakeContext) => readLodgingBookingSlots(ctx.event),
  shouldOpen: (ctx: IntakeContext) => {
    const text = ctx.message.trim();
    if (!text || !isLodgingBookingQuery(text) || !requiresLodgingBookingSlots(text)) {
      return false;
    }
    const prepPlan = planOneShotLodgingPrep({
      message: text,
      event: ctx.event,
    });
    if (
      prepPlan &&
      prepPlan.intakeGaps.length > 0 &&
      buildTripIntakeAskChips(prepPlan.intakeGaps).length > 0
    ) {
      return false;
    }
    return !hasCompleteLodgingBookingSlots(readLodgingBookingSlots(ctx.event));
  },
});
