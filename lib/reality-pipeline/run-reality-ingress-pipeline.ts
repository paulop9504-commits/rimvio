/**
 * Reality Execution pipeline — NL → Projection → Explorer → Execution Inbox (prepare only).
 * Never auto-Commits. Single orchestrator for ingress + place prep refresh.
 */

import { compileRealityProjection } from "@/lib/projection-engine/compile-reality-projection";
import { buildRealityExplorer } from "@/lib/reality-explorer/build-reality-explorer";
import { enqueueTravelPrepareOperations } from "@/lib/reality-queue/enqueue-travel-prepare-operations";
import { listPreparedRealityOperations } from "@/lib/reality-queue/prepared-operations-store";
import { asQueueItem, type RealityQueueItemV1 } from "@/lib/reality-queue/types";
import {
  readRealityPipelineSnapshot,
  REALITY_PIPELINE_VERSION,
  writeRealityPipelineSnapshot,
  type RealityPipelineSnapshotV1,
} from "@/lib/reality-pipeline/reality-pipeline-store";

function preparedItemsForContext(contextEventId: string): readonly RealityQueueItemV1[] {
  const id = contextEventId.trim();
  return listPreparedRealityOperations()
    .filter((op) => op.contextEventId?.trim() === id)
    .map(asQueueItem);
}

export function hasPreparedOpsForContext(contextEventId: string): boolean {
  return preparedItemsForContext(contextEventId).length > 0;
}

function buildExplorerSnapshot(input: {
  utterance: string;
  destinationLabelKo: string | null;
  projectId: string;
  contextEventId: string;
}): ReturnType<typeof buildRealityExplorer> {
  return buildRealityExplorer({
    utterance: input.utterance,
    projectId: input.projectId,
    destinationLabelKo: input.destinationLabelKo,
    executionItems: preparedItemsForContext(input.contextEventId),
  });
}

/**
 * Compile projection + explorer and optionally seed travel prepare pack into Inbox.
 */
export function runRealityIngressPipeline(input: {
  contextEventId: string;
  utterance: string;
  destinationLabelKo?: string | null;
  contextLabelKo?: string | null;
  /** Default true for travel — skips when ops already exist for this context. */
  seedExecutionInbox?: boolean;
}): RealityPipelineSnapshotV1 {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  const destinationLabelKo = input.destinationLabelKo?.trim() || null;

  const projection = compileRealityProjection({
    utterance,
    destinationLabel: destinationLabelKo,
    stage: "WAIT_COMMIT",
  });

  const shouldSeed =
    input.seedExecutionInbox !== false &&
    projection.project.kind === "travel" &&
    !hasPreparedOpsForContext(contextEventId);

  if (shouldSeed) {
    enqueueTravelPrepareOperations({
      contextEventId,
      contextLabelKo:
        input.contextLabelKo?.trim() || projection.project.titleKo,
      destinationLabelKo:
        destinationLabelKo ||
        projection.project.titleKo.replace(/\s*Trip$/iu, "").trim() ||
        "여행지",
    });
  }

  const explorer = buildExplorerSnapshot({
    utterance,
    destinationLabelKo,
    projectId: projection.project.id,
    contextEventId,
  });

  const snapshot: RealityPipelineSnapshotV1 = {
    version: REALITY_PIPELINE_VERSION,
    contextEventId,
    utterance,
    destinationLabelKo,
    projection,
    explorer,
    seededAtIso: new Date().toISOString(),
  };

  writeRealityPipelineSnapshot(snapshot);
  return snapshot;
}

/** Rebuild explorer branch from current prepared ops (place add / reflect). */
export function refreshRealityPipelineExplorer(
  contextEventId: string,
): RealityPipelineSnapshotV1 | null {
  const existing = readRealityPipelineSnapshot(contextEventId);
  if (!existing) {
    return null;
  }
  const explorer = buildExplorerSnapshot({
    utterance: existing.utterance,
    destinationLabelKo: existing.destinationLabelKo,
    projectId: existing.projection.project.id,
    contextEventId: existing.contextEventId,
  });
  const next: RealityPipelineSnapshotV1 = {
    ...existing,
    explorer,
    seededAtIso: new Date().toISOString(),
  };
  writeRealityPipelineSnapshot(next);
  return next;
}

/** After a single op enqueue — ensure pipeline row exists and explorer matches inbox. */
export function syncRealityPipelineAfterOperationChange(input: {
  contextEventId: string;
  utterance: string;
  destinationLabelKo?: string | null;
  contextLabelKo?: string | null;
}): RealityPipelineSnapshotV1 {
  const refreshed = refreshRealityPipelineExplorer(input.contextEventId);
  if (refreshed) {
    return refreshed;
  }
  return runRealityIngressPipeline({
    ...input,
    seedExecutionInbox: false,
  });
}
