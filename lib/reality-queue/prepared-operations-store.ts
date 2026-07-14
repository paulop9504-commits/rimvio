/**
 * Session-backed prepared Operations — AI artifacts before Reality Commit.
 * Merged into Reality Control snapshot (not personal ontology).
 */

import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import { asQueueItem } from "@/lib/reality-queue/types";

const EVENT_NAME = "rimvio-reality-operations";

const operations = new Map<string, RealityOperationV1>();

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function listPreparedRealityOperations(): readonly RealityOperationV1[] {
  return [...operations.values()].sort((a, b) =>
    (a.expiresAtIso ?? "").localeCompare(b.expiresAtIso ?? ""),
  );
}

export function readPreparedRealityOperation(
  operationId: string,
): RealityOperationV1 | null {
  return operations.get(operationId.trim()) ?? null;
}

export function upsertPreparedRealityOperation(
  operation: RealityOperationV1,
): void {
  operations.set(operation.operationId, operation);
  emit();
}

export function upsertPreparedRealityOperations(
  rows: readonly RealityOperationV1[],
): void {
  for (const row of rows) {
    operations.set(row.operationId, row);
  }
  emit();
}

export function deletePreparedRealityOperation(operationId: string): void {
  const id = operationId.trim();
  if (!id || !operations.has(id)) {
    return;
  }
  operations.delete(id);
  emit();
}

export function clearPreparedRealityOperations(): void {
  operations.clear();
  emit();
}

export function subscribePreparedRealityOperations(
  listener: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

export function preparedOperationsAsQueueItems() {
  return listPreparedRealityOperations().map(asQueueItem);
}
