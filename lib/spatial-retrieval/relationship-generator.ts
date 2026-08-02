/**
 * Relationship Generator — Anchor ↔ discovered entities
 */

import type {
  SpatialAnchorResolved,
  SpatialRelation,
  SpatialRelationEdge,
  SpatialRetrievedEntity,
} from "@/lib/spatial-retrieval/types";

export function generateSpatialRelations(input: {
  readonly anchor: SpatialAnchorResolved;
  readonly entities: readonly SpatialRetrievedEntity[];
  readonly relation: SpatialRelation;
}): readonly SpatialRelationEdge[] {
  return input.entities.map((e) => ({
    id: `rel_${input.anchor.entityId}_${e.entityId}_${input.relation}`,
    fromId: input.anchor.entityId,
    toId: e.entityId,
    relation: input.relation,
    meters: e.metersFromAnchor,
    walkMinutes: e.walkMinutes,
  }));
}
