import type { ContextConditionLastBatchWire } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import {
  clearContextConditionLastBatch,
  readContextConditionLastBatch,
  writeContextConditionLastBatch,
} from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import {
  activateDiscoveryExecutionSnapshot,
  archiveDiscoveryExecutionSnapshot,
  listDiscoveryExecutionSnapshots,
  readDiscoveryExecutionSnapshot,
  type DiscoveryExecutionSnapshot,
} from "@/lib/globe/discovery-execution/discovery-execution-archive";

/**
 * Active discovery surface SSOT (Cursor-like: one prompt = one execution).
 * Wire: lastBatch slot · archive holds superseded runs.
 */
export function readActiveDiscoveryExecution(
  contextEventId: string,
): DiscoveryExecutionSnapshot | null {
  return readContextConditionLastBatch(contextEventId);
}

export function writeActiveDiscoveryExecution(
  contextEventId: string,
  snapshot: DiscoveryExecutionSnapshot,
  options?: { archivePrior?: boolean },
): void {
  const archivePrior = options?.archivePrior !== false;
  const prior = readContextConditionLastBatch(contextEventId);
  if (
    archivePrior &&
    prior?.batchId &&
    prior.batchId !== snapshot.batchId
  ) {
    archiveDiscoveryExecutionSnapshot(contextEventId, prior);
  }
  writeContextConditionLastBatch(contextEventId, snapshot);
}

export function clearActiveDiscoveryExecution(contextEventId: string): void {
  clearContextConditionLastBatch(contextEventId);
}

export type { DiscoveryExecutionSnapshot, ContextConditionLastBatchWire };
export {
  activateDiscoveryExecutionSnapshot,
  archiveDiscoveryExecutionSnapshot,
  listDiscoveryExecutionSnapshots,
  readDiscoveryExecutionSnapshot,
};
