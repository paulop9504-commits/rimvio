import { resolveBrainSurfaceCalloutOffset } from "@/lib/globe/layout-brain-surface-callout-markers";

export type GeoCalloutMarker = {
  lat: number;
  lng: number;
  calloutOffsetX?: number | null;
  calloutOffsetY?: number | null;
};

const COORD_GROUP_PRECISION = 4;

function coordGroupKey(lat: number, lng: number): string {
  return `${lat.toFixed(COORD_GROUP_PRECISION)},${lng.toFixed(COORD_GROUP_PRECISION)}`;
}

/** Keep each pin at its geo coordinate; fan out stems only when coords collide. */
export function layoutGeoGroupedCalloutMarkers<T extends GeoCalloutMarker>(
  markers: readonly T[],
): T[] {
  if (markers.length === 0) {
    return [];
  }
  if (markers.length === 1) {
    const solo = markers[0]!;
    return [{ ...solo, calloutOffsetX: null, calloutOffsetY: null }];
  }

  const groups = new Map<string, T[]>();
  for (const marker of markers) {
    const key = coordGroupKey(marker.lat, marker.lng);
    const bucket = groups.get(key) ?? [];
    bucket.push(marker);
    groups.set(key, bucket);
  }

  const laidOut: T[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      const solo = group[0]!;
      laidOut.push({ ...solo, calloutOffsetX: null, calloutOffsetY: null });
      continue;
    }

    const hubLat = group[0]!.lat;
    const hubLng = group[0]!.lng;
    const radial = group.map((marker, index) => {
      const offset = resolveBrainSurfaceCalloutOffset(index, group.length);
      return {
        ...marker,
        lat: hubLat,
        lng: hubLng,
        calloutOffsetX: offset.x,
        calloutOffsetY: offset.y,
      };
    });
    laidOut.push(...radial);
  }

  return laidOut;
}
