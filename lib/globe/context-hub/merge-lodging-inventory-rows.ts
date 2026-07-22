import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

function lodgingRowKey(row: ContextLodgingInventoryRow): string {
  const placeId = row.placeId?.trim();
  if (placeId) {
    return `id:${placeId}`;
  }
  return `name:${row.name.trim().toLowerCase()}`;
}

function lodgingPhotoScore(row: ContextLodgingInventoryRow): number {
  const images = row.images?.length ?? 0;
  const providerBoost = row.provider === "liteapi" ? 100 : 0;
  return images + providerBoost;
}

/**
 * Prefer LiteAPI (live rates + photos); keep Places keyword hits that add coverage.
 */
export function mergeLodgingInventoryRows(input: {
  primary: readonly ContextLodgingInventoryRow[];
  secondary: readonly ContextLodgingInventoryRow[];
  maxResults: number;
}): ContextLodgingInventoryRow[] {
  const byKey = new Map<string, ContextLodgingInventoryRow>();
  for (const row of [...input.primary, ...input.secondary]) {
    const key = lodgingRowKey(row);
    const existing = byKey.get(key);
    if (!existing || lodgingPhotoScore(row) > lodgingPhotoScore(existing)) {
      byKey.set(key, row);
    }
  }

  const preferredKeys = new Set(input.primary.map(lodgingRowKey));
  const preferred: ContextLodgingInventoryRow[] = [];
  const extras: ContextLodgingInventoryRow[] = [];
  for (const [key, row] of byKey) {
    if (preferredKeys.has(key)) {
      preferred.push(row);
    } else {
      extras.push(row);
    }
  }

  return [...preferred, ...extras].slice(0, Math.max(1, input.maxResults));
}

export function lodgingInventoryHasLivePhotos(
  rows: readonly ContextLodgingInventoryRow[],
): boolean {
  return rows.some(
    (row) =>
      (row.images?.length ?? 0) > 0 &&
      row.provider !== "mock" &&
      row.photoSource !== "mock",
  );
}
