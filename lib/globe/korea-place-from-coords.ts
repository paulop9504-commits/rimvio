import { KOREA_KNOWN_PLACES } from "@/lib/globe/korea-known-places";
import {
  KOREA_METRO_DISTRICTS,
  type KoreaMetroDistrict,
} from "@/lib/globe/korea-metro-districts";
import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";

export type KoreaPlaceFromCoords = {
  label: string;
  lat: number;
  lng: number;
  metroCity: string | null;
};

function nearestMetroDistrict(lat: number, lng: number): KoreaMetroDistrict & { distanceKm: number } {
  let best = KOREA_METRO_DISTRICTS[0]!;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const row of KOREA_METRO_DISTRICTS) {
    const distanceKm = haversineKm(lat, lng, row.lat, row.lng);
    if (distanceKm < bestKm) {
      best = row;
      bestKm = distanceKm;
    }
  }
  return { ...best, distanceKm: bestKm };
}

/** Coords → 구 단위 라벨 (metro 우선, 멀면 시/도 시드). */
export function resolveKoreaPlaceFromCoords(
  lat: number,
  lng: number,
): KoreaPlaceFromCoords {
  const metro = nearestMetroDistrict(lat, lng);
  if (metro.distanceKm <= 28) {
    return {
      label: metro.label,
      lat: metro.lat,
      lng: metro.lng,
      metroCity: metro.city,
    };
  }

  let best = KOREA_KNOWN_PLACES[0]!;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const row of KOREA_KNOWN_PLACES) {
    const distanceKm = haversineKm(lat, lng, row.lat, row.lng);
    if (distanceKm < bestKm) {
      best = row;
      bestKm = distanceKm;
    }
  }

  return {
    label: best.label,
    lat: best.lat,
    lng: best.lng,
    metroCity: null,
  };
}
