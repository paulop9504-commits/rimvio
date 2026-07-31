/**
 * In-memory Place Brief cache (placeId → brief). Client + server safe.
 */

import type { PlaceBrief } from "@/lib/context-workspace/place-brief/types";

const cache = new Map<string, PlaceBrief>();

export function readPlaceBriefCache(placeId: string): PlaceBrief | null {
  const id = placeId.trim();
  if (!id) return null;
  return cache.get(id) ?? null;
}

export function writePlaceBriefCache(brief: PlaceBrief): void {
  const id = brief.placeId.trim();
  if (!id) return;
  cache.set(id, brief);
}

export function clearPlaceBriefCache(): void {
  cache.clear();
}
