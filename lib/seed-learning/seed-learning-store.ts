import type {
  SeedLearningRollupEntry,
  SeedLearningStoreWireV1,
  SeedLearningSectorId,
  SeedMentionEvent,
} from "@/lib/seed-learning/types";
import { SEED_LEARNING_VERSION } from "@/lib/seed-learning/types";
import {
  isSeedLearningTokenWorthy,
  normalizeSeedLearningToken,
} from "@/lib/seed-learning/normalize-seed-token";
import { isSeedLearningSectorId } from "@/lib/seed-learning/sector-registry";

const STORAGE_KEY = "rimvio.seed-learning.v1";

let memoryStore: SeedLearningRollupEntry[] = [];

function entryKey(sectorId: string, token: string): string {
  return `${sectorId}::${token}`;
}

function readStore(): SeedLearningRollupEntry[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SeedLearningStoreWireV1;
    if (!parsed || parsed.version !== SEED_LEARNING_VERSION) {
      return [];
    }
    return Array.isArray(parsed.entries) ? [...parsed.entries] : [];
  } catch {
    return [];
  }
}

function writeStore(entries: readonly SeedLearningRollupEntry[]): void {
  const next = [...entries];
  memoryStore = next;
  if (typeof window === "undefined") {
    return;
  }
  const wire: SeedLearningStoreWireV1 = {
    version: SEED_LEARNING_VERSION,
    entries: next,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wire));
}

export function resetSeedLearningStoreForTests(
  entries: readonly SeedLearningRollupEntry[] = [],
): void {
  writeStore(entries);
  if (typeof window !== "undefined" && entries.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function listSeedLearningRollup(): readonly SeedLearningRollupEntry[] {
  return readStore();
}

export function findSeedLearningRollup(
  sectorId: SeedLearningSectorId,
  token: string,
): SeedLearningRollupEntry | null {
  const key = entryKey(sectorId, normalizeSeedLearningToken(token));
  return (
    readStore().find(
      (row) => entryKey(row.sectorId, row.token) === key,
    ) ?? null
  );
}

function mergeSample(
  prior: readonly string[],
  next: string | null | undefined,
  max = 4,
): string[] {
  if (!next?.trim()) {
    return [...prior];
  }
  const value = next.trim();
  if (prior.includes(value)) {
    return [...prior];
  }
  return [...prior, value].slice(-max);
}

/** Apply one or more mention events into the rollup store. */
export function applySeedMentionEvents(
  events: readonly SeedMentionEvent[],
): readonly SeedLearningRollupEntry[] {
  const map = new Map(
    readStore().map((row) => [entryKey(row.sectorId, row.token), row]),
  );

  for (const event of events) {
    if (!isSeedLearningSectorId(event.sectorId)) {
      continue;
    }
    const token = normalizeSeedLearningToken(event.token);
    if (!isSeedLearningTokenWorthy(token)) {
      continue;
    }
    const atIso = event.atIso ?? new Date().toISOString();
    const key = entryKey(event.sectorId, token);
    const prior = map.get(key);
    const hitCount =
      (prior?.hitCount ?? 0) + (event.outcome === "hit" ? 1 : 0);
    const missCount =
      (prior?.missCount ?? 0) + (event.outcome === "miss" ? 1 : 0);
    map.set(key, {
      sectorId: event.sectorId,
      token,
      hitCount,
      missCount,
      mentionCount: hitCount + missCount,
      lastHitAtIso:
        event.outcome === "hit" ? atIso : (prior?.lastHitAtIso ?? null),
      lastMissAtIso:
        event.outcome === "miss" ? atIso : (prior?.lastMissAtIso ?? null),
      lastSeenAtIso: atIso,
      sampleDomains: mergeSample(
        prior?.sampleDomains ?? [],
        event.domain,
      ),
      sampleGeoIds: mergeSample(prior?.sampleGeoIds ?? [], event.geoId),
    });
  }

  const next = [...map.values()].sort(
    (a, b) => b.mentionCount - a.mentionCount || a.token.localeCompare(b.token),
  );
  writeStore(next);
  return next;
}
