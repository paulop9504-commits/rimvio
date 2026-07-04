import { MEANING_EDGE_KINDS, type MeaningEdgeKind } from "@/lib/meaning/meaning-types";
import type { RimvioEntityId } from "@/lib/ontology/entity-types";

/** Phase 1 extension kinds — commit-time entity graph edges beyond meaning buckets. */
export const ENTITY_EDGE_EXTENSION_KINDS = [
  "co_occurrence",
  "thread_mention",
  "capture_belongs",
] as const;

export type EntityEdgeExtensionKind =
  (typeof ENTITY_EDGE_EXTENSION_KINDS)[number];

/** Phase 2 — Market / Bridge / External relationship kinds (approved 2026-07). */
export const ENTITY_EDGE_KINDS_PHASE2_RESERVED = [
  "trade_partner",
  "co_participant",
  "gathering_link",
] as const;

export type EntityEdgeKindPhase2Reserved =
  (typeof ENTITY_EDGE_KINDS_PHASE2_RESERVED)[number];

export const ENTITY_EDGE_KINDS = [
  ...MEANING_EDGE_KINDS,
  ...ENTITY_EDGE_EXTENSION_KINDS,
  ...ENTITY_EDGE_KINDS_PHASE2_RESERVED,
] as const;

export type EntityEdgeKind =
  | MeaningEdgeKind
  | EntityEdgeExtensionKind
  | EntityEdgeKindPhase2Reserved;

export type EntityEdgeEvidence =
  | { type: "event"; id: string }
  | { type: "capture"; id: string }
  | { type: "trade"; id: string }
  | { type: "bridge"; id: string }
  | { type: "gathering"; id: string };

export const ENTITY_GRAPH_CONTRACT_VERSION = 1 as const;

export type EntityEdge = {
  id: string;
  kind: EntityEdgeKind;
  fromEntityId: RimvioEntityId;
  toEntityId: RimvioEntityId;
  /** 0–100 composite — derived at materialize / merge time. */
  weight: number;
  /** Required — empty evidence must not be persisted. */
  evidence: readonly EntityEdgeEvidence[];
  createdAt: string;
  updatedAt: string;
};

export type EntityGraphSnapshot = {
  version: typeof ENTITY_GRAPH_CONTRACT_VERSION;
  edges: readonly EntityEdge[];
  updatedAt: string;
};

export const EMPTY_ENTITY_GRAPH_SNAPSHOT: EntityGraphSnapshot = {
  version: ENTITY_GRAPH_CONTRACT_VERSION,
  edges: [],
  updatedAt: new Date(0).toISOString(),
};

export function entityEdgeEvidenceKey(row: EntityEdgeEvidence): string {
  return `${row.type}:${row.id}`;
}

export function mergeEntityEdgeEvidence(
  left: readonly EntityEdgeEvidence[],
  right: readonly EntityEdgeEvidence[],
): EntityEdgeEvidence[] {
  const map = new Map<string, EntityEdgeEvidence>();
  for (const row of [...left, ...right]) {
    map.set(entityEdgeEvidenceKey(row), row);
  }
  return [...map.values()];
}
