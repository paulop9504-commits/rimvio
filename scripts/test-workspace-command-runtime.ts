/**
 * Smoke: Workspace Command Runtime — Active Workspace Draft propose path.
 */
import assert from "node:assert/strict";
import {
  applyDraftMutation,
  WORKSPACE_INTENT_ACTIONS,
  assertWorkspaceMutationAllowed,
  clearDraftMutationsForTests,
  looksLikeForbiddenGlobeCommit,
  parseWorkspaceCommand,
  resolveWorkspaceIntent,
  runWorkspaceCommandRuntime,
} from "@/lib/workspace-command";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import {
  clearContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import {
  clearAllWorkspacesForTests,
  createWorkspace,
} from "@/lib/workspace";

assert.ok(WORKSPACE_INTENT_ACTIONS.includes("filter"));
assert.ok(WORKSPACE_INTENT_ACTIONS.includes("modify_context"));
assert.ok(WORKSPACE_INTENT_ACTIONS.includes("prepare"));
assert.ok(!WORKSPACE_INTENT_ACTIONS.includes("commit" as never));

assert.throws(() => assertWorkspaceMutationAllowed("commit"));
assert.throws(() => assertWorkspaceMutationAllowed("globe_mutate"));
assert.doesNotThrow(() => assertWorkspaceMutationAllowed("filter"));

const eventId = "ws-command-runtime-test";
clearContextWorkspace(eventId);
clearDraftMutationsForTests(eventId);
clearAllWorkspacesForTests();

{
  const inactive = runWorkspaceCommandRuntime({
    workspaceId: eventId,
    rawText: "더 싸게",
  });
  assert.equal(inactive.ok, false);
  if (!inactive.ok) {
    assert.equal(inactive.inactiveWorkspace, true);
  }
}

openMapContextWorkspace({
  contextEventId: eventId,
  domain: "lodging",
  query: "오사카 숙소",
  summaryKo: "오사카 여행",
  source: "test",
  candidates: [
    {
      id: "maps:namba",
      labelKo: "Namba Hotel",
      domain: "lodging",
      lat: 34.66,
      lng: 135.5,
      rating: 8.0,
      priceBand: 3,
      amountLabel: "120,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
    {
      id: "maps:budget",
      labelKo: "Budget Inn",
      domain: "lodging",
      lat: 34.67,
      lng: 135.51,
      rating: 7.2,
      priceBand: 1,
      amountLabel: "45,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
  ],
});

createWorkspace({ id: eventId, contextId: eventId });

{
  const cmd = parseWorkspaceCommand({
    workspaceId: eventId,
    rawText: "더 싸게",
  });
  assert.ok(cmd);
  const intent = resolveWorkspaceIntent(cmd!);
  assert.ok(intent);
  assert.ok(
    intent!.action === "modify_context" || intent!.action === "filter",
  );
}

{
  const ok = runWorkspaceCommandRuntime({
    workspaceId: eventId,
    rawText: "더 싸게",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.mode, "proposed");
    assert.ok(ok.proposal);
    const applied = applyDraftMutation(ok.proposal!.draft.id);
    assert.equal(applied.ok, true);
  }
  const state = readContextWorkspace(eventId);
  assert.ok(state);
  assert.equal(state!.status, "editing");
}

{
  const compare = runWorkspaceCommandRuntime({
    workspaceId: eventId,
    rawText: "비교해줘",
    applyImmediately: true,
  });
  assert.equal(compare.ok, true);
  if (compare.ok) {
    assert.equal(compare.intent.action, "compare");
    assert.equal(compare.mode, "applied");
  }
}

{
  const sim = runWorkspaceCommandRuntime({
    workspaceId: eventId,
    rawText: "만약 비 오면",
    applyImmediately: true,
  });
  assert.equal(sim.ok, true);
  if (sim.ok) {
    assert.equal(sim.intent.action, "simulate");
  }
}

{
  assert.ok(looksLikeForbiddenGlobeCommit("지구에 남겨줘"));
  const commit = runWorkspaceCommandRuntime({
    workspaceId: eventId,
    rawText: "지구에 남겨줘",
  });
  assert.equal(commit.ok, false);
  if (!commit.ok) {
    assert.equal(commit.forbiddenGlobeMutation, true);
  }
}

{
  const prep = runWorkspaceCommandRuntime({
    workspaceId: eventId,
    rawText: "예약 준비",
    targetObjectId: readContextWorkspace(eventId)?.nodes[0]?.id,
    applyImmediately: true,
  });
  assert.equal(prep.ok, true);
  if (prep.ok) {
    assert.equal(prep.intent.action, "prepare");
  }
}

clearContextWorkspace(eventId);
clearDraftMutationsForTests(eventId);
clearAllWorkspacesForTests();
console.log(
  "ok workspace-command-runtime",
  WORKSPACE_INTENT_ACTIONS.join(","),
);
