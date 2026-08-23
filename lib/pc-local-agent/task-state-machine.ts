import type { PcAgentTaskStatus } from "./types";

const VALID_TRANSITIONS: Record<PcAgentTaskStatus, PcAgentTaskStatus[]> = {
  CREATED: ["QUEUED", "CANCELLED"],
  QUEUED: ["RUNNING", "CANCELLED", "FAILED"],
  RUNNING: ["COMPLETED", "FAILED", "WAITING"],
  WAITING: ["RUNNING", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export function canTransitionTaskStatus(
  from: PcAgentTaskStatus,
  to: PcAgentTaskStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTaskTransition(
  from: PcAgentTaskStatus,
  to: PcAgentTaskStatus,
): void {
  if (!canTransitionTaskStatus(from, to)) {
    throw new Error(`Invalid task transition: ${from} → ${to}`);
  }
}

export function isTerminalTaskStatus(status: PcAgentTaskStatus): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
}

export const TASK_STATUS_ORDER: PcAgentTaskStatus[] = [
  "CREATED",
  "QUEUED",
  "RUNNING",
  "WAITING",
  "COMPLETED",
];
