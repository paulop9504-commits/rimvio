import type { EventCandidate } from "@/lib/events/event-candidate";
import { isFlightPrepUtterance } from "@/lib/globe/flight-prep/is-flight-prep-utterance";
import {
  assessTripIntakeGaps,
  readTripIntakeState,
  type TripIntakeGapId,
  type TripIntakeState,
} from "@/lib/globe/trip-intake";

export type OneShotFlightPrepStep =
  | "merge_intake"
  | "resolve_departure_hub"
  | "connect_flight_hub"
  | "open_flight_booking";

export type OneShotFlightPrepPlan = {
  readonly message: string;
  readonly intakeState: TripIntakeState;
  readonly intakeGaps: readonly TripIntakeGapId[];
  readonly readyForHub: boolean;
  readonly steps: readonly OneShotFlightPrepStep[];
};

function hasFlightDepartDate(state: TripIntakeState): boolean {
  return Boolean(state.checkInIso?.trim());
}

function flightPrepGaps(state: TripIntakeState): readonly TripIntakeGapId[] {
  return assessTripIntakeGaps(state).filter((gap) => gap !== "budget" && gap !== "guests");
}

function isReadyForFlightHub(state: TripIntakeState, gaps: readonly TripIntakeGapId[]): boolean {
  return (
    Boolean(state.destinationLabel?.trim() && state.originLabel?.trim()) &&
    hasFlightDepartDate(state) &&
    gaps.length === 0
  );
}

/** Pure plan — flight utterance → intake merge → departure hub readiness. */
export function planOneShotFlightPrep(input: {
  message: string;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
}): OneShotFlightPrepPlan | null {
  const message = input.message.trim();
  if (!message || !isFlightPrepUtterance(message)) {
    return null;
  }

  const intakeState = readTripIntakeState({
    event: input.event,
    message,
    userLat: input.userLat,
    userLng: input.userLng,
    now: input.now,
  });
  const intakeGaps = flightPrepGaps(intakeState);
  const readyForHub = isReadyForFlightHub(intakeState, intakeGaps);

  const steps: OneShotFlightPrepStep[] = ["merge_intake"];
  if (readyForHub) {
    steps.push("resolve_departure_hub", "connect_flight_hub", "open_flight_booking");
  }

  return {
    message,
    intakeState,
    intakeGaps,
    readyForHub,
    steps,
  };
}
