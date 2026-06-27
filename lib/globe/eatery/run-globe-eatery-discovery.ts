import {
  readClientMasterOrchestratorContext,
  defaultMasterOrchestratorContext,
} from "@/lib/experience-context/read-client-master-orchestrator-context";
import { buildUnifiedExperienceContext } from "@/lib/experience-context/build-unified-experience-context";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEateryInventoryToEvent } from "@/lib/globe/eatery/commit-eatery-inventory";
import { detectEaterySearchIntent } from "@/lib/globe/eatery/detect-eatery-search-intent";
import {
  dispatchGlobeEateryDiscoverySession,
  dispatchGlobeEateryDiscoveryStart,
  dispatchGlobeEateryDiscoverySummary,
  runStagedEateryPinReveal,
} from "@/lib/globe/eatery/globe-eatery-discovery-bridge";
import { loadEateryInventoryRows } from "@/lib/globe/eatery/load-eatery-inventory-rows";
import {
  projectEateryDiscoverySession,
  type GlobeEateryDiscoverySession,
} from "@/lib/globe/eatery/project-eatery-discovery-session";
import { mapEateryRowToContextResource } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import type { EateryRecommendScoreWire } from "@/lib/globe/eatery/eatery-resource-types";
import { scoreEateryRecommendations } from "@/lib/globe/eatery/score-eatery-recommendations";
import { writeEateryRecommendReasons } from "@/lib/globe/eatery/eatery-recommendation-reason-store";
import { computeLodgingDiscoveryBounds } from "@/lib/globe/lodging/compute-lodging-discovery-bounds";
import { dispatchGlobeLodgingDiscoveryClose } from "@/lib/globe/lodging/globe-lodging-discovery-bridge";
import { LODGING_DISCOVERY_RADIUS_M } from "@/lib/globe/lodging/lodging-discovery-constants";
import { copy } from "@/lib/copy/human-ko";

export type RunGlobeEateryDiscoveryInput = {
  message: string;
  contextEventId?: string | null;
  lat?: number | null;
  lng?: number | null;
  searching?: boolean;
  radiusM?: number;
};

export type GlobeEateryDiscoveryOutcome = {
  eventId: string;
  summaryKo: string;
  topName: string;
  topReasonKo: string;
  resourceIds: string[];
  session: GlobeEateryDiscoverySession;
  bounds: ReturnType<typeof computeLodgingDiscoveryBounds>;
};

/** Globe composer — detect food intent, fetch Places, score, reveal pins + session UI. */
export async function runGlobeEateryDiscovery(
  input: RunGlobeEateryDiscoveryInput,
): Promise<GlobeEateryDiscoveryOutcome | null> {
  const intent = detectEaterySearchIntent(input.message);
  if (!intent && !input.searching) {
    return null;
  }

  const eventId = input.contextEventId?.trim();
  if (!eventId) {
    return null;
  }

  const event = findLifeEventCandidate(eventId);
  if (!event) {
    return null;
  }

  dispatchGlobeLodgingDiscoveryClose();

  const masterContext =
    typeof window !== "undefined"
      ? readClientMasterOrchestratorContext()
      : defaultMasterOrchestratorContext();

  const unifiedContext = buildUnifiedExperienceContext({
    message: input.message,
    masterContext,
  });

  const radiusM = input.radiusM ?? LODGING_DISCOVERY_RADIUS_M;

  const loaded = await loadEateryInventoryRows({
    event,
    lat: input.lat,
    lng: input.lng,
    maxResults: 5,
    preferUserLocation: true,
    radiusM,
  });

  if (loaded.rows.length === 0) {
    return null;
  }

  const scored = scoreEateryRecommendations({
    rows: loaded.rows,
    unifiedContext,
    lat: input.lat,
    lng: input.lng,
  });

  const resourceIdByPlaceId: Record<string, string> = {};
  const scoreWire: Record<string, EateryRecommendScoreWire> = {};
  for (const entry of scored) {
    const resource = mapEateryRowToContextResource(event, entry.row);
    resourceIdByPlaceId[entry.row.placeId] = resource.resourceId;
    scoreWire[entry.row.placeId] = {
      score: entry.score,
      reasonKo: entry.reasonKo,
      matchReasons: entry.matchReasons,
    };
  }

  const sortedRows = scored.map((entry) => entry.row);
  commitEateryInventoryToEvent({
    event,
    inventory: sortedRows,
    inventorySource: loaded.source,
    recommendScores: scoreWire,
  });

  writeEateryRecommendReasons(eventId, scoreWire);

  const session = projectEateryDiscoverySession({
    eventId,
    scored,
    unifiedContext,
    userLat: input.lat,
    userLng: input.lng,
    eventPlace: event.place,
    searching: input.searching ?? false,
    radiusM,
    resourceIdByPlaceId,
  });

  if (!session) {
    return null;
  }

  const top = scored[0]!;
  const priceLine = top.row.cuisineHint?.trim() || null;
  const summaryKo = copy.globe.eateryDiscoverySummary(top.row.name, top.reasonKo, priceLine);

  const resourceIds = sortedRows.map(
    (row) => resourceIdByPlaceId[row.placeId]!,
  );

  const bounds = computeLodgingDiscoveryBounds({
    user:
      input.lat != null && input.lng != null
        ? { lat: input.lat, lng: input.lng }
        : null,
    lodging: sortedRows.map((row) => ({ lat: row.lat, lng: row.lng })),
    radiusM,
  });

  dispatchGlobeEateryDiscoverySession(session);
  dispatchGlobeEateryDiscoveryStart({ eventId, resourceIds });
  runStagedEateryPinReveal({ eventId, resourceIds });
  dispatchGlobeEateryDiscoverySummary({
    eventId,
    summaryKo,
    topName: top.row.name,
    topReasonKo: top.reasonKo,
  });

  return {
    eventId,
    summaryKo,
    topName: top.row.name,
    topReasonKo: top.reasonKo,
    resourceIds,
    session,
    bounds,
  };
}
