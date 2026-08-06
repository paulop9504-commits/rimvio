/**
 * Capsule resume continues mid-flight Workspace Agent Plan.
 * Run: npx tsx scripts/test-capsule-agent-plan-resume.ts
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  continueResumedWorkspaceAgentPlan,
  openMapContextWorkspace,
  readContextWorkspace,
  readPendingCapsuleAgentPlan,
  resumeCapsuleWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { runWorkspaceAgentPlan } from "@/lib/context-run/run-workspace-agent-plan";
import type { WorkspaceAgentPlan } from "@/lib/context-run/workspace-agent-plan";
import { clearCalloutWindowsForTests } from "@/lib/callout/windows";

const CTX = "ctx_capsule_plan_resume";

function poi(id: string, title: string, day: number | null): ContextWorkspaceNode {
  return {
    id,
    kind: "poi",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.68,
    lng: 135.52,
    rating: 4.4,
    priceBand: null,
    amountLabel: null,
    thumbnailUrl: null,
    tags: day != null ? [`day_${day}`] : [],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "seed",
  };
}

clearCalloutWindowsForTests();
clearContextWorkspace(CTX);
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "poi",
  query: "오사카",
  summaryKo: "Osaka Trip",
  candidates: [],
});
writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: [
    poi("p_umeda", "우메다", 2),
    poi("p_castle", "오사카성", null),
  ],
  selectedIds: [],
  updatedAtIso: new Date().toISOString(),
});
writeContextWorkspaceExpanded(CTX, true);

const unfinished: WorkspaceAgentPlan = {
  version: 1,
  planId: "wap_capsule_mid",
  contextEventId: CTX,
  sourceUtterance: "Day 2에서 우메다 빼고 오사카성 넣어줘",
  planKind: "day_modify_b",
  steps: [
    {
      id: "ws_step_1",
      kind: "workspace_patch",
      labelKo: "Day 2 · 우메다 제거",
      utterance: "Day 2에서 우메다 빼줘",
      status: "done",
      noteKo: "B · remove",
      observation: null,
    },
    {
      id: "ws_step_2",
      kind: "workspace_patch",
      labelKo: "오사카성 추가",
      utterance: "오사카성을 Day 2에 넣어줘",
      status: "pending",
      noteKo: "B · add",
      expect: { workspaceMutated: true },
      observation: null,
    },
    {
      id: "ws_step_3",
      kind: "workspace_patch",
      labelKo: "Day 2 동선 다시",
      utterance: "Day 2 이동 동선 다시 짜줘",
      status: "pending",
      noteKo: "B · rebuild",
      expect: { workspaceMutated: true },
      observation: null,
    },
  ],
  createdAtIso: new Date().toISOString(),
  cursor: 1,
};

// Simulate step1 done + persist mid-flight plan
writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: [
    poi("p_umeda", "우메다", null),
    poi("p_castle", "오사카성", null),
  ],
  agentPlan: unfinished,
  updatedAtIso: new Date().toISOString(),
});

assert.ok(readPendingCapsuleAgentPlan(CTX));

const resumed = resumeCapsuleWorkspace({
  contextEventId: CTX,
  expand: true,
});
assert.ok(resumed);
assert.ok(resumed!.pendingAgentPlan);
assert.ok(/이어갈까요/.test(resumed!.statusKo));
assert.equal(resumed!.pendingAgentPlan!.steps.filter((s) => s.status === "pending").length, 2);

void (async () => {
  const continued = await continueResumedWorkspaceAgentPlan({
    contextEventId: CTX,
  });
  assert.ok(continued);
  assert.equal(continued!.stepsFailed, 0);
  assert.ok(continued!.stepsDone >= 1);

  const after = readContextWorkspace(CTX)!;
  assert.ok(
    after.nodes.find((n) => n.id === "p_castle")!.tags.some((t) => /^day[_-]?2$/i.test(t)),
  );

  // Happy-path full run also persists agentPlan
  writeContextWorkspace({
    ...readContextWorkspace(CTX)!,
    nodes: [
      poi("p_umeda", "우메다", 2),
      poi("p_castle", "오사카성", null),
    ],
    agentPlan: null,
    updatedAtIso: new Date().toISOString(),
  });
  const full = await runWorkspaceAgentPlan({
    utterance: "Day 2 일정 너무 빡빡한데 우메다는 빼고 오사카성 넣어줘",
    explicitContextEventId: CTX,
  });
  assert.ok(full.ok || full.workspaceMutated);
  assert.ok(readContextWorkspace(CTX)!.agentPlan);

  clearContextWorkspace(CTX);
  console.log("ok — Capsule resume · pending Agent Plan continue");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
