import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  assessTripIntakeGaps,
  hasCompleteTripIntake,
  readTripIntakeState,
  type TripIntakeGapId,
  type TripIntakeState,
} from "@/lib/globe/trip-intake";
import { resolveSpatialTargetFromText } from "@/lib/globe/spatial/resolve-spatial-target-from-text";
import type { ContextSpatialTargetWire } from "@/lib/globe/spatial/context-spatial-target-metadata";
import { isInstantLodgingSearch, requiresLodgingBookingSlots } from "@/lib/globe/context-condition-ai/instant-lodging-search";

export type OneShotLodgingPrepStep =
  | "parse_spatial"
  | "merge_intake"
  | "scout_lodging"
  | "select_main_offer"
  | "open_express_checkout";

export type OneShotLodgingPrepPlan = {
  readonly message: string;
  readonly spatialTarget: ContextSpatialTargetWire | null;
  readonly intakeState: TripIntakeState;
  readonly intakeGaps: readonly TripIntakeGapId[];
  readonly readyForScout: boolean;
  readonly readyForExpress: boolean;
  readonly steps: readonly OneShotLodgingPrepStep[];
};

function isOneShotLodgingUtterance(message: string): boolean {
  const text = message.trim();
  if (!text) {
    return false;
  }
  return (
    requiresLodgingBookingSlots(text) ||
    isInstantLodgingSearch(text) ||
    /(?:숙소|호텔|lodging|hotel).{0,24}(?:준비|예약|잡|찾)/iu.test(text)
  );
}

function hasLodgingTemporalSlots(state: TripIntakeState): boolean {
  return Boolean(state.checkInIso && state.checkOutIso && state.guestCount);
}

/** Pure plan — utterance → spatial POV + intake merge → scout readiness. */
export function planOneShotLodgingPrep(input: {
  message: string;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
  expressReady?: boolean;
}): OneShotLodgingPrepPlan | null {
  const message = input.message.trim();
  if (!message || !isOneShotLodgingUtterance(message)) {
    return null;
  }

  const spatialHit = resolveSpatialTargetFromText(message);
  const spatialTarget: ContextSpatialTargetWire | null = spatialHit
    ? {
        label: spatialHit.label,
        lat: spatialHit.lat,
        lng: spatialHit.lng,
        query: spatialHit.query,
      }
    : null;

  const intakeState = readTripIntakeState({
    event: input.event,
    message,
    userLat: input.userLat,
    userLng: input.userLng,
    now: input.now,
  });
  const intakeGaps = assessTripIntakeGaps(intakeState);

  const readyForScout =
    spatialTarget != null &&
    hasLodgingTemporalSlots(intakeState) &&
    (hasCompleteTripIntake(intakeState) || intakeGaps.every((gap) => gap === "budget"));

  const steps: OneShotLodgingPrepStep[] = ["parse_spatial", "merge_intake"];
  if (readyForScout) {
    steps.push("scout_lodging", "select_main_offer");
    if (input.expressReady) {
      steps.push("open_express_checkout");
    }
  }

  return {
    message,
    spatialTarget,
    intakeState,
    intakeGaps,
    readyForScout,
    readyForExpress: readyForScout && input.expressReady === true,
    steps,
  };
}
