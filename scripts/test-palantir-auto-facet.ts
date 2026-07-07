import assert from "node:assert/strict";
import { resolvePalantirAutoFacet } from "../lib/globe/spatial-semantic/resolve-palantir-auto-facet";
import type { LocalDiscoveryActionSpec } from "../lib/globe/context-condition-ai/local-discovery-action-types";

const base: LocalDiscoveryActionSpec = {
  version: 1,
  resourceTypes: ["restaurant"],
  transport: "walk",
  budget: "medium",
  vibe: "popular",
  lodgingKind: "any",
  radiusM: 500,
};

assert.equal(
  resolvePalantirAutoFacet({ triggerMessage: "더 가까운 곳", spec: base }),
  "distance",
);
assert.equal(
  resolvePalantirAutoFacet({ triggerMessage: "조금 더 싸게", spec: base }),
  "price",
);

assert.equal(
  resolvePalantirAutoFacet({
    spec: { ...base, budget: "low" },
  }),
  "price",
);
assert.equal(
  resolvePalantirAutoFacet({
    spec: { ...base, transport: "walk", eateryFocus: "피자" },
  }),
  "distance",
);
assert.equal(
  resolvePalantirAutoFacet({
    spec: { ...base, transport: "transit", vibe: "quiet" },
  }),
  "vibe",
);
assert.equal(
  resolvePalantirAutoFacet({
    spec: { ...base, transport: "transit", eateryFocus: "피자" },
  }),
  "category",
);
assert.equal(
  resolvePalantirAutoFacet({
    spec: { ...base, budget: "high", transport: "transit" },
  }),
  "rating",
);
assert.equal(
  resolvePalantirAutoFacet({ spec: { ...base, transport: "transit" } }),
  "rating",
);

console.log("test-palantir-auto-facet: ok");
