/**
 * Workspace Projection — Entity → map pins
 */

import type {
  SpatialAnchorResolved,
  SpatialProjectionPin,
  SpatialRetrievedEntity,
} from "@/lib/spatial-retrieval/types";

export function projectSpatialPins(input: {
  readonly anchor: SpatialAnchorResolved;
  readonly entities: readonly SpatialRetrievedEntity[];
}): readonly SpatialProjectionPin[] {
  const pins: SpatialProjectionPin[] = [];
  if (input.anchor.lat != null && input.anchor.lng != null) {
    pins.push({
      entityId: input.anchor.entityId,
      titleKo: input.anchor.titleKo,
      kind: input.anchor.kind,
      lat: input.anchor.lat,
      lng: input.anchor.lng,
      role: "anchor",
    });
  }
  for (const e of input.entities) {
    pins.push({
      entityId: e.entityId,
      titleKo: e.titleKo,
      kind: e.kind,
      lat: e.lat,
      lng: e.lng,
      role: "discovered",
    });
  }
  return pins;
}
