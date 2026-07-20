import { GLOBE_ALTITUDE, GLOBE_MIN_SAFE_ALTITUDE } from "@/lib/globe/globe-zoom-levels";

export type GeoPoint = { lat: number; lng: number };

export type LodgingDiscoveryBounds = {
  centerLat: number;
  centerLng: number;
  altitude: number;
  spanDeg: number;
};

function metersToLatDeg(meters: number): number {
  return meters / 111_320;
}

function metersToLngDeg(meters: number, lat: number): number {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  return cosLat > 0.01 ? meters / (111_320 * cosLat) : meters / 111_320;
}

/** Fit user + lodging pins — street/neighborhood altitude from span. */
export function computeLodgingDiscoveryBounds(input: {
  user: GeoPoint | null;
  lodging: readonly GeoPoint[];
  radiusM?: number;
  padding?: number;
}): LodgingDiscoveryBounds | null {
  const points: GeoPoint[] = [...input.lodging];
  if (input.user) {
    points.push(input.user);
  }
  if (points.length === 0) {
    return null;
  }

  let minLat = points[0]!.lat;
  let maxLat = points[0]!.lat;
  let minLng = points[0]!.lng;
  let maxLng = points[0]!.lng;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  const radiusM = input.radiusM ?? 500;
  const pad = input.padding ?? 1.35;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  const latPad = metersToLatDeg(radiusM * 0.35) * pad;
  const lngPad = metersToLngDeg(radiusM * 0.35, centerLat) * pad;
  const spanLat = Math.max(maxLat - minLat + latPad * 2, latPad * 2);
  const spanLng = Math.max(maxLng - minLng + lngPad * 2, lngPad * 2);
  const spanDeg = Math.max(spanLat, spanLng);

  let altitude: number;
  if (spanDeg <= 0.004) {
    altitude = GLOBE_ALTITUDE.street;
  } else if (spanDeg <= 0.012) {
    altitude = GLOBE_ALTITUDE.neighborhood;
  } else {
    // Cap at city — lodging/eatery HTML markers are hidden at region/space.
    altitude = GLOBE_ALTITUDE.city;
  }

  return {
    centerLat,
    centerLng,
    altitude: Math.max(GLOBE_MIN_SAFE_ALTITUDE, altitude),
    spanDeg,
  };
}
