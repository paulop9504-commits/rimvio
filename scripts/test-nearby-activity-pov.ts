#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import { detectConvergenceIntent } from "../lib/globe/context-condition-ai/intent-convergence/intent-convergence-schema";
import { isBroadActivityQuery } from "../lib/globe/context-condition-ai/resolve-local-discovery-domain";

assert.equal(detectConvergenceIntent("놀거리"), "activity");
assert.equal(isBroadActivityQuery("놀거리"), true);

const broad = resolveLocalDiscoveryAction({ message: "놀거리" });
assert.equal(broad.status, "ready");
if (broad.status === "ready") {
  assert.ok(broad.spec.resourceTypes.includes("activity"));
  assert.equal(broad.spec.activitySubtype, "general");
  assert.equal(broad.spec.radiusM, 800);
}

const withHotelPovSkip =
  detectConvergenceIntent("놀거리") === "activity";
assert.equal(withHotelPovSkip, true);

console.log("test-nearby-activity-pov: ok");
