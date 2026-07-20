import { getSeedLearningSector } from "@/lib/seed-learning/sector-registry";
import type {
  SeedLearningRollupEntry,
  SeedPromoteCandidate,
  SeedPromoteVerdict,
} from "@/lib/seed-learning/types";

/** Min mentions before a miss-heavy token is "ready" to promote. */
export const SEED_PROMOTE_MIN_MENTIONS = 3;
/** Prefer promote when misses dominate (dictionary gap). */
export const SEED_PROMOTE_MIN_MISS = 2;
/** Hits alone can also promote aliases into an existing sector. */
export const SEED_PROMOTE_MIN_HIT_ALIAS = 5;

function scoreEntry(entry: SeedLearningRollupEntry): number {
  // Misses weigh more — they are the gap the seed should close.
  return entry.missCount * 2 + entry.hitCount;
}

function verdictFor(entry: SeedLearningRollupEntry): {
  verdict: SeedPromoteVerdict;
  reason: string;
} {
  const sector = getSeedLearningSector(entry.sectorId);
  if (!sector) {
    return { verdict: "hold", reason: "unknown_sector" };
  }
  if (entry.mentionCount < SEED_PROMOTE_MIN_MENTIONS) {
    return { verdict: "observe", reason: "below_min_mentions" };
  }
  if (entry.missCount >= SEED_PROMOTE_MIN_MISS) {
    return { verdict: "ready", reason: "frequent_miss" };
  }
  if (entry.hitCount >= SEED_PROMOTE_MIN_HIT_ALIAS) {
    return { verdict: "ready", reason: "frequent_hit_alias" };
  }
  return { verdict: "observe", reason: "awaiting_miss_or_alias_volume" };
}

function proposedRowFor(entry: SeedLearningRollupEntry): Record<string, unknown> {
  const sector = getSeedLearningSector(entry.sectorId);
  const base = {
    sectorId: entry.sectorId,
    token: entry.token,
    aliases: [entry.token],
    sampleDomains: [...entry.sampleDomains],
    sampleGeoIds: [...entry.sampleGeoIds],
    mentionCount: entry.mentionCount,
    missCount: entry.missCount,
    hitCount: entry.hitCount,
  };
  switch (entry.sectorId) {
    case "stations":
    case "landmarks":
    case "airports":
    case "world_geo":
      return {
        ...base,
        kind: "WorldGeoNode_candidate",
        needsCentroid: true,
        labelKo: entry.token,
        promoteHint: "geocode then append frequent-travel-geo / world-geo-seed",
      };
    case "lodging_brands":
    case "food_brands":
    case "cafe_chains":
    case "retail_brands":
    case "amenities":
    case "transport_modes":
    case "events":
    case "payment":
    case "orgs":
      return {
        ...base,
        kind: "EntityCatalogEntry_candidate",
        labelKo: entry.token,
        queryKo: entry.token,
        promoteHint: sector?.promotePaths[0] ?? null,
      };
    case "cuisine":
    case "cuisine_search_keywords":
      return {
        ...base,
        kind: "CuisineCatalog_candidate",
        labelKo: entry.token,
        promoteHint: sector?.promotePaths[0] ?? null,
      };
    case "lodging_stay_types":
      return {
        ...base,
        kind: "LodgingStayType_candidate",
        labelKo: entry.token,
        promoteHint: "lib/globe/lodging/lodging-stay-types.ts",
      };
    default:
      return {
        ...base,
        kind: "generic_seed_candidate",
        promoteHint: sector?.promotePaths[0] ?? null,
      };
  }
}

export function evaluateSeedPromoteCandidates(
  entries: readonly SeedLearningRollupEntry[],
): readonly SeedPromoteCandidate[] {
  return entries
    .map((entry) => {
      const sector = getSeedLearningSector(entry.sectorId);
      const { verdict, reason } = verdictFor(entry);
      return {
        sectorId: entry.sectorId,
        token: entry.token,
        verdict,
        mentionCount: entry.mentionCount,
        missCount: entry.missCount,
        hitCount: entry.hitCount,
        score: scoreEntry(entry),
        reason,
        promotePaths: sector?.promotePaths ?? [],
        proposedRow: proposedRowFor(entry),
      } satisfies SeedPromoteCandidate;
    })
    .sort((a, b) => b.score - a.score || a.token.localeCompare(b.token));
}

export function listReadySeedPromoteCandidates(
  entries: readonly SeedLearningRollupEntry[],
): readonly SeedPromoteCandidate[] {
  return evaluateSeedPromoteCandidates(entries).filter(
    (row) => row.verdict === "ready",
  );
}
