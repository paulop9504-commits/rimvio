import type { EventCandidate } from "@/lib/events/event-candidate";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import type { PlaceReviewKind } from "@/lib/globe/place-review-video";
import type { GlobeResourceReelItem } from "@/lib/globe/resource-reel/types";

export type ResourceReviewVideoContext = {
  name: string;
  place: string;
  kind: PlaceReviewKind;
  lat: number;
  lng: number;
};

/** Prefer inventory address + hotel name over trip-level area label for review video search. */
export function resolveResourceReviewVideoContext(input: {
  event: EventCandidate | null | undefined;
  item: GlobeResourceReelItem;
  areaFallback: string;
}): ResourceReviewVideoContext {
  const areaFallback = input.areaFallback.trim() || input.item.title.trim();

  if (input.item.kind === "lodging" && input.event) {
    const row = readLodgingInventoryRows(input.event).find(
      (entry) => entry.placeId === input.item.placeId,
    );
    const address = row?.address?.trim() ?? null;
    const place = address || areaFallback;
    return {
      name: row?.name?.trim() || input.item.title.trim(),
      place,
      kind: "lodging",
      lat: row?.lat ?? input.item.lat,
      lng: row?.lng ?? input.item.lng,
    };
  }

  if (input.item.kind === "eatery" && input.event) {
    const row = readEateryInventoryRows(input.event).find(
      (entry) => entry.placeId === input.item.placeId,
    );
    const address = row?.address?.trim() ?? null;
    return {
      name: row?.name?.trim() || input.item.title.trim(),
      place: address || areaFallback,
      kind: "eatery",
      lat: row?.lat ?? input.item.lat,
      lng: row?.lng ?? input.item.lng,
    };
  }

  if (
    (input.item.kind === "activity" || input.item.kind === "amenity") &&
    input.event
  ) {
    return {
      name: input.item.title.trim(),
      place: areaFallback,
      kind: "place",
      lat: input.item.lat,
      lng: input.item.lng,
    };
  }

  return {
    name: input.item.title.trim(),
    place: areaFallback,
    kind:
      input.item.kind === "lodging"
        ? "lodging"
        : input.item.kind === "activity" || input.item.kind === "amenity"
          ? "place"
          : "eatery",
    lat: input.item.lat,
    lng: input.item.lng,
  };
}
