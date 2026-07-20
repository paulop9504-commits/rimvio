/**
 * Resolve Reality Object type for photo / video / reel ingress.
 */

import type { RealityObjectType } from "@/lib/reality-object/types";

export type MediaRealityIngressKind = "photo" | "video" | "reel";

const SHORTS_OR_REEL_RE = /youtube\.com\/shorts|\/shorts\/|instagram\.com\/reel|\/reel\//iu;

export function isShortFormVideoUrl(url: string | null | undefined): boolean {
  return Boolean(url?.trim() && SHORTS_OR_REEL_RE.test(url.trim()));
}

export function resolveMediaRealityObjectType(input: {
  kind: "photo" | "video" | "reel" | "link" | "memo" | "gps_dwell" | "other";
  sourceUrl?: string | null;
}): RealityObjectType | null {
  if (input.kind === "photo") {
    return "photo";
  }
  if (input.kind === "reel") {
    return "reel";
  }
  if (input.kind === "video") {
    return isShortFormVideoUrl(input.sourceUrl) ? "reel" : "video";
  }
  return null;
}

export function mediaIngressKindFromObjectType(
  objectType: RealityObjectType,
): MediaRealityIngressKind | null {
  if (objectType === "photo" || objectType === "video" || objectType === "reel") {
    return objectType;
  }
  return null;
}
