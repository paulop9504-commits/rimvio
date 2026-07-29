/**
 * Reality Planning Engine — Goal → Sub-Goal → Task DAG.
 */

export type PlanNodeKind = "goal" | "sub_goal" | "task" | "agent_call";

export type PlanNodeStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "skipped";

export type PlanNode = {
  readonly id: string;
  readonly kind: PlanNodeKind;
  readonly label: string;
  readonly labelKo: string;
  readonly agentId?: string;
  readonly dependsOn: readonly string[];
  readonly status: PlanNodeStatus;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly result?: unknown;
  readonly errorReason?: string;
};

export type PlanDAG = {
  readonly planId: string;
  readonly contextEventId: string;
  readonly rootGoalId: string;
  readonly nodes: readonly PlanNode[];
  readonly status: "planning" | "executing" | "completed" | "failed" | "replanning";
  readonly createdAt: string;
  readonly updatedAt: string;
};
