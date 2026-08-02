/**
 * Smoke: Workspace Mutation Engine — Intent → FILTER_OBJECT → visibility.
 * Reality Store must stay untouched.
 */
import assert from "node:assert/strict";
import {
  clearRealityObjects,
  createRealityObject,
  getRealityObject,
} from "@/lib/reality-object/reality-object-store";
import {
  applyWorkspaceEngineMutation,
  clearAllWorkspacesForTests,
  clearAllWorkspaceHistoryForTests,
  createWorkspace,
  intentToEngineMutation,
  readWorkspace,
  runWorkspaceMutationEngine,
} from "@/lib/workspace";
import {
  createWorkspaceCommand,
  resolveWorkspaceIntent,
} from "@/lib/workspace-command";

clearRealityObjects();
clearAllWorkspacesForTests();
clearAllWorkspaceHistoryForTests();

const r1 = createRealityObject({
  objectId: "reality_biz",
  entityId: "e1",
  contextId: "ctx_mut",
  kind: "hotel",
  labelKo: "APA Hotel",
  relationships: [],
  availableActions: [],
  metadata: { stay: "business" },
});
const r2 = createRealityObject({
  objectId: "reality_capsule",
  entityId: "e2",
  contextId: "ctx_mut",
  kind: "hotel",
  labelKo: "난바 캡슐호텔",
  relationships: [],
  availableActions: [],
  metadata: { stay: "capsule" },
});
const r1At = r1.updatedAt;
const r2At = r2.updatedAt;

const ws = createWorkspace({
  id: "ws_mut_1",
  contextId: "ctx_mut",
  seeds: [
    {
      realityObjectId: r1.objectId,
      kind: "hotel",
      title: "APA Hotel",
      tags: ["business"],
      attrs: { category: "business", priceBand: 3 },
    },
    {
      realityObjectId: r2.objectId,
      kind: "hotel",
      title: "난바 캡슐호텔",
      tags: ["stay:capsule", "capsule"],
      attrs: { category: "capsule", hotelType: "capsule", priceBand: 1 },
    },
  ],
});

assert.equal(ws.objects.filter((o) => o.visible).length, 2);

const command = createWorkspaceCommand({
  workspaceId: ws.id,
  rawText: "캡슐호텔만 보고 싶어",
});
const intent = resolveWorkspaceIntent(command);
assert.ok(intent);
assert.equal(intent!.action, "modify_context");
assert.equal(intent!.target, "hotel");
assert.equal(intent!.parameters.hotelType, "capsule");

const mutation = intentToEngineMutation(intent!);
assert.ok(mutation);
assert.equal(mutation!.type, "FILTER_OBJECT");
assert.equal(mutation!.target, "hotel");
assert.equal(mutation!.changes.category, "capsule");

const applied = applyWorkspaceEngineMutation({
  workspaceId: ws.id,
  mutation: mutation!,
});
assert.equal(applied.ok, true);
if (applied.ok) {
  assert.equal(applied.beforeVisibleCount, 2);
  assert.equal(applied.afterVisibleCount, 1);
  assert.ok(applied.summaryKo.includes("캡슐"));
}

const after = readWorkspace(ws.id)!;
const visible = after.objects.filter((o) => o.visible);
assert.equal(visible.length, 1);
assert.ok(visible[0]!.title.includes("캡슐"));
assert.ok(after.filters.some((f) => f.value === "capsule" || f.key === "category"));

// Reality untouched
assert.equal(getRealityObject("reality_biz")!.updatedAt, r1At);
assert.equal(getRealityObject("reality_capsule")!.updatedAt, r2At);
assert.equal(getRealityObject("reality_biz")!.labelKo, "APA Hotel");

// Full pipeline
clearAllWorkspacesForTests();
createWorkspace({
  id: "ws_mut_2",
  contextId: "ctx_mut_2",
  seeds: [
    {
      realityObjectId: "reality_biz",
      kind: "hotel",
      title: "Business Inn",
      attrs: { category: "business" },
    },
    {
      realityObjectId: "reality_capsule",
      kind: "hotel",
      title: "Capsule Pod",
      tags: ["capsule"],
      attrs: { hotelType: "capsule" },
    },
  ],
});
const pipe = runWorkspaceMutationEngine({
  contextId: "ctx_mut_2",
  workspaceId: "ws_mut_2",
  intent: {
    action: "filter",
    target: "hotel",
    parameters: { hotelType: "capsule", category: "capsule" },
  },
});
assert.equal(pipe.ok, true);
if (pipe.ok) {
  assert.equal(pipe.mutation.type, "FILTER_OBJECT");
  assert.equal(pipe.afterVisibleCount, 1);
}

clearAllWorkspacesForTests();
clearAllWorkspaceHistoryForTests();
clearRealityObjects();

console.log("ok workspace-mutation-engine FILTER_OBJECT capsule");
