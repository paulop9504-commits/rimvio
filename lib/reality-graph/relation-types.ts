/**
 * Reality Graph — Relation (edge) types.
 */

import type { RealityEntityId } from "@/lib/reality-graph/entity-types";

export const REALITY_RELATION_KINDS = [
  "LocatedNear",
  "PartOf",
  "UsedIn",
  "ConnectedTo",
  "ScheduledAt",
  "OwnedBy",
  "SimilarTo",
] as const;

export type RealityRelationKind = (typeof REALITY_RELATION_KINDS)[number];

export type RealityRelation = {
  readonly id: string;
  readonly kind: RealityRelationKind;
  readonly fromId: RealityEntityId;
  readonly toId: RealityEntityId;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly createdAtIso: string;
};

/** @deprecated alias — prefer RealityRelation */
export type Relation = RealityRelation;
