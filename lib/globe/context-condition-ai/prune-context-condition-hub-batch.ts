import type { EventCandidate } from "@/lib/events/event-candidate";
import { commitLodgingInventoryToEvent } from "@/lib/globe/context-hub/commit-lodging-inventory";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { commitEateryInventoryToEvent } from "@/lib/globe/eatery/commit-eatery-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import {
  findContextConditionPinBatch,
  removeContextConditionPinBatch,
} from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import { pruneInventoryRowsByPlaceIds } from "@/lib/globe/context-condition-ai/merge-context-hub-inventory-rows";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { findLifeEventCandidate } from "@/lib/life-read-model";

/** Remove batch pins + hub inventory rows introduced by that batch. */
export function pruneContextConditionHubBatch(input: {
  contextEventId: string;
  batchId: string;
}): EventCandidate | null {
  const contextEventId = input.contextEventId.trim();
  const batchId = input.batchId.trim();
  const event = findLifeEventCandidate(contextEventId);
  if (!event) {
    return null;
  }
  const batch = findContextConditionPinBatch(event, batchId);
  if (!batch) {
    return null;
  }

  const removeIds = new Set([
    ...batch.lodgingPlaceIds,
    ...batch.eateryPlaceIds,
  ]);
  let next = event;

  if (batch.lodgingPlaceIds.length > 0) {
    const pruned = pruneInventoryRowsByPlaceIds(
      readLodgingInventoryRows(next),
      removeIds,
    );
    next = commitLodgingInventoryToEvent({
      event: next,
      inventory: pruned,
    });
  }

  if (batch.eateryPlaceIds.length > 0) {
    const pruned = pruneInventoryRowsByPlaceIds(
      readEateryInventoryRows(next),
      removeIds,
    );
    next = commitEateryInventoryToEvent({
      event: next,
      inventory: pruned,
    });
  }

  const nowIso = new Date().toISOString();
  const metadata = removeContextConditionPinBatch(next, batchId);
  return commitEventUpsert({
    id: next.id,
    title: next.title,
    category: next.category,
    source: next.source,
    lifecycle: next.lifecycle,
    datetime: next.datetime,
    place: next.place,
    description: next.description,
    metadata,
    confidence: next.confidence,
    lifecycleUpdatedAt: nowIso,
    updatedAt: nowIso,
  });
}
