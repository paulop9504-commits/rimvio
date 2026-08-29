/**
 * Hub Dev Workspace — connection + pending loop resume (sessionStorage).
 */

const CONNECTIONS_KEY = "rimvio-hub-dev-connections";
const PENDING_LOOP_KEY = "rimvio-hub-dev-pending-loop";

export type HubDevConnectionId = "stripe" | "github" | "openai" | "mcp";

export type HubDevConnections = Readonly<Record<HubDevConnectionId, boolean>>;

export type HubPendingLoopResume = {
  readonly utterance: string;
  readonly platformId: string | null;
  readonly actionId: string;
  readonly atIso: string;
};

const DEFAULT_CONNECTIONS: HubDevConnections = {
  stripe: false,
  github: true,
  openai: true,
  mcp: false,
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function readHubDevConnections(): HubDevConnections {
  const stored = readJson<Partial<HubDevConnections>>(CONNECTIONS_KEY);
  return { ...DEFAULT_CONNECTIONS, ...stored };
}

export function setHubDevConnection(id: HubDevConnectionId, connected: boolean): HubDevConnections {
  const next = { ...readHubDevConnections(), [id]: connected };
  writeJson(CONNECTIONS_KEY, next);
  return next;
}

export function isHubDevStripeConnected(): boolean {
  return readHubDevConnections().stripe;
}

export function setPendingHubLoopResume(input: Omit<HubPendingLoopResume, "atIso">): void {
  writeJson(PENDING_LOOP_KEY, {
    ...input,
    atIso: new Date().toISOString(),
  } satisfies HubPendingLoopResume);
}

export function readPendingHubLoopResume(): HubPendingLoopResume | null {
  return readJson<HubPendingLoopResume>(PENDING_LOOP_KEY);
}

export function clearPendingHubLoopResume(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_LOOP_KEY);
}
