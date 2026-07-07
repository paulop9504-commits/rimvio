import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import {
  readClientMasterOrchestratorContext,
  defaultMasterOrchestratorContext,
} from "@/lib/experience-context/read-client-master-orchestrator-context";
import { buildUnifiedExperienceContext } from "@/lib/experience-context/build-unified-experience-context";
import { copy } from "@/lib/copy/human-ko";
import { toReadablePlaceLabel } from "@/lib/globe/readable-place-label";
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
  excludePlaceIds?: readonly string[];
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

/** Strip command/filler tails so the local search query stays a clean noun. */
function stripSearchCommandNoise(text: string): string {
  return text
    .replace(
      /(?:찾아\s*줘|찾아줘|찾아|찾기|추천\s*해\s*줘|추천해줘|추천|검색\s*해\s*줘|검색|알려\s*줘|알려줘|좀|해\s*줘|해줘|보여\s*줘|보여줘)/giu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function resolveContextConditionEateryQuery(input: {
  userMessage?: string | null;
  anchorName: string;
  vibe: LocalDiscoveryVibe;
  eateryFocus?: string | null;
}): string {
  const area = input.anchorName.trim() || "근처";
  if (input.eateryFocus?.trim()) {
    return `${area} ${input.eateryFocus.trim()}`;
  }
  const raw = input.userMessage?.trim();
  if (raw) {
    // Cafe intent must search cafes, not generic restaurants.
    if (/카페|커피|coffee|cafe/iu.test(raw)) {
      return `${area} 카페`;
    }
    const cleaned = stripSearchCommandNoise(raw);
    if (cleaned.length >= 2) {
      return cleaned;
    }
  }
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
  eateryFocus?: string | null;
  activityLabelKo?: string | null;
}): string {
  const { lodgingCount, eateryCount, radiusM, eateryFocus } = input;
  const total = lodgingCount + eateryCount;
  if (total <= 0) {
    return copy.globe.contextConditionPinEmpty;
  }
  // activity/amenity results ride the eatery channel — label them correctly.
  if (input.activityLabelKo?.trim() && eateryCount > 0 && lodgingCount === 0) {
    return `${input.activityLabelKo.trim()} ${eateryCount}곳을 지도에 표시했어요`;
  }
  if (eateryCount > 0 && lodgingCount === 0 && eateryFocus?.trim()) {
    return copy.globe.cicadaAgentVisualizeSummary(eateryFocus.trim(), eateryCount);
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
  /** When set, eatery-channel rows are activity/amenity places, not restaurants. */
  activityKind?: "activity" | "amenity" | null;
}): ContextConditionRecommendation[] {
  const rows: ContextConditionRecommendation[] = [];
  for (const [index, row] of input.lodgingScored.entries()) {
    rows.push({
      kind: "lodging",
      title: toReadablePlaceLabel(row.row.name) || row.row.placeId,
      reasonKo: row.reasonKo,
      rank: index + 1,
      placeId: row.row.placeId,
      lat: row.row.lat,
      lng: row.row.lng,
    });
  }
  const eateryKind = input.activityKind ?? "eatery";
  for (const [index, row] of input.eateryScored.entries()) {
    rows.push({
      kind: eateryKind,
      title: toReadablePlaceLabel(row.row.name) || row.row.placeId,
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
  const activityKind: "activity" | "amenity" | null =
    spec.resourceTypes.includes("amenity")
      ? "amenity"
      : spec.resourceTypes.includes("activity")
        ? "activity"
        : null;
  const wantsActivity = activityKind !== null && patchScope !== "lodging_only";
  const wantsLodging =
    !wantsActivity &&
    patchScope !== "eatery_only" &&
    spec.resourceTypes.includes("hotel") &&
    intent.lodgingSimilar !== false;
  const wantsEatery =
    !wantsActivity &&
    patchScope !== "lodging_only" &&
    spec.resourceTypes.includes("restaurant") &&
    intent.eateryNearby !== false;
  const activityLabelKo = wantsActivity
    ? spec.activityFocus?.trim() || (activityKind === "amenity" ? "장소" : "놀거리")
    : null;

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
      eateryFocus: spec.eateryFocus,
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

  if (wantsActivity) {
    input.onProcessPhase?.("analyzing");
    const area = input.anchorPlaceName.trim() || "근처";
    const focus = spec.activityFocus?.trim();
    // activityFocus from a convergence chip already carries the region — avoid
    // prepending it twice (e.g. "오사카 오사카 테마파크").
    const withArea = (term: string): string =>
      term.includes(area) ? term : `${area} ${term}`.trim();
    const activityQuery = focus
      ? withArea(focus)
      : `${area} ${activityKind === "amenity" ? "장소" : "놀거리"}`;
    // Amenities (약국·편의점) are truly nearby; activities/landmarks (유니버설 등)
    // are city-wide and can sit far from the lodging anchor. Don't clip them.
    const isAmenity = activityKind === "amenity";
    const activityRadiusM = isAmenity ? radiusM : 50000;

    // Trigger → cluster: a chip answer activates related nodes (도파민 →
    // 테마파크·놀이공원·포토스팟). Multi-query them + the focus and merge, so the
    // map shows one reconstructed context (유니버설 + 주변 놀거리), not one keyword.
    const cluster = isAmenity
      ? []
      : (spec.activityCluster ?? [])
          .map((node) => node.trim())
          .filter((node) => node.length > 0);
    const queries = Array.from(
      new Set([activityQuery, ...cluster.map((node) => withArea(node))]),
    ).slice(0, 4);

    const loadedBatches = await Promise.all(
      queries.map((query) =>
        loadEateryInventoryRows({
          event,
          message: query,
          lat: input.anchorLat,
          lng: input.anchorLng,
          maxResults: 12,
          radiusM: activityRadiusM,
        }),
      ),
    );
    const mergedById = new Map<string, (typeof loadedBatches)[number]["rows"][number]>();
    for (const batch of loadedBatches) {
      for (const row of batch.rows) {
        if (!mergedById.has(row.placeId)) {
          mergedById.set(row.placeId, row);
        }
      }
    }
    const mergedRows = [...mergedById.values()];
    eaterySource =
      loadedBatches.find((batch) => batch.source && batch.source !== "mock")
        ?.source ??
      loadedBatches[0]?.source ??
      null;

    // Focus tokens minus the region word (so "오사카" doesn't match every row),
    // plus cluster nodes — any related node in the name boosts relevance.
    const focusTail = focus ? focus.replace(area, "").trim() || focus : null;
    const focusMatch = isAmenity
      ? null
      : [focusTail, ...cluster].filter(Boolean).join(" ") || null;
    eateryScored = scoreEateryRecommendations({
      rows: mergedRows,
      unifiedContext,
      lat: input.anchorLat,
      lng: input.anchorLng,
      context: contextInstance,
      // Landmark discovery: relevance over proximity so a far exact match
      // (유니버설 스튜디오) outranks a nearby unrelated café.
      distanceWeight: isAmenity ? 1 : 0.1,
      focusMatch,
    }).slice(0, cluster.length > 0 ? 6 : 4);

    // Relevance threshold (Search Filter): a chip-driven focus is high intent.
    // If nothing in the results actually matches the focus/cluster, don't force
    // an off-topic pin (e.g. "유니버설" → &ISLAND café) — return no-fit so the
    // assistant answers conversationally instead of pinning junk.
    if (!isAmenity && focus && focusMatch) {
      const focusTokens = focusMatch
        .toLowerCase()
        .split(/[\s·,]+/u)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2);
      const anyRelevant =
        focusTokens.length === 0 ||
        eateryScored.some((entry) => {
          const blob = [
            entry.row.name,
            entry.row.categoryLabel,
            entry.row.cuisineHint,
            entry.row.address,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return focusTokens.some((token) => blob.includes(token));
        });
      if (!anyRelevant) {
        eateryScored = [];
      }
    }
    eateryRows = eateryScored.map((row) => row.row);
  }

  if (lodgingRows.length === 0 && eateryRows.length === 0) {
    return null;
  }

  const exclude = new Set(
    (input.excludePlaceIds ?? [])
      .map((placeId) => placeId.trim())
      .filter((placeId) => placeId.length > 0),
  );
  if (exclude.size > 0) {
    lodgingScored = lodgingScored.filter((row) => !exclude.has(row.row.placeId));
    eateryScored = eateryScored.filter((row) => !exclude.has(row.row.placeId));
    lodgingRows = lodgingScored.map((row) => row.row);
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

  const recommendations = buildRecommendations({
    lodgingScored,
    eateryScored,
    activityKind,
  });

  const outcome: ContextConditionAnchorPinOutcome = {
    batchId,
    lodgingCount: lodgingRows.length,
    eateryCount: eateryRows.length,
    summaryKo: buildSummaryKo({
      lodgingCount: lodgingRows.length,
      eateryCount: eateryRows.length,
      radiusM,
      eateryFocus: spec.eateryFocus,
      activityLabelKo,
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
