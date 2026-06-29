/** Context Run Engine — durable RunState + ephemeral execution surfaces. */

export type ExecutionDecisionKind =
  | "auto"
  | "ask"
  | "approval_required"
  | "recommend";

export type ContextRunSurfaceKind =
  | "none"
  | "execution_card"
  | "question_card"
  | "map_focus"
  | "portal"
  | "market_quick_list"
  | "field_discovery_ingress"
  | "approval_dialog"
  | "progress"
  | "hub_peek"
  | "dashboard_highlight"
  | "external_url"
  | "toast_only";

export type ContextRunStatus = "active" | "waiting_input" | "completed" | "cancelled";

/** Minimal durable run pointer — full stack in docs/CONTEXT_RUN_ENGINE.md */
export type ContextRunState = {
  graphId: string;
  goal: string;
  status: ContextRunStatus;
  resumeHint?: string | null;
  lastVisitedNode?: string | null;
  updatedAt: string;
};

export type ContextRunSurfaceResolution = {
  graphId: string;
  decision: ExecutionDecisionKind;
  surface: ContextRunSurfaceKind;
  reason: string;
};
