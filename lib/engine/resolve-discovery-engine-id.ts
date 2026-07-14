/**
 * Map discovery scout / pin kinds → Engine SKU for lifecycle events.
 */

import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import { isActivityPrepUtterance } from "@/lib/globe/activity-prep/is-activity-prep-utterance";
import { isAmenityPrepUtterance } from "@/lib/globe/amenity-prep/is-amenity-prep-utterance";
import { isEateryPrepUtterance } from "@/lib/globe/eatery-prep/is-eatery-prep-utterance";
import { isLodgingPrepUtterance } from "@/lib/globe/lodging-prep/is-lodging-prep-utterance";
import { isTripExperienceUtterance } from "@/lib/globe/trip-experience/detect-trip-experience-utterance";
import { planRimvioEngineTurn } from "@/lib/engine/engine-registry";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type DiscoveryRecommendationKind =
  | "lodging"
  | "eatery"
  | "activity"
  | "amenity";

export function resolveEngineIdFromDiscoveryKind(
  kind: DiscoveryRecommendationKind,
): RimvioEngineId {
  switch (kind) {
    case "amenity":
      return "local_amenity_search";
    case "eatery":
      return "eatery_search";
    case "activity":
      return "activity_search";
    case "lodging":
      return "lodging_search";
  }
}

export function resolveEngineIdFromDiscoverySpec(
  spec: Pick<LocalDiscoveryActionSpec, "resourceTypes"> | null | undefined,
): RimvioEngineId | null {
  const types = spec?.resourceTypes ?? [];
  if (types.includes("amenity")) {
    return "local_amenity_search";
  }
  if (types.includes("activity")) {
    return "activity_search";
  }
  if (types.includes("hotel") && !types.includes("restaurant")) {
    return "lodging_search";
  }
  if (types.includes("restaurant")) {
    return "eatery_search";
  }
  if (types.includes("hotel")) {
    return "lodging_search";
  }
  return null;
}

export function resolveEngineIdFromDiscoveryMessage(message: string): RimvioEngineId | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  if (isAmenityPrepUtterance(text)) {
    return "local_amenity_search";
  }
  if (isLodgingPrepUtterance(text)) {
    return "lodging_search";
  }
  if (isEateryPrepUtterance(text)) {
    return "eatery_search";
  }
  if (isActivityPrepUtterance(text)) {
    return "activity_search";
  }
  if (isTripExperienceUtterance(text)) {
    return "trip_experience_search";
  }
  return null;
}

/** Prefer Engine turn plan, then message, then outcome/spec, then dominant recommendation kind. */
export function resolveDiscoveryEngineId(input: {
  message?: string | null;
  event?: EventCandidate | null;
  spec?: Pick<LocalDiscoveryActionSpec, "resourceTypes"> | null;
  recommendationKinds?: readonly DiscoveryRecommendationKind[];
  userLat?: number | null;
  userLng?: number | null;
}): RimvioEngineId | null {
  const message = input.message?.trim() ?? "";
  if (message) {
    const planned = planRimvioEngineTurn({
      message,
      event: input.event,
      userLat: input.userLat,
      userLng: input.userLng,
    });
    if (planned) {
      return planned.engineId;
    }
    const fromMessage = resolveEngineIdFromDiscoveryMessage(message);
    if (fromMessage) {
      return fromMessage;
    }
  }

  const fromSpec = resolveEngineIdFromDiscoverySpec(input.spec);
  if (fromSpec) {
    return fromSpec;
  }

  const kinds = input.recommendationKinds ?? [];
  if (kinds.includes("amenity")) {
    return "local_amenity_search";
  }
  if (kinds.includes("eatery") && !kinds.includes("lodging")) {
    return "eatery_search";
  }
  if (kinds.includes("activity") && !kinds.includes("lodging")) {
    return "activity_search";
  }
  if (kinds.includes("lodging")) {
    return "lodging_search";
  }
  if (kinds[0]) {
    return resolveEngineIdFromDiscoveryKind(kinds[0]);
  }
  return null;
}
