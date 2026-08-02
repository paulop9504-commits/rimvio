/**
 * MapLibre Evidence / Explore highlight — edge spokes + optional multi-node fit.
 */

import type { Map as MapLibreMap } from "maplibre-gl";

export const WORKSPACE_EVIDENCE_SOURCE_ID = "rimvio-workspace-evidence";
export const WORKSPACE_EVIDENCE_LAYER_ID = "rimvio-workspace-evidence-line";

export type WorkspaceEvidenceHighlight = {
  readonly evidenceId: string;
  readonly focusNodeId: string | null;
  /** LineString [lng, lat][] — distance / route edge */
  readonly lineCoords: readonly [number, number][] | null;
  /** Explore: multiple spokes from object */
  readonly lineCoordsList?: readonly (readonly [number, number][])[] | null;
  /** Nodes to emphasize (camera fit / marker ring) */
  readonly highlightNodeIds?: readonly string[] | null;
  readonly mode: "edge" | "node" | "route" | "self" | "explore";
};

function collectLines(
  highlight: WorkspaceEvidenceHighlight | null,
): [number, number][][] {
  if (!highlight) return [];
  const list: [number, number][][] = [];
  if (highlight.lineCoordsList) {
    for (const line of highlight.lineCoordsList) {
      if (line.length >= 2) {
        list.push(line.map(([lng, lat]) => [lng, lat]));
      }
    }
  }
  if (highlight.lineCoords && highlight.lineCoords.length >= 2) {
    list.push(highlight.lineCoords.map(([lng, lat]) => [lng, lat]));
  }
  return list;
}

export function syncWorkspaceEvidenceHighlight(
  map: MapLibreMap,
  highlight: WorkspaceEvidenceHighlight | null,
): void {
  const lines = collectLines(highlight);
  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: lines.map((coordinates, i) => ({
      type: "Feature",
      properties: {
        evidenceId: highlight?.evidenceId ?? "",
        i,
      },
      geometry: {
        type: "LineString",
        coordinates,
      },
    })),
  };

  const source = map.getSource(WORKSPACE_EVIDENCE_SOURCE_ID) as
    | { setData: (data: GeoJSON.FeatureCollection) => void }
    | undefined;

  if (source) {
    source.setData(geojson);
  } else {
    map.addSource(WORKSPACE_EVIDENCE_SOURCE_ID, {
      type: "geojson",
      data: geojson,
    });
    if (!map.getLayer(WORKSPACE_EVIDENCE_LAYER_ID)) {
      map.addLayer({
        id: WORKSPACE_EVIDENCE_LAYER_ID,
        type: "line",
        source: WORKSPACE_EVIDENCE_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#3182f6",
          "line-width": 4,
          "line-opacity": 0.92,
          "line-dasharray": [1.2, 1.6],
        },
      });
    }
  }

  const pts: [number, number][] = [];
  for (const line of lines) {
    for (const c of line) pts.push(c);
  }
  if (pts.length >= 2) {
    try {
      const lngs = pts.map((c) => c[0]);
      const lats = pts.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 72, maxZoom: 16, duration: 650 },
      );
    } catch {
      /* ignore fit errors */
    }
  }
}
