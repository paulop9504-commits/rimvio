/**
 * Client flush — local personal rollup deltas → shared community aggregate.
 * Never sends raw utterances / user ids — sector + token + count deltas only.
 */
import type { SeedLearningSharedDelta } from "@/lib/seed-learning/types";
import { listSeedLearningRollup } from "@/lib/seed-learning/seed-learning-store";
import type { SeedLearningSectorId } from "@/lib/seed-learning/types";
import { isSeedLearningSectorId } from "@/lib/seed-learning/sector-registry";

const SYNCED_KEY = "rimvio.seed-learning.synced.v1";

type SyncedSnapshot = Record<
  string,
  { hitCount: number; missCount: number }
>;

function entryKey(sectorId: string, token: string): string {
  return `${sectorId}::${token}`;
}

function readSynced(): SyncedSnapshot {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(SYNCED_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as SyncedSnapshot;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSynced(snapshot: SyncedSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(SYNCED_KEY, JSON.stringify(snapshot));
}

/** Diff local rollup vs last-flushed snapshot → anonymous deltas. */
export function buildSeedLearningFlushDeltas(): SeedLearningSharedDelta[] {
  const rollup = listSeedLearningRollup();
  const synced = readSynced();
  const deltas: SeedLearningSharedDelta[] = [];

  for (const row of rollup) {
    if (!isSeedLearningSectorId(row.sectorId)) {
      continue;
    }
    const key = entryKey(row.sectorId, row.token);
    const prior = synced[key] ?? { hitCount: 0, missCount: 0 };
    const hitDelta = Math.max(0, row.hitCount - prior.hitCount);
    const missDelta = Math.max(0, row.missCount - prior.missCount);
    if (hitDelta === 0 && missDelta === 0) {
      continue;
    }
    deltas.push({
      sectorId: row.sectorId as SeedLearningSectorId,
      token: row.token,
      hitDelta,
      missDelta,
      domain: row.sampleDomains[0] ?? null,
    });
  }

  return deltas.slice(0, 40);
}

function markSyncedFromRollup(): void {
  const next: SyncedSnapshot = {};
  for (const row of listSeedLearningRollup()) {
    next[entryKey(row.sectorId, row.token)] = {
      hitCount: row.hitCount,
      missCount: row.missCount,
    };
  }
  writeSynced(next);
}

export type FlushSeedLearningResult = {
  readonly ok: boolean;
  readonly persisted: number;
  readonly backend?: "supabase" | "memory";
  readonly skipped?: boolean;
};

/**
 * POST local deltas to `/api/seed-learning/ingest`.
 * Fire-and-forget safe — failures leave synced snapshot unchanged (retry next time).
 */
export async function flushSeedLearningToSharedServer(): Promise<FlushSeedLearningResult> {
  if (typeof window === "undefined") {
    return { ok: true, persisted: 0, skipped: true };
  }

  const deltas = buildSeedLearningFlushDeltas();
  if (deltas.length === 0) {
    return { ok: true, persisted: 0, skipped: true };
  }

  try {
    const response = await fetch("/api/seed-learning/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deltas }),
      keepalive: true,
    });
    if (!response.ok) {
      return { ok: false, persisted: 0 };
    }
    const body = (await response.json()) as {
      persisted?: number;
      backend?: "supabase" | "memory";
    };
    markSyncedFromRollup();
    return {
      ok: true,
      persisted: body.persisted ?? deltas.length,
      backend: body.backend,
    };
  } catch {
    return { ok: false, persisted: 0 };
  }
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced flush after scout observe (coalesce bursts). */
export function scheduleSeedLearningSharedFlush(delayMs = 1800): void {
  if (typeof window === "undefined") {
    return;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushSeedLearningToSharedServer();
  }, delayMs);
}

export function resetSeedLearningSyncedForTests(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SYNCED_KEY);
  }
}
