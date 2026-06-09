export const GLOBE_ALTITUDE = {
  overview: 2.2,
  region: 1.05,
  city: 0.28,
  street: 0.06,
} as const;

export type GlobeDetailLevel = "space" | "region" | "city" | "street";

export function resolveGlobeDetailLevel(altitude: number): GlobeDetailLevel {
  if (altitude >= 1.6) {
    return "space";
  }
  if (altitude >= 0.55) {
    return "region";
  }
  if (altitude >= 0.14) {
    return "city";
  }
  return "street";
}

export function altitudeForGlobeDetailLevel(level: GlobeDetailLevel): number {
  return GLOBE_ALTITUDE[level === "space" ? "overview" : level];
}
