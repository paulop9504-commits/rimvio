/**
 * Workspace Agent Plan — multi-step Cursor-like SSOT (not Graph ActionPlan).
 * Guard judges; Plan executor runs Tool/Patch; Postcondition verifies each step.
 */

import type { PostconditionExpect } from "@/lib/agent-policy/postcondition-check";
import type { WorkspaceAgentToolId } from "@/lib/context-run/workspace-agent-loop";

export const WORKSPACE_AGENT_PLAN_VERSION = 1 as const;

export const WORKSPACE_AGENT_PLAN_STEP_KINDS = [
  "workspace_patch",
  "spatial_discovery",
  "workspace_prompt",
  "reality_prepare",
  "wait",
] as const;

export type WorkspaceAgentPlanStepKind =
  (typeof WORKSPACE_AGENT_PLAN_STEP_KINDS)[number];

export type WorkspaceAgentPlanStepStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "skipped"
  | "blocked";

export type WorkspaceAgentPlanObservation = {
  readonly ok: boolean;
  readonly statusKo: string | null;
  readonly visibleCount: number;
  readonly workspaceMutated: boolean;
  readonly toolId: WorkspaceAgentToolId | "wait" | "noop";
  readonly patchKind: string | null;
};

export type WorkspaceAgentPlanStep = {
  readonly id: string;
  readonly kind: WorkspaceAgentPlanStepKind;
  readonly labelKo: string;
  /** Utterance fed to the single-turn Agent Loop for this step. */
  readonly utterance: string;
  readonly status: WorkspaceAgentPlanStepStatus;
  readonly expect?: PostconditionExpect;
  readonly observation?: WorkspaceAgentPlanObservation | null;
  readonly noteKo?: string | null;
};

export type WorkspaceAgentPlanKind =
  | "single"
  | "compound_c"
  | "day_modify_b"
  | "refine_chain"
  | "add_a"
  /** Concurrent lodging + eatery (+ refine) without Day verbs. */
  | "scout_domains"
  /** Scout → Top-N refine → Day place → route (acceptance compound). */
  | "scout_refine_day";

export type WorkspaceAgentPlan = {
  readonly version: typeof WORKSPACE_AGENT_PLAN_VERSION;
  readonly planId: string;
  readonly contextEventId: string | null;
  readonly sourceUtterance: string;
  readonly planKind: WorkspaceAgentPlanKind;
  readonly steps: readonly WorkspaceAgentPlanStep[];
  readonly createdAtIso: string;
  readonly cursor: number;
};
