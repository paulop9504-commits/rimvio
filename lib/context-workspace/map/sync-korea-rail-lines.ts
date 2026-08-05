/**
 * MapLibre Korea national rail polyline overlay — 2D Context Workspace only.
 * Never wire into 3D Globe.
 */

import type { Map as MapLibreMap, FilterSpecification } from "maplibre-gl";
import {
  KOREA_RAIL_BOUNDS,
  KOREA_RAIL_GEOJSON_URL,
  type KoreaRailLineId,
} from "@/lib/geo/korea-rail/line-catalog";

export const KOREA_RAIL_SOURCE_ID = "rimvio-korea-rail";
export const KOREA_RAIL_LAYER_ID = "rimvio-korea-rail-line";
export const KOREA_RAIL_CASING_LAYER_ID = "rimvio-korea-rail-casing";

function lineFilter(
  visibleLineIds: readonly KoreaRailLineId[],
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

function ensureRailLayers(map: MapLibreMap): void {
  if (!map.getSource(KOREA_RAIL_SOURCE_ID)) {
    map.addSource(KOREA_RAIL_SOURCE_ID, {
      type: "geojson",
      data: KOREA_RAIL_GEOJSON_URL,
    });
  }

  if (!map.getLayer(KOREA_RAIL_CASING_LAYER_ID)) {
    map.addLayer({
      id: KOREA_RAIL_CASING_LAYER_ID,
      type: "line",
      source: KOREA_RAIL_SOURCE_ID,
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
          5,
          3,
          8,
          5,
          11,
          7,
        ],
        "line-opacity": 0.8,
      },
    });
  }

  if (!map.getLayer(KOREA_RAIL_LAYER_ID)) {
    map.addLayer({
      id: KOREA_RAIL_LAYER_ID,
      type: "line",
      source: KOREA_RAIL_SOURCE_ID,
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
          5,
          1.6,
          8,
          2.8,
          11,
          4.2,
        ],
        "line-opacity": 0.92,
      },
    });
  }

  try {
    if (map.getLayer(KOREA_RAIL_CASING_LAYER_ID)) {
      map.moveLayer(KOREA_RAIL_CASING_LAYER_ID);
    }
    if (map.getLayer(KOREA_RAIL_LAYER_ID)) {
      map.moveLayer(KOREA_RAIL_LAYER_ID);
    }
  } catch {
    /* ignore */
  }
}

export function syncKoreaRailLines(
  map: MapLibreMap,
  visibleLineIds: readonly KoreaRailLineId[],
): void {
  ensureRailLayers(map);

  const filter = lineFilter(visibleLineIds);
  const visible = visibleLineIds.length > 0 ? "visible" : "none";

  if (map.getLayer(KOREA_RAIL_CASING_LAYER_ID)) {
    map.setFilter(KOREA_RAIL_CASING_LAYER_ID, filter);
    map.setLayoutProperty(KOREA_RAIL_CASING_LAYER_ID, "visibility", visible);
  }
  if (map.getLayer(KOREA_RAIL_LAYER_ID)) {
    map.setFilter(KOREA_RAIL_LAYER_ID, filter);
    map.setLayoutProperty(KOREA_RAIL_LAYER_ID, "visibility", visible);
  }

  try {
    map.moveLayer(KOREA_RAIL_CASING_LAYER_ID);
    map.moveLayer(KOREA_RAIL_LAYER_ID);
  } catch {
    /* ignore */
  }
}

export function fitKoreaRailVisibleBounds(
  map: MapLibreMap,
  visibleLineIds: readonly KoreaRailLineId[],
  padding = 48,
): void {
  if (visibleLineIds.length === 0) return;
  try {
    const features = map.querySourceFeatures(KOREA_RAIL_SOURCE_ID, {
      filter: lineFilter(visibleLineIds),
    });
    if (!features.length) {
      map.fitBounds(KOREA_RAIL_BOUNDS, {
        padding,
        maxZoom: 7.2,
        duration: 700,
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
        maxZoom: visibleLineIds.length >= 8 ? 7.4 : 9.5,
        duration: 700,
      },
    );
  } catch {
    map.fitBounds(KOREA_RAIL_BOUNDS, {
      padding,
      maxZoom: 7.2,
      duration: 700,
    });
  }
}
