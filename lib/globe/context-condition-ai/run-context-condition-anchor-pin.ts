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
import { commitContextConditionHubBatch } from "@/lib/globe/context-condition-ai/commit-context-condition-hub-batch";
import { writeContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { syncContextConditionPins } from "@/lib/globe/context-condition-ai/sync-context-condition-pins";
import { loadLodgingInventoryRows } from "@/lib/globe/context-hub/load-lodging-inventory-rows";
import { loadEateryInventoryRows } from "@/lib/globe/eatery/load-eatery-inventory-rows";
import { scoreEateryRecommendations } from "@/lib/globe/eatery/score-eatery-recommendations";
import { LODGING_DISCOVERY_RADIUS_M } from "@/lib/globe/lodging/lodging-discovery-constants";
import { scoreLodgingRecommendations } from "@/lib/globe/lodging/score-lodging-recommendations";
import {
  buildTravelBrainState,
  type TravelFoodBias,
} from "@/lib/situation-projection/travel-brain-personalization";

export type ContextConditionAnchorPinInput = {
  contextEventId: string;
  anchorPlaceId: string;
  anchorPlaceName: string;
  anchorLat: number;
  anchorLng: number;
  anchorPriceKrw?: number | null;
  message?: string | null;
};

export type ContextConditionAnchorPinOutcome = {
  batchId: string;
  lodgingCount: number;
  eateryCount: number;
  summaryKo: string;
  pinPoints: readonly { lat: number; lng: number }[];
};

function resolveContextConditionEateryQuery(input: {
  userMessage?: string | null;
  anchorName: string;
  foodBias?: TravelFoodBias | null;
}): string {
  if (input.userMessage?.trim()) {
    return input.userMessage.trim();
  }
  const area = input.anchorName.trim() || "근처";
  switch (input.foodBias) {
    case "local":
      return `${area} 현지 맛집`;
    case "landmark":
      return `${area} 유명 맛집`;
    case "cafe":
      return `${area} 카페`;
    case "late_night":
      return `${area} 야식`;
    case "value":
      return `${area} 가성비 식당`;
    default:
      return `${area} 맛집`;
  }
}

function buildSummaryKo(input: {
  lodgingCount: number;
  eateryCount: number;
}): string {
  const { lodgingCount, eateryCount } = input;
  const total = lodgingCount + eateryCount;
  if (total <= 0) {
    return copy.globe.contextConditionPinEmpty;
  }
  if (lodgingCount > 0 && eateryCount === 0) {
    return copy.globe.contextConditionPinLodgingDone.replace(
      "{n}",
      String(lodgingCount),
    );
  }
  if (eateryCount > 0 && lodgingCount === 0) {
    return copy.globe.contextConditionPinEateryDone.replace(
      "{n}",
      String(eateryCount),
    );
  }
  return copy.globe.contextConditionPinDone.replace("{n}", String(total));
}

/**
 * Context Condition AI — locked anchor + condition expression → immediate map pins.
 * Not Globe AI composer · not Personal Context AI recall ask.
 */
export async function runContextConditionAnchorPin(
  input: ContextConditionAnchorPinInput,
): Promise<ContextConditionAnchorPinOutcome | null> {
  const contextEventId = input.contextEventId.trim();
  const event = findLifeEventCandidate(contextEventId);
  if (!event) {
    return null;
  }

  const intent = classifyContextConditionAnchorRequest(input.message);
  const travelBrain = buildTravelBrainState(event);
  const batchId = `ctxcond-${Date.now()}`;

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

  let lodgingRows: Awaited<
    ReturnType<typeof loadLodgingInventoryRows>
  >["rows"] = [];
  let lodgingScored: ReturnType<typeof scoreLodgingRecommendations> = [];
  let lodgingSource: string | null = null;
  let eateryRows: Awaited<ReturnType<typeof loadEateryInventoryRows>>["rows"] =
    [];
  let eateryScored: ReturnType<typeof scoreEateryRecommendations> = [];
  let eaterySource: string | null = null;

  if (intent.lodgingSimilar) {
    const loaded = await loadLodgingInventoryRows({
      event,
      lat: input.anchorLat,
      lng: input.anchorLng,
      maxResults: 12,
      radiusM: LODGING_DISCOVERY_RADIUS_M,
    });
    lodgingSource = loaded.source;
    const filtered = filterLodgingRowsForContextCondition({
      rows: loaded.rows,
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

  if (intent.eateryNearby) {
    const eateryQuery = resolveContextConditionEateryQuery({
      userMessage: input.message,
      anchorName: input.anchorPlaceName,
      foodBias: travelBrain.slots.food_bias.value,
    });
    const loaded = await loadEateryInventoryRows({
      event,
      message: eateryQuery,
      lat: input.anchorLat,
      lng: input.anchorLng,
      maxResults: 10,
      radiusM: LODGING_DISCOVERY_RADIUS_M,
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

  const outcome: ContextConditionAnchorPinOutcome = {
    batchId,
    lodgingCount: lodgingRows.length,
    eateryCount: eateryRows.length,
    summaryKo: buildSummaryKo({
      lodgingCount: lodgingRows.length,
      eateryCount: eateryRows.length,
    }),
    pinPoints,
  };

  writeContextConditionLastBatch(contextEventId, {
    batchId,
    count: lodgingRows.length + eateryRows.length,
    summaryKo: outcome.summaryKo,
    atIso: new Date().toISOString(),
  });

  return outcome;
}
