/**
 * Hub Worker swarm — parallel sandbox workers under PlatformTaskGraph (P7).
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { PlatformTaskGraph } from "@/lib/hub/dev/platform-agent/task-decomposition";
import {
  drainImprovementTasksToSandbox,
  type SandboxTaskRun,
} from "@/lib/hub/dev/sandbox-task-queue";

export type HubWorkerTask = {
  readonly workerId: string;
  readonly taskId: string;
  readonly labelKo: string;
  readonly sandboxRunId: string | null;
  readonly status: "pending" | "running" | "done" | "failed";
};

export type HubWorkerSwarmResult = {
  readonly workers: readonly HubWorkerTask[];
  readonly parallelCount: number;
  readonly workLogKo: string;
};

/** Independent tasks from graph with no mutual dependsOn → parallel workers. */
export function selectParallelHubWorkers(input: {
  readonly graph: PlatformTaskGraph;
  readonly platformId: string;
  readonly draft: PlatformDraft;
  readonly maxWorkers?: number;
}): HubWorkerSwarmResult {
  const maxWorkers = input.maxWorkers ?? 4;
  const sandboxRuns = drainImprovementTasksToSandbox({
    platformId: input.platformId,
    draft: input.draft,
    limit: maxWorkers,
  });

  const independent = input.graph.tasks.filter((t) => t.dependsOn.length <= 1);
  const workers: HubWorkerTask[] = [];

  for (let i = 0; i < Math.min(independent.length, maxWorkers); i += 1) {
    const task = independent[i]!;
    const sandbox: SandboxTaskRun | undefined = sandboxRuns[i];
    workers.push({
      workerId: `worker-${i + 1}`,
      taskId: task.id,
      labelKo: task.labelKo,
      sandboxRunId: sandbox?.runId ?? null,
      status: sandbox ? "running" : "pending",
    });
  }

  for (const run of sandboxRuns.slice(workers.length)) {
    workers.push({
      workerId: `worker-sandbox-${run.runId}`,
      taskId: run.taskId,
      labelKo: run.capabilityId,
      sandboxRunId: run.runId,
      status: "running",
    });
  }

  return {
    workers,
    parallelCount: workers.filter((w) => w.status === "running").length,
    workLogKo:
      workers.length > 0
        ? `Worker ${workers.length} · 병렬 ${workers.filter((w) => w.sandboxRunId).length}`
        : "Worker 대기",
  };
}
