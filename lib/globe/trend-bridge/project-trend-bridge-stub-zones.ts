import { getTrendBridgeFeature } from "@/lib/globe/trend-bridge/trend-bridge-feature-registry";
import type { TrendBridgeZone } from "@/lib/globe/trend-bridge/trend-bridge-types";

/** Stub zones until server rollup ships — anchored near viewport center / user GPS. */
export function projectTrendBridgeStubZones(input: {
  bridgeId: string;
  anchorLat: number | null;
  anchorLng: number | null;
}): TrendBridgeZone[] {
  const feature = getTrendBridgeFeature(input.bridgeId);
  if (!feature) {
    return [];
  }

  const lat = input.anchorLat ?? 37.5665;
  const lng = input.anchorLng ?? 126.978;
  const label = feature.displayName;

  const offsets = [
    { dLat: 0, dLng: 0, intensity: 0.9 },
    { dLat: 0.012, dLng: 0.008, intensity: 0.55 },
    { dLat: -0.009, dLng: 0.011, intensity: 0.42 },
  ];

  return offsets.map((offset, index) => ({
    id: `${feature.bridgeId}-${index}`,
    bridgeId: feature.bridgeId,
    label,
    lat: lat + offset.dLat,
    lng: lng + offset.dLng,
    intensity: offset.intensity,
  }));
}
