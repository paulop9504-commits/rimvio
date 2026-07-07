import { copy } from "@/lib/copy/human-ko";
import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import { listContextConditionPlaceIdsForContext } from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readGeoOntologyFacetState } from "@/lib/globe/spatial-semantic/geo-ontology-graph-store";

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
  const placeIds = listContextConditionPlaceIdsForContext(event).eatery;
  if (placeIds.size === 0) {
    return [...markers];
  }
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
    return {
      ...marker,
      contextConditionPin: true,
      discoveryAccent: emphasized ? "orange" : muted ? "blue" : "orange",
      discoveryShortLabel: marker.discoveryShortLabel ?? marker.label,
      ontologyBadgeLabel: copy.globe.contextConditionPinBadge,
      popInDelayMs: marker.popInDelayMs ?? 0,
      isMain: rank === 0 || marker.isMain,
      carouselIndex: rank >= 0 ? rank : marker.carouselIndex,
      relationMemoKo: muted ? copy.globe.geoOntologyFacetCategoryDefault : marker.relationMemoKo,
    };
  });
}
