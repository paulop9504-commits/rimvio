import type { EventCandidate } from "@/lib/events/event-candidate";
import { fetchWeatherForecastClient } from "@/lib/context-resolver/weather/fetch-weather-forecast-client";
import { commitLodgingInventoryToEvent } from "@/lib/globe/context-hub/commit-lodging-inventory";
import { readLodgingInventoryRows, isLodgingInventoryMisanchored } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { loadLodgingInventoryRows } from "@/lib/globe/context-hub/load-lodging-inventory-rows";
import { resolveContextDiscoverySearchCoords } from "@/lib/globe/context-hub/resolve-context-discovery-search-coords";
import { commitEateryInventoryToEvent } from "@/lib/globe/eatery/commit-eatery-inventory";
import { loadEateryInventoryRows } from "@/lib/globe/eatery/load-eatery-inventory-rows";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { resolveBridgeContextWeatherTarget } from "@/lib/globe/resolve-bridge-context-weather-target";
import {
  publishContextAgentPrefetch,
  type ContextAgentPrefetchSnapshot,
} from "@/lib/globe/context-agent/context-agent-prefetch-store";

const MIN_LODGING_ROWS = 3;
const MIN_EATERY_ROWS = 3;

const inflight = new Map<string, Promise<ContextAgentPrefetchSnapshot>>();

function mergeInventoryRows<T extends { placeId: string }>(
  existing: readonly T[],
  incoming: readonly T[],
): T[] {
  const seen = new Set(existing.map((row) => row.placeId));
  const merged = [...existing];
  for (const row of incoming) {
    if (seen.has(row.placeId)) {
      continue;
    }
    seen.add(row.placeId);
    merged.push(row);
  }
  return merged;
}

/** Warm weather + lodging/eatery inventory before context agent scouts. */
export async function prefetchContextAgentSurroundings(input: {
  event: EventCandidate;
  anchorLat: number;
  anchorLng: number;
  userLat?: number | null;
  userLng?: number | null;
}): Promise<ContextAgentPrefetchSnapshot> {
  const eventId = input.event.id.trim();
  const existing = inflight.get(eventId);
  if (existing) {
    return existing;
  }

  const task = (async (): Promise<ContextAgentPrefetchSnapshot> => {
    const weatherTarget = resolveBridgeContextWeatherTarget(input.event);
    const coords = resolveContextDiscoverySearchCoords(input.event, {
      pinLat: input.anchorLat,
      pinLng: input.anchorLng,
      viewerLat: input.userLat,
      viewerLng: input.userLng,
    });

    const [weatherPayload, lodgingLoaded, eateryLoaded] = await Promise.all([
      weatherTarget
        ? fetchWeatherForecastClient({
            location: weatherTarget.location,
            targetIso: weatherTarget.targetIso,
            eventDate: weatherTarget.eventDate,
            eventTimeSource: weatherTarget.eventTimeSource,
          })
        : Promise.resolve(null),
      readLodgingInventoryRows(input.event).length >= MIN_LODGING_ROWS &&
      !isLodgingInventoryMisanchored(input.event)
        ? Promise.resolve(null)
        : loadLodgingInventoryRows({
            event: input.event,
            lat: coords.lat,
            lng: coords.lng,
            maxResults: 10,
            preferUserLocation: false,
          }).catch(() => null),
      readEateryInventoryRows(input.event).length >= MIN_EATERY_ROWS
        ? Promise.resolve(null)
        : loadEateryInventoryRows({
            event: input.event,
            lat: coords.lat,
            lng: coords.lng,
            maxResults: 6,
            preferUserLocation: false,
          }).catch(() => null),
    ]);

    let event = input.event;
    if (lodgingLoaded && lodgingLoaded.rows.length > 0) {
      const merged = mergeInventoryRows(
        readLodgingInventoryRows(event),
        lodgingLoaded.rows,
      );
      event =
        commitLodgingInventoryToEvent({
          event,
          inventory: merged,
          inventorySource: lodgingLoaded.source,
        }) ?? event;
    }
    if (eateryLoaded && eateryLoaded.rows.length > 0) {
      const merged = mergeInventoryRows(
        readEateryInventoryRows(event),
        eateryLoaded.rows,
      );
      event =
        commitEateryInventoryToEvent({
          event,
          inventory: merged,
          inventorySource: eateryLoaded.source,
        }) ?? event;
    }

    const refreshed = findLifeEventCandidate(eventId) ?? event;
    const snapshot: ContextAgentPrefetchSnapshot = {
      eventId,
      weather: weatherPayload?.weather ?? null,
      lodgingReady: readLodgingInventoryRows(refreshed).length >= MIN_LODGING_ROWS,
      eateryReady: readEateryInventoryRows(refreshed).length >= MIN_EATERY_ROWS,
      atIso: new Date().toISOString(),
    };
    publishContextAgentPrefetch(snapshot);
    return snapshot;
  })();

  inflight.set(eventId, task);
  try {
    return await task;
  } finally {
    inflight.delete(eventId);
  }
}
