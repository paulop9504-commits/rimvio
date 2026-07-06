import assert from "node:assert/strict";
import { LOCAL_DISCOVERY_PIN_CAP, LOCAL_DISCOVERY_RECOMMEND_CAP } from "../lib/globe/context-condition-ai/local-discovery-limits";
import { pickTopLocalDiscoveryRows } from "../lib/globe/context-condition-ai/pick-top-local-discovery-rows";
import {
  isLocalDiscoveryRefinement,
  refineLocalDiscoverySpec,
  resolveLocalDiscoveryAction,
} from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import { resolveContextAgentZeroPrompt } from "../lib/globe/context-agent/resolve-context-agent-zero-prompt";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildContextConditionDiscoveryOverlay } from "../lib/globe/context-condition-ai/build-context-condition-discovery-overlay";
import { evaluateContextConditionAutoReplan } from "../lib/globe/context-condition-ai/evaluate-context-condition-auto-replan";
import { discoveryRadiusMetersToRingDegrees } from "../lib/globe/discovery-radius-ring-degrees";
import { readContextConditionPinnedPlaceIds } from "../lib/globe/context-condition-ai/pin-context-condition-recommendation";
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
assert.equal(LOCAL_DISCOVERY_RECOMMEND_CAP, 3);

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
assert.match(zero.situationLineKo, /저녁 시간/);
assert.match(zero.triggerMessage, /저녁/);

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

console.log("test-context-agent-mvp: ok");
