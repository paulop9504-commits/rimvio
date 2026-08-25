import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { OpenUrlPayload, PcAgentTask } from "@/lib/pc-local-agent/types";
import { purchaseNodeForPhase } from "@/lib/pc-local-agent/purchase-graph";
import {
  applyReportedPhase,
  parkTaskForPcOffline,
  readExecutionPhase,
  readTaskResult,
  resumeTaskAfterPcOnline,
  type PcAgentTaskResult,
  type PcExecutionPhase,
} from "@/lib/pc-local-agent/execution-phase";
import { canTransitionTaskStatus } from "@/lib/pc-local-agent/task-state-machine";
import { PC_AGENT_WAITING_TIMEOUT_MS } from "@/lib/pc-local-agent/types";

function admin() {
  return createServiceRoleClient();
}

export async function reportTaskExecutionPhase(input: {
  taskId: string;
  deviceId: string;
  phase: PcExecutionPhase;
  patch?: PcAgentTaskResult;
}): Promise<{ task: PcAgentTask } | { error: string; status: number }> {
  const db = admin();
  if (!db) {
    return { error: "service_unavailable", status: 503 };
  }
  const { data: existing } = await db
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("id", input.taskId)
    .eq("device_id", input.deviceId)
    .maybeSingle();
  if (!existing) {
    return { error: "not_found", status: 404 };
  }
  const task = existing as PcAgentTask;
  const from = readExecutionPhase(task);
  const applied = applyReportedPhase({
    from,
    to: input.phase,
    result: {
      ...readTaskResult(task.result),
      ...input.patch,
      url: input.patch?.url ?? readTaskResult(task.result).url,
    },
  });
  if (!applied.ok) {
    return { error: "invalid_transition", status: 409 };
  }
  if (!canTransitionTaskStatus(task.status, applied.status) && task.status !== applied.status) {
    return { error: "invalid_status", status: 409 };
  }

  const waiting =
    applied.phase === "WAITING_USER" ||
    applied.phase === "AUTH_REQUIRED" ||
    applied.phase === "HUMAN_REQUIRED" ||
    applied.phase === "PAUSED"
      ? new Date(Date.now() + PC_AGENT_WAITING_TIMEOUT_MS).toISOString()
      : applied.phase === "APPROVED" || applied.phase === "QUEUED" || applied.phase === "DISPATCHED"
        ? null
        : undefined;

  const { data: updated, error } = await db
    .from("pc_local_agent_tasks")
    .update({
      status: applied.status,
      result: applied.result,
      error: applied.phase === "FAILED" ? input.patch?.message ?? task.error : task.error,
      waiting_expires_at: waiting === undefined ? task.waiting_expires_at : waiting,
    })
    .eq("id", input.taskId)
    .select("*")
    .maybeSingle();

  if (error || !updated) {
    return { error: error?.message ?? "update_failed", status: 500 };
  }
  return { task: updated as PcAgentTask };
}

export async function parkDeviceTasksOffline(deviceId: string): Promise<number> {
  const db = admin();
  if (!db) {
    return 0;
  }
  const { data: rows } = await db
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("device_id", deviceId)
    .in("status", [
      "QUEUED",
      "DISPATCHED",
      "RUNNING",
      "BROWSER_OPENED",
      "PAGE_READY",
      "ACTION_RUNNING",
      "APPROVED",
      "VERIFYING",
      "WAITING",
      "PC_OFFLINE",
    ]);
  let n = 0;
  for (const row of rows ?? []) {
    const task = row as PcAgentTask;
    const parked = parkTaskForPcOffline({
      status: task.status,
      phase: readExecutionPhase(task),
    });
    if (!parked) {
      continue;
    }
    if (
      !canTransitionTaskStatus(task.status, parked.status) &&
      task.status !== parked.status
    ) {
      continue;
    }
    const result: PcAgentTaskResult = {
      ...readTaskResult(task.result),
      phase: parked.phase,
      parkedReason: "pc_offline",
      parkedKind: parked.parkedKind,
      latestEvent: "pc_offline",
    };
    const { error } = await db
      .from("pc_local_agent_tasks")
      .update({
        status: parked.status,
        result,
      })
      .eq("id", task.id);
    if (!error) {
      n += 1;
    }
  }
  return n;
}

export async function resumeParkedTasksForDevice(deviceId: string): Promise<number> {
  const db = admin();
  if (!db) {
    return 0;
  }
  const { data: rows } = await db
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("device_id", deviceId)
    .in("status", ["QUEUED", "WAITING", "RUNNING", "PC_OFFLINE", "DISPATCHED"]);
  let n = 0;
  for (const row of rows ?? []) {
    const task = row as PcAgentTask;
    const resumed = resumeTaskAfterPcOnline({
      status: task.status,
      phase: readExecutionPhase(task),
      parkedKind: readTaskResult(task.result).parkedKind,
    });
    if (!resumed) {
      continue;
    }
    if (
      !canTransitionTaskStatus(task.status, resumed.status) &&
      task.status !== resumed.status
    ) {
      continue;
    }
    const result: PcAgentTaskResult = {
      ...readTaskResult(task.result),
      phase: resumed.phase,
      parkedReason: undefined,
      latestEvent: "pc_online_resume",
    };
    const { error } = await db
      .from("pc_local_agent_tasks")
      .update({
        status: resumed.status,
        result,
        waiting_expires_at: null,
        error: null,
      })
      .eq("id", task.id);
    if (!error) {
      n += 1;
    }
  }
  return n;
}

export async function insertQueuedOpenUrlTask(input: {
  userId: string;
  deviceId: string;
  payload: OpenUrlPayload;
  offline: boolean;
}): Promise<{ task: PcAgentTask } | { error: string; status: number }> {
  const db = admin();
  if (!db) {
    return { error: "service_unavailable", status: 503 };
  }
  const phase = input.offline ? "PC_OFFLINE" : "QUEUED";
  const url = input.payload.url.trim();
  const payload = {
    url,
    ...(input.payload.title?.trim() ? { title: input.payload.title.trim() } : {}),
    ...(input.payload.query?.trim() ? { query: input.payload.query.trim() } : {}),
    ...(input.payload.intent ? { intent: input.payload.intent } : {}),
    ...(input.payload.requiredCapabilities?.length
      ? { requiredCapabilities: input.payload.requiredCapabilities }
      : {}),
    graphRoot: input.payload.intent === "purchase" ? "PURCHASE" : undefined,
    graphNode:
      input.payload.intent === "purchase"
        ? purchaseNodeForPhase(phase) ?? "FIND_PRODUCT"
        : undefined,
  };
  const { data: task, error } = await db
    .from("pc_local_agent_tasks")
    .insert({
      user_id: input.userId,
      device_id: input.deviceId,
      type: "OPEN_URL",
      payload,
      status: "QUEUED",
      result: initialTaskResult(phase),
    })
    .select("*")
    .single();
  if (error || !task) {
    return { error: error?.message ?? "task_create_failed", status: 500 };
  }
  return { task: task as PcAgentTask };
}

export function initialTaskResult(phase: PcExecutionPhase): PcAgentTaskResult {
  return {
    phase,
    latestEvent: phase === "PC_OFFLINE" ? "pc_offline" : "queued",
  };
}

export function isPcOfflineHold(task: Pick<PcAgentTask, "status" | "result">): boolean {
  return readExecutionPhase(task) === "PC_OFFLINE";
}
