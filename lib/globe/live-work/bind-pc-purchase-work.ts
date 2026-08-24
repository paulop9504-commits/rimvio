import type { PcAgentTask } from "@/lib/pc-local-agent";
import {
  liveWorkPhaseFromExecution,
  readExecutionPhase,
  readTaskResult,
} from "@/lib/pc-local-agent/execution-phase";
import { isTerminalTaskStatus } from "@/lib/pc-local-agent/task-state-machine";
import { upsertLiveWork } from "@/lib/globe/live-work/live-work-store";
import type { LiveWorkPhase } from "@/lib/globe/live-work/types";
import { copy } from "@/lib/copy/human-ko";

export function statusLineFromTask(task: PcAgentTask): string {
  const phase = readExecutionPhase(task);
  const pc = copy.globe.pcContinuity;
  switch (phase) {
    case "PC_OFFLINE":
      return copy.globe.liveWorkWaitingPc;
    case "WAITING_USER":
      return copy.globe.liveWorkWaitingUser;
    case "HUMAN_REQUIRED":
    case "AUTH_REQUIRED":
      return copy.globe.liveWorkHumanRequired;
    case "APPROVED":
      return copy.globe.liveWorkApproved;
    case "BROWSER_OPENED":
      return pc.stepBrowserOpen;
    case "PAGE_READY":
      return copy.globe.liveWorkStepSite;
    case "VERIFYING":
    case "COMPLETED":
      return pc.stepReady;
    case "FAILED":
    case "CANCELLED":
      return pc.stepFailed;
    case "DISPATCHED":
    case "RUNNING":
    case "ACTION_RUNNING":
      return copy.globe.liveWorkRunning;
    default:
      return pc.stepQueued;
  }
}

export function bindPcPurchaseLiveWork(input: {
  contextEventId: string;
  task: PcAgentTask;
  deviceName: string;
}): void {
  const contextEventId =
    input.contextEventId.trim() || `shop:${input.task.id}`;
  const title = input.task.payload.title?.trim() || "구매";
  const phase = readExecutionPhase(input.task);
  const result = readTaskResult(input.task.result);
  const livePhase: LiveWorkPhase = liveWorkPhaseFromExecution(phase);
  upsertLiveWork({
    id: `pc:${input.task.id}`,
    contextEventId,
    kind: "pc_execution",
    title,
    glyph: "🛒",
    phase: livePhase,
    statusLine: statusLineFromTask(input.task),
    pcTaskId: input.task.id,
    deviceName: input.deviceName.trim() || copy.globe.pcContinuity.pcFallback,
    latestEvent: result.latestEvent ?? phase,
    screenshotJpeg: result.screenshotJpeg ?? null,
    executionPhase: phase,
    completedAtIso: isTerminalTaskStatus(input.task.status)
      ? new Date().toISOString()
      : null,
  });
}
