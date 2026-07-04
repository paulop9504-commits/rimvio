import { resolveBrainSurfaceCalloutOffset } from "@/lib/globe/layout-brain-surface-callout-markers";

export type GlobeMapCalloutMarker = {
  lat: number;
  lng: number;
  isMain: boolean;
  calloutOffsetX?: number | null;
  calloutOffsetY?: number | null;
};

const INFRA_PARTNER_LABELS = new Set([
  "google_places",
  "mock",
  "naver_local",
  "multi_provider",
]);

/** Hide infra provider ids from map pill copy. */
export function sanitizeMapMarkerSupportLabel(
  label: string | null | undefined,
): string | null {
  const raw = label?.trim();
  if (!raw || INFRA_PARTNER_LABELS.has(raw)) {
    return null;
  }
  return raw;
}

/** L1-friendly badge — strip internal 「노드」 suffix. */
export function sanitizeOntologyMapBadgeLabel(
  label: string | null | undefined,
): string | null {
  const raw = label?.trim();
  if (!raw) {
    return null;
  }
  const cleaned = raw.replace(/\s*노드\s*$/u, "").trim();
  return cleaned || null;
}

/**
 * Map pins for hub resources — default 1 focused pin; staged discovery fans out
 * radially from the context hub so pills never stack unreadably.
 */
export function resolveContextResourceMapMarkers<
  T extends GlobeMapCalloutMarker & { resourceId: string },
>(input: {
  markers: readonly T[];
  hubLat?: number | null;
  hubLng?: number | null;
  /** When > 1, radial callout layout at hub (lodging/eatery discovery reveal). */
  stagedDiscoveryCount?: number;
  maxRadial?: number;
}): T[] {
  if (input.markers.length === 0) {
    return [];
  }

  const sorted = [...input.markers].sort(
    (left, right) => Number(right.isMain) - Number(left.isMain),
  );

  const stagedCount = input.stagedDiscoveryCount ?? 0;
  const hubLat = input.hubLat;
  const hubLng = input.hubLng;
  const useRadial =
    stagedCount > 1 &&
    Number.isFinite(hubLat) &&
    Number.isFinite(hubLng);

  if (!useRadial) {
    const focus = sorted.find((row) => row.isMain) ?? sorted[0];
    return focus ? [{ ...focus, calloutOffsetX: null, calloutOffsetY: null }] : [];
  }

  const maxRadial = Math.min(input.maxRadial ?? 3, sorted.length);
  const radial = sorted.slice(0, maxRadial);

  return radial.map((marker, index) => {
    const offset = resolveBrainSurfaceCalloutOffset(index, radial.length);
    return {
      ...marker,
      lat: hubLat as number,
      lng: hubLng as number,
      calloutOffsetX: offset.x,
      calloutOffsetY: offset.y,
    };
  });
}
