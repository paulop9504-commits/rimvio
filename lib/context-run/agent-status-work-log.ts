/**
 * STEP 8 — Agent Status work-log (chat is not the answer).
 */

import {
  AGENT_PRODUCT_PIPELINE_STATUS_KO,
  formatAgentProductStatusLog,
  readLastAgentProductTurn,
  type AgentProductTurn,
} from "@/lib/context-run/agent-product-pipeline";
import { readAgentRuntimeProjection } from "@/lib/context-run/agent-runtime-projection";
import { formatAgentPlanProgressKo } from "@/lib/context-run/format-agent-plan-progress";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";

/**
 * Prefer Plan step progress · product pipeline · projection · fallback.
 */
export function resolveAgentStatusWorkLog(input: {
  readonly contextEventId: string;
  readonly fallbackKo?: string | null;
  readonly turn?: AgentProductTurn | null;
}): string | null {
  const plan = readContextWorkspace(input.contextEventId)?.agentPlan ?? null;
  const fromPlan = formatAgentPlanProgressKo(plan);
  if (fromPlan) return fromPlan;

  const turn =
    input.turn ??
    (readLastAgentProductTurn()?.contextEventId === input.contextEventId
      ? readLastAgentProductTurn()
      : null);
  const fromTurn = formatAgentProductStatusLog(turn);
  if (fromTurn) return fromTurn;

  const proj = readAgentRuntimeProjection(input.contextEventId);
  if (proj?.statusKo?.trim()) return proj.statusKo.trim();

  return input.fallbackKo?.trim() || null;
}

/** Multi-line work log for debug / Agent Status strip. */
export function listAgentStatusWorkLogLines(
  contextEventId: string,
): readonly string[] {
  const plan = readContextWorkspace(contextEventId)?.agentPlan ?? null;
  const planLine = formatAgentPlanProgressKo(plan);
  const lines: string[] = [];
  if (planLine) lines.push(planLine);
  if (plan?.steps.length) {
    for (const s of plan.steps) {
      const mark =
        s.status === "done"
          ? "✓"
          : s.status === "running"
            ? "◉"
            : s.status === "failed"
              ? "!"
              : "○";
      lines.push(`${mark} ${s.labelKo}`);
    }
  }
  const turn = readLastAgentProductTurn();
  if (turn?.contextEventId === contextEventId) {
    return [...lines, ...turn.statusLog];
  }
  const proj = readAgentRuntimeProjection(contextEventId);
  if (proj?.workLog?.length) {
    return [...lines, ...proj.workLog];
  }
  return lines;
}

export function agentStatusLabelForStage(
  stage: keyof typeof AGENT_PRODUCT_PIPELINE_STATUS_KO,
): string {
  return AGENT_PRODUCT_PIPELINE_STATUS_KO[stage];
}
