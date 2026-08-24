import type { LiveWork, LiveWorkPhase } from "@/lib/globe/live-work/types";
import {
  LIVE_WORK_OPEN_CHAT,
  LIVE_WORK_RECENT_HIGHLIGHT_MS,
  LIVE_WORK_UPDATED,
} from "@/lib/globe/live-work/types";

const STORAGE_KEY = "rimvio.live-work.v1";
const memory = new Map<string, LiveWork>();

function storage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(LIVE_WORK_UPDATED));
}

function persist(rows: readonly LiveWork[]): void {
  memory.clear();
  for (const row of rows) {
    memory.set(row.id, row);
  }
  const store = storage();
  if (!store) {
    return;
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 40)));
  } catch {
    /* quota */
  }
}

function load(): LiveWork[] {
  if (memory.size > 0) {
    return [...memory.values()];
  }
  const store = storage();
  if (!store) {
    return [];
  }
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const rows: LiveWork[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const row = item as LiveWork;
      if (!row.id?.trim() || !row.contextEventId?.trim()) {
        continue;
      }
      rows.push(row);
      memory.set(row.id, row);
    }
    return rows;
  } catch {
    return [];
  }
}

export function listLiveWorks(): LiveWork[] {
  return load().sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
}

export function listInProgressLiveWorks(): LiveWork[] {
  return listLiveWorks().filter(
    (row) =>
      row.phase === "running" ||
      row.phase === "needs_approval" ||
      row.phase === "waiting_pc",
  );
}

export function listRecentCompletedLiveWorks(
  nowMs: number = Date.now(),
): LiveWork[] {
  return listLiveWorks().filter((row) => {
    if (row.phase !== "done" && row.phase !== "stopped") {
      return false;
    }
    const done = Date.parse(row.completedAtIso ?? row.updatedAtIso);
    if (!Number.isFinite(done)) {
      return false;
    }
    return nowMs - done <= LIVE_WORK_RECENT_HIGHLIGHT_MS;
  });
}

export function readLiveWorkByContext(contextEventId: string): LiveWork | null {
  const id = contextEventId.trim();
  if (!id) {
    return null;
  }
  return listLiveWorks().find((row) => row.contextEventId === id) ?? null;
}

export function readLiveWork(id: string): LiveWork | null {
  return listLiveWorks().find((row) => row.id === id.trim()) ?? null;
}

export function upsertLiveWork(
  patch: Omit<LiveWork, "updatedAtIso" | "completedAtIso"> & {
    completedAtIso?: string | null;
  },
): LiveWork {
  const now = new Date().toISOString();
  const existing = listLiveWorks().find(
    (row) => row.id === patch.id || row.contextEventId === patch.contextEventId,
  );
  const phase: LiveWorkPhase = patch.phase;
  const completedAtIso =
    phase === "done" || phase === "stopped"
      ? (patch.completedAtIso ?? existing?.completedAtIso ?? now)
      : null;
  const next: LiveWork = {
    ...existing,
    ...patch,
    phase,
    completedAtIso,
    updatedAtIso: now,
  };
  const others = listLiveWorks().filter(
    (row) => row.id !== next.id && row.contextEventId !== next.contextEventId,
  );
  persist([next, ...others]);
  emit();
  return next;
}

export function patchLiveWork(
  id: string,
  patch: Partial<
    Pick<LiveWork, "phase" | "statusLine" | "title" | "deviceName">
  >,
): LiveWork | null {
  const current = readLiveWork(id) ?? readLiveWorkByContext(id);
  if (!current) {
    return null;
  }
  return upsertLiveWork({
    ...current,
    ...patch,
  });
}

export function subscribeLiveWorks(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = () => onChange();
  window.addEventListener(LIVE_WORK_UPDATED, handler);
  return () => window.removeEventListener(LIVE_WORK_UPDATED, handler);
}

export function requestOpenLiveWorkChat(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(LIVE_WORK_OPEN_CHAT, {
      detail: { contextEventId: contextEventId.trim() },
    }),
  );
}

export function clearLiveWorksForTests(): void {
  memory.clear();
  storage()?.removeItem(STORAGE_KEY);
}
