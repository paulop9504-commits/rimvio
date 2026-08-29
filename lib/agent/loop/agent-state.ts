/**
 * Hub Agent Loop — state machine (P1).
 */

import type { AgentIntent } from "@/lib/agent/intent/intent-types";
import type { HubWorkspaceFullState } from "@/lib/hub/dev/hub-workspace-observe";

export type AgentLoopStatus =
  | "idle"
  | "planning"
  | "executing"
  | "verifying"
  | "replanning"
  | "waiting_user"
  | "completed"
  | "failed";

export type WorkspaceContext = HubWorkspaceFullState;

export type AgentObservation = {
  readonly id: string;
  readonly atIso: string;
  readonly kind: "workspace" | "tool" | "test" | "verify";
  readonly summary: string;
  readonly data?: unknown;
};

export type AgentAction = {
  readonly id: string;
  readonly toolId: string;
  readonly label: string;
  readonly status: "pending" | "running" | "done" | "failed";
  readonly args?: Record<string, unknown>;
};

export type AgentVerification = {
  readonly ok: boolean;
  readonly detail: string;
  readonly atIso: string;
};

export type ActionPlan = {
  readonly goal: string;
  readonly steps: readonly { readonly id: string; readonly label: string; readonly toolId: string; readonly args?: Record<string, unknown> }[];
};

export type AgentState = {
  readonly goal: string;
  readonly intent: AgentIntent;
  readonly context: WorkspaceContext | null;
  readonly plan?: ActionPlan;
  readonly observations: readonly AgentObservation[];
  readonly actions: readonly AgentAction[];
  readonly verifications: readonly AgentVerification[];
  readonly status: AgentLoopStatus;
  readonly stepCount: number;
  readonly replanCount: number;
  readonly toolCalls: number;
};

export const AGENT_LOOP_LIMITS = {
  MAX_STEPS: 30,
  MAX_REPLANS: 5,
  MAX_SAME_ACTION: 2,
} as const;

export function createInitialAgentState(input: {
  readonly goal: string;
  readonly intent: AgentIntent;
}): AgentState {
  return {
    goal: input.goal,
    intent: input.intent,
    context: null,
    observations: [],
    actions: [],
    verifications: [],
    status: "idle",
    stepCount: 0,
    replanCount: 0,
    toolCalls: 0,
  };
}

export function appendObservation(
  state: AgentState,
  observation: Omit<AgentObservation, "id" | "atIso">,
): AgentState {
  return {
    ...state,
    observations: [
      ...state.observations,
      {
        ...observation,
        id: `obs-${state.observations.length + 1}`,
        atIso: new Date().toISOString(),
      },
    ],
  };
}

export function recordToolCall(state: AgentState): AgentState {
  return { ...state, toolCalls: state.toolCalls + 1, stepCount: state.stepCount + 1 };
}

export function shouldStopLoop(state: AgentState): boolean {
  return (
    state.stepCount >= AGENT_LOOP_LIMITS.MAX_STEPS ||
    state.replanCount >= AGENT_LOOP_LIMITS.MAX_REPLANS
  );
}

export function countRepeatedAction(state: AgentState, toolId: string, argsKey: string): number {
  return state.actions.filter(
    (a) => a.toolId === toolId && JSON.stringify(a.args ?? {}) === argsKey && a.status === "done",
  ).length;
}
