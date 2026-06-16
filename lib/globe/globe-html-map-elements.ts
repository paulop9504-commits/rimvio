import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import {
  isGlobeLodgingMapMarker,
  type GlobeLodgingMapMarker,
} from "@/lib/globe/context-hub/lodging-globe-marker-types";

export type GlobeHtmlMapElement = ClassifiedGlobePin | GlobeLodgingMapMarker;

export function readGlobeHtmlLat(element: GlobeHtmlMapElement): number {
  return element.lat;
}

export function readGlobeHtmlLng(element: GlobeHtmlMapElement): number {
  return element.lng;
}

export function mergeGlobeHtmlElements(input: {
  pins: readonly ClassifiedGlobePin[];
  lodgingMarkers: readonly GlobeLodgingMapMarker[];
  showLodgingMarkers: boolean;
}): GlobeHtmlMapElement[] {
  if (!input.showLodgingMarkers || input.lodgingMarkers.length === 0) {
    return [...input.pins];
  }
  return [...input.pins, ...input.lodgingMarkers];
}

export function isClassifiedGlobePin(
  element: GlobeHtmlMapElement,
): element is ClassifiedGlobePin {
  return !isGlobeLodgingMapMarker(element);
}
