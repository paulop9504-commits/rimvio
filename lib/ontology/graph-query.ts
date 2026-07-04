import {
  isEdgeActiveForRecall,
  readArchivedEventIdSet,
} from "@/lib/ontology/filter-active-edge-evidence";
import { readEntityGraphSnapshot } from "@/lib/ontology/edge-store";
import type { EntityEdge, EntityEdgeKind } from "@/lib/ontology/edge-types";
import type { RimvioEntityId } from "@/lib/ontology/entity-types";

export type EntityNeighborQuery = {
  entityId: RimvioEntityId;
  kind?: EntityEdgeKind;
  minWeight?: number;
  /** Exclude edges whose evidence is only from archived events. */
  recallSafe?: boolean;
};

/** 1-hop neighbors — read-time filters archived event evidence when recallSafe (default true). */
export function queryEntityNeighbors(
  input: EntityNeighborQuery,
): EntityEdge[] {
  const recallSafe = input.recallSafe !== false;
  const archivedIds = recallSafe ? readArchivedEventIdSet() : new Set<string>();
  const minWeight = input.minWeight ?? 0;
  const snapshot = readEntityGraphSnapshot();

  return snapshot.edges.filter((edge) => {
    if (edge.fromEntityId !== input.entityId && edge.toEntityId !== input.entityId) {
      return false;
    }
    if (input.kind && edge.kind !== input.kind) {
      return false;
    }
    if (recallSafe && !isEdgeActiveForRecall(edge, archivedIds)) {
      return false;
    }
  return edge.weight >= minWeight;
  });
}

export { readArchivedEventIdSet };
