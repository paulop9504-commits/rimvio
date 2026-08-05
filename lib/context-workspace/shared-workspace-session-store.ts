/**
 * Shared Workspace session after invite accept (ADR-047).
 * Workspace Invite Commit — NOT Reality/booking Commit.
 */

export const SHARED_WORKSPACE_COMMITTED =
  "rimvio:shared-workspace-committed";
export const SHARED_WORKSPACE_SYNC_TICK =
  "rimvio:shared-workspace-sync-tick";

export type SharedWorkspaceSession = {
  readonly contextEventId: string;
  readonly bridgeEventId: string;
  readonly title: string;
  readonly hostDisplayName: string;
  readonly peerThreadId: string | null;
  readonly committedAtIso: string;
  readonly syncActive: boolean;
};

const STORAGE_KEY = "rimvio-shared-workspace-sessions";
const memory = new Map<string, SharedWorkspaceSession>();

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hydrate(): void {
  if (memory.size > 0) return;
  const store = storage();
  if (!store) return;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as SharedWorkspaceSession;
      if (typeof r.bridgeEventId !== "string" || !r.bridgeEventId.trim()) continue;
      memory.set(r.bridgeEventId.trim(), r);
    }
  } catch {
    // ignore
  }
}

function persist(): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify([...memory.values()]));
  } catch {
    // ignore
  }
}

export function listSharedWorkspaceSessions(): readonly SharedWorkspaceSession[] {
  hydrate();
  return [...memory.values()].sort((a, b) =>
    b.committedAtIso.localeCompare(a.committedAtIso),
  );
}

export function readSharedWorkspaceSession(
  bridgeEventId: string,
): SharedWorkspaceSession | null {
  hydrate();
  return memory.get(bridgeEventId.trim()) ?? null;
}

export function writeSharedWorkspaceSession(
  session: SharedWorkspaceSession,
): void {
  const key = session.bridgeEventId.trim();
  if (!key) return;
  memory.set(key, session);
  persist();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SHARED_WORKSPACE_COMMITTED, { detail: session }),
    );
  }
}

export function emitSharedWorkspaceSyncTick(bridgeEventId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SHARED_WORKSPACE_SYNC_TICK, {
      detail: { bridgeEventId: bridgeEventId.trim() },
    }),
  );
}
