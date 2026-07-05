const STORAGE_PREFIX = "rimvio.context-condition-last-batch.";

export type ContextConditionLastBatchWire = {
  batchId: string;
  count: number;
  summaryKo: string;
  atIso: string;
};

export function readContextConditionLastBatch(
  contextEventId: string,
): ContextConditionLastBatchWire | null {
  if (typeof window === "undefined") {
    return null;
  }
  const key = contextEventId.trim();
  if (!key) {
    return null;
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
  if (typeof window === "undefined") {
    return;
  }
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(batch));
  } catch {
    // ignore quota
  }
}

export function clearContextConditionLastBatch(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    // ignore
  }
}
