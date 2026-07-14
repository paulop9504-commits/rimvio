import assert from "node:assert/strict";
import { LOCAL_DISCOVERY_PIN_CAP, LOCAL_DISCOVERY_RECOMMEND_CAP } from "../lib/globe/context-condition-ai/local-discovery-limits";
import { pickTopLocalDiscoveryRows } from "../lib/globe/context-condition-ai/pick-top-local-discovery-rows";
import {
  isLocalDiscoveryRefinement,
  refineLocalDiscoverySpec,
  resolveLocalDiscoveryAction,
} from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import { isAlternatePlaceSearch } from "../lib/globe/context-condition-ai/is-alternate-place-search";
import { isCrossDomainDiscoverySearch, isAmbiguousDiscoveryIntent, isFollowUpDiscoveryTurn } from "../lib/globe/context-condition-ai/is-cross-domain-discovery-search";
import { parseCuisineCandidates } from "../lib/globe/context-condition-ai/parse-cuisine-candidates";
import { resolveCicadaAgentPhase } from "../lib/globe/context-agent/resolve-cicada-agent-phase";
import { resolveContextAgentZeroPrompt } from "../lib/globe/context-agent/resolve-context-agent-zero-prompt";
import { buildContextAgentPreflightBriefing } from "../lib/globe/context-agent/build-context-agent-preflight-briefing";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildContextConditionDiscoveryOverlay } from "../lib/globe/context-condition-ai/build-context-condition-discovery-overlay";
import { evaluateContextConditionAutoReplan } from "../lib/globe/context-condition-ai/evaluate-context-condition-auto-replan";
import { discoveryRadiusMetersToRingDegrees } from "../lib/globe/discovery-radius-ring-degrees";
import { readContextConditionPinnedPlaceIds } from "../lib/globe/context-condition-ai/pin-context-condition-recommendation";
import { planSpatialPatch, buildSpatialPatchPreview } from "../lib/globe/context-condition-ai/plan-spatial-patch";
import { canTransitionContextAgentWorkPhase } from "../lib/globe/context-agent/context-agent-work-phase";
import { CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY } from "../lib/globe/eatery/eatery-resource-types";
import { CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY } from "../lib/globe/context-pinned-item";

const baseSpec = {
  version: 1 as const,
  resourceTypes: ["restaurant", "hotel"] as const,
  transport: "walk" as const,
  budget: "medium" as const,
  vibe: "popular" as const,
  lodgingKind: "any" as const,
  radiusM: 800,
};

assert.equal(LOCAL_DISCOVERY_PIN_CAP, 3);
assert.equal(LOCAL_DISCOVERY_RECOMMEND_CAP, 6);

const picked = pickTopLocalDiscoveryRows({
  lodgingScored: [
    { row: { placeId: "h1", name: "Hotel A", lat: 1, lng: 1, images: [] }, score: 0.9, reasonKo: "a", matchReasons: [] },
    { row: { placeId: "h2", name: "Hotel B", lat: 1, lng: 1, images: [] }, score: 0.5, reasonKo: "b", matchReasons: [] },
  ],
  eateryScored: [
    { row: { placeId: "e1", name: "Eat A", lat: 1, lng: 1, images: [] }, score: 0.95, reasonKo: "c", matchReasons: [] },
    { row: { placeId: "e2", name: "Eat B", lat: 1, lng: 1, images: [] }, score: 0.7, reasonKo: "d", matchReasons: [] },
  ],
});
assert.equal(picked.lodgingRows.length + picked.eateryRows.length, 3);
assert.equal(picked.eateryRows[0]?.placeId, "e1");

const closer = refineLocalDiscoverySpec(baseSpec, "더 가까운 곳");
assert.equal(closer.transport, "walk");
assert.equal(closer.radiusM, 800);

const cheaper = refineLocalDiscoverySpec(baseSpec, "조금 더 싸게");
assert.equal(cheaper.budget, "low");

assert.equal(isLocalDiscoveryRefinement("더 가까운 곳"), true);
assert.equal(isLocalDiscoveryRefinement("다른 곳"), true);
assert.equal(isLocalDiscoveryRefinement("주변 호텔"), false);
assert.equal(isLocalDiscoveryRefinement("근처 맛집"), false);
assert.equal(isAlternatePlaceSearch("다른 곳 보여줘"), true);

