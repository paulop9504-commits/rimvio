"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { CanonicalPlaceProfile } from "@/lib/globe/canonical-place-profile";
import { readCanonicalPlaceProfileFromEvent } from "@/lib/globe/canonical-place-profile";
import { clearEateryRecommendReasons } from "@/lib/globe/eatery/eatery-recommendation-reason-store";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
  CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY,
  CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY,
  CONTEXT_EATERY_RECOMMEND_SCORES_META_KEY,
} from "@/lib/globe/eatery/eatery-resource-types";

const EATERY_RESET_DISTANCE_KM = 25;

const EXTRA_EATERY_META_KEYS = [
  "contextEateryInventorySource",
  "contextEateryPinnedAt",
  "contextEateryPinnedName",
  "contextEateryPinnedLat",
  "contextEateryPinnedLng",
  "contextEateryPinnedMapsUrl",
] as const;

function hasPersistedEateryState(metadata: Record<string, unknown>): boolean {
  return (
    metadata[CONTEXT_EATERY_HUB_ENABLED_META_KEY] === true ||
    Array.isArray(metadata[CONTEXT_EATERY_INVENTORY_META_KEY]) ||
    typeof metadata[CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY] === "string" ||
    typeof metadata[CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY] === "string"
  );
}

function shouldInvalidateEateryState(input: {
  event: EventCandidate;
  nextProfile: CanonicalPlaceProfile;
}): boolean {
  const previous = readCanonicalPlaceProfileFromEvent(input.event);
  if (!previous) {
    return false;
  }
  if (
    previous.countryCode &&
    input.nextProfile.countryCode &&
    previous.countryCode !== input.nextProfile.countryCode
  ) {
    return true;
  }
  return (
    haversineKm(previous.lat, previous.lng, input.nextProfile.lat, input.nextProfile.lng) >
    EATERY_RESET_DISTANCE_KM
  );
}

export function stripEateryContextState(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) };
  next[CONTEXT_EATERY_HUB_ENABLED_META_KEY] = undefined;
  next[CONTEXT_EATERY_INVENTORY_META_KEY] = undefined;
  next[CONTEXT_EATERY_RECOMMEND_SCORES_META_KEY] = undefined;
  next[CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY] = undefined;
  next[CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY] = undefined;
  for (const key of EXTRA_EATERY_META_KEYS) {
    next[key] = undefined;
  }
  return next;
}

export function invalidateEateryContextStateForPlaceShift(input: {
  event: EventCandidate;
  nextProfile: CanonicalPlaceProfile;
}): Record<string, unknown> {
  const metadata = input.event.metadata ?? {};
  if (!hasPersistedEateryState(metadata)) {
    return { ...metadata };
  }
  if (!shouldInvalidateEateryState(input)) {
    return { ...metadata };
  }
  clearEateryRecommendReasons(input.event.id);
  return stripEateryContextState(metadata);
}
