/**
 * Rimvio Core — Task State SSOT types (ADR-062).
 * Persistence: roadmap Supabase · subscribe for realtime UI.
 */

export type RimvioTaskStatus =
  | "created"
  | "planning"
  | "running"
  | "paused"
  | "waiting_approval"
  | "failed"
  | "completed"
  | "cancelled";

export type RimvioTaskStep = {
  readonly id: string;
  readonly labelKo: string;
  readonly status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  readonly startedAtIso?: string;
  readonly completedAtIso?: string;
};

export type RimvioTaskCheckpoint = {
  readonly id: string;
  readonly labelKo: string;
  readonly stepIds: readonly string[];
  readonly createdAtIso: string;
};

export type RimvioTaskApproval = {
  readonly id: string;
  readonly kind: "prepare" | "commit" | "dangerous_action";
  readonly status: "pending" | "approved" | "rejected";
  readonly requestedAtIso: string;
  readonly resolvedAtIso?: string;
};

export type RimvioTaskExecutionEvent = {
  readonly id: string;
  readonly kind: "observation" | "action" | "error" | "replan" | "checkpoint";
  readonly summaryKo: string;
  readonly atIso: string;
};

/** Canonical Task — chat transcript is NOT this object. */
export type RimvioTaskState = {
  readonly id: string;
  readonly userId: string;
  readonly goal: string;
  readonly status: RimvioTaskStatus;
  readonly currentStepId: string | null;
  readonly context: Record<string, unknown>;
  readonly plan: Record<string, unknown> | null;
  readonly completedSteps: readonly RimvioTaskStep[];
  readonly pendingSteps: readonly RimvioTaskStep[];
  readonly activeCapabilityIds: readonly string[];
  readonly activeRuntimeId: string | null;
  readonly executionHistory: readonly RimvioTaskExecutionEvent[];
  readonly errors: readonly { readonly message: string; readonly atIso: string }[];
  readonly approvals: readonly RimvioTaskApproval[];
  readonly checkpoints: readonly RimvioTaskCheckpoint[];
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

export function createEmptyTaskState(input: {
  id: string;
  userId: string;
  goal: string;
}): RimvioTaskState {
  const now = new Date().toISOString();
  return {
    id: input.id,
    userId: input.userId,
    goal: input.goal,
    status: "created",
    currentStepId: null,
    context: {},
    plan: null,
    completedSteps: [],
    pendingSteps: [],
    activeCapabilityIds: [],
    activeRuntimeId: null,
    executionHistory: [],
    errors: [],
    approvals: [],
    checkpoints: [],
    createdAtIso: now,
    updatedAtIso: now,
  };
}
