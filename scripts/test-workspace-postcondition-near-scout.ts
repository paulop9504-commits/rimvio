/**
 * Postcondition Verification — near scout PASS / FAIL.
 * Run: npx tsx scripts/test-workspace-postcondition-near-scout.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertWorkspacePostcondition } from "@/lib/context-workspace/assert-workspace-postcondition";
import { gateNearScoutAnchor } from "@/lib/context-workspace/reality-anchor";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";

const gate = gateNearScoutAnchor({
  utterance: "모리노미아역 근처 호텔",
});
assert.ok(gate.gated && gate.ok);
if (!(gate.gated && gate.ok)) throw new Error("anchor");

function baseState(
  nodes: ContextWorkspaceState["nodes"],
): ContextWorkspaceState {
  return {
    contextEventId: "pc_test",
    workspaceId: "ws_pc",
    status: "editing",
    domain: "lodging",
    query: "test",
    summaryKo: "test",
    nodes,
    compilerIr: null,
    filter: { maxPriceBand: null, minRating: null, queryIncludes: null },
    selectedIds: [],
    compareIds: [],
    surfacePrimary: "map",
    openedAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
    committedAtIso: null,
    lastChangeKo: null,
    lastWhy: null,
    history: [],
    future: [],
  };
}

const anchorNode = {
  id: gate.anchor.id,
  kind: "poi" as const,
  title: gate.anchor.labelKo,
  summaryKo: "기준점",
  lat: gate.anchor.lat,
  lng: gate.anchor.lng,
  placeId: gate.anchor.id,
  amountLabel: null,
  visible: true,
  selected: false,
  bookmarked: false,
  tags: ["reality_anchor"],
  source: "reality_anchor" as const,
};

const nearHotel = {
  id: "lodging:near",
  kind: "lodging" as const,
  title: "Near Hotel",
  summaryKo: "near",
  lat: gate.anchor.lat + 0.001,
  lng: gate.anchor.lng,
  placeId: "lodging:near",
  amountLabel: null,
  visible: true,
  selected: false,
  bookmarked: false,
  tags: [] as string[],
  source: "scout_patch" as const,
};

const farHotel = {
  ...nearHotel,
  id: "lodging:far",
  title: "Far Hotel",
  placeId: "lodging:far",
  lat: gate.anchor.lat + 0.05,
  lng: gate.anchor.lng,
};

const pass = assertWorkspacePostcondition({
  state: baseState([anchorNode, nearHotel]),
  expect: {
    kind: "near_scout",
    anchorId: gate.anchor.id,
    anchorLat: gate.anchor.lat,
    anchorLng: gate.anchor.lng,
    radiusMeters: 800,
    candidateKind: "lodging",
    minCandidates: 1,
  },
});
assert.equal(pass.ok, true);
assert.equal(pass.code, "PASS");

const failFar = assertWorkspacePostcondition({
  state: baseState([anchorNode, farHotel]),
  expect: {
    kind: "near_scout",
    anchorId: gate.anchor.id,
    anchorLat: gate.anchor.lat,
    anchorLng: gate.anchor.lng,
    radiusMeters: 800,
    candidateKind: "lodging",
    minCandidates: 1,
  },
});
assert.equal(failFar.ok, false);
assert.equal(failFar.code, "CANDIDATES_OUT_OF_RADIUS");

const failAnchor = assertWorkspacePostcondition({
  state: baseState([nearHotel]),
  expect: {
    kind: "near_scout",
    anchorId: gate.anchor.id,
    anchorLat: gate.anchor.lat,
    anchorLng: gate.anchor.lng,
    radiusMeters: 800,
    candidateKind: "lodging",
    minCandidates: 1,
  },
});
assert.equal(failAnchor.ok, false);
assert.equal(failAnchor.code, "ANCHOR_MISSING");

const loop = readFileSync(
  join(process.cwd(), "lib/context-run/workspace-agent-loop.ts"),
  "utf8",
);
assert.ok(loop.includes("assertWorkspacePostcondition"));

console.log("OK — workspace-postcondition-near-scout");
