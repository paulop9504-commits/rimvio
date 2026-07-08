#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { parseCuisineCandidates } from "../lib/globe/context-condition-ai/parse-cuisine-candidates";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";

const beverageCandidates = parseCuisineCandidates("음료");
assert.equal(beverageCandidates.length, 1);
assert.equal(beverageCandidates[0]?.id, "beverage");

const resolved = resolveLocalDiscoveryAction({ message: "음료" });
assert.equal(resolved.status, "ready");
if (resolved.status === "ready") {
  assert.ok(resolved.spec.resourceTypes.includes("restaurant"));
  assert.equal(resolved.spec.resourceTypes.includes("hotel"), false);
  assert.equal(resolved.spec.eateryFocus, "카페 음료");
}

console.log("test-beverage-discovery-routing: ok");
