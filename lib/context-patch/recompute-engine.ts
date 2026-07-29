/**
 * Recompute Engine
 *
 * Given affected tasks from the dependency graph, automatically
 * re-execute only the invalidated tasks.
 *
 * This is the "Task Replay" step — when location changes from
 * Osaka to Jeju, hotel/eatery/route/itinerary all rerun automatically.
 */

import type { AffectedTask, TaskId } from "@/lib/context-patch/dependency-graph";

export type RecomputeStatus = "pending" | "running" | "done" | "skipped" | "failed";

export type RecomputeStep = {
  readonly taskId: TaskId;
  readonly triggeredBy: readonly string[];
  status: RecomputeStatus;
  result: unknown | null;
  durationMs: number;
};

export type RecomputeResult = {
  readonly steps: readonly RecomputeStep[];
  readonly totalDurationMs: number;
  readonly allDone: boolean;
  readonly summaryKo: string;
};

export type TaskExecutor = (taskId: TaskId, context: Readonly<Record<string, unknown>>) => Promise<unknown>;

/**
 * Recompute all affected tasks in dependency-priority order.
 * Higher priority (more triggers) runs first.
 */
export async function recomputeAffectedTasks(
  affected: readonly AffectedTask[],
  context: Readonly<Record<string, unknown>>,
  executor: TaskExecutor,
): Promise<RecomputeResult> {
  const t0 = Date.now();
  const steps: RecomputeStep[] = [];

  for (const task of affected) {
    const step: RecomputeStep = {
      taskId: task.taskId,
      triggeredBy: [...task.triggeredBy],
      status: "running",
      result: null,
      durationMs: 0,
    };

    const stepStart = Date.now();
    try {
      step.result = await executor(task.taskId, context);
      step.status = "done";
    } catch (e) {
      step.status = "failed";
      step.result = e instanceof Error ? e.message : "unknown error";
    }
    step.durationMs = Date.now() - stepStart;
    steps.push(step);
  }

  const totalDurationMs = Date.now() - t0;
  const allDone = steps.every((s) => s.status === "done");
  const doneCount = steps.filter((s) => s.status === "done").length;

  const location = context["location"] as string | undefined;
  const summaryKo = allDone
    ? `${location ?? "현재"} 기준으로 ${doneCount}개 작업을 갱신했습니다.`
    : `${doneCount}/${steps.length}개 작업 갱신 완료. 일부 실패.`;

  return { steps, totalDurationMs, allDone, summaryKo };
}
