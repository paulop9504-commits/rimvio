import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  clearPinnedContextItemMetadata,
  readPinnedContextItem,
} from "@/lib/globe/context-pinned-item";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
  CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY,
  CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY,
  CONTEXT_EATERY_RECOMMEND_SCORES_META_KEY,
  type ContextEateryInventoryRow,
  type EateryRecommendScoreWire,
} from "@/lib/globe/eatery/eatery-resource-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function maybeClearPinnedEateryState(input: {
  metadata: Record<string, unknown> | undefined;
  inventory: readonly ContextEateryInventoryRow[];
}): Record<string, unknown> {
  const metadata = { ...(input.metadata ?? {}) };
  const pinnedPlaceId = metadata[CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY];
  if (typeof pinnedPlaceId !== "string" || !pinnedPlaceId.trim()) {
    return metadata;
  }
  const stillPresent = input.inventory.some((row) => row.placeId === pinnedPlaceId);
  if (stillPresent) {
    return metadata;
  }
  const pinnedItem = readPinnedContextItem({ metadata } as EventCandidate);
  if (pinnedItem?.kind === "eatery") {
    return clearPinnedContextItemMetadata(metadata);
  }
  metadata[CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY] = undefined;
  metadata[CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY] = undefined;
  metadata.contextEateryPinnedAt = undefined;
  metadata.contextEateryPinnedName = undefined;
  metadata.contextEateryPinnedLat = undefined;
  metadata.contextEateryPinnedLng = undefined;
  metadata.contextEateryPinnedMapsUrl = undefined;
  metadata.contextEateryPinnedPreviewUrl = undefined;
  return metadata;
}

export function commitEateryInventoryToEvent(input: {
  event: EventCandidate;
  inventory: readonly ContextEateryInventoryRow[];
  inventorySource?: string | null;
  recommendScores?: Record<string, EateryRecommendScoreWire>;
}): EventCandidate {
  const stamp = new Date().toISOString();
  const metadata = maybeClearPinnedEateryState({
    metadata: input.event.metadata,
    inventory: input.inventory,
  });

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
      ...metadata,
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
