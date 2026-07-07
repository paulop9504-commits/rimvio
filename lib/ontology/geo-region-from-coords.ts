/** Coordinate → country hint for map search, mock fallback, and provider routing. */

export type GeoRegionCountryCode = "KR" | "JP";

const JAPAN_BOUNDS = {
  minLat: 24,
  maxLat: 46.5,
  minLng: 122,
  maxLng: 154,
} as const;

const KOREA_BOUNDS = {
  minLat: 33,
  maxLat: 38.85,
  minLng: 124.4,
  maxLng: 132.2,
} as const;

function inJapanBox(lat: number, lng: number): boolean {
  return (
    lat >= JAPAN_BOUNDS.minLat &&
    lat <= JAPAN_BOUNDS.maxLat &&
    lng >= JAPAN_BOUNDS.minLng &&
    lng <= JAPAN_BOUNDS.maxLng
  );
}

function inKoreaBox(lat: number, lng: number): boolean {
  return (
    lat >= KOREA_BOUNDS.minLat &&
    lat <= KOREA_BOUNDS.maxLat &&
    lng >= KOREA_BOUNDS.minLng &&
    lng <= KOREA_BOUNDS.maxLng
  );
}

/** Disambiguate KR/JP overlap (Busan vs Kyushu, Ulleung vs Tsushima). */
function resolveOverlapCountry(lat: number, lng: number): GeoRegionCountryCode {
  if (lat >= 37 && lng >= 130) {
    return "KR";
  }
  if (lng >= 129.8 && lat <= 34.5) {
    return "JP";
  }
  if (lng >= 129.2 && lat <= 33.8) {
    return "JP";
  }
  return "KR";
}

export function inferCountryCodeFromCoords(
  lat: number,
  lng: number,
): GeoRegionCountryCode | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const japan = inJapanBox(lat, lng);
  const korea = inKoreaBox(lat, lng);

  if (japan && korea) {
    return resolveOverlapCountry(lat, lng);
  }
  if (korea) {
    return "KR";
  }
  if (japan) {
    return "JP";
  }
  return null;
}

export function isCoordInKorea(lat: number, lng: number): boolean {
  return inferCountryCodeFromCoords(lat, lng) === "KR";
}

export function isCoordInJapan(lat: number, lng: number): boolean {
  return inferCountryCodeFromCoords(lat, lng) === "JP";
}

export function inferMapRegionFromCoords(
  lat: number,
  lng: number,
): "kr" | "jp" | null {
  const country = inferCountryCodeFromCoords(lat, lng);
  if (country === "KR") {
    return "kr";
  }
  if (country === "JP") {
    return "jp";
  }
  return null;
}
