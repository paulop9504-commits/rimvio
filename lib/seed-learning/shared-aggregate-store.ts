/**
 * Shared (community) seed-learning aggregate — anonymous token counts only.
 * Backends: Supabase (prod) → process memory + optional JSON file (dev/tests).
 * Server-only — do not import from client components.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { tryCreateClient } from "@/lib/supabase/server";
import {
  isSeedLearningTokenWorthy,
  normalizeSeedLearningToken,
} from "@/lib/seed-learning/normalize-seed-token";
import { isSeedLearningSectorId } from "@/lib/seed-learning/sector-registry";
import type {
  SeedLearningRollupEntry,
  SeedLearningSectorId,
  SeedLearningSharedDelta,
} from "@/lib/seed-learning/types";

export type { SeedLearningSharedDelta };

type MemoryRow = {
  sectorId: SeedLearningSectorId;
  token: string;
  hitCount: number;
  missCount: number;
  sampleDomains: string[];
  lastSeenAtIso: string;
};

const memory = new Map<string, MemoryRow>();

function filePath(): string {
  return (
    process.env.RIMVIO_SEED_LEARNING_AGGREGATE ??
    join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "seed-learning-aggregate.json",
    )
  );
}

function keyOf(sectorId: string, token: string): string {
  return `${sectorId}::${token}`;
}

function loadFileIntoMemory(): void {
  if (memory.size > 0) {
    return;
  }
  try {
    const path = filePath();
    if (!existsSync(path)) {
      return;
    }
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      entries?: MemoryRow[];
    };
    for (const row of parsed.entries ?? []) {
      if (!isSeedLearningSectorId(row.sectorId)) {
        continue;
      }
      memory.set(keyOf(row.sectorId, row.token), row);
    }
  } catch {
    /* ignore corrupt file */
  }
}

function persistMemoryFile(): void {
  try {
    const path = filePath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify({ version: 1, entries: [...memory.values()] }, null, 2),
      "utf8",
    );
  } catch {
    /* read-only FS (Vercel) — memory-only for this instance */
  }
}

function sanitizeDelta(
  delta: SeedLearningSharedDelta,
): SeedLearningSharedDelta | null {
  if (!isSeedLearningSectorId(delta.sectorId)) {
    return null;
  }
  const token = normalizeSeedLearningToken(delta.token);
  if (!isSeedLearningTokenWorthy(token)) {
    return null;
  }
  const hitDelta = Math.max(0, Math.min(50, Math.round(delta.hitDelta)));
  const missDelta = Math.max(0, Math.min(50, Math.round(delta.missDelta)));
  if (hitDelta === 0 && missDelta === 0) {
    return null;
  }
  return {
    sectorId: delta.sectorId,
    token,
    hitDelta,
    missDelta,
    domain: delta.domain?.trim().slice(0, 32) || null,
  };
}

function bumpMemory(delta: SeedLearningSharedDelta): void {
  loadFileIntoMemory();
  const key = keyOf(delta.sectorId, delta.token);
  const prior = memory.get(key);
  const now = new Date().toISOString();
  const domains = [...(prior?.sampleDomains ?? [])];
  if (delta.domain && !domains.includes(delta.domain)) {
    domains.push(delta.domain);
  }
  memory.set(key, {
    sectorId: delta.sectorId,
    token: delta.token,
    hitCount: (prior?.hitCount ?? 0) + delta.hitDelta,
    missCount: (prior?.missCount ?? 0) + delta.missDelta,
    sampleDomains: domains.slice(-4),
    lastSeenAtIso: now,
  });
}

function memoryToRollup(): SeedLearningRollupEntry[] {
  loadFileIntoMemory();
  return [...memory.values()]
    .map((row) => ({
      sectorId: row.sectorId,
      token: row.token,
      hitCount: row.hitCount,
      missCount: row.missCount,
      mentionCount: row.hitCount + row.missCount,
      lastHitAtIso: row.hitCount > 0 ? row.lastSeenAtIso : null,
      lastMissAtIso: row.missCount > 0 ? row.lastSeenAtIso : null,
      lastSeenAtIso: row.lastSeenAtIso,
      sampleDomains: row.sampleDomains,
      sampleGeoIds: [] as string[],
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);
}

/** Apply anonymous community deltas. Prefer Supabase; else memory+file. */
export async function ingestSeedLearningSharedDeltas(
  deltas: readonly SeedLearningSharedDelta[],
): Promise<{ persisted: number; backend: "supabase" | "memory" }> {
  const clean = deltas
    .map(sanitizeDelta)
    .filter((row): row is SeedLearningSharedDelta => row != null)
    .slice(0, 40);

  if (clean.length === 0) {
    return { persisted: 0, backend: "memory" };
  }

  if (isSupabaseConfigured()) {
    const supabase = await tryCreateClient();
    if (supabase) {
      let ok = 0;
      // Migration 068 RPC — not yet in generated Database types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      for (const delta of clean) {
        const { error } = await db.rpc("bump_seed_learning_aggregate", {
          p_sector_id: delta.sectorId,
          p_token: delta.token,
          p_hit_delta: delta.hitDelta,
          p_miss_delta: delta.missDelta,
          p_domain: delta.domain ?? null,
        });
        if (!error) {
          ok += 1;
        }
      }
      if (ok > 0) {
        return { persisted: ok, backend: "supabase" };
      }
    }
  }

  for (const delta of clean) {
    bumpMemory(delta);
  }
  persistMemoryFile();
  return { persisted: clean.length, backend: "memory" };
}

export async function listSeedLearningSharedRollup(input?: {
  sectorId?: SeedLearningSectorId | null;
  limit?: number;
}): Promise<{
  entries: SeedLearningRollupEntry[];
  backend: "supabase" | "memory";
}> {
  const limit = Math.min(Math.max(input?.limit ?? 200, 1), 500);

  if (isSupabaseConfigured()) {
    const supabase = await tryCreateClient();
    if (supabase) {
      // Migration 068 table — not yet in generated Database types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      let query = db
        .from("seed_learning_aggregate")
        .select(
          "sector_id, token, hit_count, miss_count, sample_domains, updated_at",
        )
        .order("miss_count", { ascending: false })
        .limit(limit);
      if (input?.sectorId) {
        query = query.eq("sector_id", input.sectorId);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const entries: SeedLearningRollupEntry[] = data
          .filter((row: Record<string, unknown>) =>
            isSeedLearningSectorId(String(row.sector_id)),
          )
          .map((row: Record<string, unknown>) => {
            const hit = Number(row.hit_count) || 0;
            const miss = Number(row.miss_count) || 0;
            const updated =
              typeof row.updated_at === "string"
                ? row.updated_at
                : new Date().toISOString();
            return {
              sectorId: row.sector_id as SeedLearningSectorId,
              token: String(row.token),
              hitCount: hit,
              missCount: miss,
              mentionCount: hit + miss,
              lastHitAtIso: hit > 0 ? updated : null,
              lastMissAtIso: miss > 0 ? updated : null,
              lastSeenAtIso: updated,
              sampleDomains: Array.isArray(row.sample_domains)
                ? row.sample_domains.map(String)
                : [],
              sampleGeoIds: [],
            };
          });
        return { entries, backend: "supabase" };
      }
    }
  }

  let entries = memoryToRollup();
  if (input?.sectorId) {
    entries = entries.filter((row) => row.sectorId === input.sectorId);
  }
  return { entries: entries.slice(0, limit), backend: "memory" };
}

export function resetSeedLearningSharedMemoryForTests(): void {
  memory.clear();
}
