import type { GoalSnapshot } from "@/lib/goal-engine/types";
import { readLastGoalSnapshot } from "@/lib/goal-engine/goal-snapshot-session";

const STORAGE_PREFIX = "rimvio-goal-snapshot:";

const KNOWN_SCOPES = ["free", "rimvio:search"] as const;

export type ClientGoalSnapshotRow = {
  scopeId: string;
  snapshot: GoalSnapshot;
};

function parseSnapshot(raw: string): GoalSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as GoalSnapshot;
    if (!parsed?.referenceDate || !parsed?.sourceRevision) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Dev UI — enumerate turn-published goal snapshots from sessionStorage. */
export function listClientGoalSnapshots(): ClientGoalSnapshotRow[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rows = new Map<string, GoalSnapshot>();

  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (!key?.startsWith(STORAGE_PREFIX)) {
      continue;
    }
    const scopeId = key.slice(STORAGE_PREFIX.length);
    const snapshot = parseSnapshot(window.sessionStorage.getItem(key) ?? "");
    if (snapshot) {
      rows.set(scopeId, snapshot);
    }
  }

  for (const scopeId of KNOWN_SCOPES) {
    if (rows.has(scopeId)) {
      continue;
    }
    const snapshot = readLastGoalSnapshot(scopeId);
    if (snapshot) {
      rows.set(scopeId, snapshot);
    }
  }

  return [...rows.entries()]
    .map(([scopeId, snapshot]) => ({ scopeId, snapshot }))
    .sort((a, b) => b.snapshot.referenceDate.localeCompare(a.snapshot.referenceDate));
}
