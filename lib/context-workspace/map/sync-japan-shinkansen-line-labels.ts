/**
 * Japan Shinkansen line name labels — HTML markers (Hangul-safe).
 */

import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import {
  getJapanShinkansenLineEntry,
  type JapanShinkansenLineId,
} from "@/lib/geo/japan-shinkansen/line-catalog";

type LabelState = {
  readonly markers: Marker[];
};

const labelStateByMap = new WeakMap<MapLibreMap, LabelState>();

function clearLabels(map: MapLibreMap): void {
  const prev = labelStateByMap.get(map);
  if (!prev) return;
  for (const m of prev.markers) {
    try {
      m.remove();
    } catch {
      /* ignore */
    }
  }
  labelStateByMap.delete(map);
}

function buildLabelEl(input: {
  readonly shortLabelKo: string;
  readonly color: string;
}): HTMLDivElement {
  const el = document.createElement("div");
  el.dataset.japanShinkansenLineLabel = "1";
  el.textContent = input.shortLabelKo;
  el.style.cssText = [
    "pointer-events:none",
    "user-select:none",
    "white-space:nowrap",
    "font-size:11px",
    "font-weight:800",
    "letter-spacing:-0.02em",
    "line-height:1",
    `color:${input.color}`,
    "padding:2px 5px",
    "border-radius:5px",
    "background:rgba(255,255,255,0.9)",
    "box-shadow:0 1px 4px rgba(25,31,40,0.14)",
  ].join(";");
  return el;
}

export function syncJapanShinkansenLineLabels(
  map: MapLibreMap,
  visibleLineIds: readonly JapanShinkansenLineId[],
): void {
  clearLabels(map);
  if (visibleLineIds.length === 0 || typeof document === "undefined") {
    return;
  }

  const markers: Marker[] = [];
  for (const id of visibleLineIds) {
    const entry = getJapanShinkansenLineEntry(id);
    if (!entry) continue;
    const el = buildLabelEl({
      shortLabelKo: entry.shortLabelKo,
      color: entry.color,
    });
    const marker = new Marker({ element: el, anchor: "center" })
      .setLngLat([entry.labelAnchor[0], entry.labelAnchor[1]])
      .addTo(map);
    markers.push(marker);
  }
  labelStateByMap.set(map, { markers });
}
