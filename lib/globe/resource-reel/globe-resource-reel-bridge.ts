/** Unified search feed + detail reel — lodging · eatery · scout results. */

import { dispatchGlobeMapMediaFocus } from "@/lib/globe/globe-map-media-focus-bridge";
import type { GlobeLodgingFocusDetail } from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import type { GlobeEateryFocusDetail } from "@/lib/globe/eatery/globe-eatery-focus-bridge";
import { parseContextConditionResourceId } from "@/lib/globe/context-agent/parse-context-condition-resource-id";
import type {
  GlobeResourceReelFocusDetail,
  GlobeResourceReelKind,
  GlobeResourceReelSource,
} from "@/lib/globe/resource-reel/types";

export const GLOBE_RESOURCE_REEL_FOCUS = "rimvio:globe-resource-reel-focus";
export const GLOBE_RESOURCE_REEL_STAGE = "rimvio:globe-resource-reel-stage";

export type GlobeResourceReelStageDetail = {
  open: boolean;
};

function extractEventIdFromResourceId(resourceId: string): string | null {
  const parsed = parseContextConditionResourceId(resourceId);
  if (parsed) {
    return parsed.contextEventId;
  }
  const lodgingMarker = ":lodging:";
  const lodgingIndex = resourceId.lastIndexOf(lodgingMarker);
  if (lodgingIndex > 0) {
    return resourceId.slice(0, lodgingIndex).trim() || null;
  }
  const eateryMarker = ":eatery:";
  const eateryIndex = resourceId.lastIndexOf(eateryMarker);
  if (eateryIndex > 0) {
    return resourceId.slice(0, eateryIndex).trim() || null;
  }
  const activityMarker = ":activity:";
  const activityIndex = resourceId.lastIndexOf(activityMarker);
  if (activityIndex > 0) {
    return resourceId.slice(0, activityIndex).trim() || null;
  }
  const amenityMarker = ":amenity:";
  const amenityIndex = resourceId.lastIndexOf(amenityMarker);
  if (amenityIndex > 0) {
    return resourceId.slice(0, amenityIndex).trim() || null;
  }
  return null;
}

function mapLodgingSource(
  source: GlobeLodgingFocusDetail["source"],
): GlobeResourceReelSource {
  if (source === "discovery_card") {
    return "discovery_card";
  }
  if (source === "carousel" || source === "strip") {
    return source;
  }
  return "map_marker";
}

function mapEaterySource(
  source: GlobeEateryFocusDetail["source"],
): GlobeResourceReelSource {
  return source === "discovery_card" ? "discovery_card" : "map_marker";
}

export function dispatchGlobeResourceReelFocus(
  detail: GlobeResourceReelFocusDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeResourceReelFocusDetail>(GLOBE_RESOURCE_REEL_FOCUS, {
      detail,
    }),
  );
}

export function subscribeGlobeResourceReelFocus(
  listener: (detail: GlobeResourceReelFocusDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeResourceReelFocusDetail>).detail);
  };
  window.addEventListener(GLOBE_RESOURCE_REEL_FOCUS, handler);
  return () => window.removeEventListener(GLOBE_RESOURCE_REEL_FOCUS, handler);
}

export function forwardLodgingFocusToResourceReel(
  detail: GlobeLodgingFocusDetail,
): void {
  const contextEventId = extractEventIdFromResourceId(detail.resourceId);
  if (!contextEventId) {
    return;
  }
  const source = detail.source ?? "map_marker";
  // Discovery feed scroll/preview — map marker + flyTo only. Opening the left
  // detail panel also flips mapMediaFocus and clears HTML pins (stuck card).
  if (source === "carousel" || source === "strip" || source === "discovery_card") {
    return;
  }
  dispatchGlobeResourceReelFocus({
    contextEventId,
    resourceId: detail.resourceId,
    kind: "lodging",
    carouselIndex: detail.carouselIndex,
    surface: "detail",
    source: mapLodgingSource(source),
  });
}

export function forwardEateryFocusToResourceReel(
  detail: GlobeEateryFocusDetail,
): void {
  // Discovery feed scroll/preview — highlight map pin only; do not open left reel.
  if (detail.source === "discovery_card") {
    return;
  }
  const contextEventId = extractEventIdFromResourceId(detail.resourceId);
  if (!contextEventId) {
    return;
  }
  dispatchGlobeResourceReelFocus({
    contextEventId,
    resourceId: detail.resourceId,
    kind: "eatery",
    carouselIndex: detail.carouselIndex,
    surface: "detail",
    source: mapEaterySource(detail.source),
  });
}

export function dispatchGlobeResourceReelStage(open: boolean): void {
  dispatchGlobeMapMediaFocus(open, "resource_reel");
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeResourceReelStageDetail>(GLOBE_RESOURCE_REEL_STAGE, {
      detail: { open },
    }),
  );
}

export function subscribeGlobeResourceReelStage(
  listener: (detail: GlobeResourceReelStageDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeResourceReelStageDetail>).detail);
  };
  window.addEventListener(GLOBE_RESOURCE_REEL_STAGE, handler);
  return () => window.removeEventListener(GLOBE_RESOURCE_REEL_STAGE, handler);
}

export const GLOBE_RESOURCE_REEL_KIND_FILTER =
  "rimvio:globe-resource-reel-kind-filter";

export type GlobeResourceReelKindFilterDetail = {
  contextEventId: string;
  kindFilter: import("@/lib/globe/resource-reel/resource-reel-kind-filter").ResourceReelKindFilter;
};

export function dispatchGlobeResourceReelKindFilter(
  detail: GlobeResourceReelKindFilterDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeResourceReelKindFilterDetail>(
      GLOBE_RESOURCE_REEL_KIND_FILTER,
      { detail },
    ),
  );
}

export function subscribeGlobeResourceReelKindFilter(
  listener: (detail: GlobeResourceReelKindFilterDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeResourceReelKindFilterDetail>).detail);
  };
  window.addEventListener(GLOBE_RESOURCE_REEL_KIND_FILTER, handler);
  return () =>
    window.removeEventListener(GLOBE_RESOURCE_REEL_KIND_FILTER, handler);
}

export function buildResourceReelResourceId(input: {
  contextEventId: string;
  kind: GlobeResourceReelKind;
  placeId: string;
}): string {
  return `${input.contextEventId.trim()}:${input.kind}:${input.placeId.trim()}`;
}
