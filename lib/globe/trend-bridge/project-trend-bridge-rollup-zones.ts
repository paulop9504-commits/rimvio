import type { TrendBridgeRollupRow } from "@/lib/globe/trend-bridge/server/run-trend-bridge-rollup-batch";
import { getTrendBridgeFeature } from "@/lib/globe/trend-bridge/trend-bridge-feature-registry";
import type { TrendBridgeZone } from "@/lib/globe/trend-bridge/trend-bridge-types";

function velocityIntensity(velocity: string): number {
  if (velocity === "high") {
    return 0.9;
  }
  if (velocity === "medium") {
    return 0.58;
  }
  return 0.34;
}

/** Map server rollups → mist zones (geo-anchored, not stub offsets). */
export function projectTrendBridgeRollupZones(input: {
  bridgeId: string;
  rollups: TrendBridgeRollupRow[];
}): TrendBridgeZone[] {
  const feature = getTrendBridgeFeature(input.bridgeId);
  if (!feature) {
    return [];
  }

  return input.rollups.map((rollup) => ({
    id: rollup.id,
    bridgeId: input.bridgeId,
    label: rollup.location_dong,
    lat: rollup.hotspot_lat,
    lng: rollup.hotspot_lng,
    intensity: velocityIntensity(rollup.trend_velocity),
    peakHour: rollup.peak_hour_label,
    contextSummary: rollup.context_summary,
  }));
}

/** Approximate lat/lng delta → screen % for CSS mist blobs. */
export function rollupZoneToScreenOffset(input: {
  anchorLat: number;
  anchorLng: number;
  zoneLat: number;
  zoneLng: number;
}): { leftPercent: number; topPercent: number } {
  const latKm = (input.zoneLat - input.anchorLat) * 111;
  const lngKm =
    (input.zoneLng - input.anchorLng) *
    111 *
    Math.max(0.25, Math.cos((input.anchorLat * Math.PI) / 180));
  const leftPercent = Math.min(86, Math.max(14, 50 + lngKm * 9));
  const topPercent = Math.min(72, Math.max(24, 44 - latKm * 9));
  return { leftPercent, topPercent };
}
