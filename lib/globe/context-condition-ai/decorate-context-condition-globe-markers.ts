import { copy } from "@/lib/copy/human-ko";
import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import {
  findContextConditionPinBatch,
  readActiveContextConditionPlaceIds,
  readContextConditionPinBatches,
} from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readGeoOntologyFacetState } from "@/lib/globe/spatial-semantic/geo-ontology-graph-store";
import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { activitySubtypeBadgeLabel } from "@/lib/globe/place/activity-subtype-presentation";

function lodgingPlaceIdFromResourceId(resourceId: string): string | null {
  const index = resourceId.lastIndexOf(":lodging:");
  if (index < 0) {
    return null;
  }
  return resourceId.slice(index + ":lodging:".length).trim() || null;
}

function eateryPlaceIdFromResourceId(resourceId: string): string | null {
  const activityIndex = resourceId.lastIndexOf(":activity:");
  if (activityIndex >= 0) {
    return resourceId.slice(activityIndex + ":activity:".length).trim() || null;
  }
  const amenityIndex = resourceId.lastIndexOf(":amenity:");
  if (amenityIndex >= 0) {
    return resourceId.slice(amenityIndex + ":amenity:".length).trim() || null;
  }
  const index = resourceId.lastIndexOf(":eatery:");
  if (index < 0) {
    return null;
  }
  return resourceId.slice(index + ":eatery:".length).trim() || null;
}

function activitySubtypeForPlace(
  event: EventCandidate,
  placeId: string,
  activeBatchId: string | null,
): LocalDiscoveryActivitySubtype | null {
  const batch = activeBatchId
    ? findContextConditionPinBatch(event, activeBatchId)
    : null;
  if (batch?.eateryKind === "activity" && batch.eateryPlaceIds.includes(placeId)) {
    return batch.activitySubtype ?? null;
  }
  return null;
}

export function decorateLodgingMarkersWithContextCondition(
  markers: readonly GlobeLodgingMapMarker[],
  event: EventCandidate | null | undefined,
): GlobeLodgingMapMarker[] {
  if (!event) {
    return [...markers];
  }
  const activeBatchId = readContextConditionLastBatch(event.id)?.batchId ?? null;
  const placeIds = readActiveContextConditionPlaceIds({
    event,
    activeBatchId,
  }).lodging;
  if (placeIds.size === 0) {
    return [...markers];
  }
  return markers.map((marker) => {
    const placeId = lodgingPlaceIdFromResourceId(marker.resourceId);
    if (!placeId || !placeIds.has(placeId)) {
      return marker;
    }
    const facet = readGeoOntologyFacetState(event.id);
    const rank = facet.rankedPlaceIds.indexOf(placeId);
    const emphasized =
      facet.highlightedPlaceId === placeId ||
      (facet.activeFacetId != null && rank >= 0 && rank < 3);
    const muted =
      facet.activeFacetId != null &&
      facet.rankedPlaceIds.length > 0 &&
      rank > 2 &&
      facet.highlightedPlaceId !== placeId;
    return {
      ...marker,
      contextConditionPin: true,
      discoveryAccent: emphasized ? "green" : muted ? "blue" : "green",
      discoveryShortLabel:
        marker.displayVariant === "map_node" ||
        marker.displayVariant === "price_pill" ||
        marker.displayVariant === "preview_chip" ||
        marker.displayVariant === "reason_chip"
          ? null
          : (marker.discoveryShortLabel ?? marker.label),
      ontologyBadgeLabel:
        marker.displayVariant === "map_node" ||
        marker.displayVariant === "price_pill" ||
        marker.displayVariant === "preview_chip" ||
        marker.displayVariant === "reason_chip"
          ? null
          : copy.globe.contextConditionPinBadge,
      popInDelayMs: marker.popInDelayMs ?? 0,
      isMain: rank === 0 || marker.isMain,
      carouselIndex: rank >= 0 ? rank : marker.carouselIndex,
      relationMemoKo: muted ? copy.globe.geoOntologyFacetCategoryDefault : marker.relationMemoKo,
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
  const activeBatchId = readContextConditionLastBatch(event.id)?.batchId ?? null;
  const placeIdsForContext = readActiveContextConditionPlaceIds({
    event,
    activeBatchId,
  });
  const placeIds = placeIdsForContext.eatery;
  if (placeIds.size === 0) {
    return [...markers];
  }
  const activityPlaceIds = placeIdsForContext.activity;
  return markers.map((marker) => {
    const placeId = eateryPlaceIdFromResourceId(marker.resourceId);
    if (!placeId || !placeIds.has(placeId)) {
      return marker;
    }
    const facet = readGeoOntologyFacetState(event.id);
    const rank = facet.rankedPlaceIds.indexOf(placeId);
    const emphasized =
      facet.highlightedPlaceId === placeId ||
      (facet.activeFacetId != null && rank >= 0 && rank < 3);
    const muted =
      facet.activeFacetId != null &&
      facet.rankedPlaceIds.length > 0 &&
      rank > 2 &&
      facet.highlightedPlaceId !== placeId;
    const isActivity = activityPlaceIds.has(placeId);
    return {
      ...marker,
      contextConditionPin: true,
      discoveryAccent: emphasized ? "orange" : muted ? "blue" : "orange",
      discoveryShortLabel: marker.discoveryShortLabel ?? marker.label,
      ontologyBadgeLabel: isActivity
        ? activitySubtypeBadgeLabel(activitySubtypeForPlace(event, placeId, activeBatchId))
        : copy.globe.contextConditionPinBadge,
      popInDelayMs: marker.popInDelayMs ?? 0,
      isMain: rank === 0 || marker.isMain,
      carouselIndex: rank >= 0 ? rank : marker.carouselIndex,
      relationMemoKo: muted ? copy.globe.geoOntologyFacetCategoryDefault : marker.relationMemoKo,
    };
  });
}
