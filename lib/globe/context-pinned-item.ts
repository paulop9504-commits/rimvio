import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY,
  CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY,
} from "@/lib/globe/eatery/eatery-resource-types";
import {
  readMirrorAudit,
  readMirrorProvenance,
  upsertMirrorProvenanceMetadata,
} from "@/lib/globe/mirror-provenance";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export const CONTEXT_PINNED_ITEM_META_KEY = "contextPinnedItemV1";

export const CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY =
  "contextLodgingPinnedResourceId";
export const CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY =
  "contextLodgingPinnedPlaceId";

export type ContextPinnedItemKind = "eatery" | "lodging";

export type ContextPinnedItemV1 = {
  version: 1;
  kind: ContextPinnedItemKind;
  resourceId: string;
  placeId: string;
  label: string;
  pinnedAtIso: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
  previewUrl?: string | null;
};

type BasePinnedContextItemInput = {
  resourceId: string;
  placeId: string;
  label: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
  previewUrl?: string | null;
  pinnedAtIso?: string;
};

export type EateryPinnedContextItemInput = BasePinnedContextItemInput & {
  kind: "eatery";
};

export type LodgingPinnedContextItemInput = BasePinnedContextItemInput & {
  kind: "lodging";
};

export type PinnedContextItemInput =
  | EateryPinnedContextItemInput
  | LodgingPinnedContextItemInput;

const EATERY_PIN_KEYS = [
  "contextEateryPinnedAt",
  "contextEateryPinnedName",
  "contextEateryPinnedLat",
  "contextEateryPinnedLng",
  "contextEateryPinnedMapsUrl",
  "contextEateryPinnedPreviewUrl",
  CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY,
  CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY,
] as const;

const LODGING_PIN_KEYS = [
  "contextLodgingPinnedAt",
  "contextLodgingPinnedName",
  "contextLodgingPinnedLat",
  "contextLodgingPinnedLng",
  "contextLodgingPinnedMapsUrl",
  "contextLodgingPinnedPreviewUrl",
  CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY,
  CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY,
] as const;

function readTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clearKeys(
  metadata: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const next = { ...metadata };
  for (const key of keys) {
    next[key] = undefined;
  }
  return next;
}

export function buildContextPinnedItem(
  input: PinnedContextItemInput,
): ContextPinnedItemV1 {
  const pinnedAtIso = input.pinnedAtIso?.trim() || new Date().toISOString();
  return {
    version: 1,
    kind: input.kind,
    resourceId: input.resourceId.trim(),
    placeId: input.placeId.trim(),
    label: input.label.trim(),
    pinnedAtIso,
    lat: readFiniteNumber(input.lat) ?? undefined,
    lng: readFiniteNumber(input.lng) ?? undefined,
    mapsUrl: readTrimmedString(input.mapsUrl) ?? undefined,
    previewUrl: readTrimmedString(input.previewUrl) ?? undefined,
  };
}

export function readPinnedContextItem(
  event: EventCandidate | null | undefined,
): ContextPinnedItemV1 | null {
  if (!event) {
    return null;
  }
  const raw = event.metadata?.[CONTEXT_PINNED_ITEM_META_KEY];
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const kind = row.kind;
  if (kind !== "eatery" && kind !== "lodging") {
    return null;
  }
  const resourceId = readTrimmedString(row.resourceId);
  const placeId = readTrimmedString(row.placeId);
  const label = readTrimmedString(row.label);
  const pinnedAtIso = readTrimmedString(row.pinnedAtIso);
  if (!resourceId || !placeId || !label || !pinnedAtIso) {
    return null;
  }
  return {
    version: 1,
    kind,
    resourceId,
    placeId,
    label,
    pinnedAtIso,
    lat: readFiniteNumber(row.lat) ?? undefined,
    lng: readFiniteNumber(row.lng) ?? undefined,
    mapsUrl: readTrimmedString(row.mapsUrl) ?? undefined,
    previewUrl: readTrimmedString(row.previewUrl) ?? undefined,
  };
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

export function applyPinnedContextItemMetadata(input: {
  metadata?: Record<string, unknown> | null;
  item: ContextPinnedItemV1;
}): Record<string, unknown> {
  let next = { ...(input.metadata ?? {}) };
  next = clearKeys(next, EATERY_PIN_KEYS);
  next = clearKeys(next, LODGING_PIN_KEYS);
  next[CONTEXT_PINNED_ITEM_META_KEY] = input.item;

  if (input.item.kind === "eatery") {
    next.contextEateryPinnedAt = input.item.pinnedAtIso;
    next.contextEateryPinnedName = input.item.label;
    next.contextEateryPinnedLat = input.item.lat ?? null;
    next.contextEateryPinnedLng = input.item.lng ?? null;
    next.contextEateryPinnedMapsUrl = input.item.mapsUrl ?? null;
    next.contextEateryPinnedPreviewUrl = input.item.previewUrl ?? null;
    next[CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY] = input.item.resourceId;
    next[CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY] = input.item.placeId;
    return next;
  }

  next.contextLodgingPinnedAt = input.item.pinnedAtIso;
  next.contextLodgingPinnedName = input.item.label;
  next.contextLodgingPinnedLat = input.item.lat ?? null;
  next.contextLodgingPinnedLng = input.item.lng ?? null;
  next.contextLodgingPinnedMapsUrl = input.item.mapsUrl ?? null;
  next.contextLodgingPinnedPreviewUrl = input.item.previewUrl ?? null;
  next[CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY] = input.item.resourceId;
  next[CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY] = input.item.placeId;
  return next;
}

export function clearPinnedContextItemMetadata(
  metadata?: Record<string, unknown> | null,
): Record<string, unknown> {
  let next = { ...(metadata ?? {}) };
  next[CONTEXT_PINNED_ITEM_META_KEY] = undefined;
  next = clearKeys(next, EATERY_PIN_KEYS);
  next = clearKeys(next, LODGING_PIN_KEYS);
  return next;
}

export function mergePinnedContextItemFromRemote(input: {
  event: EventCandidate;
  remoteEvent: EventCandidate;
}): EventCandidate | null {
  const localPinned = readPinnedContextItem(input.event);
  const remotePinned = readPinnedContextItem(input.remoteEvent);
  if (!remotePinned) {
    return null;
  }
  if (
    localPinned &&
    Date.parse(localPinned.pinnedAtIso) >= Date.parse(remotePinned.pinnedAtIso)
  ) {
    return null;
  }

  let nextMetadata = applyPinnedContextItemMetadata({
    metadata: input.event.metadata,
    item: remotePinned,
  });
  const remoteAudit = readMirrorAudit(input.remoteEvent.metadata);
  if (remoteAudit.length > 0) {
    nextMetadata = {
      ...nextMetadata,
      mirrorAuditV1: remoteAudit,
    };
  }
  const remoteProvenance = readMirrorProvenance(input.remoteEvent.metadata);
  if (remoteProvenance) {
    nextMetadata = upsertMirrorProvenanceMetadata({
      metadata: nextMetadata,
      patch: {
        sync: {
          state: remoteProvenance.sync.state,
          lastSyncedAtIso:
            remoteProvenance.sync.lastSyncedAtIso ?? remotePinned.pinnedAtIso,
        },
      },
      nowIso:
        remoteProvenance.sync.lastSyncedAtIso ?? remotePinned.pinnedAtIso,
    });
  }

  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    description: input.event.description,
    containerId: input.event.containerId,
    confidence: input.event.confidence,
    metadata: nextMetadata,
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt ?? new Date().toISOString(),
    updatedAt: input.event.updatedAt ?? new Date().toISOString(),
  });
}
