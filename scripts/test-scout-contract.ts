import assert from "node:assert/strict";
import {
  assertScoutContractGate,
  assertScoutOutputKinds,
  assertScoutAnchorRef,
  assertScoutReelSource,
  scoutCategoryFromSpec,
  scoutCategoryToReelKind,
  wrapScoutContract,
  withScoutOutputRef,
  withScoutAnchorRef,
  primaryScoutViolationMessage,
} from "../lib/globe/contracts";
import type { LocalDiscoveryActionSpec } from "../lib/globe/context-condition-ai/local-discovery-action-types";

const baseSpec: LocalDiscoveryActionSpec = {
  version: 1,
  resourceTypes: ["restaurant"],
  transport: "walk",
  budget: "medium",
  vibe: "popular",
  lodgingKind: "any",
  radiusM: 800,
};

const wrapped = wrapScoutContract({
  contextEventId: "evt-osaka",
  spec: baseSpec,
  chainIndex: 0,
});
assert.equal(wrapped.contract_type, "scout");
assert.equal(wrapped.category, "restaurant");
assert.equal(scoutCategoryFromSpec(baseSpec), "restaurant");
assert.equal(scoutCategoryToReelKind("restaurant"), "eatery");
assert.equal(scoutCategoryToReelKind("hotel"), "lodging");

const withOut = withScoutOutputRef(wrapped, "batch_001");
assert.equal(withOut.outputRef?.scoutId, "batch_001");

assert.equal(assertScoutOutputKinds({ contract: wrapped, kinds: ["eatery"] }).ok, true);
const contaminated = assertScoutOutputKinds({
  contract: wrapped,
  kinds: ["eatery", "activity"],
});
assert.equal(contaminated.ok, false);
if (!contaminated.ok) {
  assert.equal(contaminated.violations[0]?.code, "category_contamination");
}

const dualSpec = wrapScoutContract({
  contextEventId: "evt-osaka",
  spec: {
    ...baseSpec,
    resourceTypes: ["restaurant", "hotel"],
  },
  chainIndex: 0,
});
assert.equal(
  assertScoutOutputKinds({
    contract: dualSpec,
    kinds: ["eatery", "lodging"],
  }).ok,
  true,
  "multi resourceTypes must allow lodging + eatery",
);

assert.equal(assertScoutAnchorRef(wrapped).ok, true);
const chained = wrapScoutContract({
  contextEventId: "evt-osaka",
  spec: {
    ...baseSpec,
    resourceTypes: ["activity"],
    activityFocus: "야경",
  },
  chainIndex: 1,
  anchorRef: null,
});
const dangling = assertScoutAnchorRef(chained);
assert.equal(dangling.ok, false);
if (!dangling.ok) {
  assert.equal(dangling.violations[0]?.code, "dangling_anchor_ref");
}

const anchored = withScoutAnchorRef(chained, {
  scoutId: "batch_001",
  placeId: "place_A12",
  lat: 36.35,
  lng: 127.38,
  title: "정도한식당",
});
assert.equal(assertScoutAnchorRef(anchored).ok, true);

const ssotOk = assertScoutReelSource({
  contract: withOut,
  itemSources: [{ sourceKind: "batch", sourceId: "batch_001" }],
});
assert.equal(ssotOk.ok, true);

const ssotFork = assertScoutReelSource({
  contract: withOut,
  itemSources: [{ sourceKind: "inventory", sourceId: null }],
});
assert.equal(ssotFork.ok, false);

const gate = assertScoutContractGate({
  contract: anchored,
  outputKinds: ["activity"],
  itemSources: [{ sourceKind: "batch", sourceId: "batch_002" }],
});
assert.equal(gate.ok, true);
assert.equal(primaryScoutViolationMessage({ ok: true }), null);
assert.ok(primaryScoutViolationMessage(contaminated)?.length);

console.log("test-scout-contract: ok");
