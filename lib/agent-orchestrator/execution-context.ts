/**
 * Agent Execution Context — working memory for domain agent loops (P1).
 * Extends existing types; does not replace AgentControllerInput.
 */

import type { ActionPlanV1 } from "@/lib/action-planner/types";
import type { PlanDAG } from "@/lib/reality-planner/types";
import type { AgentObservation, AgentHistoryTurn } from "@/lib/agent/types";
import type { AgentTaskInput } from "@/lib/agent-orchestrator/types";
import type { AgentTrace } from "@/lib/agent-orchestrator/agent-trace";
import { readSessionGraph } from "@/lib/graph-command/session-graph-store";

export const ORCHESTRATOR_LOOP_BUDGET = {
  MAX_AGENT_ITERATIONS: 12,
  MAX_REPLANS: 3,
} as const;

export type AgentGoal = {
  readonly id: string;
  readonly summary: string;
  readonly summaryKo: string;
  readonly domain?: string;
};

export type WorkspaceSnapshot = {
  readonly contextEventId: string;
  readonly visibleNodeCount: number;
  readonly selectionIds: readonly string[];
  readonly pinnedLabels: readonly string[];
};

export type AgentExecutionContext = {
  readonly task: AgentTaskInput;
  readonly goal: AgentGoal;
  readonly planDag?: PlanDAG | null;
  readonly actionPlan?: ActionPlanV1 | null;
  readonly workspace: WorkspaceSnapshot;
  readonly conversation: {
    readonly utterance: string;
    readonly history?: readonly AgentHistoryTurn[];
  };
  readonly observations: readonly AgentObservation[];
  readonly trace: AgentTrace;
  readonly iteration: number;
  readonly replanCount: number;
  /** P4 — composite agent execution id for child tool ledger entries */
  readonly compositeExecutionId?: string | null;
};

export type AgentExecutionStatus =
  | "completed"
  | "needs_next_action"
  | "needs_replan"
  | "needs_user"
  | "blocked";

export type AgentExecutionResult = {
  readonly status: AgentExecutionStatus;
  readonly observation: AgentObservation;
  readonly observations: readonly AgentObservation[];
  readonly nextActions?: readonly { readonly toolId: string; readonly label: string }[];
  readonly reason?: string;
  readonly trace: AgentTrace;
};

export function buildWorkspaceSnapshot(contextEventId: string): WorkspaceSnapshot {
  const graph = readSessionGraph(contextEventId);
  if (!graph) {
    return {
      contextEventId,
      visibleNodeCount: 0,
      selectionIds: [],
      pinnedLabels: [],
    };
  }
  const visible = graph.nodes.filter((n) => n.visible);
  return {
    contextEventId,
    visibleNodeCount: visible.length,
    selectionIds: [...graph.selectionIds],
    pinnedLabels: visible.filter((n) => n.pinned).map((n) => n.labelKo).slice(0, 8),
  };
}

export function createAgentExecutionContext(input: {
  readonly task: AgentTaskInput;
  readonly goal: AgentGoal;
  readonly utterance: string;
  readonly planDag?: PlanDAG | null;
  readonly actionPlan?: ActionPlanV1 | null;
  readonly history?: readonly AgentHistoryTurn[];
  readonly observations?: readonly AgentObservation[];
}): AgentExecutionContext {
  return {
    task: input.task,
    goal: input.goal,
    planDag: input.planDag ?? null,
    actionPlan: input.actionPlan ?? null,
    workspace: buildWorkspaceSnapshot(input.task.contextEventId),
    conversation: {
      utterance: input.utterance,
      history: input.history,
    },
    observations: input.observations ?? [],
    trace: { events: [] },
    iteration: 0,
    replanCount: 0,
  };
}

export function appendContextObservation(
  ctx: AgentExecutionContext,
  observation: AgentObservation,
): AgentExecutionContext {
  return {
    ...ctx,
    observations: [...ctx.observations, observation].slice(-32),
    workspace: buildWorkspaceSnapshot(ctx.task.contextEventId),
  };
}
