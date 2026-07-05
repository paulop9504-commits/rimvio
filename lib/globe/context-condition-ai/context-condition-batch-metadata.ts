import type { EventCandidate } from "@/lib/events/event-candidate";

export const CONTEXT_CONDITION_PIN_BATCHES_META_KEY = "contextConditionPinBatches";

export type ContextConditionPinBatchRecord = {
  batchId: string;
  lodgingPlaceIds: readonly string[];
  eateryPlaceIds: readonly string[];
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
      atIso:
        typeof (row as ContextConditionPinBatchRecord).atIso === "string"
          ? (row as ContextConditionPinBatchRecord).atIso
          : new Date().toISOString(),
    });
  }
  return batches;
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

export function listContextConditionPlaceIdsForContext(
  event: EventCandidate | null | undefined,
): { lodging: Set<string>; eatery: Set<string> } {
  const lodging = new Set<string>();
  const eatery = new Set<string>();
  for (const batch of readContextConditionPinBatches(event)) {
    for (const placeId of batch.lodgingPlaceIds) {
      lodging.add(placeId);
    }
    for (const placeId of batch.eateryPlaceIds) {
      eatery.add(placeId);
    }
  }
  return { lodging, eatery };
}

export function parseContextConditionPinPlaceId(eventId: string): {
  kind: "lodging" | "eatery";
  placeId: string;
} | null {
  const match = eventId.match(/:ctxcond:[^:]+:(lodging|eatery):([^:]+)$/u);
  if (!match) {
    return null;
  }
  const kind = match[1] as "lodging" | "eatery";
  const placeId = match[2]?.trim() ?? "";
  if (!placeId) {
    return null;
  }
  return { kind, placeId };
}
