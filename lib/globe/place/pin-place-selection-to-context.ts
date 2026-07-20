"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  applyPinnedContextItemMetadata,
  buildContextPinnedItem,
} from "@/lib/globe/context-pinned-item";
import { upsertMirrorProvenanceMetadata } from "@/lib/globe/mirror-provenance";
import type { ContextPlaceInventoryRow } from "@/lib/globe/place/place-resource-types";
import { mapPlaceRowToContextResource } from "@/lib/globe/place/map-place-row-to-context-resource";
import { emitCommittedContextResource } from "@/lib/globe/resource/emit-committed-context-resource";
import { attachRealityObjectToPinMetadata } from "@/lib/reality-object/attach-on-pin";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

function buildPlaceResourceId(
  eventId: string,
  kind: "activity" | "amenity",
  placeId: string,
): string {
  return `${eventId}:${kind}:${placeId}`;
}

/** Human pick from scout cards — activity/amenity pin with domain-correct resource id. */
export function pinPlaceSelectionToContext(input: {
  eventId: string;
  kind: Extract<ContextConditionRecommendation["kind"], "activity" | "amenity">;
  row: ContextPlaceInventoryRow;
  previewUrl?: string | null;
}): EventCandidate {
  const event = findLifeEventCandidate(input.eventId.trim());
  if (!event) {
    throw new Error("event_not_found");
  }
  const resourceId = buildPlaceResourceId(event.id, input.kind, input.row.placeId);
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
      pinKind: input.kind,
      categoryLabel: input.row.categoryLabel ?? null,
      cuisineHint: input.row.cuisineHint ?? null,
      coverImageUrl,
      images: input.row.images,
      lat: input.row.lat,
      lng: input.row.lng,
      rating: input.row.rating ?? null,
      pinnedAtIso: stamp,
    },
  });
  const pinnedItem = buildContextPinnedItem({
    kind: input.kind,
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
      diff: [`resource:${input.kind}`, `pinned:${resourceId}`],
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

  return emitCommittedContextResource({
    contextEventId: pinned.id,
    resource: mapPlaceRowToContextResource(pinned, input.row, input.kind),
  });
}
