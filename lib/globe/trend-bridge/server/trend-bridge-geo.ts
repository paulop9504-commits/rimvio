import { createHash } from "node:crypto";
import { matchKoreaKnownNeighborhood } from "@/lib/globe/korea-known-neighborhoods";
import { matchKoreaKnownPlace } from "@/lib/globe/korea-known-places";
import { matchKoreaMetroDistrict } from "@/lib/globe/korea-metro-districts";

const FALLBACK_SALT = "rimvio-trend-bridge-v1";

export function hashTrendBridgeActor(userId: string): string {
  const salt = process.env.TREND_BRIDGE_ACTOR_SALT?.trim() || FALLBACK_SALT;
  return createHash("sha256")
    .update(`${salt}:${userId.trim()}`)
    .digest("hex")
    .slice(0, 32);
}

/** Collapse place label to 동/읍-level bucket for anonymous rollup. */
export function resolveTrendBridgeLocationDong(
  placeLabel: string | null | undefined,
): string | null {
  const raw = placeLabel?.trim();
  if (!raw) {
    return null;
  }

  const neighborhood = matchKoreaKnownNeighborhood(raw);
  if (neighborhood) {
    const tokens = neighborhood.label.trim().split(/\s+/u);
    return tokens[tokens.length - 1] ?? neighborhood.label;
  }

  const metro = matchKoreaMetroDistrict(raw);
  if (metro) {
    return metro.label;
  }

  const city = matchKoreaKnownPlace(raw);
  if (city) {
    return city.label;
  }

  return raw.length <= 24 ? raw : raw.slice(0, 24);
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function boundingBoxForRadiusKm(
  lat: number,
  lng: number,
  radiusKm: number,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}
