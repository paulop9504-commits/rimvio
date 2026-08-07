/**
 * Smoke: Workspace Projection Mode — Compare is compare_decision, not sheet flag.
 */
import assert from "node:assert/strict";
import {
  clearWorkspaceProjectionForTests,
  enterCompareDecisionProjection,
  exitCompareDecisionProjection,
  getWorkspaceProjectionMode,
  isCompareDecisionProjectionActive,
  readWorkspaceProjection,
  selectCompareDecisionEntity,
  syncCompareDecisionProjectionFromWorkspace,
} from "@/lib/context-workspace/projection";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { CONTEXT_WORKSPACE_VERSION } from "@/lib/context-workspace/types";

clearWorkspaceProjectionForTests();

const CTX = "ctx_osaka_trip_proj";

const workspaceStub = {
  version: CONTEXT_WORKSPACE_VERSION,
  workspaceId: "ws_test",
  contextEventId: CTX,
  domain: "lodging",
  status: "editing",
  query: "osaka hotels",
  summaryKo: "Osaka Trip",
  nodes: [
    {
      id: "hotel_a",
      kind: "lodging" as const,
      title: "A",
      lat: 34.66,
      lng: 135.5,
      status: "draft" as const,
    },
    {
      id: "hotel_b",
      kind: "lodging" as const,
      title: "B",
      lat: 34.67,
      lng: 135.5,
      status: "draft" as const,
    },
    {
      id: "hotel_c",
      kind: "lodging" as const,
      title: "C",
      lat: 34.68,
      lng: 135.5,
      status: "draft" as const,
    },
    {
      id: "poi_usj",
      kind: "poi" as const,
      title: "USJ",
      lat: 34.66,
      lng: 135.43,
      status: "draft" as const,
    },
  ],
  relationshipEdges: [
    {
      id: "rel:compare:a:b",
      kind: "compare" as const,
      fromId: "hotel_a",
      toId: "hotel_b",
      labelKo: "비교",
      meters: null,
    },
    {
      id: "rel:route:a:usj",
      kind: "route" as const,
      fromId: "hotel_a",
      toId: "poi_usj",
      labelKo: "도보 12분",
      meters: 900,
    },
  ],
  compareIds: ["hotel_a", "hotel_b", "hotel_c"],
  selectedIds: ["hotel_a"],
} as Pick<
  ContextWorkspaceState,
  "compareIds" | "relationshipEdges" | "selectedIds" | "nodes"
>;

assert.equal(getWorkspaceProjectionMode(CTX), "default");
assert.equal(isCompareDecisionProjectionActive(CTX), false);

const entered = enterCompareDecisionProjection({
  contextEventId: CTX,
  workspace: workspaceStub,
});
assert.ok(entered);
assert.equal(entered!.mode, "compare_decision");
assert.deepEqual([...entered!.candidateEntityIds], [
  "hotel_a",
  "hotel_b",
  "hotel_c",
]);
assert.equal(entered!.criteriaWeights.location, 0.4);
assert.equal(
  entered!.relationships.some((r) => r.kind === "compare"),
  false,
  "hotel↔hotel compare edges stay off map relationships",
);
assert.ok(entered!.relationships.some((r) => r.kind === "route"));
assert.equal(isCompareDecisionProjectionActive(CTX), true);

const a = readWorkspaceProjection(CTX);
const b = readWorkspaceProjection(CTX);
assert.equal(a, b, "projection getSnapshot must be referentially stable");

selectCompareDecisionEntity({ contextEventId: CTX, entityId: "hotel_b" });
assert.equal(
  (readWorkspaceProjection(CTX) as { selectedEntityId: string }).selectedEntityId,
  "hotel_b",
);

syncCompareDecisionProjectionFromWorkspace({
  contextEventId: CTX,
  workspace: {
    ...workspaceStub,
    compareIds: ["hotel_a", "hotel_b"],
  },
});
assert.deepEqual(
  [...(readWorkspaceProjection(CTX) as { candidateEntityIds: string[] }).candidateEntityIds],
  ["hotel_a", "hotel_b"],
);

exitCompareDecisionProjection(CTX);
assert.equal(getWorkspaceProjectionMode(CTX), "default");

// Domain-agnostic: eatery candidates same projection type
const food = enterCompareDecisionProjection({
  contextEventId: "ctx_food",
  workspace: {
    compareIds: ["eatery_1", "eatery_2"],
    selectedIds: [],
    relationshipEdges: [],
    nodes: [],
  },
});
assert.equal(food?.mode, "compare_decision");
assert.ok(!("hotel" in (food ?? {})));

console.log("ok workspace-projection-compare-decision mode + context link");
