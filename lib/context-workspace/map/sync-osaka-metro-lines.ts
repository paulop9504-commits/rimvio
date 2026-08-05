/**
 * MapLibre Osaka Metro polyline overlay — 2D Context Workspace only.
 * Never wire into 3D Globe.
 */

import type { Map as MapLibreMap, FilterSpecification } from "maplibre-gl";
import { OSAKA_METRO_GEOJSON_URL } from "@/lib/geo/osaka-metro/line-catalog";
import type { OsakaMetroLineId } from "@/lib/geo/osaka-metro/line-catalog";
import { syncOsakaMetroLineLabels } from "@/lib/context-workspace/map/sync-osaka-metro-line-labels";
import { syncOsakaMetroStationLabels } from "@/lib/context-workspace/map/sync-osaka-metro-station-labels";

export const OSAKA_METRO_SOURCE_ID = "rimvio-osaka-metro";
export const OSAKA_METRO_LAYER_ID = "rimvio-osaka-metro-line";
/** Soft casing under colored stroke for light basemap readability */
export const OSAKA_METRO_CASING_LAYER_ID = "rimvio-osaka-metro-casing";

function lineFilter(
  visibleLineIds: readonly OsakaMetroLineId[],
): FilterSpecification {
  if (visibleLineIds.length === 0) {
    return ["==", ["get", "lineId"], "__none__"];
  }
  // match is more reliable across MapLibre versions than `in` + literal
  return [
    "match",
    ["get", "lineId"],
    [...visibleLineIds],
    true,
    false,
  ] as FilterSpecification;
}

function ensureMetroLayers(map: MapLibreMap): void {
  if (!map.getSource(OSAKA_METRO_SOURCE_ID)) {
    map.addSource(OSAKA_METRO_SOURCE_ID, {
      type: "geojson",
      data: OSAKA_METRO_GEOJSON_URL,
    });
  }

  if (!map.getLayer(OSAKA_METRO_CASING_LAYER_ID)) {
    map.addLayer({
      id: OSAKA_METRO_CASING_LAYER_ID,
      type: "line",
      source: OSAKA_METRO_SOURCE_ID,
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
          10,
          5,
          13,
          7.5,
          15,
          9,
        ],
        "line-opacity": 0.9,
      },
    });
  }

  if (!map.getLayer(OSAKA_METRO_LAYER_ID)) {
    map.addLayer({
      id: OSAKA_METRO_LAYER_ID,
      type: "line",
      source: OSAKA_METRO_SOURCE_ID,
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
          10,
          2.8,
          13,
          4.2,
          15,
          5.5,
        ],
        "line-opacity": 0.96,
      },
    });
  }

  // Keep metro above fill zones / itinerary when possible
  try {
    if (map.getLayer(OSAKA_METRO_CASING_LAYER_ID)) {
      map.moveLayer(OSAKA_METRO_CASING_LAYER_ID);
    }
    if (map.getLayer(OSAKA_METRO_LAYER_ID)) {
      map.moveLayer(OSAKA_METRO_LAYER_ID);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Ensure source+layer exist; filter by visible line ids.
 * Empty visibleLineIds → hidden.
 */
export function syncOsakaMetroLines(
  map: MapLibreMap,
  visibleLineIds: readonly OsakaMetroLineId[],
): void {
  ensureMetroLayers(map);

  const filter = lineFilter(visibleLineIds);
  const visible = visibleLineIds.length > 0 ? "visible" : "none";

  if (map.getLayer(OSAKA_METRO_CASING_LAYER_ID)) {
    map.setFilter(OSAKA_METRO_CASING_LAYER_ID, filter);
    map.setLayoutProperty(OSAKA_METRO_CASING_LAYER_ID, "visibility", visible);
  }
  if (map.getLayer(OSAKA_METRO_LAYER_ID)) {
    map.setFilter(OSAKA_METRO_LAYER_ID, filter);
    map.setLayoutProperty(OSAKA_METRO_LAYER_ID, "visibility", visible);
  }

  try {
    syncOsakaMetroLineLabels(map, visibleLineIds);
  } catch {
    /* Marker / document unavailable */
  }
  try {
    syncOsakaMetroStationLabels(map, visibleLineIds);
  } catch {
    /* Marker / document unavailable */
  }

  try {
    map.moveLayer(OSAKA_METRO_CASING_LAYER_ID);
    map.moveLayer(OSAKA_METRO_LAYER_ID);
  } catch {
    /* ignore */
  }
}

/**
 * Soft fit to visible metro features (once after show).
 */
export function fitOsakaMetroVisibleBounds(
  map: MapLibreMap,
  visibleLineIds: readonly OsakaMetroLineId[],
  padding = 56,
): void {
  if (visibleLineIds.length === 0) return;
  try {
    const features = map.querySourceFeatures(OSAKA_METRO_SOURCE_ID, {
      filter: lineFilter(visibleLineIds),
    });
    if (!features.length) {
      // Source still loading — Osaka metro rough bbox fallback
      map.fitBounds(
        [
          [135.38, 34.53],
          [135.66, 34.77],
        ],
        { padding, maxZoom: 12.2, duration: 650 },
      );
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
      { padding, maxZoom: 13.2, duration: 650 },
    );
  } catch {
    map.fitBounds(
      [
        [135.38, 34.53],
        [135.66, 34.77],
      ],
      { padding, maxZoom: 12.2, duration: 650 },
    );
  }
}
