import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import {
  readClientMasterOrchestratorContext,
  defaultMasterOrchestratorContext,
} from "@/lib/experience-context/read-client-master-orchestrator-context";
import { buildUnifiedExperienceContext } from "@/lib/experience-context/build-unified-experience-context";
import { copy } from "@/lib/copy/human-ko";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  classifyContextConditionAnchorRequest,
  filterLodgingRowsForContextCondition,
} from "@/lib/globe/context-condition-ai/classify-context-condition-anchor-request";
import type {
  ContextConditionAnchorPinOutcome,
  ContextConditionRecommendation,
  LocalDiscoveryActionSpec,
  LocalDiscoveryBudget,
  LocalDiscoveryVibe,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { commitContextConditionHubBatch } from "@/lib/globe/context-condition-ai/commit-context-condition-hub-batch";
import { writeContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { syncContextConditionPins } from "@/lib/globe/context-condition-ai/sync-context-condition-pins";
import { loadLodgingInventoryRows } from "@/lib/globe/context-hub/load-lodging-inventory-rows";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { loadEateryInventoryRows } from "@/lib/globe/eatery/load-eatery-inventory-rows";
import { scoreEateryRecommendations } from "@/lib/globe/eatery/score-eatery-recommendations";
import { scoreLodgingRecommendations } from "@/lib/globe/lodging/score-lodging-recommendations";
import { LOCAL_DISCOVERY_RECOMMEND_CAP } from "@/lib/globe/context-condition-ai/local-discovery-limits";
import { pickTopLocalDiscoveryRows } from "@/lib/globe/context-condition-ai/pick-top-local-discovery-rows";
import { buildContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/build-context-condition-discovery-overlay";
import { publishContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-bridge";
import { resolveSpatialPatchKeptRows } from "@/lib/globe/context-condition-ai/resolve-spatial-patch-kept-rows";
import type { SpatialPatchPlan } from "@/lib/globe/context-condition-ai/spatial-patch-types";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";

export type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

export type ContextConditionAnchorPinInput = {
  contextEventId: string;
  anchorPlaceId: string;
  anchorPlaceName: string;
  anchorLat: number;
  anchorLng: number;
  anchorPriceKrw?: number | null;
  message?: string | null;
  spec: LocalDiscoveryActionSpec;
  patchPlan?: SpatialPatchPlan | null;
  keptRecommendations?: readonly ContextConditionRecommendation[];
  onProcessPhase?: (phase: import("@/lib/globe/context-agent/context-agent-runtime-state").ContextAgentProcessPhase) => void;
};

function filterLodgingByBudget(
  rows: readonly ContextLodgingInventoryRow[],
  budget: LocalDiscoveryBudget,
): ContextLodgingInventoryRow[] {
  const priced = rows.filter(
    (row) => row.priceKrw != null && Number.isFinite(row.priceKrw),
  );
  if (priced.length === 0) {
    return [...rows];
  }
  const sorted = [...priced].sort((a, b) => (a.priceKrw ?? 0) - (b.priceKrw ?? 0));
  if (budget === "low") {
    return sorted.slice(0, Math.max(4, Math.ceil(sorted.length * 0.4)));
  }
  if (budget === "high") {
    return sorted.slice(-Math.max(4, Math.ceil(sorted.length * 0.4)));
  }
  const start = Math.floor(sorted.length * 0.25);
  return sorted.slice(start, start + Math.max(4, Math.ceil(sorted.length * 0.5)));
}

function resolveContextConditionEateryQuery(input: {
  userMessage?: string | null;
  anchorName: string;
  vibe: LocalDiscoveryVibe;
}): string {
  if (input.userMessage?.trim()) {
    return input.userMessage.trim();
  }
  const area = input.anchorName.trim() || "근처";
  switch (input.vibe) {
    case "local":
      return `${area} 현지 맛집`;
    case "quiet":
      return `${area} 조용한 식당`;
    case "hot":
      return `${area} 핫플 맛집`;
    case "popular":
    default:
      return `${area} 인기 맛집`;
  }
}

function buildSummaryKo(input: {
  lodgingCount: number;
  eateryCount: number;
  radiusM: number;
}): string {
  const { lodgingCount, eateryCount, radiusM } = input;
  const total = lodgingCount + eateryCount;
  if (total <= 0) {
    return copy.globe.contextConditionPinEmpty;
  }
  const radiusLine = copy.globe.localDiscoveryPlacedSummary(radiusM, total);
  if (lodgingCount > 0 && eateryCount === 0) {
    return `${copy.globe.contextConditionPinLodgingDone.replace("{n}", String(lodgingCount))} · ${radiusLine}`;
  }
  if (eateryCount > 0 && lodgingCount === 0) {
    return `${copy.globe.contextConditionPinEateryDone.replace("{n}", String(eateryCount))} · ${radiusLine}`;
  }
  return `${copy.globe.contextConditionPinDone.replace("{n}", String(total))} · ${radiusLine}`;
}

function buildRecommendations(input: {
  lodgingScored: ReturnType<typeof scoreLodgingRecommendations>;
  eateryScored: ReturnType<typeof scoreEateryRecommendations>;
}): ContextConditionRecommendation[] {
  const rows: ContextConditionRecommendation[] = [];
  for (const [index, row] of input.lodgingScored.entries()) {
    rows.push({
      kind: "lodging",
      title: row.row.name?.trim() || row.row.placeId,
      reasonKo: row.reasonKo,
      rank: index + 1,
      placeId: row.row.placeId,
      lat: row.row.lat,
      lng: row.row.lng,
    });
  }
  for (const [index, row] of input.eateryScored.entries()) {
    rows.push({
      kind: "eatery",
      title: row.row.name?.trim() || row.row.placeId,
      reasonKo: row.reasonKo,
      rank: index + 1,
      placeId: row.row.placeId,
      lat: row.row.lat,
      lng: row.row.lng,
    });
  }
  return rows.slice(0, LOCAL_DISCOVERY_RECOMMEND_CAP);
}

/** Structured spec → map placement (pins + ranked overlay reasons). */
export async function runContextConditionAnchorPin(
  input: ContextConditionAnchorPinInput,
): Promise<ContextConditionAnchorPinOutcome | null> {
  const contextEventId = input.contextEventId.trim();
  const event = findLifeEventCandidate(contextEventId);
  if (!event) {
    return null;
  }

  const spec = input.spec;
  const intent = classifyContextConditionAnchorRequest(input.message);
  input.onProcessPhase?.("exploring");
  buildTravelBrainState(event);
  const batchId = `ctxcond-${Date.now()}`;
  const radiusM = spec.radiusM;

  const masterContext =
    typeof window !== "undefined"
      ? readClientMasterOrchestratorContext()
      : defaultMasterOrchestratorContext();
  const unifiedContext = buildUnifiedExperienceContext({
    message: input.message?.trim() ?? "",
    masterContext,
  });
  const contextInstance = buildContextInstance({
    event,
    message: input.message?.trim() ?? undefined,
    lat: input.anchorLat,
    lng: input.anchorLng,
  });

  const patchScope = input.patchPlan?.scope ?? "all";
  const wantsLodging =
    patchScope !== "eatery_only" &&
    spec.resourceTypes.includes("hotel") &&
    intent.lodgingSimilar !== false;
  const wantsEatery =
    patchScope !== "lodging_only" &&
    spec.resourceTypes.includes("restaurant") &&
    intent.eateryNearby !== false;

  const keptRows =
    input.keptRecommendations && input.keptRecommendations.length > 0
      ? resolveSpatialPatchKeptRows({
          event,
          kept: input.keptRecommendations,
        })
      : null;

  let lodgingRows: Awaited<
    ReturnType<typeof loadLodgingInventoryRows>
  >["rows"] = [];
  let lodgingScored: ReturnType<typeof scoreLodgingRecommendations> = [];
  let lodgingSource: string | null = null;
  let eateryRows: Awaited<ReturnType<typeof loadEateryInventoryRows>>["rows"] =
    [];
  let eateryScored: ReturnType<typeof scoreEateryRecommendations> = [];
  let eaterySource: string | null = null;

  if (wantsLodging) {
    input.onProcessPhase?.("analyzing");
    const loaded = await loadLodgingInventoryRows({
      event,
      lat: input.anchorLat,
      lng: input.anchorLng,
      maxResults: 14,
      radiusM,
    });
    lodgingSource = loaded.source;
    const filtered = filterLodgingRowsForContextCondition({
      rows: filterLodgingByBudget(loaded.rows, spec.budget),
      anchorPlaceId: input.anchorPlaceId,
      anchorPriceKrw: input.anchorPriceKrw,
      lodgingMode: intent.lodgingMode,
      max: intent.lodgingMode === "similar_price" ? 3 : 4,
    });
    lodgingScored = scoreLodgingRecommendations({
      rows: filtered,
      unifiedContext,
      lat: input.anchorLat,
      lng: input.anchorLng,
      context: contextInstance,
    }).slice(0, intent.lodgingMode === "similar_price" ? 3 : 4);
    lodgingRows = lodgingScored.map((row) => row.row);
  }

  if (wantsEatery) {
    input.onProcessPhase?.("analyzing");
    const eateryQuery = resolveContextConditionEateryQuery({
      userMessage: input.message,
      anchorName: input.anchorPlaceName,
      vibe: spec.vibe,
    });
    const loaded = await loadEateryInventoryRows({
      event,
      message: eateryQuery,
      lat: input.anchorLat,
      lng: input.anchorLng,
      maxResults: 10,
      radiusM,
    });
    eaterySource = loaded.source;
    eateryScored = scoreEateryRecommendations({
      rows: loaded.rows,
      unifiedContext,
      lat: input.anchorLat,
      lng: input.anchorLng,
      context: contextInstance,
    }).slice(0, 4);
    eateryRows = eateryScored.map((row) => row.row);
  }

  if (lodgingRows.length === 0 && eateryRows.length === 0) {
    return null;
  }

  const picked = pickTopLocalDiscoveryRows({
    lodgingScored: [
      ...(keptRows?.lodgingScored ?? []),
      ...lodgingScored,
    ],
    eateryScored: [...(keptRows?.eateryScored ?? []), ...eateryScored],
  });
  lodgingScored = picked.lodgingScored;
  eateryScored = picked.eateryScored;
  lodgingRows = picked.lodgingRows;
  eateryRows = picked.eateryRows;

  if (lodgingRows.length === 0 && eateryRows.length === 0) {
    return null;
  }

  input.onProcessPhase?.("optimizing");
  const committedEvent = commitContextConditionHubBatch({
    event,
    batchId,
    lodgingRows,
    eateryRows,
    lodgingScored,
    eateryScored,
    lodgingSource,
    eaterySource,
  });

  syncContextConditionPins({
    contextEvent: committedEvent,
    batchId,
    lodgingRows,
    eateryRows,
  });

  const pinPoints = [
    ...lodgingRows.map((row) => ({ lat: row.lat, lng: row.lng })),
    ...eateryRows.map((row) => ({ lat: row.lat, lng: row.lng })),
  ];

  const recommendations = buildRecommendations({ lodgingScored, eateryScored });

  const outcome: ContextConditionAnchorPinOutcome = {
    batchId,
    lodgingCount: lodgingRows.length,
    eateryCount: eateryRows.length,
    summaryKo: buildSummaryKo({
      lodgingCount: lodgingRows.length,
      eateryCount: eateryRows.length,
      radiusM,
    }),
    pinPoints,
    radiusM,
    recommendations,
    spec,
  };

  writeContextConditionLastBatch(contextEventId, {
    batchId,
    count: lodgingRows.length + eateryRows.length,
    summaryKo: outcome.summaryKo,
    atIso: new Date().toISOString(),
    recommendations: recommendations.map((row) => ({
      kind: row.kind,
      title: row.title,
      reasonKo: row.reasonKo,
      placeId: row.placeId,
      lat: row.lat,
      lng: row.lng,
    })),
    radiusM,
    spec,
  });

  publishContextConditionDiscoveryOverlay(
    buildContextConditionDiscoveryOverlay({
      contextEventId,
      anchorLat: input.anchorLat,
      anchorLng: input.anchorLng,
      outcome,
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

  return outcome;
}
