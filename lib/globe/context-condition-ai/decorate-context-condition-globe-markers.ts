import { copy } from "@/lib/copy/human-ko";
import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import { listContextConditionPlaceIdsForContext } from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import type { EventCandidate } from "@/lib/events/event-candidate";

function lodgingPlaceIdFromResourceId(resourceId: string): string | null {
  const index = resourceId.lastIndexOf(":lodging:");
  if (index < 0) {
    return null;
  }
  return resourceId.slice(index + ":lodging:".length).trim() || null;
}

function eateryPlaceIdFromResourceId(resourceId: string): string | null {
  const index = resourceId.lastIndexOf(":eatery:");
  if (index < 0) {
    return null;
  }
  return resourceId.slice(index + ":eatery:".length).trim() || null;
}

export function decorateLodgingMarkersWithContextCondition(
  markers: readonly GlobeLodgingMapMarker[],
  event: EventCandidate | null | undefined,
): GlobeLodgingMapMarker[] {
  if (!event) {
    return [...markers];
  }
  const placeIds = listContextConditionPlaceIdsForContext(event).lodging;
  if (placeIds.size === 0) {
    return [...markers];
  }
  return markers.map((marker) => {
    const placeId = lodgingPlaceIdFromResourceId(marker.resourceId);
    if (!placeId || !placeIds.has(placeId)) {
      return marker;
    }
    return {
      ...marker,
      contextConditionPin: true,
      discoveryAccent: "green",
      discoveryShortLabel: marker.discoveryShortLabel ?? marker.label,
      ontologyBadgeLabel: copy.globe.contextConditionPinBadge,
      popInDelayMs: marker.popInDelayMs ?? 0,
    };
  });
}

export function decorateEateryMarkersWithContextCondition(
  markers: readonly GlobeEateryMapMarker[],
  event: EventCandidate | null | undefined,
): GlobeEateryMapMarker[] {
  if (!event) {
    return [...markers];
  }
  const placeIds = listContextConditionPlaceIdsForContext(event).eatery;
  if (placeIds.size === 0) {
    return [...markers];
  }
  return markers.map((marker) => {
    const placeId = eateryPlaceIdFromResourceId(marker.resourceId);
    if (!placeId || !placeIds.has(placeId)) {
      return marker;
    }
    return {
      ...marker,
      contextConditionPin: true,
      discoveryAccent: "green",
      discoveryShortLabel: marker.discoveryShortLabel ?? marker.label,
      ontologyBadgeLabel: copy.globe.contextConditionPinBadge,
      popInDelayMs: marker.popInDelayMs ?? 0,
    };
  });
}
