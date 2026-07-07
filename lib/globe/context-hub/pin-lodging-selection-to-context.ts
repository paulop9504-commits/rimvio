"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  applyPinnedContextItemMetadata,
  buildContextPinnedItem,
  CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY,
} from "@/lib/globe/context-pinned-item";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { upsertMirrorProvenanceMetadata } from "@/lib/globe/mirror-provenance";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { markLodgingResourceSelected } from "@/lib/resource-operation";

function buildLodgingResourceId(eventId: string, placeId: string): string {
  return `${eventId}:lodging:${placeId}`;
}

export function readPinnedLodgingResourceId(
  event: EventCandidate | null | undefined,
): string | null {
  if (!event) {
    return null;
  }
  const raw = event.metadata?.[CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function pinLodgingSelectionToContext(input: {
  eventId: string;
  row: ContextLodgingInventoryRow;
  previewUrl?: string | null;
}): EventCandidate {
  const event = findLifeEventCandidate(input.eventId.trim());
  if (!event) {
    throw new Error("event_not_found");
  }
  const resourceId = buildLodgingResourceId(event.id, input.row.placeId);
  markLodgingResourceSelected({
    contextEventId: event.id,
    resourceId,
    label: input.row.name,
  });
  const stamp = new Date().toISOString();
  const pinnedItem = buildContextPinnedItem({
    kind: "lodging",
    resourceId,
    placeId: input.row.placeId,
    label: input.row.name,
    lat: input.row.lat,
    lng: input.row.lng,
    mapsUrl: input.row.mapsUrl ?? null,
    previewUrl: input.previewUrl ?? input.row.images[0] ?? input.row.videoUrl ?? null,
    pinnedAtIso: stamp,
  });
  const baseMetadata = applyPinnedContextItemMetadata({
    metadata: event.metadata,
    item: pinnedItem,
  });
  const metadata = upsertMirrorProvenanceMetadata({
    metadata: baseMetadata,
    patch: {
      sync: {
        state: "synced",
        lastSyncedAtIso: stamp,
      },
    },
    audit: {
      action: "local_context_edited",
      subject: {
        eventId: event.id,
        nodeId: resourceId,
      },
      diff: ["resource:lodging", `pinned:${resourceId}`],
    },
    nowIso: stamp,
  });

  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    confidence: event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
    metadata,
  });
}
