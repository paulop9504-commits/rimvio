import { extractTravelDestination } from "@/lib/action-chat/try-travel-trip-announcement";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { isTransitPrepUtterance } from "@/lib/globe/transit-prep/is-transit-prep-utterance";
import { readTripIntakeState } from "@/lib/globe/trip-intake/read-trip-intake-state";

export type TransitPrepGapId = "destination" | "origin";

export type TransitPrepState = {
  readonly destinationLabel: string | null;
  readonly originLabel: string | null;
};

export type OneShotTransitPrepStep =
  | "parse_transit_intent"
  | "merge_destination"
  | "open_navigate_field";

export type OneShotTransitPrepPlan = {
  readonly message: string;
  readonly transitState: TransitPrepState;
  readonly transitGaps: readonly TransitPrepGapId[];
  readonly readyForNavigate: boolean;
  readonly steps: readonly OneShotTransitPrepStep[];
};

function normalizeTransitDestination(label: string | null | undefined): string | null {
  const trimmed = label?.trim();
  if (!trimmed) {
    return null;
  }
  if (/^(?:이동|교통|택시|경로|길|픽업|환승)$/iu.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function extractTransitDestination(message: string): string | null {
  const untilMatch = message.match(
    /([가-힣a-zA-Z0-9]{2,20})\s*까지\s*(?:가|이동|찾|타|예약|길|타고)/iu,
  );
  if (untilMatch?.[1]?.trim()) {
    return normalizeTransitDestination(untilMatch[1].trim());
  }

  const airportMatch = message.match(/(인천공항|김포공항|김해공항|공항)/iu);
  if (airportMatch?.[1]) {
    return airportMatch[1].trim();
  }

  return normalizeTransitDestination(extractTravelDestination(message));
}

function readTransitPrepState(input: {
  event: EventCandidate | null | undefined;
  message: string;
}): TransitPrepState {
  const intake = readTripIntakeState({
    event: input.event,
    message: input.message,
  });
  const destinationLabel = normalizeTransitDestination(
    intake.destinationLabel?.trim() ||
      extractTransitDestination(input.message) ||
      input.event?.place?.trim() ||
      null,
  );

  return {
    destinationLabel,
    originLabel: intake.originLabel?.trim() || null,
  };
}

function assessTransitPrepGaps(state: TransitPrepState): readonly TransitPrepGapId[] {
  const gaps: TransitPrepGapId[] = [];
  if (!state.destinationLabel?.trim()) {
    gaps.push("destination");
  }
  return gaps;
}

/** Pure plan — transit utterance → destination merge → NAVIGATE readiness. */
export function planOneShotTransitPrep(input: {
  message: string;
  event: EventCandidate | null | undefined;
}): OneShotTransitPrepPlan | null {
  const message = input.message.trim();
  if (!message || !isTransitPrepUtterance(message)) {
    return null;
  }

  const transitState = readTransitPrepState({
    event: input.event,
    message,
  });
  const transitGaps = assessTransitPrepGaps(transitState);
  const readyForNavigate = transitGaps.length === 0;

  const steps: OneShotTransitPrepStep[] = ["parse_transit_intent", "merge_destination"];
  if (readyForNavigate) {
    steps.push("open_navigate_field");
  }

  return {
    message,
    transitState,
    transitGaps,
    readyForNavigate,
    steps,
  };
}
