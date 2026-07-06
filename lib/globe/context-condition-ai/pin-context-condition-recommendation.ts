"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { pinLodgingSelectionToContext, readPinnedLodgingResourceId } from "@/lib/globe/context-hub/pin-lodging-selection-to-context";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { pinEaterySelectionToContext, readPinnedEateryResourceId } from "@/lib/globe/eatery/pin-eatery-selection-to-context";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { findLifeEventCandidate } from "@/lib/life-read-model";

function placeIdFromPinnedResource(
  resourceId: string | null | undefined,
  kind: ContextConditionRecommendation["kind"],
): string | null {
  if (!resourceId?.trim()) {
    return null;
  }
  const marker = kind === "lodging" ? ":lodging:" : ":eatery:";
  const idx = resourceId.indexOf(marker);
  if (idx < 0) {
    return null;
  }
  const placeId = resourceId.slice(idx + marker.length).trim();
  return placeId || null;
}

export function readContextConditionPinnedPlaceIds(
  event: EventCandidate | null | undefined,
): { lodging: string | null; eatery: string | null } {
  return {
    lodging: placeIdFromPinnedResource(readPinnedLodgingResourceId(event), "lodging"),
    eatery: placeIdFromPinnedResource(readPinnedEateryResourceId(event), "eatery"),
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

  const row = readEateryInventoryRows(event).find(
    (entry) => entry.placeId === input.recommendation.placeId,
  );
  if (!row) {
    throw new Error("eatery_row_not_found");
  }
  return pinEaterySelectionToContext({ eventId, row });
}
