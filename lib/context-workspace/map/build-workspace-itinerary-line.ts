/**
 * Primary itinerary LineString coords from Workspace node order (lng, lat).
 */

export type ItineraryLinePoint = {
  readonly id: string;
  readonly lat: number;
  readonly lng: number;
  readonly visible?: boolean;
};

/** Visible nodes in list order → MapLibre LineString coordinates. */
export function buildWorkspaceItineraryLineCoords(
  nodes: readonly ItineraryLinePoint[],
): [number, number][] {
  const coords: [number, number][] = [];
  for (const n of nodes) {
    if (n.visible === false) continue;
    if (!Number.isFinite(n.lat) || !Number.isFinite(n.lng)) continue;
    coords.push([n.lng, n.lat]);
  }
  return coords.length >= 2 ? coords : [];
}

export const WORKSPACE_ITINERARY_SOURCE_ID = "rimvio-workspace-itinerary";
export const WORKSPACE_ITINERARY_LAYER_ID = "rimvio-workspace-itinerary-line";
