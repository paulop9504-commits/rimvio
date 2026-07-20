#!/usr/bin/env npx tsx
/**
 * Place Action Graph — Knowledge/Explore/Actions + AI next-3;
 * Explore → dashed brain candidate; Action → inbox prepare (no Commit);
 * Open/Action → Reality Pipeline row.
 */

import assert from "node:assert/strict";
import {
  buildAiNextSuggestions,
  buildPlaceExploreGraph,
  clearPlaceExploreSession,
  openPlaceActionGraphWithPipeline,
  projectExploreChildToBrain,
  readPlaceExploreSession,
  resetPlaceExploreSessionForTests,
  runPlaceExploreActionPipeline,
  shouldOpenPlaceActionGraph,
  syncPlaceExploreProjectionPipeline,
} from "../lib/globe/entity-explore";
import {
  buildRealityControlSnapshot,
  clearPreparedRealityOperations,
} from "../lib/reality-queue";
import {
  clearRealityPipelineSnapshots,
  readRealityPipelineSnapshot,
} from "../lib/reality-pipeline";
import type { BrainSurfaceProjectionCandidate } from "../lib/situation-projection/brain-surface-types";

resetPlaceExploreSessionForTests();
clearPreparedRealityOperations();
clearRealityPipelineSnapshots();

const entity = {
  placeId: "place-yoyogi",
  titleKo: "요요기 공원",
  lat: 35.6713,
  lng: 139.6949,
  providerTags: ["park", "tourist_attraction", "establishment"],
  contextEventId: "evt-tokyo-trip",
  contextLabelKo: "도쿄 벚꽃 여행",
  thumbnailUrl: null,
  evidenceLineKo: "도보권 · 벚꽃 시즌",
};

const graph = buildPlaceExploreGraph({
  entity,
  bias: {
    tripKind: "couple",
    lodgingMissing: true,
    cherrySeason: true,
  },
});

assert.equal(graph.aiNext.length, 3, "AI next must be exactly 3");
assert.ok(graph.knowledge.length >= 3);
assert.ok(graph.explore.some((n) => n.exploreId === "nearby_cafe"));
assert.ok(graph.actions.some((n) => n.actionId === "find_lodging"));
assert.ok(
  !JSON.stringify(graph).includes("Ontology") &&
    !JSON.stringify(graph).includes("Entity") &&
    !JSON.stringify(graph).includes("Action Graph"),
  "graph labels must stay L1",
);

const aiOnly = buildAiNextSuggestions(entity, { lodgingMissing: true });
assert.equal(aiOnly.length, 3);
assert.ok(aiOnly.some((n) => n.actionId === "find_lodging"));

const cafeNode = graph.explore.find((n) => n.exploreId === "nearby_cafe");
assert.ok(cafeNode);
const projected = projectExploreChildToBrain({
  entity,
  node: cafeNode!,
  eventId: "evt-tokyo-trip",
  index: 0,
});
assert.ok(projected);
assert.equal(projected!.markerStyle, "dashed");
assert.equal(projected!.virtualCandidate, true);
assert.ok(Number.isFinite(projected!.lat) && Number.isFinite(projected!.lng));
assert.notEqual(projected!.lat, entity.lat);
assert.ok(projected!.badgeLabelKo === "둘러보기");

const placeCandidate = {
  id: "brain-surface:evt:inferred:yoyogi",
  eventId: "evt-tokyo-trip",
  nodeId: null,
  family: "trace_place",
  anchorKind: "inferred_place",
  markerStyle: "dashed",
  label: "요요기 공원",
  previewTitle: "요요기 공원",
  previewBody: null,
  placeLabel: "요요기 공원",
  lat: entity.lat,
  lng: entity.lng,
  accent: "green",
  badgeLabelKo: null,
  relationMemoKo: null,
  openUrl: null,
  embedUrl: null,
  mapsUrl: null,
  searchQuery: null,
  sourceGuideNodeId: null,
  revealOrder: 1,
  virtualCandidate: true,
} as BrainSurfaceProjectionCandidate;

assert.equal(shouldOpenPlaceActionGraph(placeCandidate), true);

const mediaCandidate = {
  ...placeCandidate,
  family: "media",
  anchorKind: "video_root",
  markerStyle: "solid",
} as BrainSurfaceProjectionCandidate;
assert.equal(shouldOpenPlaceActionGraph(mediaCandidate), false);

const lodgingInventory = {
  ...placeCandidate,
  family: "lodging",
  anchorKind: null,
  markerStyle: "solid",
} as BrainSurfaceProjectionCandidate;
assert.equal(shouldOpenPlaceActionGraph(lodgingInventory), false);

clearPlaceExploreSession();
clearRealityPipelineSnapshots();
const session = openPlaceActionGraphWithPipeline({
  entity,
  bias: { lodgingMissing: true },
});
assert.ok(readPlaceExploreSession()?.sessionId === session.sessionId);
assert.equal(session.graph.aiNext.length, 3);

const pipelineOnOpen = readRealityPipelineSnapshot("evt-tokyo-trip");
assert.ok(pipelineOnOpen, "opening Action Graph must bind Reality Pipeline");
assert.equal(pipelineOnOpen!.contextEventId, "evt-tokyo-trip");
assert.equal(pipelineOnOpen!.projection.stage, "WAIT_COMMIT");

const exploreSync = syncPlaceExploreProjectionPipeline({
  entity,
  exploreLabelKo: cafeNode!.labelKo,
});
assert.ok(exploreSync);
assert.equal(exploreSync!.contextEventId, "evt-tokyo-trip");

const lodgingAction = graph.actions.find((n) => n.actionId === "find_lodging");
assert.ok(lodgingAction);
const actionResult = runPlaceExploreActionPipeline({
  entity,
  node: lodgingAction!,
});
assert.equal(actionResult.ok, true);
assert.ok(actionResult.ok && "operation" in actionResult && actionResult.operation);
if (actionResult.ok && "operation" in actionResult && actionResult.operation) {
  assert.equal(actionResult.operation.status, "pending");
  assert.equal(actionResult.operation.needApproval, true);
}

const pipelineAfterAction = readRealityPipelineSnapshot("evt-tokyo-trip");
assert.ok(pipelineAfterAction);
assert.ok(
  pipelineAfterAction!.explorer.branches
    .find((b) => b.root === "execution")
    ?.children.find((c) => c.kind === "inbox")
    ?.children.some((c) => c.kind === "operation"),
  "pipeline explorer must show inbox ops after place action",
);

const snap = buildRealityControlSnapshot({
  events: [],
  tradeSessions: [],
  applyHolds: false,
});
assert.equal(snap.canCommit, false, "prepare must not auto-Commit");
assert.ok(snap.items.some((item) => item.labelKo === entity.titleKo));

console.log("test-place-action-graph: ok");
