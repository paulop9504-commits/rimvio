/**
 * MapLibre Evidence highlight — edge / route line while Observe Evidence is active.
 */

import type { Map as MapLibreMap } from "maplibre-gl";

export const WORKSPACE_EVIDENCE_SOURCE_ID = "rimvio-workspace-evidence";
export const WORKSPACE_EVIDENCE_LAYER_ID = "rimvio-workspace-evidence-line";

export type WorkspaceEvidenceHighlight = {
  readonly evidenceId: string;
  readonly focusNodeId: string | null;
  /** LineString [lng, lat][] — distance / route edge */
  readonly lineCoords: readonly [number, number][] | null;
  readonly mode: "edge" | "node" | "route" | "self";
};

export function syncWorkspaceEvidenceHighlight(
  map: MapLibreMap,
  highlight: WorkspaceEvidenceHighlight | null,
): void {
  const coords = highlight?.lineCoords ?? [];
  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features:
      coords.length >= 2
        ? [
            {
              type: "Feature",
              properties: {
                evidenceId: highlight?.evidenceId ?? "",
              },
              geometry: {
                type: "LineString",
                coordinates: coords.map(([lng, lat]) => [lng, lat]),
              },
            },
          ]
        : [],
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

  if (coords.length >= 2) {
    try {
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 72, maxZoom: 16, duration: 650 },
      );
    } catch {
      /* ignore fit errors */
    }
  }
}
