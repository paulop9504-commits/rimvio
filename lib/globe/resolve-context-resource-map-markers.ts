import { resolveBrainSurfaceCalloutOffset } from "@/lib/globe/layout-brain-surface-callout-markers";
import { hasExplicitMarkerThumbnail } from "@/lib/globe/brain-surface-marker-media";

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

const COORD_GROUP_PRECISION = 3;

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

function coordGroupKey(lat: number, lng: number): string {
  return `${lat.toFixed(COORD_GROUP_PRECISION)},${lng.toFixed(COORD_GROUP_PRECISION)}`;
}

function applyRadialAtHub<
  T extends GlobeMapCalloutMarker & { resourceId: string },
>(input: {
  markers: readonly T[];
  hubLat: number;
  hubLng: number;
  maxRadial: number;
}): T[] {
  const radial = [...input.markers]
    .sort((left, right) => Number(right.isMain) - Number(left.isMain))
    .slice(0, input.maxRadial);

  return radial.map((marker, index) => {
    const offset = resolveBrainSurfaceCalloutOffset(index, radial.length);
    return {
      ...marker,
      lat: input.hubLat,
      lng: input.hubLng,
      calloutOffsetX: offset.x,
      calloutOffsetY: offset.y,
    };
  });
}

function applyRadialAtCoordGroups<
  T extends GlobeMapCalloutMarker & { resourceId: string },
>(markers: readonly T[], maxRadial: number): T[] {
  const groups = new Map<string, T[]>();
  for (const marker of markers) {
    const key = coordGroupKey(marker.lat, marker.lng);
    const bucket = groups.get(key) ?? [];
    bucket.push(marker);
    groups.set(key, bucket);
  }

  const laidOut: T[] = [];
  for (const group of groups.values()) {
    if (group.length <= 1) {
      const solo = group[0];
      if (solo) {
        laidOut.push({ ...solo, calloutOffsetX: null, calloutOffsetY: null });
      }
      continue;
    }

    const sorted = group.sort(
      (left, right) => Number(right.isMain) - Number(left.isMain),
    );
    const hubLat = sorted[0]!.lat;
    const hubLng = sorted[0]!.lng;
    laidOut.push(
      ...applyRadialAtHub({
        markers: sorted,
        hubLat,
        hubLng,
        maxRadial,
      }),
    );
  }

  return laidOut.sort(
    (left, right) => Number(right.isMain) - Number(left.isMain),
  );
}

/**
 * Map pins for hub resources — multiple markers fan out with callout stems
 * from the context hub (or shared coordinate) so pills never stack unreadably.
 */
export function resolveContextResourceMapMarkers<
  T extends GlobeMapCalloutMarker & { resourceId: string },
>(input: {
  markers: readonly T[];
  hubLat?: number | null;
  hubLng?: number | null;
  /** When false, pins stay at inventory coordinates (scout / operator). */
  layoutAtHub?: boolean;
  /** @deprecated Radial layout applies whenever marker count > 1. */
  stagedDiscoveryCount?: number;
  maxRadial?: number;
}): T[] {
  if (input.markers.length === 0) {
    return [];
  }

  const withPhoto = input.markers.filter((marker) => {
    const row = marker as {
      thumbnailUrl?: string | null;
      contextConditionPin?: boolean;
    };
    if (row.contextConditionPin) {
      return true;
    }
    return hasExplicitMarkerThumbnail(row.thumbnailUrl);
  });

  if (withPhoto.length === 0) {
    return [];
  }

  const sorted = [...withPhoto].sort(
    (left, right) => Number(right.isMain) - Number(left.isMain),
  );
  const maxRadial = Math.min(input.maxRadial ?? 6, sorted.length);

  if (sorted.length === 1) {
    const focus = sorted[0]!;
    return [{ ...focus, calloutOffsetX: null, calloutOffsetY: null }];
  }

  const layoutAtHub = input.layoutAtHub !== false;
  if (layoutAtHub) {
    const hubLat = input.hubLat;
    const hubLng = input.hubLng;
    if (Number.isFinite(hubLat) && Number.isFinite(hubLng)) {
      return applyRadialAtHub({
        markers: sorted,
        hubLat: hubLat as number,
        hubLng: hubLng as number,
        maxRadial,
      });
    }
  }

  return applyRadialAtCoordGroups(sorted, maxRadial);
}
