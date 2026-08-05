/**
 * MapLibre Osaka JR polyline overlay — Projection of ADR-051 absorb.
 */

import type { Map as MapLibreMap, FilterSpecification } from "maplibre-gl";
import { Marker } from "maplibre-gl";
import {
  OSAKA_JR_BOUNDS,
  OSAKA_JR_GEOJSON_URL,
  getOsakaJrLineEntry,
  type OsakaJrLineId,
} from "@/lib/geo/osaka-jr/line-catalog";
import { OSAKA_JR_STATIONS } from "@/lib/geo/osaka-jr/station-catalog";

export const OSAKA_JR_SOURCE_ID = "rimvio-osaka-jr";
export const OSAKA_JR_LAYER_ID = "rimvio-osaka-jr-line";
export const OSAKA_JR_CASING_LAYER_ID = "rimvio-osaka-jr-casing";

type JrLabelState = { readonly markers: Marker[] };
const lineLabelByMap = new WeakMap<MapLibreMap, JrLabelState>();
const stationLabelByMap = new WeakMap<MapLibreMap, JrLabelState>();

function lineFilter(
  visibleLineIds: readonly OsakaJrLineId[],
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

function clearMarkers(
  map: MapLibreMap,
  bag: WeakMap<MapLibreMap, JrLabelState>,
): void {
  const prev = bag.get(map);
  if (!prev) return;
  for (const m of prev.markers) {
    try {
      m.remove();
    } catch {
      /* ignore */
    }
  }
  bag.delete(map);
}

function syncJrLabels(
  map: MapLibreMap,
  visibleLineIds: readonly OsakaJrLineId[],
): void {
  clearMarkers(map, lineLabelByMap);
  clearMarkers(map, stationLabelByMap);
  if (visibleLineIds.length === 0 || typeof document === "undefined") return;

  const idSet = new Set(visibleLineIds);
  const lineMarkers: Marker[] = [];
  for (const id of visibleLineIds) {
    const entry = getOsakaJrLineEntry(id);
    if (!entry) continue;
    const el = document.createElement("div");
    el.dataset.osakaJrLineLabel = "1";
    el.textContent = entry.shortLabelKo;
    el.style.cssText = [
      "pointer-events:none",
      "font-size:11px",
      "font-weight:800",
      `color:${entry.color}`,
      "padding:2px 5px",
      "border-radius:5px",
      "background:rgba(255,255,255,0.92)",
      "box-shadow:0 1px 4px rgba(25,31,40,0.14)",
    ].join(";");
    lineMarkers.push(
      new Marker({ element: el, anchor: "center" })
        .setLngLat([entry.labelAnchor[0], entry.labelAnchor[1]])
        .addTo(map),
    );
  }
  lineLabelByMap.set(map, { markers: lineMarkers });

  const zoom = map.getZoom();
  if (zoom < 11.8) return;

  const stationMarkers: Marker[] = [];
  const seen = new Set<string>();
  for (const s of OSAKA_JR_STATIONS) {
    if (!s.lineIds.some((id) => idSet.has(id))) continue;
    if (zoom < 13 && !s.hub) continue;
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    const color =
      getOsakaJrLineEntry(s.lineIds[0]!)?.color ?? "#4e5968";
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:2px";
    const dot = document.createElement("span");
    dot.style.cssText = `width:7px;height:7px;border-radius:999px;background:${color};border:1.5px solid #fff;box-shadow:0 1px 3px rgba(25,31,40,0.28)`;
    const label = document.createElement("span");
    label.textContent = `${s.nameKo}역`;
    label.style.cssText =
      "font-size:10px;font-weight:700;color:#191f28;padding:1px 4px;border-radius:4px;background:rgba(255,255,255,0.92);box-shadow:0 1px 4px rgba(25,31,40,0.12)";
    wrap.appendChild(dot);
    wrap.appendChild(label);
    stationMarkers.push(
      new Marker({ element: wrap, anchor: "top" })
        .setLngLat([s.lng, s.lat])
        .addTo(map),
    );
  }
  stationLabelByMap.set(map, { markers: stationMarkers });
}

function ensureJrLayers(map: MapLibreMap): void {
  if (!map.getSource(OSAKA_JR_SOURCE_ID)) {
    map.addSource(OSAKA_JR_SOURCE_ID, {
      type: "geojson",
      data: OSAKA_JR_GEOJSON_URL,
    });
  }
  if (!map.getLayer(OSAKA_JR_CASING_LAYER_ID)) {
    map.addLayer({
      id: OSAKA_JR_CASING_LAYER_ID,
      type: "line",
      source: OSAKA_JR_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none",
      },
      paint: {
        "line-color": "#ffffff",
        "line-width": 7,
        "line-opacity": 0.85,
      },
    });
  }
  if (!map.getLayer(OSAKA_JR_LAYER_ID)) {
    map.addLayer({
      id: OSAKA_JR_LAYER_ID,
      type: "line",
      source: OSAKA_JR_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none",
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 4.5,
        "line-opacity": 0.95,
      },
    });
  }
}

export function syncOsakaJrLines(
  map: MapLibreMap,
  visibleLineIds: readonly OsakaJrLineId[],
): void {
  ensureJrLayers(map);
  const filter = lineFilter(visibleLineIds);
  const visible = visibleLineIds.length > 0 ? "visible" : "none";
  if (map.getLayer(OSAKA_JR_CASING_LAYER_ID)) {
    map.setFilter(OSAKA_JR_CASING_LAYER_ID, filter);
    map.setLayoutProperty(OSAKA_JR_CASING_LAYER_ID, "visibility", visible);
  }
  if (map.getLayer(OSAKA_JR_LAYER_ID)) {
    map.setFilter(OSAKA_JR_LAYER_ID, filter);
    map.setLayoutProperty(OSAKA_JR_LAYER_ID, "visibility", visible);
  }
  try {
    syncJrLabels(map, visibleLineIds);
  } catch {
    /* ignore */
  }
  try {
    map.moveLayer(OSAKA_JR_CASING_LAYER_ID);
    map.moveLayer(OSAKA_JR_LAYER_ID);
  } catch {
    /* ignore */
  }
}

export function fitOsakaJrVisibleBounds(
  map: MapLibreMap,
  visibleLineIds: readonly OsakaJrLineId[],
  padding = 56,
): void {
  if (visibleLineIds.length === 0) return;
  map.fitBounds(OSAKA_JR_BOUNDS, {
    padding,
    maxZoom: 12.2,
    duration: 700,
  });
}
