"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { pinLodgingSelectionToContext } from "@/lib/globe/context-hub/pin-lodging-selection-to-context";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { pinEaterySelectionToContext } from "@/lib/globe/eatery/pin-eatery-selection-to-context";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { readPinnedContextItem } from "@/lib/globe/context-pinned-item";
import { pinPlaceSelectionToContext } from "@/lib/globe/place/pin-place-selection-to-context";
import { findLifeEventCandidate } from "@/lib/life-read-model";

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
}): EventCandidate {
  const eventId = input.eventId.trim();
  const event = findLifeEventCandidate(eventId);
  if (!event) {
    throw new Error("event_not_found");
  }

  if (input.recommendation.kind === "lodging") {
    const row = readLodgingInventoryRows(event).find(
      (entry) => entry.placeId === input.recommendation.placeId,
    );
    if (!row) {
      throw new Error("lodging_row_not_found");
    }
    return pinLodgingSelectionToContext({ eventId, row });
  }

  if (
    input.recommendation.kind === "activity" ||
    input.recommendation.kind === "amenity"
  ) {
    const row = readEateryInventoryRows(event).find(
      (entry) => entry.placeId === input.recommendation.placeId,
    );
    if (!row) {
      throw new Error("place_row_not_found");
    }
    return pinPlaceSelectionToContext({
      eventId,
      kind: input.recommendation.kind,
      row,
    });
  }

  const row = readEateryInventoryRows(event).find(
    (entry) => entry.placeId === input.recommendation.placeId,
  );
  if (!row) {
    throw new Error("eatery_row_not_found");
  }
  return pinEaterySelectionToContext({ eventId, row });
}
