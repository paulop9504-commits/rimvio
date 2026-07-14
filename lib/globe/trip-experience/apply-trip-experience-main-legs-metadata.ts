import {
  buildContextPinnedItem,
  CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY,
  CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY,
  CONTEXT_PINNED_ITEM_META_KEY,
  type ContextPinnedItemV1,
} from "@/lib/globe/context-pinned-item";
import {
  CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY,
  CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY,
} from "@/lib/globe/eatery/eatery-resource-types";
import type { TripExperienceScoutLeg } from "@/lib/globe/trip-experience/build-trip-experience-parallel-scouts";
import {
  CONTEXT_TRIP_EXPERIENCE_MAIN_LEGS_META_KEY,
  type TripExperienceMainLegPin,
  type TripExperienceMainLegsV1,
} from "@/lib/globe/trip-experience/trip-experience-main-leg-types";

function toPinnedItem(pin: TripExperienceMainLegPin): ContextPinnedItemV1 {
  return buildContextPinnedItem({
    kind: pin.kind,
    resourceId: pin.resourceId,
    placeId: pin.placeId,
    label: pin.label,
    lat: pin.lat ?? null,
    lng: pin.lng ?? null,
    mapsUrl: pin.mapsUrl ?? null,
    previewUrl: pin.previewUrl ?? null,
    pinnedAtIso: pin.pinnedAtIso,
  });
}

/** Merge all trip experience MAIN legs without clearing sibling leg keys. */
export function applyTripExperienceMainLegsMetadata(input: {
  metadata?: Record<string, unknown> | null;
  legs: Partial<Record<TripExperienceScoutLeg, TripExperienceMainLegPin>>;
  primaryLeg: TripExperienceScoutLeg;
}): Record<string, unknown> {
  const next = { ...(input.metadata ?? {}) };
  const primary = input.legs[input.primaryLeg];
  const payload: TripExperienceMainLegsV1 = {
    version: 1,
    primaryKind: input.primaryLeg,
    legs: input.legs,
  };
  next[CONTEXT_TRIP_EXPERIENCE_MAIN_LEGS_META_KEY] = payload;

  const lodging = input.legs.lodging;
  if (lodging) {
    next.contextLodgingPinnedAt = lodging.pinnedAtIso;
    next.contextLodgingPinnedName = lodging.label;
    next.contextLodgingPinnedLat = lodging.lat ?? null;
    next.contextLodgingPinnedLng = lodging.lng ?? null;
    next.contextLodgingPinnedMapsUrl = lodging.mapsUrl ?? null;
    next.contextLodgingPinnedPreviewUrl = lodging.previewUrl ?? null;
    next[CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY] = lodging.resourceId;
    next[CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY] = lodging.placeId;
  }

  const eatery = input.legs.eatery;
  if (eatery) {
    next.contextEateryPinnedAt = eatery.pinnedAtIso;
    next.contextEateryPinnedName = eatery.label;
    next.contextEateryPinnedLat = eatery.lat ?? null;
    next.contextEateryPinnedLng = eatery.lng ?? null;
    next.contextEateryPinnedMapsUrl = eatery.mapsUrl ?? null;
    next.contextEateryPinnedPreviewUrl = eatery.previewUrl ?? null;
    next[CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY] = eatery.resourceId;
    next[CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY] = eatery.placeId;
  }

  if (primary) {
    next[CONTEXT_PINNED_ITEM_META_KEY] = toPinnedItem(primary);
  }

  return next;
}
