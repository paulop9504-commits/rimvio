/**
 * Main Agent loop phases (P0/P1 boundary).
 *
 * Maps to existing WorkspaceAgentLoopPhase and Hub AgentLoopStatus without duplicating loops.
 */

import type { WorkspaceAgentLoopPhase } from "@/lib/context-run/workspace-agent-loop";
import type { AgentLoopStatus } from "@/lib/agent/loop/agent-state";

export const MAIN_AGENT_LOOP_PHASES = [
  "idle",
  "understanding",
  "inspecting",
  "observing",
  "planning",
  "acting",
  "verifying",
  "replanning",
  "waiting_for_user",
  "completed",
  "failed",
  "reporting",
] as const;

export type MainAgentLoopPhase = (typeof MAIN_AGENT_LOOP_PHASES)[number];

export const MAIN_AGENT_LOOP_LIMITS = {
  MAX_ITERATIONS: 12,
  MAX_REPLANS: 3,
  MAX_TOOL_CALLS: 24,
  MAX_RETRIES_PER_ACTION: 2,
} as const;

export function workspacePhaseToMainPhase(
  phase: WorkspaceAgentLoopPhase,
): MainAgentLoopPhase {
  switch (phase) {
    case "observe":
      return "observing";
    case "understand":
      return "understanding";
    case "retrieve_context":
    case "select_tool":
      return "planning";
    case "execute_patch":
    case "projection":
      return "acting";
    case "verify":
      return "verifying";
    case "wait":
      return "waiting_for_user";
    default:
      return "acting";
  }
}

export function hubStatusToMainPhase(status: AgentLoopStatus): MainAgentLoopPhase {
  switch (status) {
    case "idle":
      return "idle";
    case "planning":
      return "planning";
    case "executing":
      return "acting";
    case "verifying":
      return "verifying";
    case "replanning":
      return "replanning";
    case "waiting_user":
      return "waiting_for_user";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "idle";
  }
}
