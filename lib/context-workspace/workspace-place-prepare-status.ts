/**
 * Workspace place ↔ prepared Operation (결재함 대기) lookup.
 * Matches enqueuePlacePrepToExecutionInbox operationId shape.
 */

import {
  listPreparedRealityOperations,
  readPreparedRealityOperation,
} from "@/lib/reality-queue/prepared-operations-store";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";

const AWAITING: ReadonlySet<string> = new Set(["pending", "ready"]);

export function workspacePlacePrepareOperationId(
  contextEventId: string,
  placeId: string,
): string {
  return `op:${contextEventId.trim()}:place:${placeId.trim()}`;
}

function isAwaitingStatus(status: string): boolean {
  return AWAITING.has(status);
}

/** Prepared lodging/place op waiting for Field approval (not yet committed). */
export function readWorkspacePlacePreparedOperation(input: {
  readonly contextEventId: string;
  readonly placeId: string;
  readonly nodeId?: string | null;
}): RealityOperationV1 | null {
  const ctx = input.contextEventId.trim();
  if (!ctx) return null;
  const candidates = [
    input.placeId.trim(),
    input.nodeId?.trim() ?? "",
  ].filter(Boolean);

  for (const placeId of candidates) {
    const direct = readPreparedRealityOperation(
      workspacePlacePrepareOperationId(ctx, placeId),
    );
    if (direct && isAwaitingStatus(direct.status)) {
      return direct;
    }
  }

  const placeSet = new Set(candidates);
  for (const op of listPreparedRealityOperations()) {
    if (op.contextEventId !== ctx || !isAwaitingStatus(op.status)) continue;
    const src = op.sourceRef?.trim() ?? "";
    const resource = op.preview?.resourceId?.trim() ?? "";
    if (
      placeSet.has(src) ||
      placeSet.has(resource) ||
      [...placeSet].some(
        (id) =>
          op.operationId.includes(`:place:${id}`) ||
          src.endsWith(id) ||
          src.includes(id),
      )
    ) {
      return op;
    }
  }
  return null;
}

export function isWorkspacePlaceAwaitingField(input: {
  readonly contextEventId: string;
  readonly placeId: string;
  readonly nodeId?: string | null;
}): boolean {
  return readWorkspacePlacePreparedOperation(input) != null;
}
