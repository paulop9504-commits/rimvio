import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
  CONTEXT_EATERY_RECOMMEND_SCORES_META_KEY,
  type ContextEateryInventoryRow,
  type EateryRecommendScoreWire,
} from "@/lib/globe/eatery/eatery-resource-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function commitEateryInventoryToEvent(input: {
  event: EventCandidate;
  inventory: readonly ContextEateryInventoryRow[];
  inventorySource?: string | null;
  recommendScores?: Record<string, EateryRecommendScoreWire>;
}): EventCandidate {
  const stamp = new Date().toISOString();

  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    description: input.event.description,
    metadata: {
      ...(input.event.metadata ?? {}),
      [CONTEXT_EATERY_HUB_ENABLED_META_KEY]: true,
      [CONTEXT_EATERY_INVENTORY_META_KEY]: [...input.inventory],
      ...(input.recommendScores && Object.keys(input.recommendScores).length > 0
        ? { [CONTEXT_EATERY_RECOMMEND_SCORES_META_KEY]: input.recommendScores }
        : {}),
      contextEateryInventorySource: input.inventorySource ?? null,
      feedPlanEnabled: input.event.metadata?.feedPlanEnabled ?? true,
    },
    confidence: input.event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });
}
