function mergeRowsByPlaceId<T extends { placeId: string }>(
  existing: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map(
    existing.map((row) => [row.placeId.trim(), row] as const),
  );
  for (const row of incoming) {
    byId.set(row.placeId.trim(), row);
  }
  return Array.from(byId.values());
}

export function mergeLodgingInventoryRows<
  T extends { placeId: string },
>(existing: readonly T[], incoming: readonly T[]): T[] {
  return mergeRowsByPlaceId(existing, incoming);
}

export function mergeEateryInventoryRows<
  T extends { placeId: string },
>(existing: readonly T[], incoming: readonly T[]): T[] {
  return mergeRowsByPlaceId(existing, incoming);
}

export function pruneInventoryRowsByPlaceIds<T extends { placeId: string }>(
  rows: readonly T[],
  removePlaceIds: ReadonlySet<string>,
): T[] {
  if (removePlaceIds.size === 0) {
    return [...rows];
  }
  return rows.filter((row) => !removePlaceIds.has(row.placeId.trim()));
}
