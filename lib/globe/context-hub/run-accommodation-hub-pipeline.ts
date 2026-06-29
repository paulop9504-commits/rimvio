import {
  readClientMasterOrchestratorContext,
  defaultMasterOrchestratorContext,
} from "@/lib/experience-context/read-client-master-orchestrator-context";
import { buildUnifiedExperienceContext } from "@/lib/experience-context/build-unified-experience-context";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  EVENT_SERVICE_TYPE_ACCOMMODATION,
  EVENT_SERVICE_TYPE_META_KEY,
} from "@/lib/events/event-metadata-keys";
import {
  detectAccommodationIntent,
  stampAccommodationServiceTypeOnEvent,
} from "@/lib/event-kernel";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { syncAccommodationSearchPins } from "@/lib/globe/accommodation/create-accommodation-search-pins";
import { commitLodgingInventoryToEvent } from "@/lib/globe/context-hub/commit-lodging-inventory";
import { loadAccommodationSearchInventory } from "@/lib/globe/context-hub/load-accommodation-search-inventory";
import type { LodgingRecommendScoreWire } from "@/lib/globe/context-hub/lodging-resource-types";
import { mapLodgingRowToContextResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import {
  dispatchGlobeLodgingDiscoverySession,
  dispatchGlobeLodgingDiscoveryStart,
  dispatchGlobeLodgingDiscoverySummary,
  runStagedLodgingPinReveal,
} from "@/lib/globe/lodging/globe-lodging-discovery-bridge";
import { computeLodgingDiscoveryBounds } from "@/lib/globe/lodging/compute-lodging-discovery-bounds";
import { LODGING_DISCOVERY_RADIUS_M } from "@/lib/globe/lodging/lodging-discovery-constants";
import { writeLodgingRecommendReasons } from "@/lib/globe/lodging/lodging-recommendation-reason-store";
import { projectLodgingDiscoverySession } from "@/lib/globe/lodging/project-lodging-discovery-session";
import { scoreLodgingRecommendations } from "@/lib/globe/lodging/score-lodging-recommendations";
import { copy } from "@/lib/copy/human-ko";

export type RunAccommodationHubPipelineInput = {
  contextEventId: string;
  message?: string | null;
  lat?: number | null;
  lng?: number | null;
  radiusM?: number;
};

export type AccommodationHubPipelineOutcome = {
  eventId: string;
  resourceIds: string[];
  pinCount: number;
  summaryKo: string;
};

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function resolvePipelineMessage(event: EventCandidate, message?: string | null): string {
  const explicit = message?.trim();
  if (explicit) {
    return explicit;
  }
  return [event.title, event.description, event.place].filter(Boolean).join(" ").trim();
}

function eventSignalsAccommodation(event: EventCandidate, message: string): boolean {
  if (detectAccommodationIntent(message)) {
    return true;
  }
  return event.metadata?.[EVENT_SERVICE_TYPE_META_KEY] === EVENT_SERVICE_TYPE_ACCOMMODATION;
}

/** Context Hub Rail — accommodation intent → inventory → pins → staged reveal. */
export async function runAccommodationHubPipeline(
  input: RunAccommodationHubPipelineInput,
): Promise<AccommodationHubPipelineOutcome | null> {
  const eventId = input.contextEventId.trim();
  if (!eventId) {
    return null;
  }

  let event = findLifeEventCandidate(eventId);
  if (!event) {
    return null;
  }

  const message = resolvePipelineMessage(event, input.message);
  if (!eventSignalsAccommodation(event, message)) {
    return null;
  }

  if (input.lat == null || input.lng == null) {
    return null;
  }

  event = stampAccommodationServiceTypeOnEvent(eventId) ?? event;

  const masterContext =
    typeof window !== "undefined"
      ? readClientMasterOrchestratorContext()
      : defaultMasterOrchestratorContext();

  const unifiedContext = buildUnifiedExperienceContext({
    message,
    masterContext,
  });

  const radiusM = input.radiusM ?? LODGING_DISCOVERY_RADIUS_M;
  const loaded = await loadAccommodationSearchInventory({
    event,
    lat: input.lat,
    lng: input.lng,
    maxResults: 5,
    radiusM,
  });

  if (loaded.rows.length === 0) {
    return null;
  }

  const scored = scoreLodgingRecommendations({
    rows: loaded.rows,
    unifiedContext,
    lat: input.lat,
    lng: input.lng,
  });

  const resourceIdByPlaceId: Record<string, string> = {};
  const scoreWire: Record<string, LodgingRecommendScoreWire> = {};
  for (const entry of scored) {
    const resource = mapLodgingRowToContextResource(event, entry.row);
    resourceIdByPlaceId[entry.row.placeId] = resource.resourceId;
    scoreWire[entry.row.placeId] = {
      score: entry.score,
      reasonKo: entry.reasonKo,
      matchReasons: entry.matchReasons,
    };
  }

  const sortedRows = scored.map((entry) => entry.row);
  commitLodgingInventoryToEvent({
    event,
    inventory: sortedRows,
    inventorySource: loaded.source,
    recommendScores: scoreWire,
  });

  writeLodgingRecommendReasons(eventId, scoreWire);
  syncAccommodationSearchPins({ contextEvent: event, rows: sortedRows });

  const session = projectLodgingDiscoverySession({
    eventId,
    scored,
    unifiedContext,
    userLat: input.lat,
    userLng: input.lng,
    eventPlace: event.place,
    searching: false,
    radiusM,
    resourceIdByPlaceId,
  });

  if (!session) {
    return null;
  }

  const resourceIds = sortedRows.map((row) => resourceIdByPlaceId[row.placeId]!);
  const top = scored[0]!;
  const priceLine = formatPriceKrw(top.row.priceKrw);
  const summaryKo = copy.globe.lodgingDiscoverySummary(top.row.name, top.reasonKo, priceLine);

  dispatchGlobeLodgingDiscoverySession(session);
  dispatchGlobeLodgingDiscoveryStart({ eventId, resourceIds });
  runStagedLodgingPinReveal({ eventId, resourceIds });
  dispatchGlobeLodgingDiscoverySummary({
    eventId,
    summaryKo,
    topName: top.row.name,
    topReasonKo: top.reasonKo,
  });

  computeLodgingDiscoveryBounds({
    user: { lat: input.lat, lng: input.lng },
    lodging: sortedRows.map((row) => ({ lat: row.lat, lng: row.lng })),
    radiusM,
  });

  return {
    eventId,
    resourceIds,
    pinCount: sortedRows.length,
    summaryKo,
  };
}
