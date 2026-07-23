import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  clearPinnedContextItemMetadata,
  CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY,
  CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY,
  readPinnedContextItem,
} from "@/lib/globe/context-pinned-item";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
  CONTEXT_LODGING_RECOMMEND_SCORES_META_KEY,
} from "@/lib/globe/context-hub/lodging-resource-types";
import type {
  ContextLodgingInventoryRow,
  LodgingRecommendScoreWire,
} from "@/lib/globe/context-hub/lodging-resource-types";
import { sanitizeLodgingInventoryRows } from "@/lib/globe/lodging/lodging-photo-fidelity";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function maybeClearPinnedLodgingState(input: {
  metadata: Record<string, unknown> | undefined;
  inventory: readonly ContextLodgingInventoryRow[];
}): Record<string, unknown> {
  const metadata = { ...(input.metadata ?? {}) };
  const pinnedPlaceId = metadata[CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY];
  if (typeof pinnedPlaceId !== "string" || !pinnedPlaceId.trim()) {
    return metadata;
  }
  const stillPresent = input.inventory.some((row) => row.placeId === pinnedPlaceId);
  if (stillPresent) {
    return metadata;
  }
  const pinnedItem = readPinnedContextItem({ metadata } as EventCandidate);
  if (pinnedItem?.kind === "lodging") {
    return clearPinnedContextItemMetadata(metadata);
  }
  metadata[CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY] = undefined;
  metadata[CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY] = undefined;
  metadata.contextLodgingPinnedAt = undefined;
  metadata.contextLodgingPinnedName = undefined;
  metadata.contextLodgingPinnedLat = undefined;
  metadata.contextLodgingPinnedLng = undefined;
  metadata.contextLodgingPinnedMapsUrl = undefined;
  metadata.contextLodgingPinnedPreviewUrl = undefined;
  return metadata;
}

export function commitLodgingInventoryToEvent(input: {
  event: EventCandidate;
  inventory: readonly ContextLodgingInventoryRow[];
  inventorySource?: string | null;
  recommendScores?: Record<string, LodgingRecommendScoreWire>;
}): EventCandidate {
  const stamp = new Date().toISOString();
  const inventory = sanitizeLodgingInventoryRows(input.inventory);
  const metadata = maybeClearPinnedLodgingState({
    metadata: input.event.metadata,
    inventory,
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
      [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
      [CONTEXT_LODGING_INVENTORY_META_KEY]: inventory,
      ...(input.recommendScores && Object.keys(input.recommendScores).length > 0
        ? { [CONTEXT_LODGING_RECOMMEND_SCORES_META_KEY]: input.recommendScores }
        : {}),
      contextLodgingInventorySource: input.inventorySource ?? null,
      feedPlanEnabled: input.event.metadata?.feedPlanEnabled ?? true,
    },
    confidence: input.event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });
}
