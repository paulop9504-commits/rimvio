/**
 * Context Execution Plan + Runtime — L3 instance over L2 Blueprint.
 * Plan = ordered steps (preview · replan). Runtime = step status + retry.
 * @see docs/RIMVIO_EXECUTION_PLAN.md
 */

import type { ContextRunState as ContextOsPhase } from "@/lib/context-blueprint/context-run-state";
import type { ExecutionNodeStatus } from "@/lib/context-blueprint/execution-graph";
import type { RimvioEngineId } from "@/lib/engine/engine-types";

export type { ContextOsPhase };

/** Step lifecycle — SSOT on ContextExecutionPlanV1 (L3). */
export type ExecutionPlanStepStatus = ExecutionNodeStatus;

export const EXECUTION_PLAN_APPROVALS = ["auto", "pending", "approved"] as const;

export type ExecutionPlanApproval = (typeof EXECUTION_PLAN_APPROVALS)[number];

export type ExecutionPlanStepV1 = {
  readonly stepId: string;
  readonly nodeId: string;
  readonly order: number;
  readonly labelKo: string;
  readonly engineId: RimvioEngineId | null;
  readonly status: ExecutionPlanStepStatus;
  readonly lastError: string | null;
  readonly updatedAtIso: string | null;
};

export type ContextExecutionPlanV1 = {
  readonly version: 1;
  readonly contextId: string;
  readonly goalKo: string;
  readonly osPhase: ContextOsPhase;
  readonly approval: ExecutionPlanApproval;
  readonly steps: readonly ExecutionPlanStepV1[];
  readonly currentStepId: string | null;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

export type BuildContextExecutionPlanInput = {
  readonly contextId: string;
  readonly goalKo: string;
  readonly osPhase?: ContextOsPhase;
  readonly approval?: ExecutionPlanApproval;
  readonly now?: Date;
};

export type AdvancePlanStepInput = {
  readonly plan: ContextExecutionPlanV1;
  readonly nodeId: string;
  readonly status: ExecutionPlanStepStatus;
  readonly lastError?: string | null;
  readonly now?: Date;
};
