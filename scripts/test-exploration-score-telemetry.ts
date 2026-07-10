import assert from "node:assert/strict";
import { computeScoreDistribution } from "../lib/globe/discovery-policy/compute-score-distribution";

const convergent = computeScoreDistribution([0.82, 0.84, 0.81, 0.83]);
assert.ok(convergent);
assert.equal(convergent.count, 4);
assert.ok(convergent.stdDev < 0.02);

const diffuse = computeScoreDistribution([0.42, 0.55, 0.71, 0.88, 0.91]);
assert.ok(diffuse);
assert.ok(diffuse.stdDev > convergent!.stdDev);

assert.equal(computeScoreDistribution([]), null);

console.log("test-exploration-score-telemetry: ok");
