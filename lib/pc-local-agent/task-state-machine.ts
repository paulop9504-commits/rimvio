import { canTransitionExecutionPhase, phaseFromDbStatus } from "./execution-phase";
import type { PcAgentTaskStatus } from "./types";

export function canTransitionTaskStatus(
  from: PcAgentTaskStatus,
  to: PcAgentTaskStatus,
): boolean {
  if (from === to) {
    return true;
  }
  const fromPhase = phaseFromDbStatus(from);
  const toPhase = phaseFromDbStatus(to);
  if (canTransitionExecutionPhase(fromPhase, toPhase)) {
    return true;
  }
  if (from === "RUNNING" && to === "WAITING") {
    return true;
  }
  if (from === "WAITING" && (to === "RUNNING" || to === "QUEUED")) {
    return true;
  }
  return false;
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
  "QUEUED",
  "DISPATCHED",
  "RUNNING",
  "WAITING_USER",
  "APPROVED",
  "COMPLETED",
];
