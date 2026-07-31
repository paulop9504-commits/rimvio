import {
  readClientMasterOrchestratorContext,
  defaultMasterOrchestratorContext,
} from "@/lib/experience-context/read-client-master-orchestrator-context";
import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import { buildUnifiedExperienceContext } from "@/lib/experience-context/build-unified-experience-context";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitLodgingInventoryToEvent } from "@/lib/globe/context-hub/commit-lodging-inventory";
import { loadLodgingInventoryRows } from "@/lib/globe/context-hub/load-lodging-inventory-rows";
import type { LodgingRecommendScoreWire } from "@/lib/globe/context-hub/lodging-resource-types";
import { mapLodgingRowToContextResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { computeLodgingDiscoveryBounds } from "@/lib/globe/lodging/compute-lodging-discovery-bounds";
import { detectLodgingSearchIntent } from "@/lib/globe/lodging/detect-lodging-search-intent";
import { GLOBE_DISCOVERY_FETCH_LIMIT } from "@/lib/globe/discovery/globe-discovery-feed";
import {
  dispatchGlobeLodgingDiscoverySession,
  dispatchGlobeLodgingDiscoverySummary,
} from "@/lib/globe/lodging/globe-lodging-discovery-bridge";
import { dispatchGlobeEateryDiscoveryClose } from "@/lib/globe/eatery/globe-eatery-discovery-bridge";
import { LODGING_DISCOVERY_RADIUS_M } from "@/lib/globe/lodging/lodging-discovery-constants";
import { writeLodgingRecommendReasons } from "@/lib/globe/lodging/lodging-recommendation-reason-store";
import {
  projectLodgingDiscoverySession,
  type GlobeLodgingDiscoverySession,
} from "@/lib/globe/lodging/project-lodging-discovery-session";
import { scoreLodgingRecommendations } from "@/lib/globe/lodging/score-lodging-recommendations";
import { resolveContextLodgingSearchCoords } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";
import { openLodgingContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import { lodgingInventoryRowsToPlaceHits } from "@/lib/context-workspace/lodging-inventory-to-place-hits";
import { writeContextWorkspaceExpanded } from "@/lib/context-workspace/workspace-store";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import { copy } from "@/lib/copy/human-ko";

export type RunGlobeLodgingDiscoveryInput = {
  message: string;
  contextEventId?: string | null;
  lat?: number | null;
  lng?: number | null;
  searching?: boolean;
  radiusM?: number;
};

export type GlobeLodgingDiscoveryOutcome = {
  eventId: string;
  summaryKo: string;
  topName: string;
  topReasonKo: string;
  resourceIds: string[];
  session: GlobeLodgingDiscoverySession;
  bounds: ReturnType<typeof computeLodgingDiscoveryBounds>;
};

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

/** Globe composer — detect lodging intent, fetch Places, score, reveal pins + session UI. */
export async function runGlobeLodgingDiscovery(
  input: RunGlobeLodgingDiscoveryInput,
): Promise<GlobeLodgingDiscoveryOutcome | null> {
  const intent = detectLodgingSearchIntent(input.message);
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

  const masterContext =
    typeof window !== "undefined"
      ? readClientMasterOrchestratorContext()
      : defaultMasterOrchestratorContext();

  const unifiedContext = buildUnifiedExperienceContext({
    message: input.message,
    masterContext,
  });

  const context = buildContextInstance({
    event,
    message: input.message,
    lat: input.lat,
    lng: input.lng,
    preferUserLocation: true,
    surface: "composer",
    layerMode: "discovery",
  });
  const radiusM = input.radiusM ?? LODGING_DISCOVERY_RADIUS_M;
  const origin =
    context.location.searchOrigin ??
    resolveContextLodgingSearchCoords(event, {
      lat: input.lat,
      lng: input.lng,
      preferUserLocation: true,
    }) ??
    (input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : null);

  const loaded = await loadLodgingInventoryRows({
    event,
    lat: origin?.lat ?? null,
    lng: origin?.lng ?? null,
    maxResults: GLOBE_DISCOVERY_FETCH_LIMIT,
    preferUserLocation: true,
    radiusM,
  });

  if (loaded.rows.length === 0) {
    return null;
  }

  const scored = scoreLodgingRecommendations({
    rows: loaded.rows,
    unifiedContext,
    lat: origin?.lat ?? null,
    lng: origin?.lng ?? null,
    context,
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

  const session = projectLodgingDiscoverySession({
    eventId,
    scored,
    unifiedContext,
    userLat: origin?.lat ?? null,
    userLng: origin?.lng ?? null,
    eventPlace: context.location.areaLabel ?? context.location.anchor.label ?? event.place,
    searching: input.searching ?? false,
    radiusM,
    resourceIdByPlaceId,
  });

  if (!session) {
    return null;
  }

  const top = scored[0]!;
  const priceLine = formatPriceKrw(top.row.priceKrw);
  const summaryKo = copy.globe.lodgingDiscoverySummary(top.row.name, top.reasonKo, priceLine);

  const resourceIds = sortedRows.map(
    (row) => resourceIdByPlaceId[row.placeId]!,
  );

  const bounds = computeLodgingDiscoveryBounds({
    user:
      origin?.lat != null && origin?.lng != null
        ? { lat: origin.lat, lng: origin.lng }
        : null,
    lodging: sortedRows.map((row) => ({ lat: row.lat, lng: row.lng })),
    radiusM,
  });

  dispatchGlobeEateryDiscoveryClose();
  dispatchGlobeLodgingDiscoverySession(session);
  // Reality OS: no 3D staged pin reveal — open Workspace with inventory.
  openLodgingContextWorkspace({
    contextEventId: eventId,
    query: input.message?.trim() || "숙소",
    summaryKo,
    hits: lodgingInventoryRowsToPlaceHits(sortedRows),
    source: "hotel_search",
  });
  writeContextWorkspaceExpanded(eventId, true);
  if (typeof window !== "undefined") {
    dispatchContextWorkspaceExpand({
      contextEventId: eventId,
      source: "scout_patch",
    });
  }
  dispatchGlobeLodgingDiscoverySummary({
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
