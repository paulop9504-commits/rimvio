#!/usr/bin/env npx tsx
/**
 * Price/condition refine must re-scout lodging (spatial_patch), not clarify chips.
 */

import assert from "node:assert/strict";
import { parseMaxNightlyPriceKrw } from "../lib/globe/context-condition-ai/filter-lodging-for-intent";
import { isAmbiguousDiscoveryIntent } from "../lib/globe/context-condition-ai/is-cross-domain-discovery-search";
import {
  isLocalDiscoveryRefinement,
  refineLocalDiscoverySpec,
  resolveLocalDiscoveryAction,
} from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import { resolvePalantirRefineIntent } from "../lib/globe/spatial-semantic/resolve-palantir-refine-intent";
import type { LocalDiscoveryActionSpec } from "../lib/globe/context-condition-ai/local-discovery-action-types";

const phrase = "하루에 3만원대로 다시 찾아";

assert.equal(parseMaxNightlyPriceKrw(phrase), 30_000);
assert.equal(isAmbiguousDiscoveryIntent(phrase), false);
assert.equal(isLocalDiscoveryRefinement(phrase), true);

const action = resolveLocalDiscoveryAction({
  message: phrase,
  lodgingConfidence: 0.95,
  budgetConfidence: 0.95,
  mobilityConfidence: 0.95,
  foodConfidence: 0.95,
});
assert.equal(action.status, "ready", "must not ask 무엇을 찾아볼까요?");
if (action.status === "ready") {
  assert.equal(action.spec.maxNightlyPriceKrw, 30_000);
  assert.equal(action.spec.budget, "low");
  assert.ok(
    action.spec.resourceTypes.includes("hotel") ||
      action.spec.resourceTypes.includes("lodging" as never),
  );
}

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
assert.equal(refined.maxNightlyPriceKrw, 30_000);
assert.equal(refined.budget, "low");

const lodgingRecs = [
  {
    kind: "lodging" as const,
    title: "APA Hotel",
    reasonKo: "r",
    rank: 1,
    placeId: "liteapi:1",
    lat: 34.7,
    lng: 135.5,
  },
];

const refine = resolvePalantirRefineIntent({
  message: phrase,
  currentSpec: baseSpec,
  previousRecommendations: lodgingRecs,
});
assert.ok(refine);
assert.equal(refine!.kind, "spatial_patch");
if (refine!.kind === "spatial_patch") {
  assert.equal(refine!.nextSpec.maxNightlyPriceKrw, 30_000);
  assert.equal(refine!.patchPlan.scope, "lodging_only");
}

const softCheap = resolvePalantirRefineIntent({
  message: "더 싸게",
  currentSpec: baseSpec,
  previousRecommendations: lodgingRecs,
});
assert.ok(softCheap);
assert.equal(softCheap!.kind, "facet_rerank");

console.log("test-lodging-price-refine-reproject: ok");
