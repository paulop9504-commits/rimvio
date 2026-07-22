#!/usr/bin/env npx tsx
/**
 * STEP8 golden — scout → correction chip → Solo Stage → price refine.
 * Deterministic (no live APIs).
 */

import assert from "node:assert/strict";
import {
  buildScoutDomainCorrectionChips,
  resolveIntendedScoutKind,
} from "../lib/globe/context-condition-ai/build-scout-domain-correction-chips";
import {
  enterContextSoloStage,
  exitContextSoloStage,
  isGlobeSoloStagePolicy,
} from "../lib/globe/spatial-semantic/enter-context-solo-stage";
import {
  publishFocusGlobeProjection,
  resetGlobeProjectionLayerPolicy,
} from "../lib/globe/spatial-semantic/globe-projection-layer-policy";
import { parseMaxNightlyPriceKrw } from "../lib/globe/context-condition-ai/filter-lodging-for-intent";
import {
  isLocalDiscoveryRefinement,
  refineLocalDiscoverySpec,
  resolveLocalDiscoveryAction,
} from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import type { LocalDiscoveryActionSpec } from "../lib/globe/context-condition-ai/local-discovery-action-types";
import { lodgingInventoryHasLivePhotos } from "../lib/globe/context-hub/merge-lodging-inventory-rows";
import type { ContextLodgingInventoryRow } from "../lib/globe/context-hub/lodging-resource-types";
import { resolveToolIdForIntent } from "../lib/rule-engine/resolve-tool-id";
import { classifyIntentFamily } from "../lib/rule-engine/classify-intent-family";

resetGlobeProjectionLayerPolicy();

/** 1) Scout intent → lodging ToolId */
{
  const intent = classifyIntentFamily("오사카 숙소 찾아줘");
  assert.equal(intent, "Search");
  assert.equal(
    resolveToolIdForIntent({ intent: "Search", query: "오사카 숙소 찾아줘" }),
    "hotel.lookup",
  );
  assert.equal(
    resolveIntendedScoutKind({
      triggerMessage: "숙소",
      resourceTypes: ["hotel"],
    }),
    "lodging",
  );
}

/** 2) Domain bleed → correction chips */
{
  const chips = buildScoutDomainCorrectionChips({
    triggerMessage: "근처 약국",
    resourceTypes: ["amenity"],
    recommendations: [
      { kind: "amenity" },
      { kind: "lodging" },
    ],
    keepOnlyLabel: (focus) => `${focus}만`,
    stripLabel: (focus) => `${focus} 제외`,
  });
  assert.ok(chips.some((chip) => chip.id === "keep_amenity"));
  assert.ok(chips.some((chip) => chip.id === "strip_lodging"));
}

/** 3) Chip accept path → Solo Stage */
{
  const contextEventId = "scout-stage-osaka";
  enterContextSoloStage(contextEventId);
  assert.equal(isGlobeSoloStagePolicy(), true);
  publishFocusGlobeProjection({
    contextEventId,
    visiblePlaceIds: ["hotel-a", "hotel-b"],
  });
  assert.equal(isGlobeSoloStagePolicy(), true);
}

/** 4) Refine price on stage (not clarify dump) */
{
  const phrase = "하루에 4만원대로 다시 찾아";
  assert.equal(parseMaxNightlyPriceKrw(phrase), 40_000);
  assert.equal(isLocalDiscoveryRefinement(phrase), true);
  const action = resolveLocalDiscoveryAction({
    message: phrase,
    lodgingConfidence: 0.95,
    budgetConfidence: 0.95,
    mobilityConfidence: 0.95,
    foodConfidence: 0.95,
  });
  assert.equal(action.status, "ready");
  const baseSpec: LocalDiscoveryActionSpec = {
    version: 1,
    resourceTypes: ["hotel"],
    transport: "walk",
    budget: "medium",
    vibe: "popular",
    lodgingKind: "any",
    radiusM: 2500,
  };
  const refined = refineLocalDiscoverySpec(baseSpec, phrase);
  assert.equal(refined.maxNightlyPriceKrw, 40_000);
}

/** 5) Lodging image source — live vs mock gate */
{
  const live: ContextLodgingInventoryRow = {
    placeId: "liteapi:1",
    name: "Capsule",
    lat: 34.6,
    lng: 135.5,
    images: ["https://cdn.example/live.jpg"],
    provider: "liteapi",
    photoSource: "liteapi",
    photoConfidence: "strong_identity",
  };
  const mock: ContextLodgingInventoryRow = {
    placeId: "mock-1",
    name: "Fake",
    lat: 34.6,
    lng: 135.5,
    images: ["https://cdn.example/mock.jpg"],
    provider: "mock",
    photoSource: "mock",
    photoConfidence: "mock",
  };
  assert.equal(lodgingInventoryHasLivePhotos([live]), true);
  assert.equal(lodgingInventoryHasLivePhotos([mock]), false);
}

exitContextSoloStage();
assert.equal(isGlobeSoloStagePolicy(), false);

console.log("test-scout-chip-stage-refine: ok");
