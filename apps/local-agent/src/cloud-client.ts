import type { AgentConfig } from "./config.js";
import type { AgentTask, ExecutionResult, InstallJob } from "./execution/types.js";
import { defaultRequired } from "./capabilities/router.js";
import { log, logError } from "./logger.js";

type ConnectResponse = {
  deviceId: string;
  deviceToken: string;
  deviceName: string;
};

export class CloudClient {
  constructor(private readonly config: AgentConfig) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.deviceToken}`,
      "X-Device-Id": this.config.deviceId,
      "Content-Type": "application/json",
    };
  }

  async pair(): Promise<ConnectResponse> {
    const code = this.config.pairingCode;
    if (!code) {
      throw new Error("RIMVIO_PAIRING_CODE required for pairing");
    }

    const res = await fetch(`${this.config.apiBaseUrl}/api/pc-agent/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        deviceName: this.config.deviceName,
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `pair_failed_${res.status}`);
    }

    return (await res.json()) as ConnectResponse;
  }

  async heartbeat(): Promise<void> {
    const res = await fetch(`${this.config.apiBaseUrl}/api/pc-agent/agent/heartbeat`, {
      method: "POST",
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`heartbeat_failed_${res.status}`);
    }
  }

  async fetchInstalledCapabilities(): Promise<string[]> {
    const res = await fetch(`${this.config.apiBaseUrl}/api/pc-agent/agent/capabilities`, {
      method: "GET",
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`capabilities_fetch_failed_${res.status}`);
    }
    const data = (await res.json()) as { installedIds?: string[] };
    return data.installedIds ?? [];
  }

  async claimTask(): Promise<AgentTask | null> {
    const res = await fetch(`${this.config.apiBaseUrl}/api/pc-agent/agent/tasks/claim`, {
      method: "POST",
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`claim_failed_${res.status}`);
    }
    const data = (await res.json()) as { task: AgentTask | null };
    return data.task ?? null;
  }

  async setTaskWaiting(taskId: string, missingCapabilities: string[]): Promise<void> {
    const res = await fetch(
      `${this.config.apiBaseUrl}/api/pc-agent/agent/tasks/${taskId}/wait`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ missingCapabilities, reason: "capability_required" }),
      },
    );
    if (!res.ok) {
      throw new Error(`wait_failed_${res.status}`);
    }
  }

  async claimInstallJobs(): Promise<InstallJob[]> {
    const res = await fetch(
      `${this.config.apiBaseUrl}/api/pc-agent/agent/install-jobs/claim`,
      { method: "POST", headers: this.headers() },
    );
    if (!res.ok) {
      throw new Error(`install_claim_failed_${res.status}`);
    }
    const data = (await res.json()) as { jobs: InstallJob[] };
    return data.jobs ?? [];
  }

  async completeInstallJob(jobId: string): Promise<{ resumed: boolean; taskId?: string }> {
    const res = await fetch(
      `${this.config.apiBaseUrl}/api/pc-agent/agent/install-jobs/${jobId}/complete`,
      { method: "PATCH", headers: this.headers() },
    );
    if (!res.ok) {
      throw new Error(`install_complete_failed_${res.status}`);
    }
    return (await res.json()) as { resumed: boolean; taskId?: string };
  }

  async failInstallJob(jobId: string, error: string): Promise<void> {
    await fetch(
      `${this.config.apiBaseUrl}/api/pc-agent/agent/install-jobs/${jobId}/fail`,
      {
        method: "PATCH",
        headers: this.headers(),
        body: JSON.stringify({ error }),
      },
    );
  }

  async updateInstallProgress(jobId: string, progressPct: number): Promise<void> {
    await fetch(
      `${this.config.apiBaseUrl}/api/pc-agent/agent/install-jobs/${jobId}/progress`,
      {
        method: "PATCH",
        headers: this.headers(),
        body: JSON.stringify({ progressPct }),
      },
    );
  }

  async completeTask(taskId: string, result: ExecutionResult): Promise<void> {
    const res = await fetch(
      `${this.config.apiBaseUrl}/api/pc-agent/agent/tasks/${taskId}/complete`,
      {
        method: "PATCH",
        headers: this.headers(),
        body: JSON.stringify({ result }),
      },
    );
    if (!res.ok) {
      throw new Error(`complete_failed_${res.status}`);
    }
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const res = await fetch(
      `${this.config.apiBaseUrl}/api/pc-agent/agent/tasks/${taskId}/fail`,
      {
        method: "PATCH",
        headers: this.headers(),
        body: JSON.stringify({ error }),
      },
    );
    if (!res.ok) {
      logError("ERROR", `fail report failed for ${taskId}`);
    }
  }
}

export async function runTask(
  client: CloudClient,
  task: AgentTask,
  engine: { execute(task: AgentTask): Promise<ExecutionResult> },
  router: import("./capabilities/router.js").CapabilityRouter,
): Promise<void> {
  log("TASK", `Received task ${task.id}`);
  log("TASK", `Starting ${task.type}`);

  const required = defaultRequired(task);
  const gap = router.check(required);

  if (!gap.ready) {
    log("CAPABILITY", `Missing: ${gap.missing.join(", ")}`);
    await client.setTaskWaiting(task.id, gap.missing);
    log("TASK", `Waiting for user approval — task ${task.id}`);
    return;
  }

  try {
    const result = await engine.execute(task);
    await client.completeTask(task.id, result);
    log("TASK", `Completed ${task.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "task_failed";
    logError("TASK", `Failed ${task.id}`, err);
    await client.failTask(task.id, message);
  }
}
