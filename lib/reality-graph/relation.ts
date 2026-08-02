/**
 * Reality Graph Relation API.
 *
 * Relation kinds:
 *   LocatedNear · PartOf · ConnectedTo · UsedIn · SimilarTo
 *   (+ ScheduledAt · OwnedBy — existing)
 *
 * Edges are SSOT in graph-store; this module is the Relation-facing facade.
 */

import type { RealityEntityId } from "@/lib/reality-graph/entity-types";
import type {
  RealityRelation,
  RealityRelationKind,
} from "@/lib/reality-graph/relation-types";
import { REALITY_RELATION_KINDS } from "@/lib/reality-graph/relation-types";
import { addRealityRelation } from "@/lib/reality-graph/graph-store";

export type { RealityRelation, RealityRelationKind };
export { REALITY_RELATION_KINDS };

/** STEP 3 primary relation vocabulary */
export const CORE_REALITY_RELATIONS = [
  "LocatedNear",
  "PartOf",
  "ConnectedTo",
  "UsedIn",
  "SimilarTo",
] as const;

export type CoreRealityRelationKind = (typeof CORE_REALITY_RELATIONS)[number];

export function createRelation(input: {
  readonly kind: RealityRelationKind;
  readonly fromId: RealityEntityId;
  readonly toId: RealityEntityId;
  readonly properties?: Readonly<Record<string, unknown>>;
}): RealityRelation {
  const rel = addRealityRelation(input);
  if (!rel) {
    throw new Error(
      `Reality Graph: cannot create relation ${input.kind} (${input.fromId} → ${input.toId}) — entities missing`,
    );
  }
  return rel;
}

export function relateLocatedNear(
  fromId: RealityEntityId,
  toId: RealityEntityId,
  meters?: number,
): RealityRelation {
  return createRelation({
    kind: "LocatedNear",
    fromId,
    toId,
    properties: meters != null ? { meters } : {},
  });
}

export function relatePartOf(
  childId: RealityEntityId,
  parentId: RealityEntityId,
): RealityRelation {
  return createRelation({
    kind: "PartOf",
    fromId: childId,
    toId: parentId,
  });
}

export function relateConnectedTo(
  fromId: RealityEntityId,
  toId: RealityEntityId,
  labelKo?: string,
): RealityRelation {
  return createRelation({
    kind: "ConnectedTo",
    fromId,
    toId,
    properties: labelKo ? { labelKo } : {},
  });
}

export function relateUsedIn(
  entityId: RealityEntityId,
  contextEntityId: RealityEntityId,
): RealityRelation {
  return createRelation({
    kind: "UsedIn",
    fromId: entityId,
    toId: contextEntityId,
  });
}

export function relateSimilarTo(
  fromId: RealityEntityId,
  toId: RealityEntityId,
): RealityRelation {
  return createRelation({
    kind: "SimilarTo",
    fromId,
    toId,
  });
}
