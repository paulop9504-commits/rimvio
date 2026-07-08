import assert from "node:assert/strict";
import {
  buildOnboardingParallelMapScouts,
  onboardingParallelIncludesDeparture,
} from "../lib/container-ai/build-onboarding-parallel-specs";

const scouts = buildOnboardingParallelMapScouts({
  parallelNodeIds: ["departure", "stay", "explore"],
  destinationLabel: "오사카",
});
assert.equal(scouts.length, 2);
assert.equal(scouts[0]?.nodeId, "stay");
assert.deepEqual([...scouts[0]!.spec.resourceTypes], ["hotel"]);
assert.equal(scouts[1]?.nodeId, "explore");
assert.deepEqual([...scouts[1]!.spec.resourceTypes], ["activity"]);
assert.equal(onboardingParallelIncludesDeparture(["departure", "stay"]), true);
assert.equal(onboardingParallelIncludesDeparture(["stay", "explore"]), false);

const narrowOnly = buildOnboardingParallelMapScouts({
  parallelNodeIds: ["departure"],
  destinationLabel: "오사카",
});
assert.equal(narrowOnly.length, 0);

console.log("test-onboarding-parallel-scouts: ok");
