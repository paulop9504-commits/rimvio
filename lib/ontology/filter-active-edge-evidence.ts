import type { EntityEdge } from "@/lib/ontology/edge-types";
import { listLifeEventCandidates } from "@/lib/life-read-model";

/** Active evidence for recall — drops event ids whose lifecycle is archived. */
export function filterEdgeEvidenceForRecall(
  edge: EntityEdge,
  archivedEventIds: ReadonlySet<string> = readArchivedEventIdSet(),
): EntityEdge["evidence"] {
  return edge.evidence.filter(
    (row) => row.type !== "event" || !archivedEventIds.has(row.id),
  );
}

export function isEdgeActiveForRecall(
  edge: EntityEdge,
  archivedEventIds: ReadonlySet<string> = readArchivedEventIdSet(),
): boolean {
  return filterEdgeEvidenceForRecall(edge, archivedEventIds).length > 0;
}

export function readArchivedEventIdSet(): Set<string> {
  return new Set(
    listLifeEventCandidates()
      .filter((row) => row.lifecycle === "archived")
      .map((row) => row.id),
  );
}
