/**
 * Osaka Metro line name labels — HTML markers (Hangul; MapLibre glyphs lack CJK).
 */

import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import {
  getOsakaMetroLineEntry,
  type OsakaMetroLineId,
} from "@/lib/geo/osaka-metro/line-catalog";

type MetroLabelState = {
  readonly markers: Marker[];
};

const labelStateByMap = new WeakMap<MapLibreMap, MetroLabelState>();

function clearMetroLineLabels(map: MapLibreMap): void {
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
  el.dataset.osakaMetroLineLabel = "1";
  el.textContent = input.shortLabelKo;
  el.style.cssText = [
    "pointer-events:none",
    "user-select:none",
    "white-space:nowrap",
    "font-size:11px",
    "font-weight:700",
    "letter-spacing:-0.02em",
    "line-height:1",
    `color:${input.color}`,
    "text-shadow:0 0 3px #fff,0 0 3px #fff,0 1px 2px rgba(255,255,255,0.95),0 -1px 2px rgba(255,255,255,0.95)",
  ].join(";");
  return el;
}

/**
 * Place short Korean line names on the map for visible metro lines.
 */
export function syncOsakaMetroLineLabels(
  map: MapLibreMap,
  visibleLineIds: readonly OsakaMetroLineId[],
): void {
  clearMetroLineLabels(map);
  if (visibleLineIds.length === 0 || typeof document === "undefined") {
    return;
  }

  const markers: Marker[] = [];
  for (const id of visibleLineIds) {
    const entry = getOsakaMetroLineEntry(id);
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
