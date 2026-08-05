/**
 * Osaka Metro station name markers — HTML (Hangul-safe).
 * Zoom-aware: hubs from ~12.3, denser stations from ~13.5.
 */

import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { getOsakaMetroLineEntry } from "@/lib/geo/osaka-metro/line-catalog";
import type { OsakaMetroLineId } from "@/lib/geo/osaka-metro/line-catalog";
import {
  stationsForVisibleLines,
  type OsakaMetroStation,
} from "@/lib/geo/osaka-metro/station-catalog";

export const OSAKA_METRO_STATION_HUB_ZOOM = 11.8;
export const OSAKA_METRO_STATION_DENSE_ZOOM = 13.0;

type StationLabelState = {
  readonly markers: Marker[];
  readonly lineIds: readonly OsakaMetroLineId[];
  readonly mode: "none" | "hubs" | "dense";
  zoomHandler?: () => void;
};

const stateByMap = new WeakMap<MapLibreMap, StationLabelState>();

function clearStationMarkers(map: MapLibreMap): void {
  const prev = stateByMap.get(map);
  if (!prev) return;
  for (const m of prev.markers) {
    try {
      m.remove();
    } catch {
      /* ignore */
    }
  }
  if (prev.zoomHandler) {
    try {
      map.off("zoom", prev.zoomHandler);
      map.off("zoomend", prev.zoomHandler);
    } catch {
      /* ignore */
    }
  }
  stateByMap.delete(map);
}

function primaryColor(station: OsakaMetroStation): string {
  for (const id of station.lineIds) {
    const e = getOsakaMetroLineEntry(id);
    if (e) return e.color;
  }
  return "#4e5968";
}

function buildStationEl(station: OsakaMetroStation): HTMLDivElement {
  const color = primaryColor(station);
  const wrap = document.createElement("div");
  wrap.dataset.osakaMetroStation = station.id;
  wrap.style.cssText = [
    "pointer-events:none",
    "user-select:none",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "gap:2px",
    "transform:translateY(-2px)",
  ].join(";");

  const dot = document.createElement("span");
  dot.style.cssText = [
    "width:7px",
    "height:7px",
    "border-radius:999px",
    `background:${color}`,
    "border:1.5px solid #fff",
    "box-shadow:0 1px 3px rgba(25,31,40,0.28)",
    "flex-shrink:0",
  ].join(";");

  const row = document.createElement("div");
  row.style.cssText =
    "display:flex;align-items:center;gap:3px;max-width:120px;";

  const code = station.code?.trim();
  if (code) {
    const codeEl = document.createElement("span");
    codeEl.textContent = code;
    codeEl.style.cssText = [
      "font-size:8px",
      "font-weight:800",
      "letter-spacing:0.02em",
      "color:#fff",
      `background:${color}`,
      "border-radius:999px",
      "padding:0 4px",
      "line-height:14px",
      "height:14px",
      "display:inline-flex",
      "align-items:center",
      "flex-shrink:0",
    ].join(";");
    row.appendChild(codeEl);
  }

  const label = document.createElement("span");
  label.textContent = `${station.nameKo}역`;
  label.style.cssText = [
    "white-space:nowrap",
    "overflow:hidden",
    "text-overflow:ellipsis",
    "font-size:10px",
    "font-weight:700",
    "letter-spacing:-0.03em",
    "line-height:1.1",
    "color:#191f28",
    "padding:1px 4px",
    "border-radius:4px",
    "background:rgba(255,255,255,0.92)",
    "box-shadow:0 1px 4px rgba(25,31,40,0.12)",
  ].join(";");
  row.appendChild(label);

  wrap.appendChild(dot);
  wrap.appendChild(row);
  return wrap;
}

function visibilityMode(zoom: number): "none" | "hubs" | "dense" {
  if (zoom < OSAKA_METRO_STATION_HUB_ZOOM) return "none";
  if (zoom < OSAKA_METRO_STATION_DENSE_ZOOM) return "hubs";
  return "dense";
}

function removeMarkersOnly(map: MapLibreMap): void {
  const prev = stateByMap.get(map);
  if (!prev) return;
  for (const m of prev.markers) {
    try {
      m.remove();
    } catch {
      /* ignore */
    }
  }
}

function paintStations(
  map: MapLibreMap,
  visibleLineIds: readonly OsakaMetroLineId[],
): void {
  const prev = stateByMap.get(map);
  const zoomHandler = prev?.zoomHandler;
  const mode = visibilityMode(map.getZoom());

  if (
    prev &&
    prev.mode === mode &&
    prev.lineIds.join(",") === visibleLineIds.join(",")
  ) {
    return;
  }

  removeMarkersOnly(map);

  if (
    visibleLineIds.length === 0 ||
    mode === "none" ||
    typeof document === "undefined"
  ) {
    stateByMap.set(map, {
      markers: [],
      lineIds: visibleLineIds,
      mode,
      zoomHandler,
    });
    return;
  }

  const stations = stationsForVisibleLines(visibleLineIds, {
    hubsOnly: mode === "hubs",
  });

  const markers: Marker[] = [];
  for (const s of stations) {
    const el = buildStationEl(s);
    const marker = new Marker({ element: el, anchor: "top" })
      .setLngLat([s.lng, s.lat])
      .addTo(map);
    markers.push(marker);
  }

  stateByMap.set(map, {
    markers,
    lineIds: visibleLineIds,
    mode,
    zoomHandler,
  });
}

/**
 * Sync station name chips for visible metro lines (zoom-aware).
 */
export function syncOsakaMetroStationLabels(
  map: MapLibreMap,
  visibleLineIds: readonly OsakaMetroLineId[],
): void {
  if (visibleLineIds.length === 0) {
    clearStationMarkers(map);
    return;
  }

  const existing = stateByMap.get(map);
  if (!existing?.zoomHandler) {
    const zoomHandler = () => {
      const st = stateByMap.get(map);
      if (!st || st.lineIds.length === 0) return;
      paintStations(map, st.lineIds);
    };
    map.on("zoomend", zoomHandler);
    stateByMap.set(map, {
      markers: existing?.markers ?? [],
      lineIds: visibleLineIds,
      mode: existing?.mode ?? "none",
      zoomHandler,
    });
  } else {
    // Refresh stored line ids before paint
    stateByMap.set(map, {
      ...existing,
      lineIds: visibleLineIds,
    });
  }

  paintStations(map, visibleLineIds);
}
