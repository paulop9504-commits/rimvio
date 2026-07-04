import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import {
  isGlobeContextHubMapAnchor,
  type GlobeContextHubMapAnchor,
} from "@/lib/globe/context-hub/context-hub-globe-anchor-types";
import {
  isGlobeLodgingMapMarker,
  type GlobeLodgingMapMarker,
} from "@/lib/globe/context-hub/lodging-globe-marker-types";
import {
  isGlobeEateryMapMarker,
  type GlobeEateryMapMarker,
} from "@/lib/globe/eatery/eatery-globe-marker-types";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

export type GlobeHtmlMapElement =
  | ClassifiedGlobePin
  | GlobeLodgingMapMarker
  | GlobeEateryMapMarker
  | GlobeContextHubMapAnchor
  | BrainSurfaceProjectionCandidate;

export function readGlobeHtmlLat(element: GlobeHtmlMapElement): number {
  return element.lat;
}

export function readGlobeHtmlLng(element: GlobeHtmlMapElement): number {
  return element.lng;
}

export function mergeGlobeHtmlElements(input: {
  pins: readonly ClassifiedGlobePin[];
  lodgingMarkers: readonly GlobeLodgingMapMarker[];
  eateryMarkers: readonly GlobeEateryMapMarker[];
  hubAnchors: readonly GlobeContextHubMapAnchor[];
  brainSurfaceMarkers: readonly BrainSurfaceProjectionCandidate[];
  showLodgingMarkers: boolean;
  showEateryMarkers: boolean;
  showHubAnchors: boolean;
  showBrainSurfaceMarkers: boolean;
}): GlobeHtmlMapElement[] {
  const merged: GlobeHtmlMapElement[] = [...input.pins];
  if (input.showBrainSurfaceMarkers && input.brainSurfaceMarkers.length > 0) {
    merged.push(...input.brainSurfaceMarkers);
  }
  if (input.showHubAnchors && input.hubAnchors.length > 0) {
    merged.push(...input.hubAnchors);
  }
  if (input.showLodgingMarkers && input.lodgingMarkers.length > 0) {
    merged.push(...input.lodgingMarkers);
  }
  if (input.showEateryMarkers && input.eateryMarkers.length > 0) {
    merged.push(...input.eateryMarkers);
  }
  return merged;
}

export function isClassifiedGlobePin(
  element: GlobeHtmlMapElement,
): element is ClassifiedGlobePin {
  return (
    !("eventId" in element && "family" in element && "virtualCandidate" in element) &&
    !isGlobeLodgingMapMarker(element) &&
    !isGlobeEateryMapMarker(element) &&
    !isGlobeContextHubMapAnchor(element)
  );
}

export function isBrainSurfaceProjectionCandidate(
  element: GlobeHtmlMapElement,
): element is BrainSurfaceProjectionCandidate {
  return "eventId" in element && "family" in element && "virtualCandidate" in element;
}
