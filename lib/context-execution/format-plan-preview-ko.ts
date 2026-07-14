/**
 * User-facing Execution Plan preview lines (L1 copy helpers).
 */

import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";

export const EXECUTION_PLAN_STATUS_SYMBOL: Record<string, string> = {
  done: "✓",
  running: "…",
  prepared: "◎",
  waiting_approval: "!",
  blocked: "×",
  pending: "○",
  ready: "○",
};

export type ContextHubPlanPreviewRow = {
  readonly stepId: string;
  readonly order: number;
  readonly labelKo: string;
  readonly status: ContextExecutionPlanV1["steps"][number]["status"];
  readonly symbol: string;
  readonly isCurrent: boolean;
};

function statusSymbol(status: string): string {
  return EXECUTION_PLAN_STATUS_SYMBOL[status] ?? "○";
}

function formatStepLine(step: ContextExecutionPlanV1["steps"][number], index: number): string {
  const symbol = statusSymbol(step.status);
  const label = step.labelKo.trim() || step.nodeId;
  return `${symbol} ${index + 1}. ${label}`;
}

/** Structured rows for Hub plan strip — SSOT over parsing preview text. */
export function buildContextHubPlanPreviewRows(
  plan: ContextExecutionPlanV1,
  max = 6,
): ContextHubPlanPreviewRow[] {
  const currentStepId = plan.currentStepId;
  return plan.steps.slice(0, max).map((step, index) => ({
    stepId: step.stepId,
    order: index + 1,
    labelKo: step.labelKo.trim() || step.nodeId,
    status: step.status,
    symbol: statusSymbol(step.status),
    isCurrent: currentStepId ? step.stepId === currentStepId : step.status === "running",
  }));
}

/** Compact preview for Hub / approval sheet — not marketing copy. */
export function formatContextExecutionPlanPreviewKo(
  plan: ContextExecutionPlanV1,
): string {
  return plan.steps.map((step, index) => formatStepLine(step, index)).join("\n");
}

export function formatContextExecutionPlanCurrentStepKo(
  plan: ContextExecutionPlanV1,
): string | null {
  const current =
    plan.steps.find((step) => step.stepId === plan.currentStepId) ??
    plan.steps.find((step) => step.status === "running") ??
    plan.steps.find((step) => step.status !== "done");
  if (!current) {
    return null;
  }
  return current.labelKo.trim() || current.nodeId;
}
