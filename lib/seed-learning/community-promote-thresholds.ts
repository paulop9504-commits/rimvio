import type { SeedPromoteCandidate } from "@/lib/seed-learning/types";

/**
 * Community (shared) promote gate — stricter than personal local.
 * Solo noise should not rewrite global Dictionary seeds.
 */
export const SEED_PROMOTE_SHARED_MIN_MENTIONS = 8;
export const SEED_PROMOTE_SHARED_MIN_MISS = 5;
export const SEED_PROMOTE_SHARED_MIN_HIT_ALIAS = 12;

export function filterCommunityPromoteReady(
  candidates: readonly SeedPromoteCandidate[],
): readonly SeedPromoteCandidate[] {
  return candidates.filter((row) => {
    if (row.mentionCount < SEED_PROMOTE_SHARED_MIN_MENTIONS) {
      return false;
    }
    if (row.missCount >= SEED_PROMOTE_SHARED_MIN_MISS) {
      return true;
    }
    if (row.hitCount >= SEED_PROMOTE_SHARED_MIN_HIT_ALIAS) {
      return true;
    }
    return false;
  });
}
