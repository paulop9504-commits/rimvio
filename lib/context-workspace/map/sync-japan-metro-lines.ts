/**
 * MapLibre Japan nationwide subway overlay — 2D Context Workspace only.
 * Never wire into 3D Globe.
 */

import type { Map as MapLibreMap, FilterSpecification } from "maplibre-gl";
import {
  JAPAN_METRO_BOUNDS,
  JAPAN_METRO_GEOJSON_URL,
  type JapanMetroLineId,
} from "@/lib/geo/japan-metro/line-catalog";

export const JAPAN_METRO_SOURCE_ID = "rimvio-japan-metro";
export const JAPAN_METRO_LAYER_ID = "rimvio-japan-metro-line";
export const JAPAN_METRO_CASING_LAYER_ID = "rimvio-japan-metro-casing";

function lineFilter(
  visibleLineIds: readonly JapanMetroLineId[],
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

function ensureLayers(map: MapLibreMap): void {
  if (!map.getSource(JAPAN_METRO_SOURCE_ID)) {
    map.addSource(JAPAN_METRO_SOURCE_ID, {
      type: "geojson",
      data: JAPAN_METRO_GEOJSON_URL,
    });
  }

  if (!map.getLayer(JAPAN_METRO_CASING_LAYER_ID)) {
    map.addLayer({
      id: JAPAN_METRO_CASING_LAYER_ID,
      type: "line",
      source: JAPAN_METRO_SOURCE_ID,
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
          2.5,
          8,
          5,
          12,
          7,
        ],
        "line-opacity": 0.8,
      },
    });
  }

  if (!map.getLayer(JAPAN_METRO_LAYER_ID)) {
    map.addLayer({
      id: JAPAN_METRO_LAYER_ID,
      type: "line",
      source: JAPAN_METRO_SOURCE_ID,
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
          1.4,
          8,
          2.6,
          12,
          4.2,
        ],
        "line-opacity": 0.92,
      },
    });
  }

  try {
    if (map.getLayer(JAPAN_METRO_CASING_LAYER_ID)) {
      map.moveLayer(JAPAN_METRO_CASING_LAYER_ID);
    }
    if (map.getLayer(JAPAN_METRO_LAYER_ID)) {
      map.moveLayer(JAPAN_METRO_LAYER_ID);
    }
  } catch {
    /* ignore */
  }
}

export function syncJapanMetroLines(
  map: MapLibreMap,
  visibleLineIds: readonly JapanMetroLineId[],
): void {
  ensureLayers(map);
  const filter = lineFilter(visibleLineIds);
  const visible = visibleLineIds.length > 0 ? "visible" : "none";

  if (map.getLayer(JAPAN_METRO_CASING_LAYER_ID)) {
    map.setFilter(JAPAN_METRO_CASING_LAYER_ID, filter);
    map.setLayoutProperty(JAPAN_METRO_CASING_LAYER_ID, "visibility", visible);
  }
  if (map.getLayer(JAPAN_METRO_LAYER_ID)) {
    map.setFilter(JAPAN_METRO_LAYER_ID, filter);
    map.setLayoutProperty(JAPAN_METRO_LAYER_ID, "visibility", visible);
  }

  try {
    map.moveLayer(JAPAN_METRO_CASING_LAYER_ID);
    map.moveLayer(JAPAN_METRO_LAYER_ID);
  } catch {
    /* ignore */
  }
}

export function fitJapanMetroVisibleBounds(
  map: MapLibreMap,
  visibleLineIds: readonly JapanMetroLineId[],
  padding = 48,
): void {
  if (visibleLineIds.length === 0) return;
  try {
    const features = map.querySourceFeatures(JAPAN_METRO_SOURCE_ID, {
      filter: lineFilter(visibleLineIds),
    });
    if (!features.length) {
      map.fitBounds(JAPAN_METRO_BOUNDS, {
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
    const span = Math.max(maxLng - minLng, maxLat - minLat);
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding,
        maxZoom: span > 8 ? 5.6 : span > 2 ? 8.5 : 12,
        duration: 750,
      },
    );
  } catch {
    map.fitBounds(JAPAN_METRO_BOUNDS, {
      padding,
      maxZoom: 5.8,
      duration: 750,
    });
  }
}
