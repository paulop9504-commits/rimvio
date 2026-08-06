/**
 * Agent Plan progress — Cursor-style "2/4 호텔 검색" work-log lines.
 */

import type { WorkspaceAgentPlan } from "@/lib/context-run/workspace-agent-plan";

export function formatAgentPlanProgressKo(
  plan: WorkspaceAgentPlan | null | undefined,
): string | null {
  if (!plan?.steps.length) return null;
  const total = plan.steps.length;
  const done = plan.steps.filter((s) => s.status === "done").length;
  const running = plan.steps.find((s) => s.status === "running");
  const failed = plan.steps.find((s) => s.status === "failed");
  if (failed) {
    return `${done}/${total} 실패 · ${failed.labelKo}`;
  }
  if (running) {
    const idx = plan.steps.findIndex((s) => s.id === running.id) + 1;
    return `${idx}/${total} ${running.labelKo}`;
  }
  if (done >= total) {
    return `${total}/${total} 완료`;
  }
  const next = plan.steps.find((s) => s.status === "pending");
  if (next) {
    return `${done + 1}/${total} ${next.labelKo}`;
  }
  return `${done}/${total} ${plan.planKind}`;
}

export type AgentPlanStepMark = {
  readonly id: string;
  readonly labelKo: string;
  readonly mark: "✓" | "◉" | "○" | "!";
  readonly status: string;
};

export function listAgentPlanStepMarks(
  plan: WorkspaceAgentPlan | null | undefined,
): readonly AgentPlanStepMark[] {
  if (!plan?.steps.length) return [];
  return plan.steps.map((s) => {
    const mark: AgentPlanStepMark["mark"] =
      s.status === "done"
        ? "✓"
        : s.status === "running"
          ? "◉"
          : s.status === "failed"
            ? "!"
            : "○";
    return {
      id: s.id,
      labelKo: s.labelKo,
      mark,
      status: s.status,
    };
  });
}

export function agentPlanPercent(
  plan: WorkspaceAgentPlan | null | undefined,
): number | null {
  if (!plan?.steps.length) return null;
  const done = plan.steps.filter(
    (s) => s.status === "done" || s.status === "skipped",
  ).length;
  return Math.min(100, Math.round((done / plan.steps.length) * 100));
}
