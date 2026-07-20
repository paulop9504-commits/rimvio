import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import type { ContextBloomCandidate } from "@/lib/visual-projection/context-bloom-types";
import { resolveContextBloomDecor } from "@/lib/visual-projection/context-bloom-store";

export function lodgingMarkersToBloomCandidates(
  markers: readonly GlobeLodgingMapMarker[],
): ContextBloomCandidate[] {
  return markers.map((row) => ({
    id: row.id,
    resourceId: row.resourceId,
    label: row.label,
    lat: row.lat,
    lng: row.lng,
    pinKind: "lodging" as const,
  }));
}

export function eateryMarkersToBloomCandidates(
  markers: readonly GlobeEateryMapMarker[],
): ContextBloomCandidate[] {
  return markers.map((row) => {
    const pinKind = row.resourceId.includes(":activity:")
      ? ("activity" as const)
      : row.resourceId.includes(":amenity:")
        ? ("amenity" as const)
        : ("eatery" as const);
    return {
      id: row.id,
      resourceId: row.resourceId,
      label: row.label,
      lat: row.lat,
      lng: row.lng,
      pinKind,
    };
  });
}

export function decorateLodgingMarkersWithBloom(
  markers: readonly GlobeLodgingMapMarker[],
): GlobeLodgingMapMarker[] {
  return markers.map((row) => {
    const decor = resolveContextBloomDecor(row.id, row.resourceId);
    if (decor.bloomRole === "none") {
      return row;
    }
    return {
      ...row,
      bloomRole: decor.bloomRole,
      bloomDelayMs: decor.bloomDelayMs,
    };
  });
}

export function decorateEateryMarkersWithBloom(
  markers: readonly GlobeEateryMapMarker[],
): GlobeEateryMapMarker[] {
  return markers.map((row) => {
    const decor = resolveContextBloomDecor(row.id, row.resourceId);
    if (decor.bloomRole === "none") {
      return row;
    }
    return {
      ...row,
      bloomRole: decor.bloomRole,
      bloomDelayMs: decor.bloomDelayMs,
    };
  });
}
