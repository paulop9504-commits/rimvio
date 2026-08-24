import { loadConfig, requirePairedCredentials } from "./config.js";
import { CloudClient, runTask } from "./cloud-client.js";
import { CapabilityRouter } from "./capabilities/router.js";
import { runInstallJobs } from "./capabilities/install-handler.js";
import { createExecutionEngine } from "./execution/index.js";
import { log, logError } from "./logger.js";

const runningTasks = new Set<string>();

async function main(): Promise<void> {
  const config = loadConfig(process.argv.slice(2));
  const client = new CloudClient(config);

  if (process.argv.includes("--pair")) {
    log("AGENT", "Pairing with Rimvio Cloud...");
    const result = await client.pair();
    log("AGENT", "Device registered");
    console.log("");
    console.log("Save these credentials to your .env:");
    console.log(`RIMVIO_DEVICE_ID=${result.deviceId}`);
    console.log(`RIMVIO_DEVICE_TOKEN=${result.deviceToken}`);
    console.log("");
    return;
  }

  requirePairedCredentials(config);
  log("AGENT", "Connected");
  log("AGENT", `Cloud ${config.apiBaseUrl}`);
  log("AGENT", `Device ${config.deviceId}`);
  log("AGENT", `Engine ${config.executionEngine}`);
  log(
    "AGENT",
    "Chrome login: start Chrome with --remote-debugging-port=9222 then keep this agent running",
  );

  let router = CapabilityRouter.withBuiltinOnly();
  try {
    const installed = await client.fetchInstalledCapabilities();
    router.updateInstalled(installed);
    log("AGENT", `Capabilities: ${installed.join(", ")}`);
  } catch (err) {
    logError("ERROR", "Failed to load capabilities", err);
  }

  const engine = createExecutionEngine(config.executionEngine);
  let shuttingDown = false;

  const heartbeatLoop = setInterval(() => {
    void client.heartbeat().catch((err) => {
      logError("ERROR", "Heartbeat failed", err);
    });
  }, config.heartbeatIntervalMs);

  log("AGENT", "Heartbeat started");

  void client.heartbeat().catch((err) => {
    logError("ERROR", "Initial heartbeat failed", err);
  });

  const pollLoop = setInterval(() => {
    if (shuttingDown) {
      return;
    }
    void (async () => {
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
          log("AGENT", `Capabilities updated: ${installed.join(", ")}`);
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
      }
    })();
  }, config.taskPollIntervalMs);

  const shutdown = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    log("AGENT", "Shutting down...");
    clearInterval(heartbeatLoop);
    clearInterval(pollLoop);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logError("ERROR", "Fatal", err);
  process.exit(1);
});
