/**
 * Background task dispatch — `bg:` id prefix (Jarvis Phase 4 / ADR-042).
 * Non-blocking Verify · Repair · Observe work off the main intent path.
 */

import { publishAgentRuntimeEvent } from "@/lib/workstream/agent-runtime-bus";

export const BG_TASK_ID_PREFIX = "bg:" as const;

export type BackgroundTaskKind =
  | "verify_schedule"
  | "repair_schedule"
  | "sync_goal"
  | "observe_world";

export type BackgroundTaskStatus =
  | "queued"
  | "running"
  | "done"
  | "failed";

export type BackgroundTaskRecord = {
  readonly id: string;
  readonly kind: BackgroundTaskKind;
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly status: BackgroundTaskStatus;
  readonly queuedAtIso: string;
  readonly startedAtIso: string | null;
  readonly finishedAtIso: string | null;
  readonly errorKo: string | null;
};

type TaskRunner = () => void | Promise<void>;

const tasks: BackgroundTaskRecord[] = [];
let seq = 0;
let drainScheduled = false;

const MAX_TASKS = 120;

function nowIso(): string {
  return new Date().toISOString();
}

function trimLog(): void {
  if (tasks.length > MAX_TASKS) {
    tasks.splice(0, tasks.length - MAX_TASKS);
  }
}

function patchTask(
  id: string,
  patch: Partial<
    Pick<
      BackgroundTaskRecord,
      "status" | "startedAtIso" | "finishedAtIso" | "errorKo"
    >
  >,
): BackgroundTaskRecord | null {
  const i = tasks.findIndex((t) => t.id === id);
  if (i < 0) return null;
  const next = { ...tasks[i]!, ...patch };
  tasks[i] = next;
  return next;
}

export function formatBackgroundTaskId(
  kind: BackgroundTaskKind,
  contextEventId: string,
): string {
  return `${BG_TASK_ID_PREFIX}${kind}:${contextEventId.trim()}`;
}

export function isBackgroundTaskId(id: string): boolean {
  return id.trim().startsWith(BG_TASK_ID_PREFIX);
}

export function readBackgroundTasks(input?: {
  readonly contextEventId?: string | null;
  readonly limit?: number;
}): readonly BackgroundTaskRecord[] {
  const ctx = input?.contextEventId?.trim();
  const limit = input?.limit ?? 20;
  const rows = ctx ? tasks.filter((t) => t.contextEventId === ctx) : tasks.slice();
  return rows.slice(-limit);
}

export function readBackgroundTask(id: string): BackgroundTaskRecord | null {
  return tasks.find((t) => t.id === id) ?? null;
}

async function runTask(record: BackgroundTaskRecord, run: TaskRunner): Promise<void> {
  patchTask(record.id, { status: "running", startedAtIso: nowIso() });
  publishAgentRuntimeEvent({
    kind: "bg_task_started",
    contextEventId: record.contextEventId,
    labelKo: record.labelKo,
    payload: { taskId: record.id, kind: record.kind },
  });

  try {
    await run();
    patchTask(record.id, { status: "done", finishedAtIso: nowIso() });
    publishAgentRuntimeEvent({
      kind: "bg_task_finished",
      contextEventId: record.contextEventId,
      labelKo: `${record.labelKo} 완료`,
      payload: { taskId: record.id, kind: record.kind, ok: true },
    });
  } catch (err) {
    const errorKo =
      err instanceof Error && err.message.trim()
        ? err.message.trim()
        : "백그라운드 작업 실패";
    patchTask(record.id, {
      status: "failed",
      finishedAtIso: nowIso(),
      errorKo,
    });
    publishAgentRuntimeEvent({
      kind: "bg_task_finished",
      contextEventId: record.contextEventId,
      labelKo: errorKo,
      payload: { taskId: record.id, kind: record.kind, ok: false },
    });
  }
}

function runTaskSync(record: BackgroundTaskRecord, run: TaskRunner): void {
  patchTask(record.id, { status: "running", startedAtIso: nowIso() });
  publishAgentRuntimeEvent({
    kind: "bg_task_started",
    contextEventId: record.contextEventId,
    labelKo: record.labelKo,
    payload: { taskId: record.id, kind: record.kind },
  });

  try {
    const out = run();
    if (out && typeof (out as Promise<void>).then === "function") {
      throw new Error("sync background task must not return a Promise");
    }
    patchTask(record.id, { status: "done", finishedAtIso: nowIso() });
    publishAgentRuntimeEvent({
      kind: "bg_task_finished",
      contextEventId: record.contextEventId,
      labelKo: `${record.labelKo} 완료`,
      payload: { taskId: record.id, kind: record.kind, ok: true },
    });
  } catch (err) {
    const errorKo =
      err instanceof Error && err.message.trim()
        ? err.message.trim()
        : "백그라운드 작업 실패";
    patchTask(record.id, {
      status: "failed",
      finishedAtIso: nowIso(),
      errorKo,
    });
    publishAgentRuntimeEvent({
      kind: "bg_task_finished",
      contextEventId: record.contextEventId,
      labelKo: errorKo,
      payload: { taskId: record.id, kind: record.kind, ok: false },
    });
  }
}

type PendingRun = { readonly record: BackgroundTaskRecord; readonly run: TaskRunner };

const pending: PendingRun[] = [];
let draining = false;

async function drainQueue(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (pending.length > 0) {
      const next = pending.shift();
      if (!next) break;
      await runTask(next.record, next.run);
    }
  } finally {
    draining = false;
    drainScheduled = false;
  }
}

function scheduleDrain(): void {
  if (drainScheduled) return;
  drainScheduled = true;
  const tick = () => {
    void drainQueue();
  };
  if (typeof queueMicrotask === "function") {
    queueMicrotask(tick);
  } else {
    setTimeout(tick, 0);
  }
}

/**
 * Queue a background task. Id always starts with `bg:`.
 * Pass `sync: true` in tests to run inline.
 */
export function dispatchBackgroundTask(input: {
  readonly kind: BackgroundTaskKind;
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly run: TaskRunner;
  readonly sync?: boolean;
}): BackgroundTaskRecord {
  seq += 1;
  const contextEventId = input.contextEventId.trim();
  const record: BackgroundTaskRecord = {
    id: `${formatBackgroundTaskId(input.kind, contextEventId)}:${Date.now().toString(36)}:${seq}`,
    kind: input.kind,
    contextEventId,
    labelKo: input.labelKo.trim() || input.kind,
    status: "queued",
    queuedAtIso: nowIso(),
    startedAtIso: null,
    finishedAtIso: null,
    errorKo: null,
  };
  tasks.push(record);
  trimLog();

  publishAgentRuntimeEvent({
    kind: "bg_task_queued",
    contextEventId,
    labelKo: record.labelKo,
    payload: { taskId: record.id, kind: record.kind },
  });

  if (input.sync) {
    runTaskSync(record, input.run);
    return readBackgroundTask(record.id) ?? record;
  }

  pending.push({ record, run: input.run });
  scheduleDrain();
  return record;
}

export function clearBackgroundTasksForTests(): void {
  tasks.length = 0;
  pending.length = 0;
  seq = 0;
  drainScheduled = false;
  draining = false;
}
