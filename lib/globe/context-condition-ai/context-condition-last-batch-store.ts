import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { recordInstantCarryAnchorsFromUtterance } from "@/lib/globe/instant-carry/instant-carry-entity-anchor-store";
import { haversineKm } from "@/lib/feed/spacetime-fit";

const STORAGE_PREFIX = "rimvio.context-condition-last-batch.";

const BATCH_ANCHOR_TOLERANCE_KM = 40;

/** Node / test fallback when sessionStorage is unavailable. */
const memoryBatches = new Map<string, ContextConditionLastBatchWire>();

export type ContextConditionLastBatchWire = {
  batchId: string;
  count: number;
  summaryKo: string;
  atIso: string;
  /** User prompt that produced this scout run — feed copy SSOT. */
  triggerMessage?: string;
  radiusM?: number;
  spec?: LocalDiscoveryActionSpec | null;
  recommendations?: readonly {
    kind: "lodging" | "eatery" | "activity" | "amenity";
    activitySubtype?: LocalDiscoveryActionSpec["activitySubtype"];
    title: string;
    reasonKo: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  }[];
};

export function isContextConditionLastBatchMisanchored(
  batch: ContextConditionLastBatchWire | null | undefined,
  anchorLat: number,
  anchorLng: number,
): boolean {
  const rows = batch?.recommendations ?? [];
  if (rows.length === 0) {
    return false;
  }
  return rows.some((row) => {
    if (row.lat == null || row.lng == null) {
      return false;
    }
    return (
      haversineKm(row.lat, row.lng, anchorLat, anchorLng) > BATCH_ANCHOR_TOLERANCE_KM
    );
  });
}

export function readContextConditionLastBatch(
  contextEventId: string,
): ContextConditionLastBatchWire | null {
  const key = contextEventId.trim();
  if (!key) {
    return null;
  }
  if (typeof window === "undefined") {
    return memoryBatches.get(key) ?? null;
  }
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ContextConditionLastBatchWire;
    if (!parsed?.batchId?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeContextConditionLastBatch(
  contextEventId: string,
  batch: ContextConditionLastBatchWire,
): void {
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  if (typeof window === "undefined") {
    memoryBatches.set(key, batch);
  } else {
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(batch));
    } catch {
      // ignore quota
    }
  }
  const trigger = batch.triggerMessage?.trim();
  if (trigger) {
    // Instant Carry S3 — Entity Resolver →「근처」anchors (personal dock, not discovery rail).
    try {
      recordInstantCarryAnchorsFromUtterance(trigger);
    } catch {
      // Non-blocking.
    }
  }
}

export function clearContextConditionLastBatch(contextEventId: string): void {
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  if (typeof window === "undefined") {
    memoryBatches.delete(key);
    return;
  }
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    // ignore
  }
}
