import { copy } from "@/lib/copy/human-ko";
import { buildIntakeSnapshot } from "@/lib/intake/build-intake-snapshot";
import { createDomainIntakeModule } from "@/lib/intake/create-domain-intake-module";
import type { IntakeContext } from "@/lib/intake/types";
import { readTripIntakeState } from "@/lib/globe/trip-intake/read-trip-intake-state";
import { isBroadTripPackageMessage } from "@/lib/globe/trip-intake/should-open-trip-intake";
import { TRIP_INTAKE_SLOT_DEFS } from "@/lib/globe/trip-intake/trip-intake-slots";

export const TRIP_INTAKE_DOMAIN_ID = "trip" as const;
export const TRIP_INTAKE_PRIORITY = 10;

function readTripState(ctx: IntakeContext) {
  return readTripIntakeState({
    event: ctx.event,
    message: ctx.message,
    blueprint: ctx.blueprint,
  });
}

export const tripIntakeModule = createDomainIntakeModule({
  domainId: TRIP_INTAKE_DOMAIN_ID,
  priority: TRIP_INTAKE_PRIORITY,
  toastMessageKo: copy.globe.tripIntakeMissingToast,
  slotDefs: TRIP_INTAKE_SLOT_DEFS,
  readState: readTripState,
  shouldOpen: (ctx: IntakeContext) => {
    if (!isBroadTripPackageMessage(ctx.message)) {
      return false;
    }
    const snapshot = buildIntakeSnapshot({
      domainId: TRIP_INTAKE_DOMAIN_ID,
      state: readTripState(ctx),
      slotDefs: TRIP_INTAKE_SLOT_DEFS,
    });
    return !snapshot.complete;
  },
});
