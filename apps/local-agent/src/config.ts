export type AgentConfig = {
  apiBaseUrl: string;
  deviceId: string;
  deviceToken: string;
  executionEngine: string;
  heartbeatIntervalMs: number;
  taskPollIntervalMs: number;
  pairingCode?: string;
  deviceName: string;
};

function readEnv(name: string, fallback?: string): string {
  const v = process.env[name]?.trim();
  if (v) {
    return v;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Missing required env: ${name}`);
}

export function loadConfig(args: string[]): AgentConfig {
  const pairMode = args.includes("--pair");

  return {
    apiBaseUrl: readEnv("RIMVIO_API_BASE_URL", "http://localhost:3000").replace(/\/$/, ""),
    deviceId: process.env.RIMVIO_DEVICE_ID?.trim() ?? "",
    deviceToken: process.env.RIMVIO_DEVICE_TOKEN?.trim() ?? "",
    executionEngine: process.env.RIMVIO_EXECUTION_ENGINE?.trim() || "browser",
    heartbeatIntervalMs: Number(process.env.RIMVIO_HEARTBEAT_INTERVAL_MS ?? 15_000),
    taskPollIntervalMs: Number(process.env.RIMVIO_TASK_POLL_INTERVAL_MS ?? 2_000),
    pairingCode: pairMode
      ? readEnv("RIMVIO_PAIRING_CODE")
      : process.env.RIMVIO_PAIRING_CODE?.trim(),
    deviceName: process.env.RIMVIO_DEVICE_NAME?.trim() || "My PC",
  };
}

export function requirePairedCredentials(config: AgentConfig): void {
  if (!config.deviceId || !config.deviceToken) {
    throw new Error(
      "RIMVIO_DEVICE_ID and RIMVIO_DEVICE_TOKEN are required. Run with --pair first.",
    );
  }
}
