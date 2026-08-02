/**
 * Smoke: NL Reality Command — 캡슐호텔만 보여줘 → filter Hotel capsule → Draft.
 */
import assert from "node:assert/strict";
import {
  REALITY_COMMAND_ACTIONS,
  parseRealityCommand,
  runRealityCommand,
  toWorkspaceIntent,
} from "@/lib/reality-command";
import {
  clearAllWorkspacesForTests,
  createWorkspace,
} from "@/lib/workspace";
import {
  clearDraftMutationsForTests,
  readDraftMutation,
} from "@/lib/workspace-command";

clearAllWorkspacesForTests();
clearDraftMutationsForTests();

assert.ok(REALITY_COMMAND_ACTIONS.includes("filter"));
assert.ok(REALITY_COMMAND_ACTIONS.includes("replace"));
assert.ok(REALITY_COMMAND_ACTIONS.includes("prepare"));

// Parse-only
const parsed = parseRealityCommand("캡슐호텔만 보여줘");
assert.ok(parsed);
assert.equal(parsed!.target, "Hotel");
assert.equal(parsed!.action, "filter");
assert.equal(parsed!.constraint.type, "capsule");

const parsed2 = parseRealityCommand("캡슐호텔만 보고싶어");
assert.ok(parsed2);
assert.equal(parsed2!.action, "filter");
assert.equal(parsed2!.constraint.type, "capsule");

// Other intents
assert.equal(parseRealityCommand("호텔 바꿔줘")?.action, "replace");
assert.equal(parseRealityCommand("두 호텔 비교해")?.action, "compare");
assert.equal(parseRealityCommand("예약 준비해")?.action, "prepare");
assert.equal(parseRealityCommand("시뮬레이션 해줘")?.action, "simulate");
assert.equal(parseRealityCommand("동선 최적화")?.action, "optimize");
assert.equal(parseRealityCommand("호텔을 우메다로 옮겨줘")?.action, "move");

// Commit forbidden
const commit = runRealityCommand({
  workspaceId: "ws-nl",
  text: "지구에 남겨줘",
});
assert.equal(commit.ok, false);
if (!commit.ok) assert.equal(commit.forbiddenCommit, true);

// Full flow: Intent → Proposal → Draft
createWorkspace({
  id: "ws-nl",
  contextId: "ws-nl",
  seeds: [
    {
      realityObjectId: "r_biz",
      kind: "hotel",
      title: "Business Hotel",
      attrs: { category: "business" },
    },
    {
      realityObjectId: "r_cap",
      kind: "hotel",
      title: "난바 캡슐호텔",
      tags: ["capsule"],
      attrs: { hotelType: "capsule", category: "capsule" },
    },
  ],
});

const result = runRealityCommand({
  workspaceId: "ws-nl",
  text: "캡슐호텔만 보고싶어",
});
assert.equal(result.ok, true);
if (result.ok) {
  assert.deepEqual(
    {
      target: result.intent.target,
      action: result.intent.action,
      constraint: { type: result.intent.constraint.type },
    },
    {
      target: "Hotel",
      action: "filter",
      constraint: { type: "capsule" },
    },
  );
  assert.ok(result.proposal.previewKo.includes("capsule") || result.proposal.previewKo.includes("filter"));
  assert.equal(result.proposal.applyLabelKo, "적용");
  assert.ok(result.proposal.draftId);
  assert.equal(result.proposal.draftStatus, "proposed");

  const draft = readDraftMutation(result.proposal.draftId!);
  assert.ok(draft);
  assert.equal(draft!.status, "proposed");
  assert.equal(draft!.realityDiff.after.hotelType, "capsule");
}

const wsIntent = toWorkspaceIntent(parsed!);
assert.equal(wsIntent.action, "modify_context");
assert.equal(wsIntent.parameters.hotelType, "capsule");

clearDraftMutationsForTests();
clearAllWorkspacesForTests();

console.log(
  "ok reality-command-engine capsule-filter Hotel→Draft proposed",
);
