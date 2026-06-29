import type { PendingSituationLock } from "@/lib/experience-run/experience-run-types";

const STORAGE_KEY = "rimvio:experience-run-situation-lock";

export function readPendingSituationLock(): PendingSituationLock | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lock));
}

export function clearPendingSituationLock(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(STORAGE_KEY);
}
