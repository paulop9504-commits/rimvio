/**
 * Compound near + stay — 「교바시역 근처 캡슐호텔 찾아줘」
 * Run: npx tsx scripts/test-kyobashi-capsule-spatial-stay.ts
 */

import assert from "node:assert/strict";
import {
  gateNearScoutAnchor,
  isNearScoutUtterance,
} from "@/lib/context-workspace/reality-anchor";
import { parseWorkspacePatch } from "@/lib/context-workspace/workspace-patch";
import { resolveLodgingStaySearchKeyword } from "@/lib/globe/lodging/lodging-stay-types";
import {
  applyConstraintMemoryToScoutQuery,
  emptyConstraintMemory,
  mergeConstraintMemoryFromUtterance,
} from "@/lib/agent-policy/constraint-memory";
import { resolveWorkspaceSearchDomain } from "@/lib/context-workspace/resolve-workspace-search-domain";

const UTT = "교바시역 근처 캡슐호텔 찾아줘";

assert.equal(isNearScoutUtterance(UTT), true);

const gate = gateNearScoutAnchor({ utterance: UTT });
assert.equal(gate.gated, true);
assert.ok(gate.ok, "교바시 must resolve Anchor");
if (gate.ok) {
  assert.match(gate.anchor.labelKo, /교바시/);
  assert.ok(Number.isFinite(gate.anchor.lat));
}

const patch = parseWorkspacePatch(UTT);
assert.equal(patch?.kind, "spatial_constraint");
if (patch?.kind === "spatial_constraint") {
  assert.equal(patch.nearLabelKo, "교바시역");
  assert.equal(patch.stayType, "capsule");
  assert.equal(patch.stationNear, true);
}

assert.equal(resolveWorkspaceSearchDomain(UTT, "eatery"), "lodging");

const bag = mergeConstraintMemoryFromUtterance({
  prev: emptyConstraintMemory(),
  utterance: UTT,
});
assert.equal(bag.nearLabelKo, "교바시역");
assert.equal(bag.stayType, "capsule");

const scout = applyConstraintMemoryToScoutQuery(UTT, bag);
assert.match(scout, /교바시/);
assert.match(scout, /캡슐/);
assert.ok(!/\bcapsule\b/i.test(scout), "must not append English stay id");

const kw = resolveLodgingStaySearchKeyword({
  stayType: "capsule",
  message: UTT,
  areaHint: "교바시역",
});
assert.ok(kw);
assert.match(kw!, /캡슐/);
assert.match(kw!, /교바시/);

console.log("OK — kyobashi-capsule-spatial-stay (Anchor · stay · scout)");
