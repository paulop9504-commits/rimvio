/**
 * Pending Operation actions — Reflect promotes, Delete holds, never L5 alone.
 */

import { holdRealityQueueItems, releaseRealityQueueItem } from "@/lib/reality-queue/reality-queue-hold-store";
import {
  deletePreparedRealityOperation,
  readPreparedRealityOperation,
  upsertPreparedRealityOperation,
} from "@/lib/reality-queue/prepared-operations-store";
import type { RealityOperationV1, RealityQueueItemV1 } from "@/lib/reality-queue/types";

/** Reflect = user reviewed Diff → mark ready for Commit. */
export function reflectRealityOperation(item: RealityQueueItemV1): RealityOperationV1 | null {
  const prepared = readPreparedRealityOperation(item.operationId);
  if (prepared) {
    const next: RealityOperationV1 = {
      ...prepared,
      status: "ready",
    };
    upsertPreparedRealityOperation(next);
    releaseRealityQueueItem(item.itemId);
    return next;
  }
  // Plan-derived items: can't mutate plan step here — hold release only.
  releaseRealityQueueItem(item.itemId);
  return null;
}

/** Delete = remove prepared Op or hold plan row out of queue. */
export function deleteRealityOperation(item: RealityQueueItemV1): void {
  if (item.operationId.startsWith("op:")) {
    deletePreparedRealityOperation(item.operationId);
    return;
  }
  holdRealityQueueItems([item.itemId]);
}
