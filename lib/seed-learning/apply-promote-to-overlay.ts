/**
 * Apply ready Seed promote candidates into the runtime catalog overlay.
 * Does not mutate committed seed source files.
 */

import { upsertPromotedCatalogEntries } from "@/lib/entity-resolver/catalogs/promoted-overlay-store";
import { buildCatalogEntryFromPromoteCandidate } from "@/lib/seed-learning/build-catalog-entry-from-candidate";
import { listReadySeedPromoteCandidates } from "@/lib/seed-learning/evaluate-promote-candidates";
import { listSeedLearningRollup } from "@/lib/seed-learning/seed-learning-store";
import type { SeedPromoteCandidate } from "@/lib/seed-learning/types";

export type ApplyPromoteOverlayResult = {
  readonly applied: number;
  readonly skipped: number;
  readonly candidates: readonly SeedPromoteCandidate[];
};

/**
 * Sync personal ready promotes → resolver overlay (Dictionary soft layer).
 */
export function syncReadyPromotesToCatalogOverlay(
  candidates?: readonly SeedPromoteCandidate[],
): ApplyPromoteOverlayResult {
  const ready =
    candidates ??
    listReadySeedPromoteCandidates(listSeedLearningRollup());
  const entries = [];
  let skipped = 0;
  for (const row of ready) {
    const entry = buildCatalogEntryFromPromoteCandidate(row);
    if (!entry) {
      skipped += 1;
      continue;
    }
    entries.push(entry);
  }
  const applied = upsertPromotedCatalogEntries(entries);
  return {
    applied,
    skipped,
    candidates: ready,
  };
}
