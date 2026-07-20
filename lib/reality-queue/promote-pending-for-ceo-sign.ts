/**
 * CEO Sign one-tap — promote pending prepared ops to ready, then Commit may fire.
 * Human click on 「반영하기」 is the approval; separate Reflect taps are optional.
 */

import { reflectRealityOperation } from "@/lib/reality-queue/operation-actions";
import type { RealityQueueItemV1 } from "@/lib/reality-queue/types";

/**
 * Reflect every pending prepared Operation so canCommit opens in one CEO Sign.
 */
export function promotePendingPreparedOpsForCeoSign(
  items: readonly RealityQueueItemV1[],
): number {
  let count = 0;
  for (const item of items) {
    if (
      item.status === "pending" &&
      item.operationId.startsWith("op:") &&
      item.kind !== "trade"
    ) {
      const next = reflectRealityOperation(item);
      if (next) {
        count += 1;
      }
    }
  }
  return count;
}
