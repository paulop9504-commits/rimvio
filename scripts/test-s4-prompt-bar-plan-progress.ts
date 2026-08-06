/**
 * S4 — WorkspacePromptBar mount path + Plan progress status.
 * Run: npx tsx scripts/test-s4-prompt-bar-plan-progress.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  agentPlanPercent,
  formatAgentPlanProgressKo,
  listAgentPlanStepMarks,
} from "@/lib/context-run/format-agent-plan-progress";
import {
  listAgentStatusWorkLogLines,
  resolveAgentStatusWorkLog,
} from "@/lib/context-run/agent-status-work-log";
import {
  WORKSPACE_AGENT_PLAN_VERSION,
  type WorkspaceAgentPlan,
} from "@/lib/context-run/workspace-agent-plan";
import {
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace";

const root = process.cwd();

{
  const host = readFileSync(
    join(root, "components/workspace-sdk/workspace-sdk-host.tsx"),
    "utf8",
  );
  assert.match(host, /WorkspacePromptBar/);
  assert.match(host, /formatAgentPlanProgressKo/);
  assert.match(host, /data-workspace-sdk-host/);
}

{
  const bar = readFileSync(
    join(root, "components/context-workspace/workspace-prompt-bar.tsx"),
    "utf8",
  );
  assert.match(bar, /data-workspace-prompt/);
  assert.match(bar, /WorkspaceAgentStatusPanel/);
  assert.match(bar, /applyGlobeWorkspaceAgentTurn/);
}

{
  const panel = readFileSync(
    join(root, "components/context-workspace/workspace-agent-status-panel.tsx"),
    "utf8",
  );
  assert.match(panel, /agentPlanSteps/);
  assert.match(panel, /listAgentPlanStepMarks/);
}

{
  const plan: WorkspaceAgentPlan = {
    version: WORKSPACE_AGENT_PLAN_VERSION,
    planId: "plan-s4",
    contextEventId: "ctx-s4",
    sourceUtterance: "호텔 찾아",
    planKind: "scout_domains",
    cursor: 1,
    createdAtIso: new Date().toISOString(),
    steps: [
      {
        id: "s1",
        kind: "spatial_discovery",
        labelKo: "호텔 검색",
        utterance: "호텔",
        status: "done",
      },
      {
        id: "s2",
        kind: "spatial_discovery",
        labelKo: "맛집 검색",
        utterance: "맛집",
        status: "running",
      },
      {
        id: "s3",
        kind: "workspace_patch",
        labelKo: "후보 정리",
        utterance: "정리",
        status: "pending",
      },
      {
        id: "s4",
        kind: "wait",
        labelKo: "선택 대기",
        utterance: "대기",
        status: "pending",
      },
    ],
  };

  assert.equal(formatAgentPlanProgressKo(plan), "2/4 맛집 검색");
  assert.equal(agentPlanPercent(plan), 25);
  const marks = listAgentPlanStepMarks(plan);
  assert.equal(marks.length, 4);
  assert.equal(marks[0]!.mark, "✓");
  assert.equal(marks[1]!.mark, "◉");
  assert.equal(marks[2]!.mark, "○");

  const donePlan: WorkspaceAgentPlan = {
    ...plan,
    steps: plan.steps.map((s) => ({ ...s, status: "done" as const })),
  };
  assert.equal(formatAgentPlanProgressKo(donePlan), "4/4 완료");
  assert.equal(agentPlanPercent(donePlan), 100);
}

{
  const eventId = "ctx-s4-worklog";
  openMapContextWorkspace({
    contextEventId: eventId,
    query: "오사카 준비",
    domain: "lodging",
    hits: [],
  });
  const base = readContextWorkspace(eventId);
  assert.ok(base);
  const plan: WorkspaceAgentPlan = {
    version: WORKSPACE_AGENT_PLAN_VERSION,
    planId: "plan-s4-wl",
    contextEventId: eventId,
    sourceUtterance: "오사카 준비",
    planKind: "compound_c",
    cursor: 0,
    createdAtIso: new Date().toISOString(),
    steps: [
      {
        id: "a",
        kind: "spatial_discovery",
        labelKo: "숙소",
        utterance: "숙소",
        status: "running",
      },
      {
        id: "b",
        kind: "spatial_discovery",
        labelKo: "저녁",
        utterance: "저녁",
        status: "pending",
      },
    ],
  };
  writeContextWorkspace({ ...base!, agentPlan: plan });
  assert.equal(readContextWorkspace(eventId)?.agentPlan?.planId, "plan-s4-wl");
  assert.equal(
    resolveAgentStatusWorkLog({ contextEventId: eventId }),
    "1/2 숙소",
  );
  const lines = listAgentStatusWorkLogLines(eventId);
  assert.ok(lines[0] === "1/2 숙소");
  assert.ok(lines.some((l) => l.includes("숙소")));
  assert.ok(lines.some((l) => l.includes("저녁")));
}

console.log("ok — s4 prompt-bar + plan progress");
