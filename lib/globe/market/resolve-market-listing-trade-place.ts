import { resolveKoreaPlaceFromCoords } from "@/lib/globe/korea-place-from-coords";
import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";
import type { MarketPhotoMemoryPlace } from "@/lib/globe/market/extract-market-photo-memory-place";

/** Photo memory vs current GPS — same metro area ≈ auto trade place. */
export const MARKET_TRADE_PLACE_MATCH_KM = 35;

export type MarketGpsPlace = {
  placeLabel: string;
  lat: number;
  lng: number;
  metroCity: string | null;
};

export type MarketTradePlaceAutoResolution = {
  kind: "auto";
  trade: MarketGpsPlace;
  photoMemory: MarketPhotoMemoryPlace | null;
};

export type MarketTradePlaceMismatchResolution = {
  kind: "mismatch";
  gps: MarketGpsPlace;
  photoMemory: MarketPhotoMemoryPlace;
  metroCity: string;
};

export type MarketListingTradePlaceResolution =
  | MarketTradePlaceAutoResolution
  | MarketTradePlaceMismatchResolution;

export function resolveMarketListingTradePlace(input: {
  gpsLat: number;
  gpsLng: number;
  photoMemory: MarketPhotoMemoryPlace | null;
}): MarketListingTradePlaceResolution {
  const gpsResolved = resolveKoreaPlaceFromCoords(input.gpsLat, input.gpsLng);
  const gps: MarketGpsPlace = {
    placeLabel: gpsResolved.label,
    lat: gpsResolved.lat,
    lng: gpsResolved.lng,
    metroCity: gpsResolved.metroCity,
  };

  const photo = input.photoMemory;
  if (!photo) {
    return { kind: "auto", trade: gps, photoMemory: null };
  }

  const distanceKm = haversineKm(gps.lat, gps.lng, photo.lat, photo.lng);
  if (distanceKm <= MARKET_TRADE_PLACE_MATCH_KM) {
    return { kind: "auto", trade: gps, photoMemory: photo };
  }

  return {
    kind: "mismatch",
    gps,
    photoMemory: photo,
    metroCity: gps.metroCity ?? gps.placeLabel.split(/\s+/u)[0] ?? "서울",
  };
}
