/**
 * Sandbox task queue — improvement tasks → isolated coding runs (P6).
 */

import type { ImprovementTask } from "@/lib/rimvio-index/types";
import {
  readImprovementTasks,
  updateImprovementTaskStatus,
} from "@/lib/rimvio-index/improvement-task-pool";
import type { CodingPlan } from "@/lib/hub/dev/platform-agent/coding-plan";
import type { PlatformDraft } from "@/lib/hub/platform/types";

export type SandboxTaskRun = {
  readonly runId: string;
  readonly taskId: string;
  readonly capabilityId: string;
  readonly platformId: string;
  readonly branchHint: string;
  readonly status: "queued" | "running" | "passed" | "failed";
  readonly createdAt: string;
};

const memoryRuns: SandboxTaskRun[] = [];
let runCounter = 0;

function nextRunId(): string {
  runCounter += 1;
  return `SANDBOX-${Date.now()}-${runCounter}`;
}

export function readSandboxTaskRuns(): readonly SandboxTaskRun[] {
  return [...memoryRuns];
}

/** Queue improvement task for sandbox coding agent. */
export function enqueueSandboxTask(input: {
  readonly task: ImprovementTask;
  readonly draft: PlatformDraft;
}): SandboxTaskRun {
  const existing = memoryRuns.find(
    (r) => r.taskId === input.task.taskId && r.status !== "failed",
  );
  if (existing) return existing;

  const run: SandboxTaskRun = {
    runId: nextRunId(),
    taskId: input.task.taskId,
    capabilityId: input.task.capabilityId,
    platformId: input.task.platformId,
    branchHint: `improve/${input.task.capabilityId.replace(/\./g, "-")}`,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  memoryRuns.push(run);
  updateImprovementTaskStatus(input.task.taskId, "assigned");
  return run;
}

/** Build minimal coding plan for sandbox improvement run. */
export function codingPlanForSandboxRun(input: {
  readonly run: SandboxTaskRun;
}): CodingPlan {
  const path = `src/capabilities/${input.run.capabilityId.replace(/\./g, "/")}.ts`;
  return {
    summaryKo: `${input.run.capabilityId} 개선`,
    sourcePaths: [path],
    steps: [
      {
        id: "read",
        label: "소스 읽기",
        toolId: "code.readFile",
        args: { path },
        phase: "read",
      },
      {
        id: "edit",
        label: "Capability 수정",
        toolId: "code.modifyFile",
        args: { path, capability: input.run.capabilityId },
        phase: "edit",
      },
      {
        id: "test",
        label: "Sandbox 테스트",
        toolId: "test.run",
        args: {},
        phase: "test",
      },
    ],
  };
}

/** Mark run complete after coding-agent-loop. */
export function completeSandboxTaskRun(input: {
  readonly runId: string;
  readonly ok: boolean;
}): SandboxTaskRun | null {
  const idx = memoryRuns.findIndex((r) => r.runId === input.runId);
  if (idx < 0) return null;
  const run = memoryRuns[idx]!;
  const updated: SandboxTaskRun = {
    ...run,
    status: input.ok ? "passed" : "failed",
  };
  memoryRuns[idx] = updated;
  updateImprovementTaskStatus(
    run.taskId,
    input.ok ? "review" : "open",
  );
  return updated;
}

/** Drain open improvement tasks into sandbox queue. */
export function drainImprovementTasksToSandbox(input: {
  readonly platformId: string;
  readonly draft: PlatformDraft;
  readonly limit?: number;
}): readonly SandboxTaskRun[] {
  const limit = input.limit ?? 4;
  const open = readImprovementTasks().filter(
    (t) =>
      t.platformId === input.platformId &&
      (t.status === "open" || t.status === "assigned"),
  );
  return open.slice(0, limit).map((task) =>
    enqueueSandboxTask({ task, draft: input.draft }),
  );
}

export function resetSandboxTaskQueueForTests(): void {
  memoryRuns.length = 0;
  runCounter = 0;
}
