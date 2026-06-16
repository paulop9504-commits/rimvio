import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import { resolveLodgingMockForPlace } from "@/lib/globe/context-hub/lodging-mock-inventory";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "@/lib/globe/context-hub/lodging-resource-types";
import { isLodgingHubEnabled } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function resolveContextPlace(event: EventCandidate): string {
  const pin = findPersonalGlobePinByEventId(event.id);
  const plan = readPlanContextFromEvent(event);
  return (
    pin?.placeLabel?.trim() ||
    plan?.place?.trim() ||
    event.place?.trim() ||
    event.title.trim()
  );
}

/** Places API stub — refresh mock lodging inventory when JIT sync allows fetch. */
export function syncPlacesLodgingInventory(contextEventId: string): EventCandidate | null {
  const event = findEventCandidate(contextEventId.trim());
  if (!event || !isLodgingHubEnabled(event)) {
    return null;
  }

  const place = resolveContextPlace(event);
  const plan = readPlanContextFromEvent(event);
  const inventory = resolveLodgingMockForPlace(place).map((row) => ({
    ...row,
    checkInIso: row.checkInIso ?? plan?.windowStartIso ?? event.datetime ?? null,
    checkOutIso: row.checkOutIso ?? plan?.windowEndIso ?? null,
  }));

  const stamp = new Date().toISOString();

  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    metadata: {
      ...(event.metadata ?? {}),
      [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
      [CONTEXT_LODGING_INVENTORY_META_KEY]: inventory,
      feedPlanEnabled: event.metadata?.feedPlanEnabled ?? true,
    },
    confidence: event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });
}
