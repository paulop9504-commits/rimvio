import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildContextDiscoveryOntologyGraph } from "@/lib/globe/spatial-semantic/build-context-discovery-ontology-graph";
import { publishGeoOntologyGraph } from "@/lib/globe/spatial-semantic/geo-ontology-graph-store";
import {
  appendContextConditionPinBatch,
  type ContextConditionPinBatchRecord,
} from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import { buildContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/build-context-condition-discovery-overlay";
import { publishContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-bridge";
import { consumeScoutRevealPending } from "@/lib/globe/context-condition-ai/context-condition-scout-reveal-pending-store";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { syncContextConditionPins } from "@/lib/globe/context-condition-ai/sync-context-condition-pins";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { findLifeEventCandidate } from "@/lib/life-read-model";

/** User tapped [확인하기] — reveal map markers, overlay, and ontology for a gated scout. */
export function revealContextConditionScout(
  contextEventId: string,
): EventCandidate | null {
  const pending = consumeScoutRevealPending(contextEventId);
  if (!pending) {
    return null;
  }
  const event = findLifeEventCandidate(contextEventId);
  if (!event) {
    return null;
  }

  const committed = commitScoutPinBatch(event, pending.batch);
  const lodgingIds = new Set(pending.batch.lodgingPlaceIds);
  const eateryIds = new Set(pending.batch.eateryPlaceIds);
  const lodgingRows = readLodgingInventoryRows(committed).filter((row) =>
    lodgingIds.has(row.placeId),
  );
  const eateryRows = readEateryInventoryRows(committed).filter((row) =>
    eateryIds.has(row.placeId),
  );

  syncContextConditionPins({
    contextEvent: committed,
    batchId: pending.batch.batchId,
    lodgingRows,
    eateryRows,
    eateryKind: pending.batch.eateryKind ?? "eatery",
    activitySubtype: pending.batch.activitySubtype ?? null,
  });

  publishContextConditionDiscoveryOverlay(
    buildContextConditionDiscoveryOverlay({
      contextEventId,
      anchorLat: pending.searchOriginLat,
      anchorLng: pending.searchOriginLng,
      outcome: pending.outcome,
      pinRows: [
        ...lodgingRows.map((row) => ({
          lat: row.lat,
          lng: row.lng,
          placeId: row.placeId,
        })),
        ...eateryRows.map((row) => ({
          lat: row.lat,
          lng: row.lng,
          placeId: row.placeId,
        })),
      ],
    }),
  );

  publishGeoOntologyGraph(
    buildContextDiscoveryOntologyGraph({
      contextEventId,
      anchorPlaceName: pending.anchorPlaceName,
      outcome: pending.outcome,
    }),
  );

  return committed;
}

function commitScoutPinBatch(
  event: EventCandidate,
  batch: ContextConditionPinBatchRecord,
): EventCandidate {
  const metadata = appendContextConditionPinBatch(event, batch);
  const nowIso = new Date().toISOString();
  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    metadata,
    confidence: event.confidence,
    lifecycleUpdatedAt: nowIso,
    updatedAt: nowIso,
  });
}
