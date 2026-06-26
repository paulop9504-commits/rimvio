import {
  kmToDisplayDistance,
  type RegionalProfile,
} from "@/lib/preferences/regional-profile";

export function formatRegionalDistance(
  km: number | null | undefined,
  profile: RegionalProfile,
): string | null {
  if (km == null || !Number.isFinite(km)) {
    return null;
  }

  if (profile.distanceUnit === "mi") {
    const miles = kmToDisplayDistance(km, profile);
    if (miles < 0.1) {
      const feet = Math.round(km * 3280.84);
      return `${feet} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }

  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatRegionalHostEtaLine(
  minutes: number,
  distanceKm: number,
  profile: RegionalProfile,
): string {
  const distance = formatRegionalDistance(distanceKm, profile);
  if (profile.numberLocale.startsWith("ko")) {
    return distance
      ? `약 ${minutes}분 후 도착 · ${distance}`
      : `약 ${minutes}분 후 도착`;
  }
  return distance
    ? `~${minutes} min away · ${distance}`
    : `~${minutes} min away`;
}
