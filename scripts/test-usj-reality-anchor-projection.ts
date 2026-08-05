#!/usr/bin/env npx tsx
/**
 * Reality Anchor Projection — USJ near lodging vertical slice.
 */
import assert from "node:assert/strict";
import {
  USJ_GEO_ID,
  buildAnchorLodgingContinuumUtterance,
  gateNearScoutAnchor,
  isNearLodgingUtterance,
  resolveRealityAnchorFromUtterance,
} from "@/lib/context-workspace/reality-anchor";
import { parseWorkspacePatch } from "@/lib/context-workspace/workspace-patch";
import { parseSpatialDiscoveryIntent } from "@/lib/spatial-retrieval/intent-parser";
import { resolveSpatialAnchorDetailed } from "@/lib/spatial-retrieval/anchor-resolver";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace";
import { applyWorkspacePatch } from "@/lib/context-workspace/workspace-patch/apply-workspace-patch";
import { ensureWorkspaceAnchorNode } from "@/lib/context-workspace/reality-anchor";

const U1 = "유니버셜 스튜디오 근처 숙소 찾아줘";
const U2 = "유니버설 스튜디오 근처 호텔";

assert.equal(isNearLodgingUtterance(U1), true);
const anchor = resolveRealityAnchorFromUtterance(U1);
assert.ok(anchor);
assert.equal(anchor!.geoId, USJ_GEO_ID);
assert.ok(anchor!.lat > 34 && anchor!.lat < 35);
assert.match(anchor!.labelKo, /유니버설|스튜디오/);

assert.ok(resolveRealityAnchorFromUtterance(U2));

const patch = parseWorkspacePatch(U1);
assert.ok(patch);
assert.equal(patch!.kind, "spatial_constraint");
if (patch!.kind === "spatial_constraint") {
  assert.match(patch.nearLabelKo, /유니버설/);
  assert.equal(patch.stationNear, false);
}

const intent = parseSpatialDiscoveryIntent(U1);
assert.ok(intent);
assert.equal(intent!.targetEntity, "hotel");
assert.equal(intent!.anchorEntity, "attraction");

const resolved = resolveSpatialAnchorDetailed({
  intent: intent!,
  contextId: "ctx_usj_test",
  candidates: [],
});
// Slice A — empty pool must not invent USJ/Namba seed; Reality Anchor gate resolves.
assert.equal(resolved.ok, false);

const nearGate = gateNearScoutAnchor({ utterance: U1 });
assert.equal(nearGate.gated, true);
assert.ok(nearGate.ok, "USJ near lodging must resolve via Reality Anchor");
if (nearGate.ok) {
  assert.ok(
    /usj|유니버설|유니버셜|universal/i.test(nearGate.anchor.labelKo) ||
      nearGate.anchor.id.includes("usj"),
  );
  assert.ok(Number.isFinite(nearGate.anchor.lat));
}

const continuumSeed = buildAnchorLodgingContinuumUtterance(U1, anchor!);
assert.match(continuumSeed, /여행/);

const CTX = "ctx_usj_anchor_proj";
clearContextWorkspace(CTX);
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "lodging",
  query: U1,
  summaryKo: "USJ Trip",
  candidates: [],
});

const applied = applyWorkspacePatch({
  contextEventId: CTX,
  patch: patch!,
  utterance: U1,
  skipAutoProjection: true,
});
assert.equal(applied.ok, true);
assert.equal(applied.needsRescout, true);
assert.match(applied.scoutQuery ?? "", /숙소/);

const ws = readContextWorkspace(CTX)!;
const usjNode = ws.nodes.find(
  (n) =>
    /유니버설|유니버셜|USJ|universal/i.test(n.title) ||
    n.placeId.includes("usj"),
);
assert.ok(usjNode, "USJ Anchor Object must be in Workspace");

const id = ensureWorkspaceAnchorNode({
  contextEventId: CTX,
  anchor: {
    entityId: USJ_GEO_ID,
    titleKo: "유니버설 스튜디오 재팬",
    labelKo: "유니버설 스튜디오 재팬",
    kind: "attraction",
    lat: 34.6654,
    lng: 135.4323,
  },
  geoId: USJ_GEO_ID,
});
assert.ok(id);

console.log("ok — USJ Reality Anchor Projection slice");
