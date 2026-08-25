import { CapabilityRouter } from "./capabilities/router.js";
import { runInstallJobs } from "./capabilities/install-handler.js";
import { runTask, type CloudClient } from "./cloud-client.js";
import type { AgentConfig } from "./config.js";
import type { ExecutionEngine } from "./execution/types.js";
import { log, logError } from "./logger.js";

const runningTasks = new Set<string>();
let kickPoll: (() => void) | null = null;

export function kickPairedWorkPoll(): void {
  kickPoll?.();
}

/** Heartbeat + claim/execute after this PC is connected. */
export function startPairedWorkLoops(input: {
  config: AgentConfig;
  client: CloudClient;
  engine: ExecutionEngine;
}): { stop: () => void } {
  const { config, client, engine } = input;
  let shuttingDown = false;
  let ticking = false;
  let router = CapabilityRouter.withBuiltinOnly();

  void client.fetchInstalledCapabilities().then((installed) => {
    router.updateInstalled(installed);
    log("AGENT", `Capabilities: ${installed.join(", ") || "builtin"}`);
  }).catch((err) => {
    logError("ERROR", "Failed to load capabilities", err);
  });

  const heartbeatLoop = setInterval(() => {
    void client.heartbeat().catch((err) => {
      logError("ERROR", "Heartbeat failed", err);
    });
  }, config.heartbeatIntervalMs);

  void client.heartbeat().catch((err) => {
    logError("ERROR", "Initial heartbeat failed", err);
  });
  log("AGENT", "Heartbeat started");

  const tick = async () => {
    if (shuttingDown || ticking) {
      return;
    }
    ticking = true;
    try {
      const installJobs = await client.claimInstallJobs();
      if (installJobs.length > 0) {
        log("CAPABILITY", `Processing ${installJobs.length} install job(s)`);
        await runInstallJobs(
          installJobs,
          async (jobId) => {
            const result = await client.completeInstallJob(jobId);
            if (result.resumed) {
              log("TASK", `Resumed task ${result.taskId ?? "unknown"}`);
            }
          },
          async (jobId, error) => {
            await client.failInstallJob(jobId, error);
          },
          async (jobId, progressPct) => {
            await client.updateInstallProgress(jobId, progressPct);
          },
        );
        const installed = await client.fetchInstalledCapabilities();
        router = CapabilityRouter.withBuiltinOnly();
        router.updateInstalled(installed);
      }

      const task = await client.claimTask();
      if (!task || runningTasks.has(task.id)) {
        return;
      }
      runningTasks.add(task.id);
      try {
        await runTask(client, task, engine, router);
      } finally {
        runningTasks.delete(task.id);
      }
    } catch (err) {
      logError("ERROR", "Poll failed", err);
    } finally {
      ticking = false;
    }
  };

  kickPoll = () => {
    void tick();
  };

  const pollLoop = setInterval(() => {
    void tick();
  }, config.taskPollIntervalMs);

  const stop = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    kickPoll = null;
    clearInterval(heartbeatLoop);
    clearInterval(pollLoop);
  };

  return { stop };
}
