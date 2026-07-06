import { haversineKm } from "@/lib/feed/spacetime-fit";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import type { ContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-types";
import type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";

const EARTH_RADIUS_KM = 6371;

type GeoPoint = { lat: number; lng: number; id: string };

function orderPointsNearestNeighbor(
  origin: GeoPoint,
  points: readonly GeoPoint[],
): GeoPoint[] {
  const remaining = [...points];
  const ordered: GeoPoint[] = [];
  let cursor = origin;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const [index, point] of remaining.entries()) {
      const distance = haversineKm(cursor.lat, cursor.lng, point.lat, point.lng);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    const next = remaining.splice(bestIndex, 1)[0]!;
    ordered.push(next);
    cursor = next;
  }

  return ordered;
}

/** Short-hop route arcs — flat lift for walk-scale POI chains. */
export function resolveLocalDiscoveryRouteArcAltitude(arc: Pick<
  GlobeTripArc,
  "startLat" | "startLng" | "endLat" | "endLng"
>): number {
  const distanceKm = haversineKm(
    arc.startLat,
    arc.startLng,
    arc.endLat,
    arc.endLng,
  );
  const peakKm = Math.min(0.45, Math.max(0.04, distanceKm * 0.08));
  return peakKm / EARTH_RADIUS_KM;
}

export function buildContextConditionDiscoveryOverlay(input: {
  contextEventId: string;
  anchorLat: number;
  anchorLng: number;
  outcome: ContextConditionAnchorPinOutcome;
  pinRows?: readonly { lat: number; lng: number; placeId: string }[];
}): ContextConditionDiscoveryOverlay {
  const pinRows = input.pinRows ?? input.outcome.pinPoints;
  const points: GeoPoint[] = pinRows.map((row, index) => {
    const placeId =
      "placeId" in row && typeof row.placeId === "string"
        ? row.placeId.trim()
        : "";
    return {
      lat: row.lat,
      lng: row.lng,
      id: placeId || `pin-${index}`,
    };
  });

  const origin: GeoPoint = {
    lat: input.anchorLat,
    lng: input.anchorLng,
    id: "anchor",
  };
  const ordered = orderPointsNearestNeighbor(origin, points);
  const chain = [origin, ...ordered];

  const routeArcs: GlobeTripArc[] = [];
  for (let index = 1; index < chain.length; index += 1) {
    const start = chain[index - 1]!;
    const end = chain[index]!;
    routeArcs.push({
      id: `ctxcond-route:${input.outcome.batchId}:${index}`,
      tripRef: input.outcome.batchId,
      startLat: start.lat,
      startLng: start.lng,
      endLat: end.lat,
      endLng: end.lng,
      color: GLOBE_TOSS_THEME.blue,
      emphasis: "focused",
    });
  }

  return {
    contextEventId: input.contextEventId.trim(),
    batchId: input.outcome.batchId,
    ring: {
      lat: input.anchorLat,
      lng: input.anchorLng,
      radiusM: input.outcome.radiusM,
    },
    routeArcs,
  };
}
