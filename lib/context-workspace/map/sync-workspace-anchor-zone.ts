/**
 * Soft walk-radius anchor zone — MapLibre fill + soft-edge stroke.
 * 2D Context Workspace only (not 3D Globe).
 * Rimvio Toss blue — not Gemini brand chrome.
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import { createCirclePolygonGeoJSON } from "@/lib/context-workspace/map/create-circle-polygon-geojson";

export const WORKSPACE_ANCHOR_ZONE_SOURCE_ID = "rimvio-workspace-anchor-zone";
export const WORKSPACE_ANCHOR_ZONE_FILL_ID = "rimvio-workspace-anchor-zone-fill";
export const WORKSPACE_ANCHOR_ZONE_STROKE_ID =
  "rimvio-workspace-anchor-zone-stroke";

export type WorkspaceAnchorZone = {
  readonly nameKo: string;
  readonly lat: number;
  readonly lng: number;
  /** Soft highlight radius */
  readonly radiusMeters: number;
};

/**
 * Sync / clear soft blue walk zone under Decision projection.
 */
export function syncWorkspaceAnchorZone(
  map: MapLibreMap,
  zone: WorkspaceAnchorZone | null,
): void {
  if (!zone || !Number.isFinite(zone.lat) || !Number.isFinite(zone.lng)) {
    if (map.getLayer(WORKSPACE_ANCHOR_ZONE_STROKE_ID)) {
      map.removeLayer(WORKSPACE_ANCHOR_ZONE_STROKE_ID);
    }
    if (map.getLayer(WORKSPACE_ANCHOR_ZONE_FILL_ID)) {
      map.removeLayer(WORKSPACE_ANCHOR_ZONE_FILL_ID);
    }
    if (map.getSource(WORKSPACE_ANCHOR_ZONE_SOURCE_ID)) {
      map.removeSource(WORKSPACE_ANCHOR_ZONE_SOURCE_ID);
    }
    return;
  }

  const data = createCirclePolygonGeoJSON({
    lat: zone.lat,
    lng: zone.lng,
    radiusMeters: Math.max(80, Math.min(1200, zone.radiusMeters)),
    properties: { nameKo: zone.nameKo },
  });

  const existing = map.getSource(WORKSPACE_ANCHOR_ZONE_SOURCE_ID) as
    | { setData: (d: GeoJSON.FeatureCollection) => void }
    | undefined;
  if (existing) {
    existing.setData(data);
  } else {
    map.addSource(WORKSPACE_ANCHOR_ZONE_SOURCE_ID, {
      type: "geojson",
      data,
    });
  }

  if (!map.getLayer(WORKSPACE_ANCHOR_ZONE_FILL_ID)) {
    const beforeId =
      map.getLayer("rimvio-osaka-metro-casing") ||
      map.getLayer("rimvio-osaka-metro-line")
        ? map.getLayer("rimvio-osaka-metro-casing")
          ? "rimvio-osaka-metro-casing"
          : "rimvio-osaka-metro-line"
        : undefined;
    map.addLayer(
      {
        id: WORKSPACE_ANCHOR_ZONE_FILL_ID,
        type: "fill",
        source: WORKSPACE_ANCHOR_ZONE_SOURCE_ID,
        paint: {
          "fill-color": "#3182f6",
          "fill-opacity": 0.12,
        },
      },
      beforeId,
    );
  }

  if (!map.getLayer(WORKSPACE_ANCHOR_ZONE_STROKE_ID)) {
    const beforeId = map.getLayer("rimvio-osaka-metro-casing")
      ? "rimvio-osaka-metro-casing"
      : map.getLayer("rimvio-osaka-metro-line")
        ? "rimvio-osaka-metro-line"
        : undefined;
    map.addLayer(
      {
        id: WORKSPACE_ANCHOR_ZONE_STROKE_ID,
        type: "line",
        source: WORKSPACE_ANCHOR_ZONE_SOURCE_ID,
        paint: {
          "line-color": "#69a7ff",
          "line-width": 2,
          "line-blur": 2.5,
          "line-opacity": 0.85,
        },
      },
      beforeId,
    );
  }
}
