import type { EventCandidate } from "@/lib/events/event-candidate";
import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

export const CONTEXT_CONDITION_PIN_BATCHES_META_KEY = "contextConditionPinBatches";

export type ContextConditionPinBatchRecord = {
  batchId: string;
  lodgingPlaceIds: readonly string[];
  eateryPlaceIds: readonly string[];
  eateryKind?: "eatery" | "activity" | "amenity";
  activitySubtype?: LocalDiscoveryActivitySubtype | null;
  atIso: string;
};

export function readContextConditionPinBatches(
  event: EventCandidate | null | undefined,
): ContextConditionPinBatchRecord[] {
  const raw = event?.metadata?.[CONTEXT_CONDITION_PIN_BATCHES_META_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  const batches: ContextConditionPinBatchRecord[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const batchId =
      typeof (row as ContextConditionPinBatchRecord).batchId === "string"
        ? (row as ContextConditionPinBatchRecord).batchId.trim()
        : "";
    if (!batchId) {
      continue;
    }
    batches.push({
      batchId,
      lodgingPlaceIds: normalizePlaceIds(
        (row as ContextConditionPinBatchRecord).lodgingPlaceIds,
      ),
      eateryPlaceIds: normalizePlaceIds(
        (row as ContextConditionPinBatchRecord).eateryPlaceIds,
      ),
      eateryKind:
        (row as ContextConditionPinBatchRecord).eateryKind === "activity" ||
        (row as ContextConditionPinBatchRecord).eateryKind === "amenity"
          ? (row as ContextConditionPinBatchRecord).eateryKind
          : "eatery",
      activitySubtype: normalizeActivitySubtype(
        (row as ContextConditionPinBatchRecord).activitySubtype,
      ),
      atIso:
        typeof (row as ContextConditionPinBatchRecord).atIso === "string"
          ? (row as ContextConditionPinBatchRecord).atIso
          : new Date().toISOString(),
    });
  }
  return batches;
}

function normalizeActivitySubtype(
  value: unknown,
): LocalDiscoveryActivitySubtype | null {
  return value === "general" ||
    value === "shopping" ||
    value === "museum" ||
    value === "park" ||
    value === "nightlife" ||
    value === "photo_spot"
    ? value
    : null;
}

function normalizePlaceIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((row): row is string => typeof row === "string")
    .map((row) => row.trim())
    .filter(Boolean);
}

export function appendContextConditionPinBatch(
  event: EventCandidate,
  batch: ContextConditionPinBatchRecord,
): Record<string, unknown> {
  const existing = readContextConditionPinBatches(event);
  const next = [
    ...existing.filter((row) => row.batchId !== batch.batchId),
    batch,
  ].slice(-12);
  return {
    ...(event.metadata ?? {}),
    [CONTEXT_CONDITION_PIN_BATCHES_META_KEY]: next,
  };
}

export function removeContextConditionPinBatch(
  event: EventCandidate,
  batchId: string,
): Record<string, unknown> {
  const key = batchId.trim();
  const next = readContextConditionPinBatches(event).filter(
    (row) => row.batchId !== key,
  );
  return {
    ...(event.metadata ?? {}),
    [CONTEXT_CONDITION_PIN_BATCHES_META_KEY]: next,
  };
}

export function findContextConditionPinBatch(
  event: EventCandidate | null | undefined,
  batchId: string,
): ContextConditionPinBatchRecord | null {
  const key = batchId.trim();
  if (!key) {
    return null;
  }
  return readContextConditionPinBatches(event).find((row) => row.batchId === key) ?? null;
}

/** Place ids for the active scout run only — not historical pin batches. */
export function readActiveContextConditionPlaceIds(input: {
  event: EventCandidate | null | undefined;
  activeBatchId?: string | null;
}): {
  lodging: Set<string>;
  eatery: Set<string>;
  activity: Set<string>;
  amenity: Set<string>;
} {
  const empty = {
    lodging: new Set<string>(),
    eatery: new Set<string>(),
    activity: new Set<string>(),
    amenity: new Set<string>(),
  };
  const batchId = input.activeBatchId?.trim();
  if (!batchId) {
    return empty;
  }
  const batch = findContextConditionPinBatch(input.event, batchId);
  if (!batch) {
    return empty;
  }
  for (const placeId of batch.lodgingPlaceIds) {
    empty.lodging.add(placeId);
  }
  for (const placeId of batch.eateryPlaceIds) {
    empty.eatery.add(placeId);
    if (batch.eateryKind === "activity") {
      empty.activity.add(placeId);
    } else if (batch.eateryKind === "amenity") {
      empty.amenity.add(placeId);
    }
  }
  return empty;
}

export function listContextConditionPlaceIdsForContext(
  event: EventCandidate | null | undefined,
): {
  lodging: Set<string>;
  eatery: Set<string>;
  activity: Set<string>;
  amenity: Set<string>;
} {
  const lodging = new Set<string>();
  const eatery = new Set<string>();
  const activity = new Set<string>();
  const amenity = new Set<string>();
  for (const batch of readContextConditionPinBatches(event)) {
    for (const placeId of batch.lodgingPlaceIds) {
      lodging.add(placeId);
    }
    for (const placeId of batch.eateryPlaceIds) {
      eatery.add(placeId);
      if (batch.eateryKind === "activity") {
        activity.add(placeId);
      } else if (batch.eateryKind === "amenity") {
        amenity.add(placeId);
      }
    }
  }
  return { lodging, eatery, activity, amenity };
}

export function parseContextConditionPinPlaceId(eventId: string): {
  kind: "lodging" | "eatery" | "activity" | "amenity";
  placeId: string;
} | null {
  const match = eventId.match(/:ctxcond:[^:]+:(lodging|eatery|activity|amenity):([^:]+)$/u);
  if (!match) {
    return null;
  }
  const kind = match[1] as "lodging" | "eatery" | "activity" | "amenity";
  const placeId = match[2]?.trim() ?? "";
  if (!placeId) {
    return null;
  }
  return { kind, placeId };
}
