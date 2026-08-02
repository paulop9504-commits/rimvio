/**
 * Smoke: Workspace Engine — Reality IDE from Context (Osaka Trip Workspace).
 * Reality Object = 원본 · Workspace Object = Instance · no direct Reality mutate.
 */
import assert from "node:assert/strict";
import {
  createOsakaTripContext,
  saveRealityContext,
  clearRealityContextsForTests,
} from "@/lib/context";
import {
  clearRealityObjects,
  createRealityObject,
  getRealityObject,
} from "@/lib/reality-object/reality-object-store";
import {
  WORKSPACE_IDE_PANELS,
  addWorkspacePrepareDraft,
  addWorkspaceSimulationResult,
  assertWorkspaceDoesNotTouchReality,
  clearAllWorkspaceHistoryForTests,
  clearAllWorkspacesForTests,
  listWorkspaceManaged,
  openWorkspaceFromContext,
  readWorkspace,
  withWorkspaceIdePanel,
} from "@/lib/workspace";

clearAllWorkspacesForTests();
clearAllWorkspaceHistoryForTests();
clearRealityContextsForTests();
clearRealityObjects();

const ctx = createOsakaTripContext({ intent: "오사카 여행" });
saveRealityContext(ctx);
assert.equal(ctx.titleKo, "Osaka Trip");

// Reality Objects (원본) for hotel seed ids
for (const e of ctx.entities) {
  createRealityObject({
    objectId: e.entityId,
    entityId: e.entityId,
    contextId: ctx.id,
    kind: e.kind.toLowerCase() === "hotel" ? "hotel" : "place",
    labelKo: e.titleKo,
    relationships: [],
    availableActions: [],
    metadata: {},
  });
}
const hotelReality = getRealityObject(
  ctx.entities.find((e) => e.kind === "Hotel")!.entityId,
)!;
const hotelRealityAt = hotelReality.updatedAt;

// Context click → Osaka Trip Workspace
const opened = openWorkspaceFromContext({
  context: ctx,
  activePanel: "hotel",
});
assert.equal(opened.created, true);
assert.equal(opened.ide.titleKo, "Osaka Trip Workspace");
assert.equal(opened.ide.activePanel, "hotel");
assert.equal(opened.ide.realityObjectReadonly, true);
assert.equal(opened.ide.editsStayOnInstance, true);
assert.ok(opened.ide.objectCount >= 4);
assert.ok(opened.ide.constraintCount >= 1);
assert.deepEqual([...WORKSPACE_IDE_PANELS], [
  "hotel",
  "schedule",
  "budget",
  "agent",
]);

const managed = listWorkspaceManaged({ workspaceId: opened.workspace.id });
assert.ok(managed);
assert.ok(managed!.objects.some((o) => o.title === "Hotel"));
assert.ok(managed!.constraints.some((c) => c.key === "purpose"));

// Simulation + Prepare on Workspace (instance layer)
const afterSim = addWorkspaceSimulationResult({
  workspaceId: opened.workspace.id,
  scenarioKo: "예산 What-if",
  result: { budgetDelta: -30_000 },
});
assert.ok(afterSim);
assert.ok((afterSim!.simulationResults.length ?? 0) >= 1);

const afterPrep = addWorkspacePrepareDraft({
  workspaceId: opened.workspace.id,
  labelKo: "호텔 예약 준비",
  payload: { guests: 2 },
});
assert.ok(afterPrep);
const prepManaged = listWorkspaceManaged({ workspaceId: opened.workspace.id });
assert.ok(prepManaged!.prepare.length >= 1);

// Panel switch (IDE chrome)
const scheduleIde = withWorkspaceIdePanel(opened.ide, "schedule");
assert.equal(scheduleIde.activePanel, "schedule");

// Reality Object unchanged
assert.equal(
  getRealityObject(hotelReality.objectId)!.updatedAt,
  hotelRealityAt,
);

assert.throws(() => assertWorkspaceDoesNotTouchReality("mutate_reality"));

// Re-open same context → same workspace
const again = openWorkspaceFromContext({ context: ctx });
assert.equal(again.created, false);
assert.equal(again.workspace.id, opened.workspace.id);

clearAllWorkspacesForTests();
clearAllWorkspaceHistoryForTests();
clearRealityContextsForTests();
clearRealityObjects();

console.log(
  "ok workspace-engine Osaka-Trip-Workspace IDE objects·constraints·sim·prepare Reality-RO",
);