const eateryOnly = [{ kind: "eatery" as const, title: "A", reasonKo: "r", rank: 1, placeId: "e1", lat: 1, lng: 1 }];
assert.equal(isCrossDomainDiscoverySearch("주변 호텔", eateryOnly), true);
assert.equal(isCrossDomainDiscoverySearch("더 가까운 곳", eateryOnly), false);
assert.equal(isFollowUpDiscoveryTurn("주변 호텔", eateryOnly), true);
assert.equal(isFollowUpDiscoveryTurn("더 가까운 곳", eateryOnly), false);
assert.equal(isAmbiguousDiscoveryIntent("뭐 있어?"), true);
assert.equal(isAmbiguousDiscoveryIntent("주변 호텔"), false);

const ambiguousFocus = resolveLocalDiscoveryAction({
  message: "뭐 있어?",
  mobilityConfidence: 0.9,
  budgetConfidence: 0.9,
  foodConfidence: 0.9,
  lodgingConfidence: 0.9,
});
assert.equal(ambiguousFocus.status, "questions");
assert.equal(ambiguousFocus.questions[0]?.slot, "resourceFocus");

const hotelAfterAmbiguous = resolveLocalDiscoveryAction({
  message: "뭐 있어?",
  answers: { resourceFocus: "hotel" },
  mobilityConfidence: 0.9,
  budgetConfidence: 0.9,
  foodConfidence: 0.9,
  lodgingConfidence: 0.9,
  inferredTransport: "walk",
  inferredBudget: "medium",
});
assert.equal(hotelAfterAmbiguous.status, "ready");
if (hotelAfterAmbiguous.status === "ready") {
  assert.deepEqual(hotelAfterAmbiguous.spec.resourceTypes, ["hotel"]);
}

const followUpHotel = resolveLocalDiscoveryAction({
  message: "주변 호텔",
  followUpTurn: true,
  previousSpec: { ...baseSpec, resourceTypes: ["restaurant"], eateryFocus: "라멘" },
  mobilityConfidence: 0.2,
  budgetConfidence: 0.2,
  foodConfidence: 0.9,
  lodgingConfidence: 0.9,
});
assert.equal(followUpHotel.status, "ready");
if (followUpHotel.status === "ready") {
  assert.deepEqual(followUpHotel.spec.resourceTypes, ["hotel"]);
  assert.equal(followUpHotel.spec.transport, "walk");
}

const lodgingPatch = planSpatialPatch({
  message: "주변 호텔",
  currentSpec: { ...baseSpec, resourceTypes: ["restaurant"] },
  previousRecommendations: eateryOnly,
});
assert.equal(lodgingPatch.scope, "lodging_only");

const multiCuisine = resolveLocalDiscoveryAction({
  message: "피자집, 치킨집, 스시집 찾고 싶어",
  mobilityConfidence: 0.9,
  budgetConfidence: 0.9,
  foodConfidence: 0.9,
  lodgingConfidence: 0.9,
  inferredTransport: "walk",
  inferredBudget: "medium",
  wantsEatery: true,
  wantsLodging: false,
});
assert.equal(multiCuisine.status, "questions");
assert.equal(multiCuisine.questions[0]?.slot, "menuFocus");
assert.equal(parseCuisineCandidates("피자집, 치킨집, 스시집").length, 3);

const pizzaReady = resolveLocalDiscoveryAction({
  message: "피자집",
  answers: { menuFocus: "pizza" },
  mobilityConfidence: 0.9,
  budgetConfidence: 0.9,
  foodConfidence: 0.9,
  lodgingConfidence: 0.9,
  inferredTransport: "walk",
  inferredBudget: "medium",
  wantsEatery: true,
  wantsLodging: false,
});
assert.equal(pizzaReady.status, "ready");
if (pizzaReady.status === "ready") {
  assert.equal(pizzaReady.spec.eateryFocus, "피자");
}

assert.equal(
  resolveCicadaAgentPhase({
    workPhase: "collecting_context",
    processPhase: null,
    lifecycle: "idle",
    hasPendingQuestions: true,
    alternateSearch: false,
    hasGlobeResults: false,
  }),
  "clarifying",
);
assert.equal(
  resolveCicadaAgentPhase({
    workPhase: "scouting",
    processPhase: "analyzing",
    lifecycle: "busy",
    hasPendingQuestions: false,
    alternateSearch: false,
    hasGlobeResults: false,
  }),
  "searching",
);
assert.equal(
  resolveCicadaAgentPhase({
    workPhase: "scouting",
    processPhase: "optimizing",
    lifecycle: "busy",
    hasPendingQuestions: false,
    alternateSearch: false,
    hasGlobeResults: false,
  }),
  "visualizing",
);
assert.equal(
  resolveCicadaAgentPhase({
    workPhase: "replanning",
    processPhase: "exploring",
    lifecycle: "busy",
    hasPendingQuestions: false,
    alternateSearch: true,
    hasGlobeResults: true,
  }),
  "searching",
);
assert.equal(
  resolveCicadaAgentPhase({
    workPhase: "awaiting_human",
    processPhase: null,
    lifecycle: "idle",
    hasPendingQuestions: false,
    alternateSearch: false,
    hasGlobeResults: true,
  }),
  "visualizing",
);

