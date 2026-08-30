/**
 * Dev Workspace execution log — real invoke/publish events only (no fake metrics).
 */

export const HUB_DEV_EXECUTION_LOG_KEY = "rimvio.hub.dev-execution-log.v1";

export type DevExecutionSource =
  | "preview"
  | "simulation"
  | "sandbox-test"
  | "test-invoke"
  | "publish"
  | "registry-discovery"
  | "runtime-upload"
  | "runtime-compat-test"
  | "runtime-router"
  | "compatibility-graph-test";

export type DevExecutionLogEntry = {
  readonly id: string;
  readonly platformId: string;
  readonly platformName: string;
  readonly capabilityId?: string;
  readonly source: DevExecutionSource;
  readonly ok: boolean;
  readonly detail: string;
  readonly atIso: string;
  readonly durationMs?: number;
  readonly input?: Record<string, unknown>;
  readonly output?: Record<string, unknown>;
};

const LOG_EVENT = "rimvio:hub-dev-execution-log";

let memoryLog: DevExecutionLogEntry[] | null = null;

function emitLogChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LOG_EVENT));
  }
}

export function readDevExecutionLog(): readonly DevExecutionLogEntry[] {
  if (memoryLog) return memoryLog;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(HUB_DEV_EXECUTION_LOG_KEY);
      if (raw) {
        memoryLog = JSON.parse(raw) as DevExecutionLogEntry[];
        return memoryLog;
      }
    } catch {
      // fall through
    }
  }
  memoryLog = [];
  return memoryLog;
}

function persistLog(entries: DevExecutionLogEntry[]): void {
  memoryLog = entries.slice(-500);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(HUB_DEV_EXECUTION_LOG_KEY, JSON.stringify(memoryLog));
    } catch {
      // ignore
    }
  }
  emitLogChange();
}

export function appendDevExecutionLog(
  entry: Omit<DevExecutionLogEntry, "id" | "atIso"> & { id?: string; atIso?: string },
): DevExecutionLogEntry {
  const full: DevExecutionLogEntry = {
    id: entry.id ?? `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    atIso: entry.atIso ?? new Date().toISOString(),
    platformId: entry.platformId,
    platformName: entry.platformName,
    capabilityId: entry.capabilityId,
    source: entry.source,
    ok: entry.ok,
    detail: entry.detail,
    durationMs: entry.durationMs,
    input: entry.input,
    output: entry.output,
  };
  persistLog([...readDevExecutionLog(), full]);
  return full;
}

export function readDevExecutionLogForPlatform(
  platformId: string,
): readonly DevExecutionLogEntry[] {
  return readDevExecutionLog().filter((e) => e.platformId === platformId);
}

export type DevRuntimeSnapshot = {
  readonly platformId: string;
  readonly platformName: string;
  readonly environment: "development" | "preview" | "production";
  readonly healthy: boolean;
  readonly capabilityCount: number;
  readonly requestCount: number;
  readonly errorCount: number;
  readonly errorRatePct: number | null;
  readonly latencyP95Ms: number | null;
  readonly publishedInRegistry: boolean;
  readonly lastEventAtIso: string | null;
};

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx] ?? null;
}

export function buildDevRuntimeSnapshot(input: {
  platformId: string;
  platformName: string;
  capabilityCount: number;
  publishStatus: "idle" | "submitting" | "pending-review" | "published";
  publishedInRegistry: boolean;
}): DevRuntimeSnapshot {
  const logs = readDevExecutionLogForPlatform(input.platformId);
  const requestCount = logs.length;
  const errorCount = logs.filter((e) => !e.ok).length;
  const durations = logs.map((e) => e.durationMs).filter((d): d is number => typeof d === "number");
  const errorRatePct = requestCount > 0 ? Math.round((errorCount / requestCount) * 1000) / 10 : null;

  const environment: DevRuntimeSnapshot["environment"] =
    input.publishStatus === "pending-review" || input.publishedInRegistry
      ? "production"
      : requestCount > 0
        ? "preview"
        : "development";

  return {
    platformId: input.platformId,
    platformName: input.platformName,
    environment,
    healthy: requestCount === 0 ? true : errorCount === 0,
    capabilityCount: input.capabilityCount,
    requestCount,
    errorCount,
    errorRatePct,
    latencyP95Ms: percentile(durations, 95),
    publishedInRegistry: input.publishedInRegistry,
    lastEventAtIso: logs[logs.length - 1]?.atIso ?? null,
  };
}

export function subscribeDevExecutionLog(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(LOG_EVENT, handler);
  return () => window.removeEventListener(LOG_EVENT, handler);
}
