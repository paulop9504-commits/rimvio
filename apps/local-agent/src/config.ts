import { readPcCredentials } from "./credential-store.js";

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
  const stored = readPcCredentials();

  return {
    apiBaseUrl: readEnv("RIMVIO_API_BASE_URL", "https://rimvio.com").replace(/\/$/, ""),
    deviceId: process.env.RIMVIO_DEVICE_ID?.trim() || stored?.deviceId || "",
    deviceToken: process.env.RIMVIO_DEVICE_TOKEN?.trim() || stored?.deviceToken || "",
    executionEngine: process.env.RIMVIO_EXECUTION_ENGINE?.trim() || "browser",
    heartbeatIntervalMs: Number(process.env.RIMVIO_HEARTBEAT_INTERVAL_MS ?? 15_000),
    taskPollIntervalMs: Number(process.env.RIMVIO_TASK_POLL_INTERVAL_MS ?? 2_000),
    pairingCode: pairMode
      ? readEnv("RIMVIO_PAIRING_CODE")
      : process.env.RIMVIO_PAIRING_CODE?.trim(),
    deviceName:
      process.env.RIMVIO_DEVICE_NAME?.trim() || stored?.deviceName || "My PC",
  };
}

export function requirePairedCredentials(config: AgentConfig): void {
  if (!config.deviceId || !config.deviceToken) {
    throw new Error("This PC is not connected to Rimvio yet.");
  }
}
