/** Claude-inspired Execution Feed — Run projection, not chat. */

export type ExecutionFeedStepStatus =
  | "pending"
  | "running"
  | "waiting_user"
  | "done"
  | "failed";

/** Collapsed step chip in the pill row (Claude source / tab pills). */
export type ExecutionFeedPill = {
  id: string;
  labelKo: string;
  status: ExecutionFeedStepStatus;
  /** Short result when done — e.g. "✓ iPhone 15 Pro" */
  resultKo?: string | null;
};

/** Active expanded panel kinds (Claude artifacts). */
export type ExecutionFeedArtifactKind =
  | "progress"
  | "result"
  | "question"
  | "approval"
  | "widget"
  | "checklist"
  | "metric_strip"
  | "summary";

export type ExecutionFeedMetric = {
  id: string;
  labelKo: string;
  valueKo: string;
  hintKo?: string | null;
  tone?: "default" | "positive" | "warn" | "neutral";
};

export type ExecutionFeedChecklistItem = {
  id: string;
  titleKo: string;
  bodyKo?: string | null;
  done: boolean;
  priorityKo?: string | null;
  priorityTone?: "high" | "medium" | "low";
};

export type ExecutionFeedSourceChip = {
  id: string;
  labelKo: string;
  icon?: "globe" | "map" | "hub" | "field" | "memory";
};

export type ExecutionFeedTab = {
  id: string;
  labelKo: string;
};

export type ExecutionFeedArtifact = {
  kind: ExecutionFeedArtifactKind;
  titleKo?: string | null;
  bodyKo?: string | null;
  summaryLineKo?: string | null;
  metrics?: readonly ExecutionFeedMetric[];
  checklist?: readonly ExecutionFeedChecklistItem[];
  sources?: readonly ExecutionFeedSourceChip[];
  tabs?: readonly ExecutionFeedTab[];
  activeTabId?: string | null;
  primaryActionLabelKo?: string | null;
  secondaryActionLabelKo?: string | null;
};

export type ExecutionFeedItem = {
  id: string;
  graphId: string;
  createdAt: string;
  goalKo?: string | null;
  pills: readonly ExecutionFeedPill[];
  activePillId: string | null;
  expandedPillId: string | null;
  artifact: ExecutionFeedArtifact | null;
};

export type ExecutionFeedState = {
  run: ExecutionFeedItem | null;
};

export type ExecutionFeedGoalInput = {
  graphId: string;
  goalKo: string;
};

export type ExecutionFeedStepInput = {
  graphId: string;
  stepId: string;
  labelKo: string;
  status: ExecutionFeedStepStatus;
  resultKo?: string | null;
};

export type ExecutionFeedArtifactInput = {
  graphId: string;
  stepId?: string | null;
  artifact: ExecutionFeedArtifact;
};
