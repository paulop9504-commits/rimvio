"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  applyPinnedContextItemMetadata,
  buildContextPinnedItem,
  CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY,
} from "@/lib/globe/context-pinned-item";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { selectPreferredLodgingImage } from "@/lib/globe/lodging/lodging-photo-fidelity";
import { upsertMirrorProvenanceMetadata } from "@/lib/globe/mirror-provenance";
import { mapLodgingRowToContextResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { emitCommittedContextResource } from "@/lib/globe/resource/emit-committed-context-resource";
import { attachRealityObjectToPinMetadata } from "@/lib/reality-object/attach-on-pin";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { markLodgingResourceSelected } from "@/lib/resource-operation";
import { recordHotelSelected } from "@/lib/workstream";

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
  const coverImageUrl =
    input.previewUrl?.trim() ||
    selectPreferredLodgingImage(input.row) ||
    null;
  const { metadata: withObject, object } = attachRealityObjectToPinMetadata({
    metadata: event.metadata,
    build: {
      contextEventId: event.id,
      title: input.row.name,
      placeId: input.row.placeId,
      resourceId,
      pinKind: "lodging",
      categoryLabel: input.row.partnerLabel ?? null,
      coverImageUrl,
      images: input.row.images,
      lat: input.row.lat,
      lng: input.row.lng,
      price: input.row.priceKrw ?? null,
      reservationSupport: true,
      paymentSupport: true,
      pinnedAtIso: stamp,
    },
  });
  const pinnedItem = buildContextPinnedItem({
    kind: "lodging",
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
      diff: ["resource:lodging", `pinned:${resourceId}`],
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

  // Work residue — search does not persist; selection does (ADR-036).
  recordHotelSelected({
    contextEventId: pinned.id,
    labelKo: input.row.name,
    placeId: input.row.placeId,
    objectId: resourceId,
    placeLabel:
      (typeof pinned.place === "string" && pinned.place.trim()) ||
      (typeof pinned.metadata?.globePlaceLabel === "string"
        ? pinned.metadata.globePlaceLabel
        : null),
  });

  // 3-layer: pin Commit → ContextResource file (not scout inventory).
  return emitCommittedContextResource({
    contextEventId: pinned.id,
    resource: mapLodgingRowToContextResource(pinned, input.row),
  });
}
