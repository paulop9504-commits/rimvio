import type { GlobeInstance } from "globe.gl";
import type { GlobeContextWarmthPoint } from "@/lib/globe/globe-context-warmth-types";
import {
  resolveGlobeContextWarmthBandwidth,
  resolveGlobeContextWarmthOpacity,
  shouldRenderGlobeContextWarmth,
  warmthColorForDensity,
} from "@/lib/globe/globe-context-warmth-visual";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";

const WARMTH_SURFACE_ALTITUDE = 0.003;

export function syncGlobeContextWarmthLayer(input: {
  globe: GlobeInstance;
  enabled: boolean;
  points: readonly GlobeContextWarmthPoint[];
  altitude: number;
  detailLevel?: GlobeDetailLevel;
}): void {
  const visible = shouldRenderGlobeContextWarmth({
    enabled: input.enabled,
    pointCount: input.points.length,
    altitude: input.altitude,
    detailLevel: input.detailLevel,
  });
  if (!visible) {
    input.globe.heatmapsData([]);
    return;
  }

  const layerOpacity = resolveGlobeContextWarmthOpacity(input.altitude);
  const bandwidth = resolveGlobeContextWarmthBandwidth(input.altitude);

  input.globe
    .heatmapsData([{ id: "personal", points: [...input.points] }])
    .heatmapPoints((row: { points: GlobeContextWarmthPoint[] }) => row.points)
    .heatmapPointLat((point: GlobeContextWarmthPoint) => point.lat)
    .heatmapPointLng((point: GlobeContextWarmthPoint) => point.lng)
    .heatmapPointWeight((point: GlobeContextWarmthPoint) => point.weight)
    .heatmapBandwidth(bandwidth)
    .heatmapColorSaturation(1)
    .heatmapColorFn(() => (t: number) => warmthColorForDensity(t, layerOpacity))
    .heatmapBaseAltitude(WARMTH_SURFACE_ALTITUDE)
    .heatmapTopAltitude(WARMTH_SURFACE_ALTITUDE)
    .heatmapsTransitionDuration(0);
}
