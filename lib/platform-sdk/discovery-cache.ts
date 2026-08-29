/**
 * Discovery pipeline TTL cache — intent · index search · ranking (Hub → Agent latency).
 */

import type { CapabilitySearchHit } from "@/lib/platform-sdk/capability-index";
import type { CapabilityDiscoveryPlan } from "@/lib/platform-sdk/discover-capabilities";
import type { RimvioIntentFrame } from "@/lib/rimvio-protocol/intent";

export const DISCOVERY_CACHE_TTL_MS = {
  intent: 30_000,
  indexSearch: 30_000,
  ranking: 10_000,
} as const;

type CacheEntry<T> = {
  readonly value: T;
  readonly expiresAt: number;
};

const intentCache = new Map<string, CacheEntry<RimvioIntentFrame>>();
const indexSearchCache = new Map<string, CacheEntry<CapabilitySearchHit[]>>();
const rankingCache = new Map<string, CacheEntry<CapabilityDiscoveryPlan | null>>();

function normalizeCacheKey(parts: readonly string[]): string {
  return parts.map((p) => p.trim().toLowerCase()).join("|");
}

function readCached<T>(bucket: Map<string, CacheEntry<T>>, key: string): T | null {
  const hit = bucket.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    bucket.delete(key);
    return null;
  }
  return hit.value;
}

function writeCached<T>(bucket: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
  bucket.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function getCachedIntent(
  utterance: string,
  compute: () => RimvioIntentFrame,
): { readonly frame: RimvioIntentFrame; readonly cacheHit: boolean } {
  const key = normalizeCacheKey(["intent", utterance]);
  const cached = readCached(intentCache, key);
  if (cached) return { frame: cached, cacheHit: true };
  const frame = compute();
  writeCached(intentCache, key, frame, DISCOVERY_CACHE_TTL_MS.intent);
  return { frame, cacheHit: false };
}

export function getCachedIndexSearch(
  utterance: string,
  marketCountry: string | undefined,
  limit: number,
  compute: () => CapabilitySearchHit[],
): { readonly hits: CapabilitySearchHit[]; readonly cacheHit: boolean } {
  const key = normalizeCacheKey([
    "index",
    utterance,
    marketCountry ?? "any",
    String(limit),
  ]);
  const cached = readCached(indexSearchCache, key);
  if (cached) return { hits: cached, cacheHit: true };
  const hits = compute();
  writeCached(indexSearchCache, key, hits, DISCOVERY_CACHE_TTL_MS.indexSearch);
  return { hits, cacheHit: false };
}

export function getCachedRankingPlan(
  utterance: string,
  marketCountry: string | undefined,
  compute: () => CapabilityDiscoveryPlan | null,
): { readonly plan: CapabilityDiscoveryPlan | null; readonly cacheHit: boolean } {
  const key = normalizeCacheKey(["rank", utterance, marketCountry ?? "any"]);
  const cached = readCached(rankingCache, key);
  if (cached !== null) return { plan: cached, cacheHit: true };
  const plan = compute();
  writeCached(rankingCache, key, plan, DISCOVERY_CACHE_TTL_MS.ranking);
  return { plan, cacheHit: false };
}

export function clearDiscoveryCacheForTests(): void {
  intentCache.clear();
  indexSearchCache.clear();
  rankingCache.clear();
}
