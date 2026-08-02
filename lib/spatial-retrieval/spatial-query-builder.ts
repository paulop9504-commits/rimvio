/**
 * Spatial Query Builder — Anchor + Intent → Query Spec
 */

import type {
  SpatialAnchorResolved,
  SpatialDiscoveryIntent,
  SpatialQuerySpec,
} from "@/lib/spatial-retrieval/types";

const DEFAULT_RADIUS_M = 1500;

export function buildSpatialQuery(input: {
  readonly intent: SpatialDiscoveryIntent;
  readonly anchor: SpatialAnchorResolved;
}): SpatialQuerySpec {
  const { intent, anchor } = input;
  const radiusMeters =
    intent.constraints.distance ??
    (intent.constraints.walkingTime != null
      ? intent.constraints.walkingTime * 80
      : DEFAULT_RADIUS_M);

  const center =
    anchor.lat != null && anchor.lng != null
      ? { lat: anchor.lat, lng: anchor.lng }
      : null;

  return {
    targetEntity: intent.targetEntity,
    relation: intent.relation,
    anchor,
    constraints: intent.constraints,
    center,
    radiusMeters,
  };
}
