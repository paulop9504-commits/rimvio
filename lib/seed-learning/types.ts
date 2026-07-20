/**
 * Seed Learning Engine — frequent mention → rollup → promote candidate.
 * Does NOT invent coordinates or mutate Reality. Humans (or codegen) commit seeds.
 *
 * @see docs/RIMVIO_ENTITY_RESOLVER.md — Dictionary-first
 */

export const SEED_LEARNING_VERSION = 1 as const;

export const SEED_LEARNING_SECTOR_IDS = [
  "stations",
  "landmarks",
  "airports",
  "world_geo",
  "lodging_brands",
  "lodging_stay_types",
  "cuisine",
  "food_brands",
  "cafe_chains",
  "amenities",
  "retail_brands",
  "transport_modes",
  "korea_known_places",
  "korea_known_neighborhoods",
  "korea_known_pois",
  "korea_metro_districts",
  "departure_hub_airports",
  "cuisine_search_keywords",
  "events",
  "payment",
  "orgs",
  "osaka_demo_catalog",
  "known_entities_kernel",
] as const;

export type SeedLearningSectorId = (typeof SEED_LEARNING_SECTOR_IDS)[number];

export type SeedLearningPriority = "P0" | "P1" | "P2";

export type SeedMentionOutcome = "hit" | "miss";

export type SeedLearningSectorDef = {
  readonly id: SeedLearningSectorId;
  readonly labelKo: string;
  readonly priority: SeedLearningPriority;
  /** Static SSOT path(s) — promote target for codegen / PR. */
  readonly promotePaths: readonly string[];
  readonly descriptionKo: string;
};

export type SeedMentionEvent = {
  readonly sectorId: SeedLearningSectorId;
  readonly token: string;
  readonly outcome: SeedMentionOutcome;
  readonly domain?: string | null;
  readonly geoId?: string | null;
  readonly entityId?: string | null;
  readonly messageSnippet?: string | null;
  readonly atIso?: string;
};

export type SeedLearningRollupEntry = {
  readonly sectorId: SeedLearningSectorId;
  readonly token: string;
  readonly hitCount: number;
  readonly missCount: number;
  readonly mentionCount: number;
  readonly lastHitAtIso: string | null;
  readonly lastMissAtIso: string | null;
  readonly lastSeenAtIso: string;
  readonly sampleDomains: readonly string[];
  readonly sampleGeoIds: readonly string[];
};

export type SeedPromoteVerdict = "observe" | "ready" | "hold";

export type SeedPromoteCandidate = {
  readonly sectorId: SeedLearningSectorId;
  readonly token: string;
  readonly verdict: SeedPromoteVerdict;
  readonly mentionCount: number;
  readonly missCount: number;
  readonly hitCount: number;
  readonly score: number;
  readonly reason: string;
  readonly promotePaths: readonly string[];
  /** Suggested row payload — sector-specific; never auto-committed. */
  readonly proposedRow: Record<string, unknown>;
};

/** Anonymous community delta — no utterance / user id. */
export type SeedLearningSharedDelta = {
  readonly sectorId: SeedLearningSectorId;
  readonly token: string;
  readonly hitDelta: number;
  readonly missDelta: number;
  readonly domain?: string | null;
};

export type SeedLearningStoreWireV1 = {
  readonly version: typeof SEED_LEARNING_VERSION;
  readonly entries: readonly SeedLearningRollupEntry[];
};
