/** Client-safe seed-learning barrel — no node:fs / next/headers. */

export type {
  SeedLearningSectorId,
  SeedLearningPriority,
  SeedMentionOutcome,
  SeedLearningSectorDef,
  SeedMentionEvent,
  SeedLearningRollupEntry,
  SeedPromoteVerdict,
  SeedPromoteCandidate,
  SeedLearningSharedDelta,
  SeedLearningStoreWireV1,
} from "@/lib/seed-learning/types";
export {
  SEED_LEARNING_VERSION,
  SEED_LEARNING_SECTOR_IDS,
} from "@/lib/seed-learning/types";

export {
  SEED_LEARNING_SECTOR_REGISTRY,
  getSeedLearningSector,
  listSeedLearningSectors,
  isSeedLearningSectorId,
  assertSectorRegistryComplete,
} from "@/lib/seed-learning/sector-registry";

export {
  normalizeSeedLearningToken,
  isSeedLearningTokenWorthy,
} from "@/lib/seed-learning/normalize-seed-token";

export {
  resetSeedLearningStoreForTests,
  listSeedLearningRollup,
  findSeedLearningRollup,
  applySeedMentionEvents,
} from "@/lib/seed-learning/seed-learning-store";

export {
  seedMentionEventsFromEntities,
  seedMentionMissProbesFromUtterance,
  observeSeedMentions,
} from "@/lib/seed-learning/observe-seed-mentions";

export {
  observeScoutSeedLearning,
  type ObserveScoutSeedLearningInput,
  type ObserveScoutSeedLearningResult,
} from "@/lib/seed-learning/observe-scout-seed-learning";

export {
  SEED_PROMOTE_MIN_MENTIONS,
  SEED_PROMOTE_MIN_MISS,
  SEED_PROMOTE_MIN_HIT_ALIAS,
  evaluateSeedPromoteCandidates,
  listReadySeedPromoteCandidates,
} from "@/lib/seed-learning/evaluate-promote-candidates";

export {
  SEED_PROMOTE_SHARED_MIN_MENTIONS,
  SEED_PROMOTE_SHARED_MIN_MISS,
  SEED_PROMOTE_SHARED_MIN_HIT_ALIAS,
  filterCommunityPromoteReady,
} from "@/lib/seed-learning/community-promote-thresholds";

export {
  dumpSeedPromoteCandidatesMarkdown,
  dumpSeedPromoteCandidatesJson,
} from "@/lib/seed-learning/dump-promote-candidates";

export { buildCatalogEntryFromPromoteCandidate } from "@/lib/seed-learning/build-catalog-entry-from-candidate";
export {
  syncReadyPromotesToCatalogOverlay,
  type ApplyPromoteOverlayResult,
} from "@/lib/seed-learning/apply-promote-to-overlay";

export {
  flushSeedLearningToSharedServer,
  scheduleSeedLearningSharedFlush,
  buildSeedLearningFlushDeltas,
  resetSeedLearningSyncedForTests,
  type FlushSeedLearningResult,
} from "@/lib/seed-learning/flush-seed-learning-client";