const resolved = resolveLocalDiscoveryAction({
  message: "근처 맛집 찾아줘",
  mobilityConfidence: 0.9,
  budgetConfidence: 0.9,
  foodConfidence: 0.9,
  lodgingConfidence: 0.9,
  inferredTransport: "walk",
  inferredBudget: "medium",
});
assert.equal(resolved.status, "ready");

const mockEvent = {
  id: "ev-test",
  title: "오사카 여행",
  place: "오사카",
  atIso: new Date().toISOString(),
  metadata: {},
} as EventCandidate;

const zero = resolveContextAgentZeroPrompt({
  event: mockEvent,
  anchorPlaceName: "오사카",
  now: new Date("2026-07-06T18:30:00+09:00"),
});
assert.match(zero.situationLineKo, /오사카/);
assert.match(zero.preflightBriefingKo, /오사카/);
assert.match(zero.triggerMessage, /저녁/);

const preflight = buildContextAgentPreflightBriefing({
  event: mockEvent,
  anchorPlaceName: "오사카",
  now: new Date("2026-07-06T18:30:00+09:00"),
  weather: { condition: "rain", summary: "비", temp_c: 22, precipitation_chance: 0.8 },
});
assert.match(preflight.briefingLineKo, /오사카/);
assert.match(preflight.briefingLineKo, /비 예보/);
assert.match(preflight.briefingLineKo, /숙소 아직 안 고름/);

const overlay = buildContextConditionDiscoveryOverlay({
  contextEventId: "ev-test",
  anchorLat: 37.5,
  anchorLng: 127.0,
  outcome: {
    batchId: "batch-1",
    lodgingCount: 1,
    eateryCount: 2,
    summaryKo: "ok",
    pinPoints: [
      { lat: 37.501, lng: 127.001 },
      { lat: 37.502, lng: 127.002 },
    ],
    radiusM: 800,
    recommendations: [],
    spec: baseSpec,
  },
});
assert.equal(overlay.routeArcs.length, 2);
assert.ok(discoveryRadiusMetersToRingDegrees(37.5, 800) > 0.001);

const replan = evaluateContextConditionAutoReplan({
  event: mockEvent,
  spec: baseSpec,
  weather: { condition: "rain", summary: "비" },
});
assert.equal(replan?.trigger, "weather_rain");

const pinnedEvent = {
  ...mockEvent,
  metadata: {
    [CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY]: "ev-test:lodging:hotel-abc",
    [CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY]: "ev-test:eatery:ramen-1",
  },
} as EventCandidate;
const pinned = readContextConditionPinnedPlaceIds(pinnedEvent);
assert.equal(pinned.lodging, "hotel-abc");
assert.equal(pinned.eatery, "ramen-1");

const patchPlan = planSpatialPatch({
  message: "숙소는 그대로 두고 맛집만 더 좋은 데로 바꿔줘",
  currentSpec: baseSpec,
  previousRecommendations: [
    {
      kind: "lodging",
      title: "Hotel A",
      reasonKo: "a",
      rank: 1,
      placeId: "h1",
      lat: 1,
      lng: 1,
    },
    {
      kind: "eatery",
      title: "Eat A",
      reasonKo: "b",
      rank: 2,
      placeId: "e1",
      lat: 1,
      lng: 1,
    },
  ],
});
assert.equal(patchPlan.scope, "eatery_only");
assert.deepEqual(patchPlan.keepKinds, ["lodging"]);
assert.deepEqual(patchPlan.replaceKinds, ["eatery"]);

const patchPreview = buildSpatialPatchPreview({
  plan: patchPlan,
  previousRecommendations: [
    {
      kind: "lodging",
      title: "Hotel A",
      reasonKo: "a",
      rank: 1,
      placeId: "h1",
      lat: 1,
      lng: 1,
    },
  ],
});
assert.equal(patchPreview.kept.length, 1);
assert.equal(patchPreview.kept[0]?.placeId, "h1");

assert.equal(canTransitionContextAgentWorkPhase("briefing", "scouting"), true);
assert.equal(canTransitionContextAgentWorkPhase("scouting", "deciding"), true);
assert.equal(canTransitionContextAgentWorkPhase("idle", "deciding"), false);

console.log("test-context-agent-mvp: ok");
