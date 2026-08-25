import type { AgentConfig } from "./config.js";
import type { AgentTask, ExecutionResult, InstallJob } from "./execution/types.js";
import { defaultRequired } from "./capabilities/router.js";
import { log, logError } from "./logger.js";
import { publishPcWork } from "./pc-work-view.js";

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

  async pairWithCode(code: string, deviceName?: string): Promise<ConnectResponse> {
    const res = await fetch(`${this.config.apiBaseUrl}/api/pc-agent/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        deviceName: deviceName || this.config.deviceName,
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `pair_failed_${res.status}`);
    }

    return (await res.json()) as ConnectResponse;
  }

  async pair(): Promise<ConnectResponse> {
    const code = this.config.pairingCode;
    if (!code) {
      throw new Error("RIMVIO_PAIRING_CODE required for pairing");
    }
    return this.pairWithCode(code, this.config.deviceName);
  }

  async createDesktopSession(
    deviceName: string,
    callbackPort: number,
  ): Promise<{ nonce: string; approveUrl: string }> {
    const res = await fetch(`${this.config.apiBaseUrl}/api/pc-agent/desktop/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceName, callbackPort }),
    });
    if (!res.ok) {
      throw new Error(`desktop_session_${res.status}`);
    }
    return (await res.json()) as { nonce: string; approveUrl: string };
  }

  async exchangeDesktopSession(nonce: string, exchange: string): Promise<ConnectResponse> {
    const res = await fetch(`${this.config.apiBaseUrl}/api/pc-agent/desktop/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nonce, exchange }),
    });
    if (!res.ok) {
      throw new Error(`desktop_exchange_${res.status}`);
    }
    return (await res.json()) as ConnectResponse;
  }

  async heartbeat(): Promise<void> {
    const version =
      process.env.RIMVIO_PC_APP_VERSION?.trim() ||
      process.env.npm_package_version?.trim() ||
      "";
    const res = await fetch(`${this.config.apiBaseUrl}/api/pc-agent/agent/heartbeat`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ version }),
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

  async createSelfTask(payload: {
    url: string;
    title?: string;
    query?: string;
    intent?: "purchase" | "desktop";
    appId?: string;
  }): Promise<AgentTask> {
    const res = await fetch(`${this.config.apiBaseUrl}/api/pc-agent/agent/tasks`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ type: "OPEN_URL", payload }),
    });
    if (!res.ok) {
      throw new Error(`self_task_failed_${res.status}`);
    }
    const data = (await res.json()) as { task: AgentTask };
    return data.task;
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

  async reportProgress(
    taskId: string,
    body: {
      phase: string;
      message?: string;
      url?: string;
      screenshotJpeg?: string;
      product?: ExecutionResult["product"];
      graphNode?: string;
    },
  ): Promise<AgentTask | null> {
    const res = await fetch(
      `${this.config.apiBaseUrl}/api/pc-agent/agent/tasks/${taskId}/progress`,
      {
        method: "PATCH",
        headers: this.headers(),
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      throw new Error(`progress_failed_${res.status}`);
    }
    const data = (await res.json()) as { task?: AgentTask };
    return data.task ?? null;
  }

  async getTask(taskId: string): Promise<AgentTask | null> {
    const res = await fetch(
      `${this.config.apiBaseUrl}/api/pc-agent/agent/tasks/${taskId}`,
      { headers: this.headers() },
    );
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { task?: AgentTask };
    return data.task ?? null;
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
  engine: import("./execution/types.js").ExecutionEngine,
  router: import("./capabilities/router.js").CapabilityRouter,
): Promise<void> {
  log("TASK", `Received task ${task.id}`);
  log("TASK", `Starting ${task.type}`);
  const title = task.payload.title || task.payload.query || "실행 중";
  publishPcWork({
    running: true,
    title,
    userLine: task.payload.query || task.payload.title || "",
    planLine: "",
    url: task.payload.url || "",
    phase: "RUNNING",
    previewTitle: (task.payload.url || "").replace(/^https?:\/\//, "").split("/")[0] || "실행 화면",
  });

  const required = defaultRequired(task);
  const gap = router.check(required);

  if (!gap.ready) {
    log("CAPABILITY", `Missing: ${gap.missing.join(", ")}`);
    await client.setTaskWaiting(task.id, gap.missing);
    log("TASK", `Waiting for user approval — task ${task.id}`);
    return;
  }

  const report: import("./execution/types.js").ProgressReporter = async (input) => {
    publishPcWork({
      running: true,
      phase: input.phase,
      url: input.url || task.payload.url || "",
      screenshotJpeg: input.screenshotJpeg ?? undefined,
      previewTitle: input.url
        ? input.url.replace(/^https?:\/\//, "").split("/")[0]
        : undefined,
    });
    await client.reportProgress(task.id, input);
  };

  const phase =
    typeof task.status === "string" && task.status
      ? task.status
      : typeof task.result?.phase === "string"
        ? task.result.phase
        : "";

  try {
    if (phase === "APPROVED" && engine.checkout) {
      log("TASK", "Resuming checkout after approval");
      const checkout = await engine.checkout(task, report);
      if (checkout.hold === "human_required") {
        return;
      }
      await client.completeTask(task.id, checkout);
      log("TASK", `Completed ${task.id}`);
      return;
    }

    await client.reportProgress(task.id, { phase: "RUNNING" });
    const result = await engine.execute(task, report);

    if (result.hold === "human_required") {
      log("TASK", "Human required — leaving browser open");
      return;
    }
    if (result.hold === "waiting_user") {
      await client.reportProgress(task.id, {
        phase: "WAITING_USER",
        url: result.url,
        message: result.message,
        screenshotJpeg: result.screenshotJpeg,
        product: result.product,
        graphNode: "WAITING_USER_APPROVAL",
      });
      log("TASK", `Waiting for purchase approval — ${task.id}`);
      const deadline = Date.now() + 15 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2_000));
        const latest = await client.getTask(task.id);
        const next =
          typeof latest?.status === "string" && latest.status
            ? latest.status
            : typeof latest?.result?.phase === "string"
              ? latest.result.phase
              : "";
        const status = latest?.status ?? "";
        if (status === "CANCELLED" || next === "CANCELLED") {
          log("TASK", "Cancelled while waiting");
          return;
        }
        if ((next === "APPROVED" || status === "APPROVED") && engine.checkout) {
          const checkout = await engine.checkout(task, report);
          if (checkout.hold === "human_required") {
            return;
          }
          await client.completeTask(task.id, checkout);
          log("TASK", `Completed ${task.id}`);
          return;
        }
        if (status === "FAILED") {
          return;
        }
        if (engine.snapshot) {
          const shot = await engine.snapshot();
          if (shot) {
            await report({
              phase: "WAITING_USER",
              screenshotJpeg: shot,
            });
          }
        }
      }
      return;
    }

    await client.completeTask(task.id, result);
    publishPcWork({ running: false, phase: "DONE" });
    log("TASK", `Completed ${task.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "task_failed";
    logError("TASK", `Failed ${task.id}`, err);
    await client.failTask(task.id, message);
  }
}
