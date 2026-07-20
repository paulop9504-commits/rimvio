import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { GLOBE_CONTEXT_VISIBILITY_PRIVATE } from "@/lib/globe/globe-context-visibility";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import {
  listPersonalGlobePins,
  removePersonalGlobePinByEventId,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";
import { pruneContextConditionHubBatch } from "@/lib/globe/context-condition-ai/prune-context-condition-hub-batch";
import { clearContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-bridge";
import { toReadablePlaceLabel } from "@/lib/globe/readable-place-label";
import type { EventCandidate } from "@/lib/events/event-candidate";

function contextConditionPinEventId(input: {
  contextEventId: string;
  batchId: string;
  kind: "lodging" | "eatery" | "activity" | "amenity";
  placeId: string;
}): string {
  return `${input.contextEventId.trim()}:ctxcond:${input.batchId}:${input.kind}:${input.placeId.trim()}`;
}

function contextConditionPinId(eventId: string): string {
  return `pgpin:${eventId}`;
}

export function listContextConditionPins(input: {
  contextEventId?: string | null;
  batchId?: string | null;
}): PersonalGlobePin[] {
  const contextKey = input.contextEventId?.trim() ?? "";
  const batchKey = input.batchId?.trim() ?? "";
  return listPersonalGlobePins().filter((pin) => {
    if (pin.source !== "context_condition_ai") {
      return false;
    }
    if (contextKey && pin.parentContextEventId !== contextKey) {
      return false;
    }
    if (batchKey && pin.contextConditionBatchId !== batchKey) {
      return false;
    }
    return true;
  });
}

export function dismissContextConditionPinBatch(input: {
  contextEventId: string;
  batchId: string;
}): number {
  const pins = listContextConditionPins(input);
  for (const pin of pins) {
    removePersonalGlobePinByEventId(pin.eventId);
  }
  pruneContextConditionHubBatch(input);
  clearContextConditionDiscoveryOverlay(input.contextEventId);
  return pins.length;
}

/** Remove prior lodging ctxcond pins for this context (keep other batches' eatery if any). */
export function dismissPriorLodgingContextConditionPins(input: {
  contextEventId: string;
  keepBatchId: string;
}): number {
  const contextKey = input.contextEventId.trim();
  const keep = input.keepBatchId.trim();
  if (!contextKey) {
    return 0;
  }
  const stale = listContextConditionPins({ contextEventId: contextKey }).filter(
    (pin) =>
      pin.contextConditionKind === "lodging" &&
      pin.contextConditionBatchId !== keep,
  );
  for (const pin of stale) {
    removePersonalGlobePinByEventId(pin.eventId);
  }
  return stale.length;
}

export function syncContextConditionPins(input: {
  contextEvent: EventCandidate;
  batchId: string;
  lodgingRows?: readonly ContextLodgingInventoryRow[];
  eateryRows?: readonly ContextEateryInventoryRow[];
  eateryKind?: "eatery" | "activity" | "amenity" | null;
  activitySubtype?: LocalDiscoveryActivitySubtype | null;
  now?: Date;
}): PersonalGlobePin[] {
  const contextEventId = input.contextEvent.id.trim();
  const nowIso = (input.now ?? new Date()).toISOString();
  const pins: PersonalGlobePin[] = [];

  if ((input.lodgingRows?.length ?? 0) > 0) {
    dismissPriorLodgingContextConditionPins({
      contextEventId,
      keepBatchId: input.batchId,
    });
  }

  for (const row of input.lodgingRows ?? []) {
    const eventId = contextConditionPinEventId({
      contextEventId,
      batchId: input.batchId,
      kind: "lodging",
      placeId: row.placeId,
    });
    const pin: PersonalGlobePin = {
      pinId: contextConditionPinId(eventId),
      eventId,
      lat: row.lat,
      lng: row.lng,
      placeLabel: toReadablePlaceLabel(row.name) || row.name,
      experienceTitle: toReadablePlaceLabel(row.name) || row.name,
      photoCount: row.images.length,
      videoCount: row.videoUrl ? 1 : 0,
      createdAtIso: nowIso,
      acl: { viewerPeerThreadIds: [] },
      visibility: GLOBE_CONTEXT_VISIBILITY_PRIVATE,
      source: "context_condition_ai",
      contextConditionBatchId: input.batchId,
      contextConditionKind: "lodging",
      parentContextEventId: contextEventId,
    };
    upsertPersonalGlobePin(pin);
    pins.push(pin);
  }

  for (const row of input.eateryRows ?? []) {
    const eateryKind = input.eateryKind ?? "eatery";
    const eventId = contextConditionPinEventId({
      contextEventId,
      batchId: input.batchId,
      kind: eateryKind,
      placeId: row.placeId,
    });
    const pin: PersonalGlobePin = {
      pinId: contextConditionPinId(eventId),
      eventId,
      lat: row.lat,
      lng: row.lng,
      placeLabel: toReadablePlaceLabel(row.name) || row.name,
      experienceTitle: toReadablePlaceLabel(row.name) || row.name,
      photoCount: row.images.length,
      videoCount: 0,
      createdAtIso: nowIso,
      acl: { viewerPeerThreadIds: [] },
      visibility: GLOBE_CONTEXT_VISIBILITY_PRIVATE,
      source: "context_condition_ai",
      contextConditionBatchId: input.batchId,
      contextConditionKind: eateryKind,
      contextConditionActivitySubtype:
        eateryKind === "activity" ? (input.activitySubtype ?? null) : null,
      parentContextEventId: contextEventId,
    };
    upsertPersonalGlobePin(pin);
    pins.push(pin);
  }

  return pins;
}
