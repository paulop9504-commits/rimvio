import { readActiveDiscoveryExecution } from "@/lib/globe/discovery-execution/read-active-discovery-execution";
import type { ContextConditionLastBatchWire } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import type { EventCandidate } from "@/lib/events/event-candidate";

/** Pure gate — amenity/activity/restaurant-only scouts exclude lodging bleed. */
export function resolveDiscoverySurfaceIncludesLodgingFromBatch(
  batch: ContextConditionLastBatchWire | null | undefined,
): boolean {
  if (!batch) {
    return true;
  }
  const types = batch.spec?.resourceTypes ?? [];
  if (types.includes("hotel")) {
    return true;
  }
  if (batch.recommendations?.some((row) => row.kind === "lodging")) {
    return true;
  }
  if (
    types.includes("amenity") ||
    types.includes("activity") ||
    (types.length === 1 && types[0] === "restaurant")
  ) {
    return false;
  }
  return true;
}

/**
 * Whether discovery surfaces (feed reel · hub carousel) should include lodging rows.
 * Amenity/activity/restaurant-only scouts must not bleed prior hotel inventory.
 */
export function discoverySurfaceIncludesLodging(
  contextEventId: string | null | undefined,
): boolean {
  const id = contextEventId?.trim();
  if (!id) {
    return true;
  }
  return resolveDiscoverySurfaceIncludesLodgingFromBatch(
    readActiveDiscoveryExecution(id),
  );
}

export function discoverySurfaceIncludesLodgingForEvent(
  event: EventCandidate | null | undefined,
): boolean {
  if (!event) {
    return true;
  }
  return discoverySurfaceIncludesLodging(event.id);
}
