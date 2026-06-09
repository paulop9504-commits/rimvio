export const GLOBE_ALTITUDE = {
  overview: 2.2,
  region: 0.85,
  city: 0.18,
  /** Apartment-district scale — roads + block labels. */
  neighborhood: 0.022,
  /** Pin-accurate — building / street names. */
  pin: 0.005,
} as const;

export type GlobeDetailLevel =
  | "space"
  | "region"
  | "city"
  | "neighborhood"
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
  if (altitude >= 0.075) {
    return "city";
  }
  if (altitude >= 0.012) {
    return "neighborhood";
  }
  return "pin";
}

export function altitudeForGlobeDetailLevel(level: GlobeDetailLevel): number {
  return GLOBE_ALTITUDE[level === "space" ? "overview" : level];
}
