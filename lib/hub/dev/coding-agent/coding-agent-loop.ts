/**
 * Coding Agent Loop (P4) — Explore → Edit → Test → Repair.
 * Sub-executor under Platform Agent; uses Hub Tool Gateway.
 */

import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";
import type { HubWorkspaceToolContext } from "@/lib/hub/dev/hub-workspace-tools";
import { invokeHubWorkspaceTool } from "@/lib/hub/dev/hub-workspace-tools";
import {
  buildCodingPlan,
  type CodingPlan,
} from "@/lib/hub/dev/platform-agent/coding-plan";
import { planRepairStepsFromGraph, buildIssueGraph, detectRegression } from "@/lib/hub/dev/hub-verify-repair";
import { rootCauseAnalysis, analyzeErrors } from "@/lib/hub/dev/hub-error-analysis";
import { deriveProjectIssues } from "@/lib/hub/dev/dev-project-state";

export type CodingAgentEvent =
  | { readonly type: "phase"; readonly phase: string; readonly detail?: string }
  | { readonly type: "file"; readonly path: string; readonly action: "read" | "edit" | "search" }
  | { readonly type: "test"; readonly passed: number; readonly total: number; readonly ok: boolean }
  | { readonly type: "repair"; readonly reason: string }
  | { readonly type: "complete"; readonly ok: boolean; readonly summary: string };

export type CodingAgentLoopInput = {
  readonly plan: CodingPlan;
  readonly ctx: HubWorkspaceToolContext;
  readonly onEvent: (event: CodingAgentEvent) => void;
  readonly maxRepairs?: number;
};

export type CodingAgentLoopResult = {
  readonly ok: boolean;
  readonly stepsRun: number;
  readonly repairs: number;
};

export async function runCodingAgentLoop(input: CodingAgentLoopInput): Promise<CodingAgentLoopResult> {
  const emit = input.onEvent;
  const maxRepairs = input.maxRepairs ?? 2;
  let repairs = 0;
  let stepsRun = 0;
  let lastTestOk = true;

  const runSteps = async (steps: readonly HubAgentPlanStep[]) => {
    for (const s of steps) {
      stepsRun += 1;
      emit({ type: "phase", phase: s.toolId, detail: s.label });

      if (s.toolId.startsWith("code.")) {
        const path = String(s.args?.path ?? "");
        emit({
          type: "file",
          path: path || String(s.args?.capability ?? ""),
          action: s.toolId.includes("read") || s.toolId.includes("search") ? "read" : "edit",
        });
      }

      const result = await invokeHubWorkspaceTool(s.toolId, s.args ?? {}, input.ctx);

      if (s.toolId === "test.run" && result.ok) {
        const data = result.data as { passed: number; total: number; ok: boolean };
        lastTestOk = data.ok;
        emit({ type: "test", passed: data.passed, total: data.total, ok: data.ok });
      }

      if (!result.ok) {
        emit({ type: "complete", ok: false, summary: result.error });
        return false;
      }
    }
    return true;
  };

  const ok = await runSteps(input.plan.steps);
  if (!ok) return { ok: false, stepsRun, repairs };

  const verifyExtras: HubAgentPlanStep[] = [
    { id: "lint", label: "Lint", toolId: "lint.run" },
    { id: "types", label: "Type check", toolId: "typecheck.run" },
  ];
  await runSteps(verifyExtras);

  while (!lastTestOk && repairs < maxRepairs) {
    repairs += 1;
    const draftBefore = input.ctx.getDraft();
    const analyzed = analyzeErrors({
      issues: deriveProjectIssues(draftBefore),
      testFailed: true,
    });
    const rca = rootCauseAnalysis(analyzed);
    emit({ type: "repair", reason: rca.primaryCauseKo.slice(0, 80) });
    const graph = buildIssueGraph({
      draft: draftBefore,
      testFailed: true,
    });
    const repairPlan = planRepairStepsFromGraph(graph);
    const repairOk = await runSteps([
      ...repairPlan,
      { id: `re-lint-${repairs}`, label: "Lint 재실행", toolId: "lint.run" },
      { id: `re-types-${repairs}`, label: "타입 재검사", toolId: "typecheck.run" },
      { id: `re-test-${repairs}`, label: "재테스트", toolId: "test.run" },
    ]);
    if (!repairOk) break;

    const draftAfter = input.ctx.getDraft();
    const regression = detectRegression(draftBefore, draftAfter);
    if (regression.detected) {
      emit({ type: "repair", reason: regression.summaryKo });
    }
  }

  emit({
    type: "complete",
    ok: lastTestOk,
    summary: lastTestOk ? "Coding Agent 완료" : "테스트 실패 — 수동 확인 필요",
  });

  return { ok: lastTestOk, stepsRun, repairs };
}
