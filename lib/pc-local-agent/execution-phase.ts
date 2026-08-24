import type { PcAgentTask, PcAgentTaskStatus } from "./types";

/**
 * Fine-grained execution SSOT lives on `pc_local_agent_tasks.status`
 * (16 phases + legacy CREATED/WAITING). `result.phase` is a mirror.
 */
export const PC_EXECUTION_PHASES = [
  "QUEUED",
  "DISPATCHED",
  "RUNNING",
  "BROWSER_OPENED",
  "PAGE_READY",
  "ACTION_RUNNING",
  "WAITING_USER",
  "APPROVED",
  "VERIFYING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "PAUSED",
  "PC_OFFLINE",
  "AUTH_REQUIRED",
  "HUMAN_REQUIRED",
] as const;

export type PcExecutionPhase = (typeof PC_EXECUTION_PHASES)[number];

export type PcAgentTaskResult = {
  success?: boolean;
  url?: string;
  message?: string;
  phase?: PcExecutionPhase;
  graphNode?: string;
  latestEvent?: string;
  screenshotJpeg?: string;
  product?: {
    title?: string;
    price?: string;
    delivery?: string;
  };
  parkedKind?: "queued" | "inflight";
  parkedReason?: "pc_offline";
};

const TERMINAL_PHASES = new Set<PcExecutionPhase>([
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export function isPcExecutionPhase(value: unknown): value is PcExecutionPhase {
  return (
    typeof value === "string" &&
    (PC_EXECUTION_PHASES as readonly string[]).includes(value)
  );
}

export function isTerminalExecutionPhase(phase: PcExecutionPhase): boolean {
  return TERMINAL_PHASES.has(phase);
}

export function toDbTaskStatus(phase: PcExecutionPhase): PcAgentTaskStatus {
  return phase;
}

export function phaseFromDbStatus(status: PcAgentTaskStatus): PcExecutionPhase {
  if (status === "CREATED" || status === "WAITING") {
    return status === "WAITING" ? "WAITING_USER" : "QUEUED";
  }
  if (isPcExecutionPhase(status)) {
    return status;
  }
  return "QUEUED";
}

export function readTaskResult(
  result: PcAgentTask["result"] | Record<string, unknown> | null,
): PcAgentTaskResult {
  if (!result || typeof result !== "object") {
    return {};
  }
  return result as PcAgentTaskResult;
}

export function readExecutionPhase(
  task: Pick<PcAgentTask, "status" | "result">,
): PcExecutionPhase {
  if (isPcExecutionPhase(task.status)) {
    return task.status;
  }
  const phase = readTaskResult(task.result).phase;
  if (isPcExecutionPhase(phase)) {
    return phase;
  }
  return phaseFromDbStatus(task.status);
}

/**
 * Agent-reported progress. Cloud rejects checkout/complete from WAITING_USER.
 */
export function canTransitionExecutionPhase(
  from: PcExecutionPhase,
  to: PcExecutionPhase,
): boolean {
  if (from === to) {
    return true;
  }
  if (TERMINAL_PHASES.has(from)) {
    return false;
  }
  if (to === "CANCELLED" || to === "FAILED") {
    return true;
  }
  if (to === "PC_OFFLINE" || to === "PAUSED") {
    return true;
  }

  if (from === "WAITING_USER") {
    return to === "APPROVED" || to === "PAUSED";
  }
  if (from === "HUMAN_REQUIRED" || from === "AUTH_REQUIRED") {
    return (
      to === "ACTION_RUNNING" ||
      to === "WAITING_USER" ||
      to === "PAUSED" ||
      to === "HUMAN_REQUIRED" ||
      to === "AUTH_REQUIRED"
    );
  }
  if (from === "PC_OFFLINE") {
    return to === "QUEUED" || to === "DISPATCHED" || to === "RUNNING";
  }
  if (to === "APPROVED") {
    return from === "WAITING_USER";
  }
  if (to === "COMPLETED") {
    if (
      from === "WAITING_USER" ||
      from === "HUMAN_REQUIRED" ||
      from === "AUTH_REQUIRED" ||
      from === "ACTION_RUNNING"
    ) {
      return false;
    }
    return (
      from === "APPROVED" ||
      from === "VERIFYING" ||
      from === "RUNNING" ||
      from === "PAGE_READY" ||
      from === "BROWSER_OPENED"
    );
  }
  if (to === "VERIFYING") {
    return from === "APPROVED" || from === "ACTION_RUNNING" || from === "VERIFYING";
  }
  if (from === "APPROVED") {
    return (
      to === "ACTION_RUNNING" ||
      to === "VERIFYING" ||
      to === "HUMAN_REQUIRED" ||
      to === "AUTH_REQUIRED"
    );
  }

  const happy: PcExecutionPhase[] = [
    "QUEUED",
    "DISPATCHED",
    "RUNNING",
    "BROWSER_OPENED",
    "PAGE_READY",
    "ACTION_RUNNING",
    "WAITING_USER",
  ];
  const fromIdx = happy.indexOf(from);
  const toIdx = happy.indexOf(to);
  if (fromIdx >= 0 && toIdx >= 0 && toIdx >= fromIdx) {
    return true;
  }
  if (to === "HUMAN_REQUIRED" || to === "AUTH_REQUIRED" || to === "WAITING_USER") {
    return fromIdx >= 0 || from === "ACTION_RUNNING" || from === "APPROVED";
  }
  return false;
}

export function applyReportedPhase(input: {
  from: PcExecutionPhase;
  to: PcExecutionPhase;
  result?: PcAgentTaskResult;
}):
  | { ok: true; phase: PcExecutionPhase; status: PcAgentTaskStatus; result: PcAgentTaskResult }
  | { ok: false; error: "invalid_transition" } {
  if (!canTransitionExecutionPhase(input.from, input.to)) {
    return { ok: false, error: "invalid_transition" };
  }
  const result: PcAgentTaskResult = {
    ...input.result,
    phase: input.to,
  };
  return {
    ok: true,
    phase: input.to,
    status: toDbTaskStatus(input.to),
    result,
  };
}

export function parkTaskForPcOffline(input: {
  status: PcAgentTaskStatus;
  phase: PcExecutionPhase;
}): { status: PcAgentTaskStatus; phase: PcExecutionPhase; parkedKind: "queued" | "inflight" } | null {
  if (isTerminalExecutionPhase(input.phase) || isTerminalDbStatus(input.status)) {
    return null;
  }
  if (input.phase === "PC_OFFLINE" || input.status === "PC_OFFLINE") {
    return null;
  }
  if (
    input.phase === "WAITING_USER" ||
    input.phase === "HUMAN_REQUIRED" ||
    input.phase === "AUTH_REQUIRED"
  ) {
    return null;
  }
  if (
    input.status === "QUEUED" ||
    input.phase === "QUEUED" ||
    input.phase === "DISPATCHED"
  ) {
    return { status: "PC_OFFLINE", phase: "PC_OFFLINE", parkedKind: "queued" };
  }
  return { status: "PC_OFFLINE", phase: "PC_OFFLINE", parkedKind: "inflight" };
}

export function resumeTaskAfterPcOnline(input: {
  status: PcAgentTaskStatus;
  phase: PcExecutionPhase;
  parkedKind?: "queued" | "inflight";
}): { status: PcAgentTaskStatus; phase: PcExecutionPhase } | null {
  if (input.phase !== "PC_OFFLINE" && input.status !== "PC_OFFLINE") {
    return null;
  }
  const inflight =
    input.parkedKind === "inflight" || input.status === "WAITING";
  if (inflight) {
    return { status: "DISPATCHED", phase: "DISPATCHED" };
  }
  return { status: "QUEUED", phase: "QUEUED" };
}

export function isClaimableQueuedPhase(phase: PcExecutionPhase): boolean {
  return phase === "QUEUED" || phase === "DISPATCHED";
}

export function isCheckoutResumePhase(phase: PcExecutionPhase): boolean {
  return phase === "APPROVED";
}

function isTerminalDbStatus(status: PcAgentTaskStatus): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
}

export function liveWorkPhaseFromExecution(
  phase: PcExecutionPhase,
): "running" | "needs_approval" | "waiting_pc" | "done" | "stopped" {
  if (phase === "WAITING_USER") {
    return "needs_approval";
  }
  if (phase === "PC_OFFLINE" || phase === "PAUSED") {
    return "waiting_pc";
  }
  if (phase === "COMPLETED") {
    return "done";
  }
  if (phase === "FAILED" || phase === "CANCELLED") {
    return "stopped";
  }
  if (phase === "HUMAN_REQUIRED" || phase === "AUTH_REQUIRED") {
    return "needs_approval";
  }
  return "running";
}
