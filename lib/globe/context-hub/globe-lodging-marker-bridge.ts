/** Sync globe lodging markers ↔ hub carousel without coupling components. */

import { dispatchGlobeMapMediaFocus } from "@/lib/globe/globe-map-media-focus-bridge";
import { forwardLodgingFocusToResourceReel } from "@/lib/globe/resource-reel/globe-resource-reel-bridge";

export const GLOBE_LODGING_FOCUS = "rimvio:globe-lodging-focus";
export const GLOBE_LODGING_FOCUS_STAGE = "rimvio:globe-lodging-focus-stage";
const recentFocusedLodgingByEventId = new Map<string, string>();

export type GlobeLodgingFocusDetail = {
  resourceId: string;
  carouselIndex: number;
  /** map_marker opens full focus stage; carousel/strip sync markers only. */
  source?: "map_marker" | "carousel" | "strip" | "discovery_card";
};

export type GlobeLodgingFocusStageDetail = {
  open: boolean;
};

function extractEventIdFromLodgingResourceId(resourceId: string): string | null {
  const marker = ":lodging:";
  const index = resourceId.lastIndexOf(marker);
  if (index <= 0) {
    return null;
  }
  const eventId = resourceId.slice(0, index).trim();
  return eventId || null;
}

function rememberRecentLodgingFocus(resourceId: string): void {
  const eventId = extractEventIdFromLodgingResourceId(resourceId);
  if (!eventId) {
    return;
  }
  recentFocusedLodgingByEventId.set(eventId, resourceId);
  if (recentFocusedLodgingByEventId.size <= 24) {
    return;
  }
  const firstKey = recentFocusedLodgingByEventId.keys().next().value;
  if (typeof firstKey === "string") {
    recentFocusedLodgingByEventId.delete(firstKey);
  }
}

export function dispatchGlobeLodgingFocus(detail: GlobeLodgingFocusDetail): void {
  if (typeof window === "undefined") {
    return;
  }
  rememberRecentLodgingFocus(detail.resourceId);
  window.dispatchEvent(
    new CustomEvent<GlobeLodgingFocusDetail>(GLOBE_LODGING_FOCUS, { detail }),
  );
  forwardLodgingFocusToResourceReel(detail);
}

export function readRecentGlobeLodgingFocusResourceId(
  eventId: string | null | undefined,
): string | null {
  const key = eventId?.trim();
  if (!key) {
    return null;
  }
  return recentFocusedLodgingByEventId.get(key) ?? null;
}

export function subscribeGlobeLodgingFocus(
  listener: (detail: GlobeLodgingFocusDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GlobeLodgingFocusDetail>).detail;
    if (!detail?.resourceId) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(GLOBE_LODGING_FOCUS, handler);
  return () => window.removeEventListener(GLOBE_LODGING_FOCUS, handler);
}

export function dispatchGlobeLodgingFocusStage(open: boolean): void {
  dispatchGlobeMapMediaFocus(open, "lodging");
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeLodgingFocusStageDetail>(GLOBE_LODGING_FOCUS_STAGE, {
      detail: { open },
    }),
  );
}

export function subscribeGlobeLodgingFocusStage(
  listener: (detail: GlobeLodgingFocusStageDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeLodgingFocusStageDetail>).detail);
  };
  window.addEventListener(GLOBE_LODGING_FOCUS_STAGE, handler);
  return () => window.removeEventListener(GLOBE_LODGING_FOCUS_STAGE, handler);
}
