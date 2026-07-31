/**
 * Reality OS — Capsule resume opens Workspace (Context → Workspace).
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  clearWorkspaceChat,
  prepareTripWorkspaceDraft,
  resumeCapsuleWorkspace,
} from "../lib/context-workspace";

const CTX = "test:reality-os-resume";

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);

const state = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일 짜줘",
  contextEventId: CTX,
  tripPrep: {
    destinationKo: "오사카",
    nights: 4,
    days: 5,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
});
assert.ok(state);
assert.ok(state!.nodes.length >= 3);

const resumed = resumeCapsuleWorkspace({
  contextEventId: CTX,
  expand: true,
});
assert.ok(resumed, "resume without requiring compiler IR");
assert.ok(resumed!.state.nodes.some((n) => n.visible));
assert.equal(resumed!.state.contextEventId, CTX);

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
console.log("ok: reality-os capsule → workspace resume");
