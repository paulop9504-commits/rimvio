/**
 * Toss-style 2D Workspace map canvas — quiet paper, pins own attention.
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import { applyRimvioVectorMapCanvas } from "@/lib/globe/apply-rimvio-vector-map-canvas";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";

/** Extra Liberty layers that compete with Workspace pins. */
const TOSS_WORKSPACE_EXTRA_HIDDEN = [
  "housenumber",
  "place_label",
  "place_city",
  "place_town",
  "place_village",
  "place_other",
  "place_hamlet",
  "place_suburb",
  "airport_label",
  "rail_station_label",
  "transit_stop_label",
] as const;

function hideLayer(map: MapLibreMap, layerId: string): void {
  if (!map.getLayer(layerId)) {
    return;
  }
  map.setLayoutProperty(layerId, "visibility", "none");
}

function setPaint(
  map: MapLibreMap,
  layerId: string,
  property: string,
  value: unknown,
): void {
  if (!map.getLayer(layerId)) {
    return;
  }
  map.setPaintProperty(layerId, property, value);
}

/**
 * Apply Rimvio quiet canvas + Toss Workspace polish
 * (hide POI/place labels, softer land paper).
 */
export function applyTossWorkspaceMapCanvas(map: MapLibreMap): void {
  applyRimvioVectorMapCanvas(map);

  setPaint(map, "background", "background-color", GLOBE_TOSS_THEME.shellBg);
  setPaint(map, "water", "fill-color", "#d9e8f5");
  setPaint(map, "building", "fill-opacity", 0.45);
  setPaint(map, "building-3d", "fill-extrusion-opacity", 0.38);

  for (const layerId of TOSS_WORKSPACE_EXTRA_HIDDEN) {
    hideLayer(map, layerId);
  }

  // Hide any leftover POI / place / shield symbol layers by id pattern.
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    if (
      id.startsWith("poi") ||
      id.startsWith("place_") ||
      id.includes("shield") ||
      id.includes("housenumber") ||
      id.includes("housenum")
    ) {
      hideLayer(map, id);
    }
  }
}
