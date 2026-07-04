import type { PendingSituationLock } from "@/lib/experience-run/experience-run-types";

const STORAGE_KEY = "rimvio:experience-run-situation-lock";

function sessionStore(): Storage | null {
  if (typeof window !== "undefined") {
    return window.sessionStorage;
  }
  const global = globalThis as { sessionStorage?: Storage };
  return global.sessionStorage ?? null;
}

export function readPendingSituationLock(): PendingSituationLock | null {
  const storage = sessionStore();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PendingSituationLock;
    if (!parsed?.profile || !parsed.seedMessage?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingSituationLock(lock: PendingSituationLock): void {
  const storage = sessionStore();
  if (!storage) {
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(lock));
}

export function clearPendingSituationLock(): void {
  const storage = sessionStore();
  if (!storage) {
    return;
  }
  storage.removeItem(STORAGE_KEY);
}

export function resetPendingSituationLockForTests(): void {
  clearPendingSituationLock();
}
