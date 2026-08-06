/**
 * Smoke: 「캡슐호텔 찾아줘」 routes to lodging prompt — not broken Spatial→restaurant.
 */
import assert from "node:assert/strict";
import { parseWorkspacePatch } from "@/lib/context-workspace/workspace-patch/parse-workspace-patch";
import { isSpatialDiscoveryUtterance } from "@/lib/spatial-retrieval/apply-spatial-discovery-to-workspace";
import { parseSpatialDiscoveryIntent } from "@/lib/spatial-retrieval/intent-parser";
import { parseLodgingStayTypeFromText } from "@/lib/globe/lodging/lodging-stay-types";

const u = "캡슐호텔 찾아줘";
assert.equal(parseLodgingStayTypeFromText(u), "capsule");
assert.equal(isSpatialDiscoveryUtterance(u), false);
assert.equal(parseSpatialDiscoveryIntent(u), null);

const patch = parseWorkspacePatch(u);
assert.ok(patch);
assert.equal(patch!.kind, "replace_entity");
if (patch!.kind === "replace_entity") {
  assert.equal(patch.stayType, "capsule");
  assert.equal(patch.domain, "lodging");
}

// Still spatial when near-cue present
assert.ok(isSpatialDiscoveryUtterance("호텔 근처 맛집 찾아줘"));
assert.ok(parseSpatialDiscoveryIntent("호텔 근처 맛집 찾아줘"));

// Soft「만 보여」= in-set filter (not wipe)
const only = parseWorkspacePatch("캡슐호텔만 보여줘");
assert.ok(only);
assert.equal(only!.kind, "filter_entity");
if (only!.kind === "filter_entity") {
  assert.ok(only.filter.tagIncludes?.includes("stay:capsule"));
}

// Short find without 줘
const short = parseWorkspacePatch("캡슐호텔 찾아");
assert.ok(short);
assert.equal(short!.kind, "replace_entity");

console.log("ok — capsule hotel command routes to lodging patch");
