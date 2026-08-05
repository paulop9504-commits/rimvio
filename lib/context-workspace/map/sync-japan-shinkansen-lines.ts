/**
 * MapLibre Japan Shinkansen polyline overlay — 2D Context Workspace only.
 * Never wire into 3D Globe.
 */

import type { Map as MapLibreMap, FilterSpecification } from "maplibre-gl";
import {
  JAPAN_SHINKANSEN_BOUNDS,
  JAPAN_SHINKANSEN_GEOJSON_URL,
  type JapanShinkansenLineId,
} from "@/lib/geo/japan-shinkansen/line-catalog";
import { syncJapanShinkansenLineLabels } from "@/lib/context-workspace/map/sync-japan-shinkansen-line-labels";

export const JAPAN_SHINKANSEN_SOURCE_ID = "rimvio-japan-shinkansen";
export const JAPAN_SHINKANSEN_LAYER_ID = "rimvio-japan-shinkansen-line";
export const JAPAN_SHINKANSEN_CASING_LAYER_ID =
  "rimvio-japan-shinkansen-casing";

function lineFilter(
  visibleLineIds: readonly JapanShinkansenLineId[],
): FilterSpecification {
  if (visibleLineIds.length === 0) {
    return ["==", ["get", "lineId"], "__none__"];
  }
  return [
    "match",
    ["get", "lineId"],
    [...visibleLineIds],
    true,
    false,
  ] as FilterSpecification;
}

function ensureShinkansenLayers(map: MapLibreMap): void {
  if (!map.getSource(JAPAN_SHINKANSEN_SOURCE_ID)) {
    map.addSource(JAPAN_SHINKANSEN_SOURCE_ID, {
      type: "geojson",
      data: JAPAN_SHINKANSEN_GEOJSON_URL,
    });
  }

  if (!map.getLayer(JAPAN_SHINKANSEN_CASING_LAYER_ID)) {
    map.addLayer({
      id: JAPAN_SHINKANSEN_CASING_LAYER_ID,
      type: "line",
      source: JAPAN_SHINKANSEN_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none",
      },
      paint: {
        "line-color": "#ffffff",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          4,
          3.5,
          7,
          6,
          10,
          8,
        ],
        "line-opacity": 0.82,
      },
    });
  }

  if (!map.getLayer(JAPAN_SHINKANSEN_LAYER_ID)) {
    map.addLayer({
      id: JAPAN_SHINKANSEN_LAYER_ID,
      type: "line",
      source: JAPAN_SHINKANSEN_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none",
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          4,
          2,
          7,
          3.4,
          10,
          5,
        ],
        "line-opacity": 0.95,
      },
    });
  }

  try {
    if (map.getLayer(JAPAN_SHINKANSEN_CASING_LAYER_ID)) {
      map.moveLayer(JAPAN_SHINKANSEN_CASING_LAYER_ID);
    }
    if (map.getLayer(JAPAN_SHINKANSEN_LAYER_ID)) {
      map.moveLayer(JAPAN_SHINKANSEN_LAYER_ID);
    }
  } catch {
    /* ignore */
  }
}

export function syncJapanShinkansenLines(
  map: MapLibreMap,
  visibleLineIds: readonly JapanShinkansenLineId[],
): void {
  ensureShinkansenLayers(map);

  const filter = lineFilter(visibleLineIds);
  const visible = visibleLineIds.length > 0 ? "visible" : "none";

  if (map.getLayer(JAPAN_SHINKANSEN_CASING_LAYER_ID)) {
    map.setFilter(JAPAN_SHINKANSEN_CASING_LAYER_ID, filter);
    map.setLayoutProperty(
      JAPAN_SHINKANSEN_CASING_LAYER_ID,
      "visibility",
      visible,
    );
  }
  if (map.getLayer(JAPAN_SHINKANSEN_LAYER_ID)) {
    map.setFilter(JAPAN_SHINKANSEN_LAYER_ID, filter);
    map.setLayoutProperty(JAPAN_SHINKANSEN_LAYER_ID, "visibility", visible);
  }

  try {
    syncJapanShinkansenLineLabels(map, visibleLineIds);
  } catch {
    /* Marker / document unavailable */
  }

  try {
    map.moveLayer(JAPAN_SHINKANSEN_CASING_LAYER_ID);
    map.moveLayer(JAPAN_SHINKANSEN_LAYER_ID);
  } catch {
    /* ignore */
  }
}

export function fitJapanShinkansenVisibleBounds(
  map: MapLibreMap,
  visibleLineIds: readonly JapanShinkansenLineId[],
  padding = 48,
): void {
  if (visibleLineIds.length === 0) return;
  try {
    const features = map.querySourceFeatures(JAPAN_SHINKANSEN_SOURCE_ID, {
      filter: lineFilter(visibleLineIds),
    });
    if (!features.length) {
      map.fitBounds(JAPAN_SHINKANSEN_BOUNDS, {
        padding,
        maxZoom: 5.8,
        duration: 750,
      });
      return;
    }
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const f of features) {
      const g = f.geometry;
      if (!g) continue;
      const rings: number[][] =
        g.type === "LineString"
          ? g.coordinates
          : g.type === "MultiLineString"
            ? g.coordinates.flat()
            : [];
      for (const c of rings) {
        const lng = c[0];
        const lat = c[1];
        if (lng == null || lat == null) continue;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    }
    if (!Number.isFinite(minLng) || !Number.isFinite(maxLng)) return;
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding,
        maxZoom: visibleLineIds.length >= 6 ? 5.6 : 7.5,
        duration: 750,
      },
    );
  } catch {
    map.fitBounds(JAPAN_SHINKANSEN_BOUNDS, {
      padding,
      maxZoom: 5.8,
      duration: 750,
    });
  }
}
