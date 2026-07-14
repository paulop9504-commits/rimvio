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
import {
  filterLodgingRowsForIntent,
  resolveLodgingSearchKeyword,
} from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";
import type {
  ContextConditionAnchorPinOutcome,
  ContextConditionRecommendation,
  LocalDiscoveryActionSpec,
  LocalDiscoveryBudget,
  LocalDiscoveryVibe,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { commitContextConditionHubBatch } from "@/lib/globe/context-condition-ai/commit-context-condition-hub-batch";
import { classifyPlaceCategory } from "@/lib/globe/context-condition-ai/discovery-guard/classify-place-category";
import { verifyDiscoveryResults } from "@/lib/globe/context-condition-ai/discovery-guard/verify-discovery-results";
import {
  INSTANT_POI_MAX_RESULTS,
  INSTANT_POI_PIN_CAP,
} from "@/lib/globe/context-condition-ai/instant-poi-search";
import { writeContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { syncContextConditionPins } from "@/lib/globe/context-condition-ai/sync-context-condition-pins";
import { writeScoutRevealPending } from "@/lib/globe/context-condition-ai/context-condition-scout-reveal-pending-store";
import { emitSearchHubAction } from "@/lib/globe/resource/hub-action-record-store";
import { logExplorationScoutScoreTelemetry } from "@/lib/globe/discovery-policy/log-exploration-score-telemetry";
import { loadLodgingInventoryRows } from "@/lib/globe/context-hub/load-lodging-inventory-rows";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { loadEateryInventoryRows } from "@/lib/globe/eatery/load-eatery-inventory-rows";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import { loadPlaceInventoryRows } from "@/lib/globe/place/load-place-inventory-rows";
import type { ContextPlaceInventoryRow } from "@/lib/globe/place/place-resource-types";
import { isDemoPlaceInventoryRow } from "@/lib/globe/place/is-demo-place-inventory-row";
import { isCoordInKorea } from "@/lib/globe/geo-region-from-coords";
import { scorePlaceRecommendations } from "@/lib/globe/place/score-place-recommendations";
import { scoreEateryRecommendations } from "@/lib/globe/eatery/score-eatery-recommendations";
import { scoreLodgingRecommendations } from "@/lib/globe/lodging/score-lodging-recommendations";
import {
  LOCAL_DISCOVERY_FEED_INVENTORY_CAP,
  LOCAL_DISCOVERY_LODGING_SCOUT_MAX,
  LOCAL_DISCOVERY_RECOMMEND_CAP,
} from "@/lib/globe/context-condition-ai/local-discovery-limits";
import { pickTopLocalDiscoveryRows } from "@/lib/globe/context-condition-ai/pick-top-local-discovery-rows";
import {
  isExplicitActivityLandmarkQuery,
  resolveActivityLandmarkInventoryRow,
} from "@/lib/globe/context-condition-ai/resolve-activity-landmark-inventory";
import {
  applyExplorationMode,
  guardThresholdForDomain,
  readExplorationModeOverride,
  resolveExplorationMode,
} from "@/lib/globe/discovery-policy";
import { explorationScoreBias } from "@/lib/globe/discovery-policy/exploration-score-bias";
import { buildContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/build-context-condition-discovery-overlay";
import { publishContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-bridge";
import { resolveSpatialPatchKeptRows } from "@/lib/globe/context-condition-ai/resolve-spatial-patch-kept-rows";
import type { SpatialPatchPlan } from "@/lib/globe/context-condition-ai/spatial-patch-types";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";
import type { DiscoverySearchOrigin } from "@/lib/globe/discovery-lens/types";

export type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

/** Broad activity with no focus/chip cluster → reconstruct real attractions. */
const DEFAULT_ACTIVITY_CLUSTER = [
  "관광명소",
  "관광지",
  "랜드마크",
  "테마파크",
  "전망대",
  "박물관",
  "공원",
  "강변 산책",
  "리버워크",
] as const;

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
  /** 1st-person POV — overrides anchor for search origin when set. */
  discoveryOrigin?: DiscoverySearchOrigin | null;
  /**
   * When true, skip HubActionRecord(search) emit — caller already logged
   * (e.g. onboarding parallel wrapper).
   */
  skipSearchActionLog?: boolean;
  onProcessPhase?: (phase: import("@/lib/globe/context-agent/context-agent-runtime-state").ContextAgentProcessPhase) => void;
  /** Gate map pins until user confirms in chat (discovery feed opens on confirm). */
  deferMapReveal?: boolean;
};

function resolveDiscoverySearchOrigin(input: {
  anchorLat: number;
  anchorLng: number;
  anchorPlaceName: string;
  spec: LocalDiscoveryActionSpec;
  discoveryOrigin?: DiscoverySearchOrigin | null;
}): {
  lat: number;
  lng: number;
  regionLabel: string;
  radiusM: number;
} {
  const lens = input.discoveryOrigin;
  if (
    lens &&
    Number.isFinite(lens.lat) &&
    Number.isFinite(lens.lng)
  ) {
    return {
      lat: lens.lat,
      lng: lens.lng,
      regionLabel: lens.regionLabel.trim() || "근처",
      radiusM: lens.radiusM,
    };
  }
  return {
    lat: input.anchorLat,
    lng: input.anchorLng,
    regionLabel: input.anchorPlaceName.trim() || "근처",
    radiusM: input.spec.radiusM,
  };
}

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
    // Cafe / beverage intent must search cafes, not generic restaurants or hotels.
    if (/카페|커피|coffee|cafe/iu.test(raw)) {
      return `${area} 카페`;
    }
    if (/음료|음료수|드링크|drink|beverage|목말|갈증/iu.test(raw)) {
      return `${area} 카페 음료`;
    }
    if (/주스|juice|스무디|smoothie/iu.test(raw)) {
      return `${area} 주스 카페`;
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
  activitySubtype?: LocalDiscoveryActionSpec["activitySubtype"];
  recommendCap?: number;
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
      activitySubtype: eateryKind === "activity" ? (input.activitySubtype ?? null) : null,
      title: toReadablePlaceLabel(row.row.name) || row.row.placeId,
      reasonKo: row.reasonKo,
      rank: index + 1,
      placeId: row.row.placeId,
      lat: row.row.lat,
      lng: row.row.lng,
    });
  }
  return rows.slice(0, input.recommendCap ?? LOCAL_DISCOVERY_RECOMMEND_CAP);
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

  // 3-layer: scout search log (resourceId null) — Resource only after pin Commit.
  if (!input.skipSearchActionLog) {
    void emitSearchHubAction({
      contextEventId,
      sourceHubId: "hub.local_discovery",
      approvalPolicy: "user_tap",
      payload: {
        query: input.message?.trim() || input.anchorPlaceName,
        filters: {
          resourceTypes: [...input.spec.resourceTypes],
          radiusM: input.discoveryOrigin?.radiusM ?? input.spec.radiusM,
          patch: Boolean(input.patchPlan),
        },
      },
    });
  }

  const spec = input.spec;
  const explorationMode = resolveExplorationMode({
    message: input.message,
    spec,
    explicitLandmark: isExplicitActivityLandmarkQuery(
      spec.activityFocus ?? input.message ?? "",
    ),
    override: readExplorationModeOverride(contextEventId),
  });
  const exploration = applyExplorationMode(explorationMode);
  const searchOrigin = resolveDiscoverySearchOrigin({
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    anchorPlaceName: input.anchorPlaceName,
    spec,
    discoveryOrigin: input.discoveryOrigin,
  });
  const intent = classifyContextConditionAnchorRequest(input.message);
  input.onProcessPhase?.("exploring");
  const travelBrain = buildTravelBrainState(event);
  const batchId = `ctxcond-${Date.now()}`;
  const radiusM = input.discoveryOrigin?.radiusM ?? spec.radiusM;

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
    lat: searchOrigin.lat,
    lng: searchOrigin.lng,
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
  const activitySubtype = spec.activitySubtype ?? "general";

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
  let activityScoresForTelemetry: readonly number[] | undefined;

  if (wantsLodging) {
    input.onProcessPhase?.("analyzing");
    const lodgingKeyword = resolveLodgingSearchKeyword({
      lodgingKind: spec.lodgingKind,
      lodgingStayType: spec.lodgingStayType ?? null,
      message: input.message,
    });
    const loaded = await loadLodgingInventoryRows({
      event,
      lat: searchOrigin.lat,
      lng: searchOrigin.lng,
      maxResults: LOCAL_DISCOVERY_LODGING_SCOUT_MAX,
      radiusM,
      keyword: lodgingKeyword,
    });
    lodgingSource = loaded.source;
    const lodgingFilterMax =
      intent.lodgingMode === "similar_price"
        ? 6
        : exploration.feedInventoryCap;
    const intentFiltered = filterLodgingRowsForIntent({
      rows: loaded.rows,
      lodgingKind: spec.lodgingKind,
      lodgingStayType: spec.lodgingStayType ?? null,
      budget: spec.budget,
      maxNightlyPriceKrw: spec.maxNightlyPriceKrw ?? null,
    });
    const budgetFiltered = filterLodgingByBudget(
      intentFiltered.length > 0 ? intentFiltered : loaded.rows,
      spec.budget,
    );
    const filtered = filterLodgingRowsForContextCondition({
      rows: budgetFiltered,
      anchorPlaceId: input.anchorPlaceId,
      anchorPriceKrw: input.anchorPriceKrw,
      lodgingMode: intent.lodgingMode,
      max: lodgingFilterMax,
    });
    lodgingScored = scoreLodgingRecommendations({
      rows: filtered,
      unifiedContext,
      lat: searchOrigin.lat,
      lng: searchOrigin.lng,
      context: contextInstance,
      event,
      travelBrain,
      exploration,
    }).slice(0, lodgingFilterMax);
    lodgingRows = lodgingScored.map((row) => row.row);
  }

  if (wantsEatery) {
    input.onProcessPhase?.("analyzing");
    const eateryQuery = resolveContextConditionEateryQuery({
      userMessage: input.message,
      anchorName: searchOrigin.regionLabel,
      vibe: spec.vibe,
      eateryFocus: spec.eateryFocus,
    });
    const loaded = await loadEateryInventoryRows({
      event,
      message: eateryQuery,
      lat: searchOrigin.lat,
      lng: searchOrigin.lng,
      maxResults: exploration.eateryMaxResults,
      radiusM,
    });
    eaterySource = loaded.source;
    const scored = scoreEateryRecommendations({
      rows: loaded.rows,
      unifiedContext,
      lat: searchOrigin.lat,
      lng: searchOrigin.lng,
      context: contextInstance,
      event,
      travelBrain,
      exploration: exploration,
    });
    // Category integrity (flexible): drop clearly off-domain rows (a hotel in a
    // food search) but keep adjacent picks so results stay rich.
    const guarded = verifyDiscoveryResults({
      domain: "eatery",
      items: scored,
      focusTokens: (spec.eateryFocus ?? "").split(/[\s·,]+/u),
      guardThreshold: guardThresholdForDomain(exploration, "eatery"),
    });
    eateryScored = (guarded.kept.length > 0 ? guarded.kept : scored).slice(
      0,
      exploration.eateryPresentCap,
    );
    eateryRows = eateryScored.map((row) => row.row);
  }

  if (wantsActivity) {
    input.onProcessPhase?.("analyzing");
    const area = searchOrigin.regionLabel;
    // Lens / hotel POV — keep Naver queries city-scoped; coords carry the radius.
    const queryArea =
      input.discoveryOrigin && input.anchorPlaceName.trim()
        ? input.anchorPlaceName.trim()
        : area;
    const focus = spec.activityFocus?.trim();
    // activityFocus from a convergence chip already carries the region — avoid
    // prepending it twice (e.g. "오사카 오사카 테마파크").
    const withArea = (term: string): string =>
      term.includes(queryArea) ? term : `${queryArea} ${term}`.trim();
    const activityQuery = focus
      ? withArea(focus)
      : `${queryArea} ${activityKind === "amenity" ? "장소" : "놀거리"}`;
    const isAmenity = activityKind === "amenity";
    const activityRadiusM = input.discoveryOrigin
      ? searchOrigin.radiusM
      : isAmenity
        ? Math.max(radiusM, spec.radiusM)
        : 50000;
    const amenityMaxResults = INSTANT_POI_MAX_RESULTS;

    // Trigger → cluster: a chip answer activates related nodes (도파민 →
    // 테마파크·놀이공원·포토스팟). Multi-query them + the focus and merge, so the
    // map shows one reconstructed context (유니버설 + 주변 놀거리), not one keyword.
    const landmarkQuery = [focus, activityQuery].find((query) =>
      isExplicitActivityLandmarkQuery(query),
    );
    const isLandmarkScout = Boolean(landmarkQuery);

    const chipCluster = isAmenity
      ? []
      : (spec.activityCluster ?? [])
          .map((node) => node.trim())
          .filter((node) => node.length > 0);
    const cluster =
      isLandmarkScout || isAmenity
        ? []
        : !isAmenity && chipCluster.length === 0 && !focus
          ? DEFAULT_ACTIVITY_CLUSTER
          : chipCluster;
    const queries = isLandmarkScout
      ? []
      : Array.from(
          new Set([activityQuery, ...cluster.map((node) => withArea(node))]),
        ).slice(0, 8);

    let resolvedLandmark: Awaited<
      ReturnType<typeof resolveActivityLandmarkInventoryRow>
    > = null;
    if (landmarkQuery) {
      resolvedLandmark = await resolveActivityLandmarkInventoryRow({
        query: landmarkQuery,
        lat: searchOrigin.lat,
        lng: searchOrigin.lng,
      });
    }

    const loadedBatches = isLandmarkScout
      ? []
      : await Promise.all(
          queries.map((query) =>
            wantsActivity
              ? loadPlaceInventoryRows({
                  event,
                  domain: activityKind ?? "activity",
                  query,
                  lat: searchOrigin.lat,
                  lng: searchOrigin.lng,
                  maxResults: isAmenity
                    ? amenityMaxResults
                    : isLandmarkScout
                      ? 4
                      : 12,
                  radiusM: activityRadiusM,
                })
              : loadEateryInventoryRows({
                  event,
                  message: query,
                  lat: searchOrigin.lat,
                  lng: searchOrigin.lng,
                  maxResults: isLandmarkScout ? 4 : 12,
                  radiusM: activityRadiusM,
                }),
          ),
        );
    const mergedById = new Map<string, ContextPlaceInventoryRow>();
    for (const batch of loadedBatches) {
      for (const row of batch.rows) {
        if (!mergedById.has(row.placeId)) {
          mergedById.set(row.placeId, row);
        }
      }
    }

    if (resolvedLandmark) {
      mergedById.set(resolvedLandmark.placeId, resolvedLandmark);
    }

    // Multi-query clusters used to glue Korea demo mocks onto Tokyo Google hits
    // whenever one keyword missed Nearby. Prefer real rows; drop demo placeholders.
    const allMerged = [...mergedById.values()];
    const originOverseas = !isCoordInKorea(searchOrigin.lat, searchOrigin.lng);
    const withoutDemo = allMerged.filter((row) => !isDemoPlaceInventoryRow(row));
    const regionFit = originOverseas
      ? withoutDemo.filter((row) => !isCoordInKorea(row.lat, row.lng))
      : withoutDemo;
    const mergedRows =
      regionFit.length > 0
        ? regionFit
        : originOverseas
          ? []
          : withoutDemo.length > 0
            ? withoutDemo
            : allMerged;
    eaterySource =
      loadedBatches.find((batch) => batch.source && batch.source !== "mock")
        ?.source ??
      (resolvedLandmark ? "google_places" : null) ??
      (mergedRows.length > 0 && mergedRows.every((row) => !isDemoPlaceInventoryRow(row))
        ? "google_places"
        : loadedBatches[0]?.source) ??
      null;

    // Focus tokens minus the region word (so "오사카" doesn't match every row),
    // plus cluster nodes — any related node in the name boosts relevance.
    const focusTail = focus ? focus.replace(queryArea, "").trim() || focus : null;
    const focusMatch = isAmenity
      ? null
      : [focusTail, ...cluster].filter(Boolean).join(" ") || null;
    const activityScored = scorePlaceRecommendations({
      domain: isAmenity ? "amenity" : "activity",
      rows: mergedRows,
      lat: searchOrigin.lat,
      lng: searchOrigin.lng,
      focusMatch,
      activitySubtype,
      exploration,
    }).slice(
      0,
      isLandmarkScout
        ? exploration.activityLandmarkPinCap
        : isAmenity
          ? INSTANT_POI_PIN_CAP
          : cluster.length > 0
            ? exploration.activityPresentCap + 2
            : exploration.activityPresentCap,
    );

    // Category Integrity Guard (strict): an activity/amenity search must never
    // pin a café/hotel. When the strict pass empties, relax once (Google POI
    // often lands as unknown) and finally keep hard-filtered rows — same pattern
    // as eatery search, without re-asking the user in chat.
    const guardDomain = isAmenity ? "amenity" : "activity";
    const focusTokens = (focusMatch ?? "").split(/[\s·,]+/u);
    const guarded = verifyDiscoveryResults({
      domain: guardDomain,
      items: activityScored,
      focusTokens,
      guardThreshold: guardThresholdForDomain(exploration, guardDomain),
    });
    eateryScored = guarded.kept;
    if (eateryScored.length === 0 && activityScored.length > 0) {
      const relaxed = verifyDiscoveryResults({
        domain: guardDomain,
        items: activityScored,
        focusTokens,
        guardThreshold: 0.52,
      });
      eateryScored =
        relaxed.kept.length > 0
          ? relaxed.kept
          : activityScored
              .filter((item) => {
                const category = classifyPlaceCategory(item.row);
                return (
                  category !== "cafe" &&
                  category !== "restaurant" &&
                  category !== "lodging"
                );
              })
              .slice(0, exploration.activityPresentCap);
    }
    activityScoresForTelemetry = eateryScored.map((row) => row.score);
    if (eateryScored.length === 0 && resolvedLandmark) {
      eateryScored = scorePlaceRecommendations({
        domain: isAmenity ? "amenity" : "activity",
        rows: [resolvedLandmark],
        lat: searchOrigin.lat,
        lng: searchOrigin.lng,
        focusMatch: focusTail,
        activitySubtype,
        exploration,
      });
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

  const activityLandmarkFocus =
    spec.resourceTypes.includes("activity") &&
    isExplicitActivityLandmarkQuery(spec.activityFocus ?? input.message);

  const combinedLodgingScored = [
    ...(keptRows?.lodgingScored ?? []),
    ...lodgingScored,
  ];
  const combinedEateryScored = [...(keptRows?.eateryScored ?? []), ...eateryScored];

  const feedLodgingScored = combinedLodgingScored.slice(
    0,
    exploration.feedInventoryCap ?? LOCAL_DISCOVERY_FEED_INVENTORY_CAP,
  );
  const feedEateryScored = combinedEateryScored.slice(
    0,
    Math.max(exploration.eateryPresentCap * 2, exploration.recommendCap),
  );

  const picked = pickTopLocalDiscoveryRows({
    lodgingScored: feedLodgingScored,
    eateryScored: feedEateryScored,
    cap:
      activityKind === "amenity"
        ? INSTANT_POI_PIN_CAP
        : activityLandmarkFocus
          ? exploration.activityLandmarkPinCap
          : exploration.pinCap,
  });
  const mapPinLodgingRows = picked.lodgingRows;
  const mapPinEateryRows = picked.eateryRows;
  const feedLodgingRows = feedLodgingScored.map((row) => row.row);
  const feedEateryRows = feedEateryScored.map((row) => row.row);

  if (feedLodgingRows.length === 0 && feedEateryRows.length === 0) {
    return null;
  }

  input.onProcessPhase?.("optimizing");

  const pinPoints = [
    ...mapPinLodgingRows.map((row) => ({ lat: row.lat, lng: row.lng })),
    ...mapPinEateryRows.map((row) => ({ lat: row.lat, lng: row.lng })),
  ];

  const recommendations = buildRecommendations({
    lodgingScored: feedLodgingScored,
    eateryScored: feedEateryScored,
    activityKind,
    activitySubtype: activityKind === "activity" ? activitySubtype : null,
    recommendCap: exploration.recommendCap,
  });

  const outcome: ContextConditionAnchorPinOutcome = {
    batchId,
    lodgingCount: feedLodgingRows.length,
    eateryCount: feedEateryRows.length,
    summaryKo: buildSummaryKo({
      lodgingCount: feedLodgingRows.length,
      eateryCount: feedEateryRows.length,
      radiusM,
      eateryFocus: spec.eateryFocus,
      activityLabelKo,
    }),
    pinPoints,
    radiusM,
    recommendations,
    spec,
  };

  const committedEvent = commitContextConditionHubBatch({
    event,
    batchId,
    lodgingRows: feedLodgingRows,
    eateryRows: feedEateryRows,
    lodgingScored: feedLodgingScored,
    eateryScored: feedEateryScored,
    lodgingSource,
    eaterySource,
    eateryKind: activityKind ?? "eatery",
    activitySubtype: activityKind === "activity" ? activitySubtype : null,
    deferMapReveal: input.deferMapReveal,
  });

  const deferMapReveal = Boolean(input.deferMapReveal);
  if (deferMapReveal) {
    writeScoutRevealPending(contextEventId, {
      batch: {
        batchId,
        lodgingPlaceIds: mapPinLodgingRows.map((row) => row.placeId),
        eateryPlaceIds: mapPinEateryRows.map((row) => row.placeId),
        eateryKind: activityKind ?? "eatery",
        activitySubtype: activityKind === "activity" ? activitySubtype : null,
        atIso: new Date().toISOString(),
      },
      anchorPlaceName: searchOrigin.regionLabel,
      searchOriginLat: searchOrigin.lat,
      searchOriginLng: searchOrigin.lng,
      outcome,
    });
  } else {
    syncContextConditionPins({
      contextEvent: committedEvent,
      batchId,
      lodgingRows: mapPinLodgingRows,
      eateryRows: mapPinEateryRows,
      eateryKind: activityKind ?? "eatery",
      activitySubtype: activityKind === "activity" ? activitySubtype : null,
    });
    publishContextConditionDiscoveryOverlay(
      buildContextConditionDiscoveryOverlay({
        contextEventId,
        anchorLat: searchOrigin.lat,
        anchorLng: searchOrigin.lng,
        outcome,
        pinRows: [
          ...mapPinLodgingRows.map((row) => ({
            lat: row.lat,
            lng: row.lng,
            placeId: row.placeId,
          })),
          ...mapPinEateryRows.map((row) => ({
            lat: row.lat,
            lng: row.lng,
            placeId: row.placeId,
          })),
        ],
      }),
    );
  }

  writeContextConditionLastBatch(contextEventId, {
    batchId,
    count: feedLodgingRows.length + feedEateryRows.length,
    summaryKo: outcome.summaryKo,
    atIso: new Date().toISOString(),
    triggerMessage: input.message?.trim() || undefined,
    recommendations: recommendations.map((row) => ({
      kind: row.kind,
      activitySubtype: row.activitySubtype ?? null,
      title: row.title,
      reasonKo: row.reasonKo,
      placeId: row.placeId,
      lat: row.lat,
      lng: row.lng,
    })),
    radiusM,
    spec,
  });

  logExplorationScoutScoreTelemetry({
    contextEventId,
    explorationMode,
    batchId,
    lodgingScores: feedLodgingScored.map((row) => row.score),
    eateryScores: wantsActivity
      ? undefined
      : feedEateryScored.map((row) => row.score),
    activityScores: wantsActivity ? activityScoresForTelemetry : undefined,
  });

  return outcome;
}
