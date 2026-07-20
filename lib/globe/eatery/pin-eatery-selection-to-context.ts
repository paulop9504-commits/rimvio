"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  applyPinnedContextItemMetadata,
  buildContextPinnedItem,
} from "@/lib/globe/context-pinned-item";
import { upsertMirrorProvenanceMetadata } from "@/lib/globe/mirror-provenance";
import { mapEateryRowToContextResource } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { emitCommittedContextResource } from "@/lib/globe/resource/emit-committed-context-resource";
import { attachRealityObjectToPinMetadata } from "@/lib/reality-object/attach-on-pin";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import {
  CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY,
} from "@/lib/globe/eatery/eatery-resource-types";

function buildEateryResourceId(eventId: string, placeId: string): string {
  return `${eventId}:eatery:${placeId}`;
}

export function readPinnedEateryResourceId(
  event: EventCandidate | null | undefined,
): string | null {
  if (!event) {
    return null;
  }
  const raw = event.metadata?.[CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function pinEaterySelectionToContext(input: {
  eventId: string;
  row: ContextEateryInventoryRow;
  previewUrl?: string | null;
}): EventCandidate {
  const event = findLifeEventCandidate(input.eventId.trim());
  if (!event) {
    throw new Error("event_not_found");
  }
  const resourceId = buildEateryResourceId(event.id, input.row.placeId);
  const stamp = new Date().toISOString();
  const coverImageUrl =
    input.previewUrl ?? input.row.images[0] ?? null;
  const { metadata: withObject, object } = attachRealityObjectToPinMetadata({
    metadata: event.metadata,
    build: {
      contextEventId: event.id,
      title: input.row.name,
      placeId: input.row.placeId,
      resourceId,
      pinKind: "eatery",
      categoryLabel: input.row.categoryLabel ?? null,
      cuisineHint: input.row.cuisineHint ?? null,
      coverImageUrl,
      images: input.row.images,
      lat: input.row.lat,
      lng: input.row.lng,
      rating: input.row.rating ?? null,
      reservationSupport: true,
      pinnedAtIso: stamp,
    },
  });
  const pinnedItem = buildContextPinnedItem({
    kind: "eatery",
    resourceId,
    placeId: input.row.placeId,
    label: input.row.name,
    lat: input.row.lat,
    lng: input.row.lng,
    mapsUrl: input.row.mapsUrl ?? null,
    previewUrl: object.coverImageUrl ?? coverImageUrl,
    pinnedAtIso: stamp,
  });
  const baseMetadata = applyPinnedContextItemMetadata({
    metadata: withObject,
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
      diff: ["resource:eatery", `pinned:${resourceId}`],
    },
    nowIso: stamp,
  });
  const pinned = commitEventUpsert({
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

  // 3-layer: pin Commit → ContextResource file (not scout inventory).
  return emitCommittedContextResource({
    contextEventId: pinned.id,
    resource: mapEateryRowToContextResource(pinned, input.row),
  });
}
