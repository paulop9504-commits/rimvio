/**
 * Reality Entity + Relationship converter.
 *
 * Google Result list → Reality Graph (Anchor ─relation─ Targets).
 * Never return bare POI lists as product SSOT.
 */

import type {
  SpatialAnchorResolved,
  SpatialRealityEntity,
  SpatialRealityRelationship,
  SpatialRelation,
  SpatialRelationEdge,
  SpatialRetrievedEntity,
} from "@/lib/spatial-retrieval/types";

export function toRealityEntityFromAnchor(
  anchor: SpatialAnchorResolved,
  contextId: string,
): SpatialRealityEntity {
  return {
    id: anchor.entityId,
    type: anchor.kind,
    location: { lat: anchor.lat, lng: anchor.lng },
    attributes: {
      titleKo: anchor.titleKo || anchor.labelKo,
    },
    contextLinks: [contextId],
  };
}

export function toRealityEntityFromRetrieved(
  e: SpatialRetrievedEntity,
  contextId: string,
  anchorId: string,
): SpatialRealityEntity {
  return {
    id: e.entityId,
    type: e.kind,
    location: { lat: e.lat, lng: e.lng },
    attributes: {
      titleKo: e.titleKo,
      rating: e.rating ?? null,
      budgetBand: e.budgetBand ?? null,
      scheduleTags: e.scheduleTags,
      contextScore: e.contextScore?.total,
    },
    contextLinks: [contextId, anchorId],
  };
}

export function buildRealityEntities(input: {
  readonly anchor: SpatialAnchorResolved;
  readonly entities: readonly SpatialRetrievedEntity[];
  readonly contextId: string;
}): readonly SpatialRealityEntity[] {
  const nodes: SpatialRealityEntity[] = [
    toRealityEntityFromAnchor(input.anchor, input.contextId),
  ];
  for (const e of input.entities) {
    nodes.push(
      toRealityEntityFromRetrieved(e, input.contextId, input.anchor.entityId),
    );
  }
  return nodes;
}

export function toRealityRelationship(input: {
  readonly fromId: string;
  readonly toId: string;
  readonly type: SpatialRelation;
  readonly distance: number | null;
  readonly walkingTime: number | null;
}): SpatialRealityRelationship {
  return {
    from: input.fromId,
    to: input.toId,
    type: input.type,
    metadata: {
      distance: input.distance,
      walkingTime: input.walkingTime,
    },
  };
}

export function generateSpatialRelations(input: {
  readonly anchor: SpatialAnchorResolved;
  readonly entities: readonly SpatialRetrievedEntity[];
  readonly relation: SpatialRelation;
}): readonly SpatialRelationEdge[] {
  return input.entities.map((e) => {
    const reality = toRealityRelationship({
      fromId: input.anchor.entityId,
      toId: e.entityId,
      type: input.relation,
      distance: e.metersFromAnchor,
      walkingTime: e.walkMinutes,
    });
    return {
      id: `rel_${input.anchor.entityId}_${e.entityId}_${input.relation}`,
      fromId: input.anchor.entityId,
      toId: e.entityId,
      relation: input.relation,
      meters: e.metersFromAnchor,
      walkMinutes: e.walkMinutes,
      reality,
    };
  });
}

export function extractRealityRelationships(
  edges: readonly SpatialRelationEdge[],
): readonly SpatialRealityRelationship[] {
  return edges.map((e) => e.reality);
}

/** ASCII Reality Graph sketch for logs / smoke. */
export function formatRealityGraphSketch(input: {
  readonly anchorLabel: string;
  readonly relation: SpatialRelation;
  readonly targets: readonly string[];
}): string {
  const lines = [`🏨 ${input.anchorLabel}`, ""];
  if (input.targets.length === 0) {
    lines.push("(no discovered entities)");
    return lines.join("\n");
  }
  lines.push(" |");
  lines.push(" |");
  lines.push(` ${capitalizeRelation(input.relation)}`);
  lines.push(" |");
  lines.push(" |");
  lines.push("");
  for (const t of input.targets) {
    lines.push(`🍣 ${t}`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function capitalizeRelation(r: SpatialRelation): string {
  if (r === "nearby") return "Nearby";
  if (r === "walking_distance") return "Walking Distance";
  if (r === "route_along") return "Route Along";
  if (r === "same_area") return "Same Area";
  if (r === "inside") return "Inside";
  return r;
}
