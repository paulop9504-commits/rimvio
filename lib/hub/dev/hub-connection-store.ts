/**
 * Hub Dev Workspace — connection + pending loop resume (sessionStorage).
 */

const CONNECTIONS_KEY = "rimvio-hub-dev-connections";
const PROFILES_KEY = "rimvio-hub-dev-connection-profiles";
const PENDING_LOOP_KEY = "rimvio-hub-dev-pending-loop";
const CONNECTIONS_EVENT = "rimvio:hub-connections-updated";

let memoryPendingLoop: HubPendingLoopResume | null = null;

export type HubDevConnectionId = "stripe" | "github" | "vercel" | "supabase" | "openai" | "mcp";

export type HubDevConnections = Readonly<Record<HubDevConnectionId, boolean>>;

export type HubConnectionProfile = {
  readonly provider: HubDevConnectionId;
  readonly accountLabel: string;
  readonly connectedAtIso: string;
  readonly avatarUrl?: string;
};

export type HubPendingLoopResume = {
  readonly utterance: string;
  readonly platformId: string | null;
  readonly actionId: string;
  readonly provider?: HubDevConnectionId;
  readonly atIso: string;
};

/** Disconnected by default — user must OAuth connect (Cursor-style). */
const DEFAULT_CONNECTIONS: HubDevConnections = {
  stripe: false,
  github: false,
  vercel: false,
  supabase: false,
  openai: false,
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
  if (key === CONNECTIONS_KEY || key === PROFILES_KEY) {
    window.dispatchEvent(new CustomEvent(CONNECTIONS_EVENT));
  }
}

export function readHubDevConnections(): HubDevConnections {
  const stored = readJson<Partial<HubDevConnections>>(CONNECTIONS_KEY);
  return { ...DEFAULT_CONNECTIONS, ...stored };
}

export function setHubDevConnection(id: HubDevConnectionId, connected: boolean): HubDevConnections {
  const next = { ...readHubDevConnections(), [id]: connected };
  writeJson(CONNECTIONS_KEY, next);
  if (!connected) {
    const profiles = readHubConnectionProfiles().filter((p) => p.provider !== id);
    writeJson(PROFILES_KEY, profiles);
  }
  return next;
}

export function readHubConnectionProfiles(): readonly HubConnectionProfile[] {
  return readJson<HubConnectionProfile[]>(PROFILES_KEY) ?? [];
}

export function readHubConnectionProfile(provider: HubDevConnectionId): HubConnectionProfile | null {
  return readHubConnectionProfiles().find((p) => p.provider === provider) ?? null;
}

export function setHubConnectionProfile(profile: HubConnectionProfile): void {
  const rest = readHubConnectionProfiles().filter((p) => p.provider !== profile.provider);
  writeJson(PROFILES_KEY, [...rest, profile]);
}

export function isHubDevProviderConnected(id: HubDevConnectionId): boolean {
  return readHubDevConnections()[id];
}

export function isHubDevStripeConnected(): boolean {
  return isHubDevProviderConnected("stripe");
}

export function setPendingHubLoopResume(
  input: Omit<HubPendingLoopResume, "atIso"> & { readonly provider?: HubDevConnectionId },
): void {
  const record = {
    ...input,
    atIso: new Date().toISOString(),
  } satisfies HubPendingLoopResume;
  memoryPendingLoop = record;
  writeJson(PENDING_LOOP_KEY, record);
}

export function readPendingHubLoopResume(): HubPendingLoopResume | null {
  if (memoryPendingLoop) return memoryPendingLoop;
  memoryPendingLoop = readJson<HubPendingLoopResume>(PENDING_LOOP_KEY);
  return memoryPendingLoop;
}

export function clearPendingHubLoopResume(): void {
  memoryPendingLoop = null;
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_LOOP_KEY);
}

export function clearHubDevConnectionsForTests(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CONNECTIONS_KEY);
  sessionStorage.removeItem(PROFILES_KEY);
}

export const HUB_CONNECTIONS_UPDATED_EVENT = CONNECTIONS_EVENT;
