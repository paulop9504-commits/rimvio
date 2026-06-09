export const GLOBE_ALTITUDE = {
  overview: 2.2,
  region: 0.85,
  city: 0.14,
  /** Apartment-district scale — roads + block labels. */
  neighborhood: 0.012,
  /** Street names legible — Toss map detail. */
  street: 0.0032,
  /** Building / alley — max pinch zoom. */
  pin: 0.00055,
} as const;

/** Closest camera altitude (globe radii above surface). */
export const GLOBE_MIN_CAMERA_ALTITUDE = 0.00035;

export type GlobeDetailLevel =
  | "space"
  | "region"
  | "city"
  | "neighborhood"
  | "street"
  | "pin";

/** @deprecated Use `pin` */
export type GlobeStreetDetailLevel = "pin";

export function resolveGlobeDetailLevel(altitude: number): GlobeDetailLevel {
  if (altitude >= 1.4) {
    return "space";
  }
  if (altitude >= 0.42) {
    return "region";
  }
  if (altitude >= 0.065) {
    return "city";
  }
  if (altitude >= 0.008) {
    return "neighborhood";
  }
  if (altitude >= 0.0018) {
    return "street";
  }
  return "pin";
}

export function altitudeForGlobeDetailLevel(level: GlobeDetailLevel): number {
  return GLOBE_ALTITUDE[level === "space" ? "overview" : level];
}
