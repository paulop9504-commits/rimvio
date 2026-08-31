/**
 * Platform Goal State — Agent work board (P0 spine primitive #1).
 *
 * LLM memory + Goal State + Workspace State + Execution History + Capability Graph
 */

import type { PlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";

export type PlatformGoalStateStatus =
  | "idle"
  | "executing"
  | "blocked"
  | "verified"
  | "committed";

export type PlatformGoalBlockedItem = {
  readonly id: string;
  readonly reasonKo: string;
};

/** Agent work board — never lose progress mid-goal. */
export type PlatformGoalState = {
  readonly goalId: string;
  readonly goal: PlatformGoal;
  readonly status: PlatformGoalStateStatus;
  readonly completed: readonly string[];
  readonly inProgress: string | null;
  readonly blocked: readonly PlatformGoalBlockedItem[];
  readonly pending: readonly string[];
  readonly replanCount: number;
  readonly progressPct: number;
};

function goalIdFromGoal(goal: PlatformGoal): string {
  const scope =
    goal.scope.kind === "existing_platform"
      ? goal.scope.platformName
      : goal.scope.kind === "code_direct"
        ? "code"
        : "new";
  return `goal:${goal.goalKind}:${scope}:${goal.domain ?? "general"}`;
}

/** Initialize Goal State from structured goal + plan steps. */
export function createPlatformGoalState(input: {
  readonly goal: PlatformGoal;
  readonly planSteps?: readonly HubAgentPlanStep[];
}): PlatformGoalState {
  const pending = (input.planSteps ?? []).map((s) => s.id);
  return {
    goalId: goalIdFromGoal(input.goal),
    goal: input.goal,
    status: pending.length ? "executing" : "idle",
    completed: [],
    inProgress: pending[0] ?? null,
    blocked: [],
    pending: pending.slice(1),
    replanCount: 0,
    progressPct: 0,
  };
}

function calcProgress(completed: number, total: number): number {
  if (total <= 0) return completed > 0 ? 100 : 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

/** Mark step started. */
export function markGoalStepRunning(
  state: PlatformGoalState,
  stepId: string,
): PlatformGoalState {
  const pending = state.pending.filter((id) => id !== stepId);
  return {
    ...state,
    status: "executing",
    inProgress: stepId,
    pending: state.inProgress && state.inProgress !== stepId
      ? [state.inProgress, ...pending]
      : pending,
  };
}

/** Mark step completed — advance work board. */
export function markGoalStepCompleted(
  state: PlatformGoalState,
  stepId: string,
): PlatformGoalState {
  const completed = state.completed.includes(stepId)
    ? state.completed
    : [...state.completed, stepId];
  const pending = state.pending.filter((id) => id !== stepId);
  const total = completed.length + pending.length + (state.inProgress ? 1 : 0);
  const next = pending[0] ?? null;
  return {
    ...state,
    completed,
    inProgress: state.inProgress === stepId ? next : state.inProgress,
    pending: state.inProgress === stepId ? pending.slice(1) : pending,
    progressPct: calcProgress(completed.length, total),
    status: pending.length === 0 && !next ? "verified" : "executing",
  };
}

/** Mark step failed — block + keep pending for partial replan. */
export function markGoalStepBlocked(
  state: PlatformGoalState,
  stepId: string,
  reasonKo: string,
): PlatformGoalState {
  return {
    ...state,
    status: "blocked",
    inProgress: null,
    blocked: [...state.blocked, { id: stepId, reasonKo }],
  };
}

/** Partial replan — surgery, not full plan discard. */
export function applyPartialReplanToGoalState(
  state: PlatformGoalState,
  input: {
    readonly failedStepId: string;
    readonly replacementStepIds: readonly string[];
    readonly reasonKo: string;
  },
): PlatformGoalState {
  const blocked = state.blocked.filter((b) => b.id !== input.failedStepId);
  const remainingPending = state.pending.filter((id) => id !== input.failedStepId);
  const queue = [...input.replacementStepIds, ...remainingPending];
  return {
    ...state,
    status: "executing",
    blocked,
    inProgress: queue[0] ?? null,
    pending: queue.slice(1),
    replanCount: state.replanCount + 1,
  };
}

export function summarizeGoalStateKo(state: PlatformGoalState): string {
  const parts: string[] = [];
  if (state.completed.length) parts.push(`완료 ${state.completed.length}`);
  if (state.inProgress) parts.push(`진행 → ${state.inProgress}`);
  if (state.blocked.length) parts.push(`차단 ${state.blocked.length}`);
  if (state.pending.length) parts.push(`대기 ${state.pending.length}`);
  return parts.join(" · ") || state.goal.summaryKo;
}
