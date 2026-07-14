"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveEngineIdFromDiscoveryKind } from "@/lib/engine/resolve-discovery-engine-id";
import { recordEngineLifecycleClient } from "@/lib/engine/record-engine-lifecycle";
import { readTripExperienceMainLegPlaceIds } from "@/lib/globe/trip-experience/read-trip-experience-main-legs";
import { pinLodgingSelectionToContext } from "@/lib/globe/context-hub/pin-lodging-selection-to-context";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { pinEaterySelectionToContext } from "@/lib/globe/eatery/pin-eatery-selection-to-context";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { readPinnedContextItem } from "@/lib/globe/context-pinned-item";
import { pinPlaceSelectionToContext } from "@/lib/globe/place/pin-place-selection-to-context";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readActiveDiscoveryExecution } from "@/lib/globe/discovery-execution/read-active-discovery-execution";

export type ContextConditionPinnedByKind = {
  lodging: string | null;
  eatery: string | null;
  activity: string | null;
  amenity: string | null;
};

const EMPTY_PINNED: ContextConditionPinnedByKind = {
  lodging: null,
  eatery: null,
  activity: null,
  amenity: null,
};

export function readContextConditionPinnedPlaceIds(
  event: EventCandidate | null | undefined,
): ContextConditionPinnedByKind {
  const tripLegs = readTripExperienceMainLegPlaceIds(event);
  if (tripLegs.lodging || tripLegs.eatery || tripLegs.activity) {
    return {
      lodging: tripLegs.lodging,
      eatery: tripLegs.eatery,
      activity: tripLegs.activity,
      amenity: null,
    };
  }
  const pinned = readPinnedContextItem(event);
  if (!pinned) {
    return { ...EMPTY_PINNED };
  }
  return {
    ...EMPTY_PINNED,
    [pinned.kind]: pinned.placeId,
  };
}

/** Human final gate — pick one ranked candidate and pin to context (not booking). */
export function pinContextConditionRecommendation(input: {
  eventId: string;
  recommendation: Pick<
    ContextConditionRecommendation,
    "kind" | "placeId" | "title"
  >;
  /** When false, caller records Engine main_selected (lodging / trip one-shot). */
  recordEngineMainSelected?: boolean;
}): EventCandidate {
  const eventId = input.eventId.trim();
  const event = findLifeEventCandidate(eventId);
  if (!event) {
    throw new Error("event_not_found");
  }

  let next: EventCandidate;

  if (input.recommendation.kind === "lodging") {
    const row = readLodgingInventoryRows(event).find(
      (entry) => entry.placeId === input.recommendation.placeId,
    );
    if (!row) {
      throw new Error("lodging_row_not_found");
    }
    next = pinLodgingSelectionToContext({ eventId, row });
  } else if (
    input.recommendation.kind === "activity" ||
    input.recommendation.kind === "amenity"
  ) {
    const row = readEateryInventoryRows(event).find(
      (entry) => entry.placeId === input.recommendation.placeId,
    );
    if (!row) {
      throw new Error("place_row_not_found");
    }
    next = pinPlaceSelectionToContext({
      eventId,
      kind: input.recommendation.kind,
      row,
    });
  } else {
    const row = readEateryInventoryRows(event).find(
      (entry) => entry.placeId === input.recommendation.placeId,
    );
    if (!row) {
      throw new Error("eatery_row_not_found");
    }
    next = pinEaterySelectionToContext({ eventId, row });
  }

  const shouldRecord = input.recordEngineMainSelected !== false;
  if (shouldRecord) {
    const batchId = readActiveDiscoveryExecution(eventId)?.batchId ?? null;
    recordEngineLifecycleClient({
      contextEventId: eventId,
      engineId: resolveEngineIdFromDiscoveryKind(input.recommendation.kind),
      kind: "main_selected",
      payload: {
        placeId: input.recommendation.placeId,
        title: input.recommendation.title,
        ...(batchId ? { batchId } : {}),
      },
    });
  }

  return next;
}
