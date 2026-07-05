import type { EventCandidate } from "@/lib/events/event-candidate";
import { commitLodgingInventoryToEvent } from "@/lib/globe/context-hub/commit-lodging-inventory";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import type {
  ContextLodgingInventoryRow,
  LodgingRecommendScoreWire,
} from "@/lib/globe/context-hub/lodging-resource-types";
import { commitEateryInventoryToEvent } from "@/lib/globe/eatery/commit-eatery-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import type {
  ContextEateryInventoryRow,
  EateryRecommendScoreWire,
} from "@/lib/globe/eatery/eatery-resource-types";
import {
  appendContextConditionPinBatch,
  type ContextConditionPinBatchRecord,
} from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import { mergeEateryInventoryRows, mergeLodgingInventoryRows } from "@/lib/globe/context-condition-ai/merge-context-hub-inventory-rows";
import { writeEateryRecommendReasons } from "@/lib/globe/eatery/eatery-recommendation-reason-store";
import { writeLodgingRecommendReasons } from "@/lib/globe/lodging/lodging-recommendation-reason-store";
import { readLodgingRecommendReasonsForEvent } from "@/lib/globe/lodging/lodging-recommendation-reason-store";
import { readEateryRecommendReasonsForEvent } from "@/lib/globe/eatery/eatery-recommendation-reason-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import type { ScoredLodgingRecommendation } from "@/lib/globe/lodging/score-lodging-recommendations";
import type { ScoredEateryRecommendation } from "@/lib/globe/eatery/score-eatery-recommendations";

export type CommitContextConditionHubBatchInput = {
  event: EventCandidate;
  batchId: string;
  lodgingRows: readonly ContextLodgingInventoryRow[];
  eateryRows: readonly ContextEateryInventoryRow[];
  lodgingScored: readonly ScoredLodgingRecommendation[];
  eateryScored: readonly ScoredEateryRecommendation[];
  lodgingSource?: string | null;
  eaterySource?: string | null;
  now?: Date;
};

/** Merge hub inventory + batch metadata so map markers and focus cards resolve. */
export function commitContextConditionHubBatch(
  input: CommitContextConditionHubBatchInput,
): EventCandidate {
  const nowIso = (input.now ?? new Date()).toISOString();
  let event = input.event;

  if (input.lodgingRows.length > 0) {
    const mergedLodging = mergeLodgingInventoryRows(
      readLodgingInventoryRows(event),
      input.lodgingRows,
    );
    const lodgingScoreWire: Record<string, LodgingRecommendScoreWire> = {};
    for (const entry of input.lodgingScored) {
      lodgingScoreWire[entry.row.placeId] = {
        score: entry.score,
        reasonKo: entry.reasonKo,
        matchReasons: entry.matchReasons,
      };
    }
    event = commitLodgingInventoryToEvent({
      event,
      inventory: mergedLodging,
      inventorySource: input.lodgingSource ?? null,
      recommendScores: lodgingScoreWire,
    });
    writeLodgingRecommendReasons(event.id, {
      ...readLodgingRecommendReasonsForEvent(event.id),
      ...lodgingScoreWire,
    });
  }

  if (input.eateryRows.length > 0) {
    const mergedEatery = mergeEateryInventoryRows(
      readEateryInventoryRows(event),
      input.eateryRows,
    );
    const eateryScoreWire: Record<string, EateryRecommendScoreWire> = {};
    for (const entry of input.eateryScored) {
      eateryScoreWire[entry.row.placeId] = {
        score: entry.score,
        reasonKo: entry.reasonKo,
        matchReasons: entry.matchReasons,
      };
    }
    event = commitEateryInventoryToEvent({
      event,
      inventory: mergedEatery,
      inventorySource: input.eaterySource ?? null,
      recommendScores: eateryScoreWire,
    });
    writeEateryRecommendReasons(event.id, {
      ...readEateryRecommendReasonsForEvent(event.id),
      ...eateryScoreWire,
    });
  }

  const batch: ContextConditionPinBatchRecord = {
    batchId: input.batchId,
    lodgingPlaceIds: input.lodgingRows.map((row) => row.placeId),
    eateryPlaceIds: input.eateryRows.map((row) => row.placeId),
    atIso: nowIso,
  };
  const metadata = appendContextConditionPinBatch(event, batch);

  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    metadata,
    confidence: event.confidence,
    lifecycleUpdatedAt: nowIso,
    updatedAt: nowIso,
  });
}
