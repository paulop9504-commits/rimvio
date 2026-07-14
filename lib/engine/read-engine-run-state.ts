import { readEngineEventsFromMetadata } from "@/lib/engine/engine-event-metadata";
import type { RimvioEngineId, RimvioEngineRunState } from "@/lib/engine/engine-types";
import { CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY } from "@/lib/globe/context-pinned-item";
import { CONTEXT_TRIP_BUDGET_BAND_META_KEY } from "@/lib/globe/trip-intake/trip-intake-metadata-keys";
import {
  assessTripIntakeGaps,
  hasCompleteTripIntake,
  readTripIntakeState,
} from "@/lib/globe/trip-intake";
import type { EventCandidate } from "@/lib/events/event-candidate";

function engineEventsFor(
  event: EventCandidate | null | undefined,
  engineId: RimvioEngineId,
) {
  return readEngineEventsFromMetadata(event?.metadata).filter(
    (row) => row.engineId === engineId,
  );
}

function hasEngineEvent(
  event: EventCandidate | null | undefined,
  engineId: RimvioEngineId,
  kind: "scout_complete" | "main_selected",
): boolean {
  return engineEventsFor(event, engineId).some((row) => row.kind === kind);
}

function tripIntakeState(event: EventCandidate | null | undefined): RimvioEngineRunState {
  if (!event) {
    return "idle";
  }
  const intake = readTripIntakeState({ event });
  if (assessTripIntakeGaps(intake).length > 0) {
    return "awaiting_slots";
  }
  if (hasCompleteTripIntake(intake)) {
    return "planning";
  }
  return "idle";
}

export function readLodgingSearchEngineState(
  event: EventCandidate | null | undefined,
): RimvioEngineRunState {
  if (!event) {
    return "idle";
  }
  if (event.metadata?.[CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY]) {
    return "prepared";
  }
  if (hasEngineEvent(event, "lodging_search", "main_selected")) {
    return "awaiting_approval";
  }
  if (hasEngineEvent(event, "lodging_search", "scout_complete")) {
    return "scouting";
  }
  return tripIntakeState(event);
}

export function readFlightBookingEngineState(
  event: EventCandidate | null | undefined,
): RimvioEngineRunState {
  if (!event) {
    return "idle";
  }
  if (hasEngineEvent(event, "flight_booking", "main_selected")) {
    return "prepared";
  }
  if (hasEngineEvent(event, "flight_booking", "scout_complete")) {
    return "scouting";
  }
  return tripIntakeState(event);
}

export function readTripExperienceSearchEngineState(
  event: EventCandidate | null | undefined,
): RimvioEngineRunState {
  if (!event) {
    return "idle";
  }
  if (hasEngineEvent(event, "trip_experience_search", "main_selected")) {
    return "prepared";
  }
  if (hasEngineEvent(event, "trip_experience_search", "scout_complete")) {
    return "scouting";
  }
  const intake = readTripIntakeState({ event });
  if (!hasCompleteTripIntake(intake)) {
    return "awaiting_slots";
  }
  return "planning";
}

export function readTransitNavigateEngineState(
  event: EventCandidate | null | undefined,
): RimvioEngineRunState {
  if (!event) {
    return "idle";
  }
  if (hasEngineEvent(event, "transit_navigate", "main_selected")) {
    return "prepared";
  }
  if (hasEngineEvent(event, "transit_navigate", "scout_complete")) {
    return "scouting";
  }
  return "planning";
}

export function readFinancePrepEngineState(
  event: EventCandidate | null | undefined,
): RimvioEngineRunState {
  if (!event) {
    return "idle";
  }
  if (hasEngineEvent(event, "finance_prep", "main_selected")) {
    return "prepared";
  }
  if (hasEngineEvent(event, "finance_prep", "scout_complete")) {
    return "scouting";
  }
  if (event.metadata?.[CONTEXT_TRIP_BUDGET_BAND_META_KEY]) {
    return "planning";
  }
  return "awaiting_slots";
}

export function readLocalAmenitySearchEngineState(
  event: EventCandidate | null | undefined,
): RimvioEngineRunState {
  if (!event) {
    return "idle";
  }
  if (hasEngineEvent(event, "local_amenity_search", "main_selected")) {
    return "prepared";
  }
  if (hasEngineEvent(event, "local_amenity_search", "scout_complete")) {
    return "scouting";
  }
  return "idle";
}

export function readEaterySearchEngineState(
  event: EventCandidate | null | undefined,
): RimvioEngineRunState {
  if (!event) {
    return "idle";
  }
  if (hasEngineEvent(event, "eatery_search", "main_selected")) {
    return "prepared";
  }
  if (hasEngineEvent(event, "eatery_search", "scout_complete")) {
    return "scouting";
  }
  return "idle";
}

export function readActivitySearchEngineState(
  event: EventCandidate | null | undefined,
): RimvioEngineRunState {
  if (!event) {
    return "idle";
  }
  if (hasEngineEvent(event, "activity_search", "main_selected")) {
    return "prepared";
  }
  if (hasEngineEvent(event, "activity_search", "scout_complete")) {
    return "scouting";
  }
  return "idle";
}
